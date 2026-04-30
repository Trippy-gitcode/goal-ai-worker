/*
 * Supabase ネットワーク層モック（Playwright page.route() ベース）
 *
 * 設計方針:
 *  - 外部依存なし（MSW を持ち込まない、page.route() で完結）
 *  - lais/src/lib/supabase.js が `https://test.supabase.invalid` を VITE_SUPABASE_URL に
 *    指定して createClient するため、ブラウザから出る fetch は全て test.supabase.invalid 宛
 *  - `**\/auth/v1/**` と `**\/rest/v1/**` を mockSupabaseAuth / mockSupabaseRest で差し替え
 *  - 実 API キー / Supabase キーは一切ハードコードしない（page.route() のレスポンスは
 *    全てテストが用意したダミー JSON）
 *
 * 仕様根拠:
 *  - LP-008 環境変数未設定クラッシュ → webServer.env でダミー注入済（playwright.config.ts）
 *  - LP-009 emailRedirectTo / origin 直結のサブパス非互換 → mock 時は origin が
 *    http://localhost:5175 に固定されるためミスマッチが起きない
 *  - M3 R5.1 PKCE 二重消費の解消（session_history G_38）→ mockSupabaseAuth で
 *    /token?grant_type=pkce のレスポンスを 1 回成功 / 2 回目以降エラーで再現可能
 *
 * 参考: dev_system_v34_package.md §2.25.16.6 必須参照マトリクス（QA カテゴリ）
 */
import type { Page, Route, Request as PlaywrightRequest } from '@playwright/test';

export interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: 'bearer';
  user: MockUser;
}

export interface MockUser {
  id: string;
  email: string;
  aud: string;
  role: string;
  email_confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  // BUG-RT-SIGNUP-DUPLICATE-UX: 既登録メアド検出のため identities を任意で持たせる
  identities?: Array<Record<string, unknown>>;
}

const NOW = () => Math.floor(Date.now() / 1000);

export function buildMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    ...overrides,
  };
}

export function buildMockSession(user?: Partial<MockUser>): MockSession {
  const u = buildMockUser(user);
  return {
    access_token: 'mock-access-token-' + u.id,
    refresh_token: 'mock-refresh-token-' + u.id,
    expires_in: 3600,
    expires_at: NOW() + 3600,
    token_type: 'bearer',
    user: u,
  };
}

export interface MockAuthOptions {
  /** signInWithPassword / exchangeCodeForSession の成功時に返す session（null で「セッションなし」） */
  session?: MockSession | null;
  /** signUp 時に session を返さない = 確認メール待ちの挙動 */
  signupRequiresConfirmation?: boolean;
  /** signIn を強制的に 401 で失敗させる（バリデーションテスト用） */
  signInError?: { status: number; code: string; message: string };
  /** PKCE exchange を 1 回目成功 / 2 回目以降失敗にする（M3 R5.1 二重消費再現） */
  exchangeOnceOnly?: boolean;
  /**
   * BUG-RT-SIGNUP-DUPLICATE-UX:
   * signUp に対して「既登録メアド」レスポンスを返す。
   *  - 'identities-empty': data.user.identities = [] を返す（confirm email 必須プロジェクトの実挙動）
   *  - 'error-message': error.message = "User already registered" を 400 で返す
   */
  signupDuplicate?: 'identities-empty' | 'error-message';
}

const DEFAULT_AUTH: MockAuthOptions = {
  session: null,
  signupRequiresConfirmation: true,
  signInError: undefined,
  exchangeOnceOnly: false,
};

/**
 * Supabase Auth API（/auth/v1/**）をモックする。
 * page.route() を使い、ブラウザ → Supabase 宛の fetch を全て差し替える。
 *
 * カバー範囲（最低限）:
 *   - GET  /auth/v1/settings        : SDK 起動時の機能フラグ
 *   - POST /auth/v1/signup          : signUpWithEmail
 *   - POST /auth/v1/token?grant_type=password   : signInWithEmail
 *   - POST /auth/v1/token?grant_type=pkce       : exchangeCodeForSession
 *   - POST /auth/v1/token?grant_type=refresh_token : refresh
 *   - POST /auth/v1/logout
 *   - GET  /auth/v1/user            : getUser
 */
export async function mockSupabaseAuth(page: Page, options: MockAuthOptions = {}): Promise<void> {
  const opts: MockAuthOptions = { ...DEFAULT_AUTH, ...options };
  let exchangeCount = 0;

  // 注意: glob `**/auth/v1/**` は URL に query string が付くと match しない実環境があるため、
  // 安全に regex を使用（任意の host 配下の `/auth/v1/...` 全てを対象）。
  await page.route(/\/auth\/v1\//, async (route: Route, request: PlaywrightRequest) => {
    const url = new URL(request.url());
    const path = url.pathname.replace(/^.*\/auth\/v1/, '/auth/v1');
    const method = request.method();

    // settings: SDK が起動時に叩く機能フラグ取得
    if (method === 'GET' && path === '/auth/v1/settings') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          external: { email: true },
          mailer_autoconfirm: false,
          phone_autoconfirm: false,
          sms_provider: '',
          mfa_enabled: false,
        }),
      });
    }

    // signup
    if (method === 'POST' && path === '/auth/v1/signup') {
      // BUG-RT-SIGNUP-DUPLICATE-UX: 既登録メアド検出パターン 2 種をモック
      if (opts.signupDuplicate === 'error-message') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'user_already_exists',
            error_description: 'User already registered',
            code: 'user_already_exists',
            msg: 'User already registered',
            message: 'User already registered',
          }),
        });
      }
      if (opts.signupDuplicate === 'identities-empty') {
        // Supabase 実挙動: 既登録メアドでも 200 を返すが data.user.identities が空配列。
        // session は null（confirm email 待ちと同形）。
        const user = { ...buildMockUser(), identities: [] };
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user, session: null }),
        });
      }
      const user = buildMockUser();
      const body = opts.signupRequiresConfirmation
        ? { user, session: null }
        : { user, session: buildMockSession({ id: user.id }) };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    }

    // token (signin / pkce / refresh)
    if (method === 'POST' && path === '/auth/v1/token') {
      const grantType = url.searchParams.get('grant_type') || 'password';

      if (grantType === 'password') {
        if (opts.signInError) {
          return route.fulfill({
            status: opts.signInError.status,
            contentType: 'application/json',
            body: JSON.stringify({
              error: opts.signInError.code,
              error_description: opts.signInError.message,
              code: opts.signInError.code,
              msg: opts.signInError.message,
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(opts.session || buildMockSession()),
        });
      }

      if (grantType === 'pkce') {
        exchangeCount += 1;
        if (opts.exchangeOnceOnly && exchangeCount > 1) {
          return route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'invalid_grant',
              error_description: 'code already used',
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(opts.session || buildMockSession()),
        });
      }

      if (grantType === 'refresh_token') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(opts.session || buildMockSession()),
        });
      }
    }

    // logout
    if (method === 'POST' && path === '/auth/v1/logout') {
      return route.fulfill({ status: 204, body: '' });
    }

    // user info
    if (method === 'GET' && path === '/auth/v1/user') {
      const session = opts.session;
      if (!session) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unauthorized' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(session.user),
      });
    }

    // それ以外: 空 200 でフォールバック（テストが想定外パスに依存しないよう警告）
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ _mock: 'unhandled-auth-path', path, method }),
    });
  });
}

export interface MockRestEntry {
  /** テーブル名（path 末尾と一致、例: 'goals' / 'tasks'） */
  table: string;
  /** GET 時に返す行 */
  rows: Array<Record<string, unknown>>;
}

export interface MockRestOptions {
  entries?: MockRestEntry[];
  /** デフォルト 200、空配列を返す */
  defaultEmpty?: boolean;
}

/**
 * Supabase REST API（/rest/v1/**）をモックする。
 * シンプルな GET 専用。INSERT/UPDATE/DELETE は最小実装（受け取って 201/204 を返す）。
 */
export async function mockSupabaseRest(page: Page, options: MockRestOptions = {}): Promise<void> {
  const entries = options.entries || [];
  const tableMap = new Map(entries.map((e) => [e.table, e.rows]));
  const defaultEmpty = options.defaultEmpty ?? true;

  // 注意: glob では query が含まれた URL に match しない実環境があるため regex を使用。
  await page.route(/\/rest\/v1\//, async (route: Route, request: PlaywrightRequest) => {
    const url = new URL(request.url());
    const method = request.method();
    // path: /rest/v1/<table>?...
    const segments = url.pathname.split('/').filter(Boolean);
    const table = segments[segments.length - 1] || '';

    if (method === 'GET' || method === 'HEAD') {
      const rows = tableMap.get(table);
      if (rows) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(rows),
        });
      }
      if (defaultEmpty) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'not found', table }),
      });
    }

    if (method === 'POST') {
      // 受信ボディをそのまま 1 件返す（id 補完）
      let body: unknown = {};
      try {
        body = request.postDataJSON();
      } catch {
        body = {};
      }
      const inserted = Array.isArray(body)
        ? body.map((row, i) => ({ id: `mock-${table}-${i}`, ...row }))
        : [{ id: `mock-${table}-0`, ...(body as Record<string, unknown>) }];
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(inserted),
      });
    }

    if (method === 'PATCH' || method === 'DELETE') {
      return route.fulfill({ status: 204, body: '' });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

/**
 * 「未認証」状態の最短セットアップ。
 * S-00 / S-01 のレンダリング検証で使用。
 */
export async function mockSupabaseUnauthenticated(page: Page): Promise<void> {
  await mockSupabaseAuth(page, { session: null });
  await mockSupabaseRest(page, { defaultEmpty: true });
}

/**
 * Lais Pages Functions (`/api/lais/**`) をモックする。
 * LAIS-PHASE-A-REAL-COMPLETION 後、UI は db.js → /api/lais/* で実 Supabase に接続するため、
 * smoke テスト (mock 経由) では Pages Function 層もモックする必要がある。
 *
 * mockData の指定がない場合はデフォルトのダミー応答（空配列 / 空 profile）を返す。
 */
export interface MockLaisOptions {
  tasks?: Array<Record<string, unknown>>;
  goals?: Array<Record<string, unknown>>;
  messages?: Array<Record<string, unknown>>;
  profile?: Record<string, unknown>;
}

export async function mockLaisApi(page: Page, options: MockLaisOptions = {}): Promise<void> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const tasks = options.tasks ?? [
    // OVERDUE 行（昨日付）
    {
      id: 'mock-task-overdue',
      user_id: 'mock-user',
      name: '昨日のタスク',
      time: '08:00',
      duration: 15,
      category: 'work',
      categoryLabel: 'Work',
      status: 'scheduled',
      statusLabel: '予定',
      memo: '',
      parentGoalId: null,
      date: yesterdayIso,
      meta_text: '予定 · 15分',
    },
    // TODAY 行
    {
      id: 'mock-task-today',
      user_id: 'mock-user',
      name: '今日のタスク',
      time: '09:00',
      duration: 30,
      category: 'work',
      categoryLabel: 'Work',
      status: 'scheduled',
      statusLabel: '予定',
      memo: '',
      parentGoalId: null,
      date: todayIso,
      meta_text: '予定 · 30分',
    },
  ];
  const goals = options.goals ?? [];
  const messages = options.messages ?? [];
  const profile = options.profile ?? {
    id: 'mock-user',
    email: 'mock@example.com',
    display_name: 'モックふとし',
    partner_avatar: null,
    age: null,
    occupation: null,
    hobby: null,
    prefs: {},
    _row_exists: true,
  };

  await page.route(/\/api\/lais\//, async (route: Route, request: PlaywrightRequest) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (method === 'OPTIONS') return route.fulfill({ status: 204, body: '' });

    if (path === '/api/lais/bootstrap') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, user_id: 'mock-user', created: false }),
      });
    }

    if (path === '/api/lais/profile') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile }),
      });
    }

    if (path === '/api/lais/tasks') {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ tasks }),
        });
      }
      if (method === 'POST') {
        let body: any = {};
        try { body = request.postDataJSON(); } catch (_) {}
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            task: {
              id: 'mock-task-new',
              ...body,
              status: 'scheduled',
              statusLabel: '予定',
              meta_text: '予定',
            },
          }),
        });
      }
    }

    if (/^\/api\/lais\/tasks\//.test(path)) {
      const id = path.replace('/api/lais/tasks/', '');
      if (method === 'GET') {
        const t = tasks.find((x) => x.id === id) || tasks[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task: t }),
        });
      }
      if (method === 'PATCH') {
        let body: any = {};
        try { body = request.postDataJSON(); } catch (_) {}
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ task: { ...tasks[0], ...body, id } }),
        });
      }
      if (method === 'DELETE') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      }
    }

    if (path === '/api/lais/goals') {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ goals }),
        });
      }
      if (method === 'POST') {
        let body: any = {};
        try { body = request.postDataJSON(); } catch (_) {}
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            goal: { id: 'mock-goal-new', ...body, status: 'active', progress: 0 },
          }),
        });
      }
    }

    if (/^\/api\/lais\/goals\//.test(path)) {
      const id = path.replace('/api/lais/goals/', '');
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            goal: {
              id,
              user_id: 'mock-user',
              name: 'モックゴール',
              progress: 50,
              daysLeft: 30,
              category: 'work',
              categoryLabel: 'Work',
              categories: [],
              status: 'active',
            },
            tasks: [],
          }),
        });
      }
      if (method === 'PATCH') {
        let body: any = {};
        try { body = request.postDataJSON(); } catch (_) {}
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ goal: { id, ...body } }),
        });
      }
      if (method === 'DELETE') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true }),
        });
      }
    }

    if (path === '/api/lais/chat') {
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages }),
        });
      }
      if (method === 'POST') {
        let body: any = {};
        try { body = request.postDataJSON(); } catch (_) {}
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: {
              id: 'mock-msg-new',
              role: body.role || 'user',
              text: body.content || '',
              time: '00:00',
            },
          }),
        });
      }
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ _mock: 'unhandled', path, method }),
    });
  });
}

/**
 * 「認証済み」状態の最短セットアップ。
 * AuthCallback の正常系で使用。
 */
export async function mockSupabaseAuthenticated(
  page: Page,
  user?: Partial<MockUser>
): Promise<void> {
  await mockSupabaseAuth(page, { session: buildMockSession(user) });
  await mockSupabaseRest(page, { defaultEmpty: true });
}

/**
 * Supabase storageKey 推定。
 * playwright.config.ts: VITE_SUPABASE_URL = https://playwright-test.supabase.co
 *  → ref = playwright-test → storageKey = sb-playwright-test-auth-token
 *
 * 環境変数値が変わった場合に備え、URL から ref を抽出するロジックを置く。
 * テスト用 host が VITE_SUPABASE_URL に固定された Phase 4 設計を前提。
 */
const PLAYWRIGHT_SUPABASE_REF = 'playwright-test';
const PLAYWRIGHT_STORAGE_KEY = `sb-${PLAYWRIGHT_SUPABASE_REF}-auth-token`;

export interface MockSignInOptions {
  /** 上書き user。指定なしなら buildMockUser() 既定 */
  user?: Partial<MockUser>;
  /** 上書き session。指定なしなら buildMockSession(user) を生成 */
  session?: MockSession;
  /** REST entries を併せて差し込む */
  restEntries?: MockRestEntry[];
}

/**
 * mockSupabaseSignIn — protected route 直接到達を可能にする「セッション事前注入」ヘルパー。
 *
 * 動作:
 *  1. mockSupabaseAuth + mockSupabaseRest を session 付きでセットアップ
 *  2. page.addInitScript で `sb-{ref}-auth-token` を localStorage に直接注入
 *     → RequireAuth.jsx の bootstrapAuth → getSession() が即座に session を取得
 *     → /grow など protected route が初回描画から認証済みとして表示
 *
 * 用途: dashboard-smoke / Phase A protected 画面の mock 経由 smoke。
 * signin form 入力 → submit 経由のテストとは別に、protected route の直接到達検証で使う。
 *
 * 注意:
 *  - 実 Supabase 接続は一切しない（page.route() で /auth/v1/** + /rest/v1/** をインターセプト）
 *  - mock-token / mock-user-id 等のダミー値のみ。実 credentials を絶対書き込まない
 */
export async function mockSupabaseSignIn(
  page: Page,
  options: MockSignInOptions = {}
): Promise<MockSession> {
  const session = options.session || buildMockSession(options.user);

  await mockSupabaseAuth(page, { session });
  await mockSupabaseRest(page, {
    entries: options.restEntries,
    defaultEmpty: true,
  });
  // LAIS-PHASE-A-REAL-COMPLETION: Pages Functions も同時にモックして
  // 旧 mock 想定の smoke テストとの互換を保つ。
  await mockLaisApi(page, {});

  // localStorage 直接注入（auth-callback.spec.ts の正常系で確立済の手法）。
  // Supabase JS は持続化セッションを `sb-{ref}-auth-token` キーで読む。
  await page.addInitScript(
    ({ key, sess }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          access_token: sess.access_token,
          refresh_token: sess.refresh_token,
          expires_at: sess.expires_at,
          expires_in: sess.expires_in,
          token_type: sess.token_type,
          user: sess.user,
        })
      );
    },
    { key: PLAYWRIGHT_STORAGE_KEY, sess: session }
  );

  return session;
}

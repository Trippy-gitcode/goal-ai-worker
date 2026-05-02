// frontend/js/cross_border_consent_modal.js
// Round 31 honest audit PO-F fix (2026-05-02、 batch 14):
//   個情法 §28 「外国にある第三者への提供」 同意 modal の scaffold 実装。
//   privacy.html では同意取得を主張済 だが UI ゼロ = 全 user が同意なしで Anthropic / OpenAI
//   米国に PII 送信中 (1 億円 fine リスク)。 本 module で初回 visit + retroactive 同意 UI を提供。
//
//   注意: (a) 法的 wording は PO + 法務 confirmation 必要 (本 file は placeholder text)、
//        (b) 同意 record の DB 列 users.cross_border_consent_at + cross_border_consent_version
//            は migration 20260502_005_cross_border_consent.up.sql で追加 (PR 別)、
//        (c) 同意取得後の audit_log 書込は src/utils/audit_log.js helper 経由。

const CONSENT_VERSION = '2026-05-02-v1';  // privacy.html 改訂時に bump、 既同意 user に再表示
const CONSENT_LS_KEY = 'goal_cross_border_consent';

/**
 * 既存同意の有無を localStorage で snapshot 確認。
 * server-side audit log が SSoT、 LS は UX 高速化用 cache。
 */
function hasCachedConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_LS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && obj.version === CONSENT_VERSION && obj.granted === true;
  } catch (_) { return false; }
}

/**
 * server に同意 record を post (POST /api/account/consent/cross-border)。
 * 失敗時は localStorage は更新せず、 次回 visit で再表示。
 */
async function recordConsent(granted) {
  try {
    const res = await fetch(`${WORKER_URL || ''}/api/account/consent/cross-border`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ granted, version: CONSENT_VERSION, ts: new Date().toISOString() }),
    });
    if (res.ok || res.status === 204) {
      localStorage.setItem(CONSENT_LS_KEY, JSON.stringify({ granted, version: CONSENT_VERSION, ts: Date.now() }));
      return true;
    }
    return false;
  } catch (_) {
    return false;  // network 失敗、 次回再 prompt
  }
}

/**
 * Modal HTML を body に injection。 既存 modal 構造との衝突を避けるため id prefix `cbc-`。
 */
function renderConsentModal() {
  if (document.getElementById('cbc-modal-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'cbc-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'cbc-modal-title');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="max-width:560px;background:var(--bg,#fff);color:var(--fg,#000);padding:1.5rem;border-radius:12px;max-height:90vh;overflow-y:auto;">
      <h2 id="cbc-modal-title" style="font-size:1.2em;font-weight:bold;margin-bottom:0.8rem;">外国にある第三者への個人データ提供 同意</h2>
      <p style="font-size:0.9em;line-height:1.6;margin-bottom:1rem;">
        本サービスは、 ご入力いただいた目標情報・チャット内容・要約等の個人データを、 以下の米国・シンガポール所在の AI 事業者に提供して回答を生成します。
      </p>
      <ul style="font-size:0.85em;margin-bottom:1rem;padding-left:1.5em;">
        <li><strong>OpenAI (米国)</strong>: GPT-5 系モデルでの回答生成 (DPA 締結済)</li>
        <li><strong>Anthropic (米国)</strong>: Claude モデルでの回答生成 (DPA 締結済)</li>
        <li><strong>Google AI Studio (米国)</strong>: Gemini モデルでの回答生成 (DPA 締結済)</li>
        <li><strong>Supabase (米国・シンガポール)</strong>: データベース保存 (DPA 締結済)</li>
        <li><strong>Stripe (米国)</strong>: 決済処理 (DPA 締結済、 決済 plan のみ)</li>
        <li><strong>Cloudflare (米国)</strong>: Worker 実行 + KV (DPA 締結済)</li>
      </ul>
      <p style="font-size:0.85em;line-height:1.5;margin-bottom:1rem;color:var(--muted,#666);">
        個人情報保護法 §28 (越境移転) および GDPR Art.49 に基づく <strong>明示同意</strong> をお願いします。 同意の保管期間は 7 年、 撤回は <a href="#/me" style="text-decoration:underline;">プロフィール画面</a> から可能です。 詳細は <a href="privacy.html#cross-border" target="_blank" style="text-decoration:underline;">プライバシーポリシー §越境移転</a> をご確認ください。
      </p>
      <div style="display:flex;gap:0.8rem;justify-content:flex-end;margin-top:1rem;">
        <button id="cbc-decline" style="padding:0.6rem 1.2rem;border:1px solid var(--border,#ccc);background:transparent;color:var(--fg,#000);border-radius:6px;cursor:pointer;">同意しない (利用継続不可)</button>
        <button id="cbc-accept" style="padding:0.6rem 1.2rem;background:var(--primary,#0066cc);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">同意して利用を開始</button>
      </div>
      <p style="font-size:0.7em;line-height:1.4;margin-top:0.8rem;color:var(--muted2,#999);">
        本 modal は scaffold 実装 (PO-F、 2026-05-02)、 法的 wording は PO + 法務 confirmation 後に確定。
      </p>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('cbc-accept').addEventListener('click', async () => {
    const ok = await recordConsent(true);
    if (ok) {
      overlay.remove();
      if (typeof toast === 'function') toast('同意を受け付けました');
    } else {
      if (typeof toast === 'function') toast('同意 record 保存に失敗、 後ほど再試行');
    }
  });
  document.getElementById('cbc-decline').addEventListener('click', async () => {
    await recordConsent(false);
    overlay.remove();
    if (typeof toast === 'function') toast('同意なしのため、 利用を継続できません。 設定画面から再同意可能です。');
    // optional: redirect to landing page or display non-functional state
  });
}

/**
 * Init: page load 時に未同意なら modal 表示。 ensureAuth() 完了後に呼ぶ前提。
 * 既存 user の retroactive prompt: localStorage に旧 version しかない場合も再表示。
 */
function initCrossBorderConsentModal() {
  // 同意 not granted → modal 表示
  if (!hasCachedConsent()) {
    renderConsentModal();
  }
}

// グローバル expose (existing globals.js style)
if (typeof window !== 'undefined') {
  window.initCrossBorderConsentModal = initCrossBorderConsentModal;
  window.hasCrossBorderConsent = hasCachedConsent;
}

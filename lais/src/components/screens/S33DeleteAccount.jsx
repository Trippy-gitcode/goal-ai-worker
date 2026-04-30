import { useState, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import './S33DeleteAccount.css';

/*
 * S-33 DeleteAccount — 退会画面 (Stage 7-3 新設)
 * po_expectations_v1.md §8.7 準拠
 *
 * Given: S-30 から「退会」タップ
 * When : 確認モーダル + 入力 ("DELETE")
 * Then : 物理削除 + ログアウト (C2 連動)
 */

const CONFIRM_KEYWORD = 'DELETE';

export function S33DeleteAccount() {
  const [confirmText, setConfirmText] = useState('');
  const canDelete = confirmText === CONFIRM_KEYWORD;

  const handleBack = useCallback(() => {
    route('/me', true);
  }, []);

  const handleDelete = useCallback(() => {
    if (!canDelete) return;
    // C2 連動: 物理削除 + ログアウトは後続フェーズ
    // eslint-disable-next-line no-console
    console.log('[S33] account deleted');
    route('/', true);
  }, [canDelete]);

  return (
    <main id="main-content" class="s33-delete-account" aria-labelledby="s33-title" data-testid="s33-root">
      <header class="s33-header">
        <button type="button" class="s33-back" onClick={handleBack} aria-label="戻る">
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M 13 4 L 7 10 L 13 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <h1 id="s33-title" class="s33-title">退会</h1>
      </header>

      <section class="s33-warning" role="alert">
        <p class="s33-warning-text">
          この操作は <strong>取り消せません</strong>。
          すべてのデータ (目標 / タスク / 対話 / 日記) が削除されます。
        </p>
      </section>

      <label class="s33-confirm-label" for="s33-confirm-input">
        確認のため、下に「{CONFIRM_KEYWORD}」と入力してください。
      </label>
      <input
        id="s33-confirm-input"
        data-testid="s33-confirm-input"
        type="text"
        class="s33-confirm-input"
        value={confirmText}
        onInput={(e) => setConfirmText((e.target instanceof HTMLInputElement ? e.target.value : ''))}
        placeholder={CONFIRM_KEYWORD}
        autoComplete="off"
        spellcheck={false}
      />

      <button
        type="button"
        class="s33-delete-cta"
        onClick={handleDelete}
        disabled={!canDelete}
        data-testid="s33-delete-btn"
      >
        退会する
      </button>

      <button type="button" class="s33-cancel" onClick={handleBack}>
        キャンセル
      </button>
    </main>
  );
}

export default S33DeleteAccount;

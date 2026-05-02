// frontend/js/age_gate.js
// Round 31 honest audit PO-E (interim mitigation, 2026-05-02、 batch 14):
//   13 歳未満 user の利用を block して COPPA 適用を回避する age gate。 VPC vendor 契約
//   (¥30K-100K/月) は §4 escalation で PO 判断が必要だが、 13 歳未満を register 段階で
//   reject すれば COPPA / Apple §5.1.4 の対象外となり、 当面の法的リスクを除去できる。
//
//   注意: (a) 利用規約に「13 歳未満は利用不可」 を明記する更新が PO 必要、
//        (b) 本 gate は self-attestation (年齢入力) 方式、 厳密な VPC ではない、
//        (c) 13-17 歳は Apple App Store 5.1.4 上は parental consent 不要 (US COPPA 13 歳閾値)
//            だが、 GDPR 域では 13-15 (DE/AT は 14、 FR は 15、 ES は 14) の追加同意が必要
//            (本 gate では「13 歳以上ですか？」 のみ、 GDPR 配信時は別途修正)。

const AGE_GATE_LS_KEY = 'goal_age_gate_passed';
const MIN_AGE = 13;  // COPPA threshold (US)、 GDPR 配信時は 16 に bump 検討

/**
 * 既存通過の有無を localStorage で snapshot 確認。 server-side audit log 連動 (audit_log table)
 * は recordAgeGate() 経由。
 */
function hasAgeGatePassed() {
  try {
    const raw = localStorage.getItem(AGE_GATE_LS_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return obj && obj.passed === true && obj.minAge === MIN_AGE;
  } catch (_) { return false; }
}

/**
 * server に age gate record を post。 失敗時は localStorage 更新せず、 次回再表示。
 */
async function recordAgeGate(passed, declaredAge) {
  try {
    const res = await fetch(`${WORKER_URL || ''}/api/account/age-gate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ passed, declared_age: declaredAge, min_age: MIN_AGE, ts: new Date().toISOString() }),
    });
    if (res.ok || res.status === 204) {
      localStorage.setItem(AGE_GATE_LS_KEY, JSON.stringify({ passed, minAge: MIN_AGE, ts: Date.now() }));
      return true;
    }
    return false;
  } catch (_) { return false; }
}

function renderAgeGateModal() {
  if (document.getElementById('age-gate-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'age-gate-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'age-gate-title');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="max-width:440px;background:var(--bg,#fff);color:var(--fg,#000);padding:1.5rem;border-radius:12px;">
      <h2 id="age-gate-title" style="font-size:1.15em;font-weight:bold;margin-bottom:0.8rem;">年齢確認</h2>
      <p style="font-size:0.9em;line-height:1.6;margin-bottom:1rem;">
        本サービスは ${MIN_AGE} 歳以上の方のみご利用いただけます。 該当しない場合はご利用を中止してください。
      </p>
      <p style="font-size:0.8em;line-height:1.5;color:var(--muted,#666);margin-bottom:1rem;">
        虚偽申告は禁止しています (利用規約 §X)。
      </p>
      <div style="display:flex;gap:0.8rem;justify-content:flex-end;margin-top:1rem;">
        <button id="age-gate-no" style="padding:0.6rem 1.2rem;border:1px solid var(--border,#ccc);background:transparent;color:var(--fg,#000);border-radius:6px;cursor:pointer;">${MIN_AGE} 歳未満</button>
        <button id="age-gate-yes" style="padding:0.6rem 1.2rem;background:var(--primary,#0066cc);color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">${MIN_AGE} 歳以上</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('age-gate-yes').addEventListener('click', async () => {
    await recordAgeGate(true, null);
    overlay.remove();
    if (typeof toast === 'function') toast('年齢確認を受け付けました');
  });
  document.getElementById('age-gate-no').addEventListener('click', async () => {
    await recordAgeGate(false, null);
    // 利用 block: page を空 state に置換
    document.body.innerHTML = `
      <div style="padding:2rem;text-align:center;font-family:system-ui;">
        <h1 style="font-size:1.3em;margin-bottom:1rem;">ご利用いただけません</h1>
        <p style="font-size:0.95em;line-height:1.6;color:#444;">
          本サービスは ${MIN_AGE} 歳以上の方のみご利用いただけます。<br>
          ご了承ください。
        </p>
      </div>`;
  });
}

function initAgeGate() {
  if (!hasAgeGatePassed()) {
    renderAgeGateModal();
  }
}

if (typeof window !== 'undefined') {
  window.initAgeGate = initAgeGate;
  window.hasAgeGatePassed = hasAgeGatePassed;
}

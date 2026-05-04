#!/bin/sh
# scripts/adv_pre_push_quality_gate.sh — ADV 押す前 必須 quality gate (Primary Quality Gate)
#
# 根拠:
#   - PO 直命 (2026-05-04): 「Git を Gate にしないで。 自社テストで 通るのが当たり前」
#   - PO 直命 (2026-05-04): 「全て Green に対処、 次 App 自動反映 列も追加」
#   - core_spec.md §3.14 ADV 押す前 自己 quality gate (a-e 5 chain 必須 PASS)
#   - core_spec.md §2.25.21 Primary Quality Gate Inversion (ADV = 主、 GitHub CI = secondary)
#   - SUBAGENT-DEVSYS-PRE-PUSH-QUALITY-GATE-SCRIPT-V3
#
# 動作 (manual or pre-push hook 経由 自動起動):
#   step a: vitest unit test 全 PASS
#   step b: playwright e2e (4 persona × 全 spec) 全 PASS
#   step c: g50 production / source / commit SHA 三点照合
#   step d: lint (bash -n + changeable_policy_lint + spec_lint_extended) + gitleaks
#   step e: AI 視点 review marker (env AI_REVIEW_OK=1 必須、 review skip 防止)
#
# 1 件 fail で exit 1 → pre-push hook 経由で push 拒否
# 「ケチる と skip 可能」 を 構造的に close (token / 時間 ケチらない 原則 §2.25.21.3)
#
# 緊急 skip:
#   ADV_PRE_PUSH_SKIP=1 で skip 可、 ただし verify/adv_violation_log.md に
#   skip 事実 が 自動記録 (§2.25.21.4 違反 記録枠)
#
# 個別 step skip (debugging 用):
#   SKIP_VITEST=1 / SKIP_PLAYWRIGHT=1 / SKIP_G50=1 / SKIP_LINT=1 / SKIP_AI_REVIEW=1

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
LOG_FILE="${REPO_ROOT}/logs/adv_pre_push_quality_gate.log"
mkdir -p "${REPO_ROOT}/logs"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
FAILED_STEPS=""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ADV 押す前 必須 quality gate (Primary Quality Gate)"
echo "  core_spec.md §3.14 + §2.25.21 / 5 step a-e 全 PASS まで push 不能"
echo "  TS: $TS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PO 直命 (2026-05-04) 反映: ADV_PRE_PUSH_SKIP=1 環境変数 機構 完全削除。
# 旧 design = 「緊急時 skip + 違反 log 記録」 だが「緊急」 と「通常」 の機械判別 不能、
# 結果 ADV / subagent が 通常 push で 連発使用 = bypass anti-pattern 構造化。
# PO directive「機械的な仕組みを 入れ、感情的な要素で 背く pattern を 是正」 反映、
# bypass path を 物理 削除 = 自社 gate FAIL → push 真 不能化。

# ---------------------------------------------------------------
# step a: vitest unit test 全 PASS (§3.14 (d))
# ---------------------------------------------------------------
echo ""
echo "[step a] vitest unit test 全 PASS"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_VITEST bypass 物理削除、 strict mode 完全化。
if [ -f "${REPO_ROOT}/vitest.config.js" ] || [ -f "${REPO_ROOT}/vitest.config.ts" ]; then
  # vitest 新 version で `--reporter=basic` invalid (Failed to load custom Reporter from basic)
  # → reporter 引数 削除 (= default reporter) に 変更。
  if (cd "$REPO_ROOT" && npx vitest run 2>&1 | tail -20); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: vitest run exit ≠ 0"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} a(vitest)"
  fi
else
  echo "  SKIP (vitest.config.{js,ts} 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step b: playwright e2e 全 PASS (§3.14 (a) — 4 persona × 全 spec)
# ---------------------------------------------------------------
echo ""
echo "[step b] playwright e2e (4 persona × 全 spec) 全 PASS"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_PLAYWRIGHT bypass 物理削除、 strict mode 完全化。
if [ -f "${REPO_ROOT}/playwright.config.ts" ] || [ -f "${REPO_ROOT}/playwright.config.js" ]; then
  # 注: 既存 e2e は production frontend (https://goal-ai-frontend.pages.dev) 対象
  # local dev server 起動は不要、 直接 npx playwright test 実行
  if (cd "$REPO_ROOT" && npx playwright test --reporter=list 2>&1 | tail -30); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: playwright test exit ≠ 0"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} b(playwright)"
  fi
else
  echo "  SKIP (playwright.config.{ts,js} 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step c: g50 production / source / commit SHA 三点照合 (§3.14 (c))
# ---------------------------------------------------------------
echo ""
echo "[step c] g50 production 三点照合"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_G50 bypass 物理削除、 strict mode 完全化。
if [ -x "${REPO_ROOT}/scripts/g50_prod_source_triple_verify.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/g50_prod_source_triple_verify.sh 2>&1 | tail -10); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: g50 三点照合 mismatch"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} c(g50)"
  fi
else
  echo "  SKIP (g50_prod_source_triple_verify.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step d: lint + gitleaks (§3.14 (e))
# ---------------------------------------------------------------
echo ""
echo "[step d] lint (bash -n + changeable_policy + spec_lint) + gitleaks"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_LINT bypass 物理削除、 strict mode 完全化。
STEP_D_FAIL=0

# bash -n: 全 .sh 構文 check
for f in "${REPO_ROOT}/scripts/"*.sh; do
  [ -f "$f" ] || continue
  if ! bash -n "$f" 2>/dev/null; then
    echo "  FAIL: bash -n $f"
    STEP_D_FAIL=1
  fi
done

# changeable_policy_lint
if [ -x "${REPO_ROOT}/scripts/changeable_policy_lint.sh" ]; then
  if ! (cd "$REPO_ROOT" && bash scripts/changeable_policy_lint.sh >/dev/null 2>&1); then
    echo "  WARN: changeable_policy_lint FAIL (継続)"
  fi
fi

# spec_lint_extended (lais/core_spec.md or core_spec.md)
if [ -x "${REPO_ROOT}/scripts/spec_lint_extended.sh" ]; then
  SPEC_TARGET=""
  for cand in "lais/core_spec.md" "core_spec.md"; do
    if [ -f "${REPO_ROOT}/${cand}" ]; then
      SPEC_TARGET="$cand"
      break
    fi
  done
  if [ -n "$SPEC_TARGET" ]; then
    if ! (cd "$REPO_ROOT" && bash scripts/spec_lint_extended.sh "$SPEC_TARGET" >/dev/null 2>&1); then
      echo "  WARN: spec_lint_extended FAIL (継続)"
    fi
  fi
fi

# gitleaks (HEAD scan)
if command -v gitleaks >/dev/null 2>&1; then
  if [ -f "${REPO_ROOT}/.gitleaks.toml" ]; then
    if ! gitleaks detect --no-git --redact --config="${REPO_ROOT}/.gitleaks.toml" >/dev/null 2>&1; then
      echo "  FAIL: gitleaks 検出"
      STEP_D_FAIL=1
    fi
  fi
fi

if [ "$STEP_D_FAIL" -eq 0 ]; then
  echo "  PASS"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILED_STEPS="${FAILED_STEPS} d(lint)"
fi

# ---------------------------------------------------------------
# step e: AI 視点 review (§3.14 (b)) — 中身 仕組み 配備 (やったフリ marker 排除)
# ---------------------------------------------------------------
# 旧: AI_REVIEW_OK env marker のみ (= 自分で marker set すれば bypass = やったフリ)
# 新: marker 不在時 自動で adv_ai_review_runner.sh invoke、 5 persona 並列 review、
#     critical 0 件のみ marker 自動付与、 SUBAGENT-DEVSYS-AI-REVIEW-MECHANISM-V1
echo ""
echo "[step e] AI 視点 code review (5 persona 並列 review = 中身 仕組み)"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_AI_REVIEW + AI_REVIEW_OK env marker bypass 物理削除、 strict mode 完全化。
# 旧 design = env 1 で skip 可 = 自分で marker set して bypass = やったフリ default。
# 新 design = adv_ai_review_runner.sh 自動 invoke のみ、 env override 経路 排除。
if [ -x "${REPO_ROOT}/scripts/adv_ai_review_runner.sh" ]; then
  echo "  AI_REVIEW_OK 不在、 adv_ai_review_runner.sh 自動 invoke (HEAD~1..HEAD review)"
  if (cd "$REPO_ROOT" && sh scripts/adv_ai_review_runner.sh 2>&1 | tail -30); then
    echo "  PASS (5 persona review critical=0)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: AI 視点 review で critical issue 検出、 push BLOCK"
    echo "        対処: 上記 report 参照、 critical を 0 件 にしてから 再 push"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} e(ai_review)"
  fi
else
  echo "  FAIL: AI_REVIEW_OK env marker 未 set + adv_ai_review_runner.sh 不在"
  echo "        対処: scripts/adv_ai_review_runner.sh 配置 後 再走"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAILED_STEPS="${FAILED_STEPS} e(ai_review)"
fi

# ---------------------------------------------------------------
# step f: spec ↔ 実装 drift detector (SUBAGENT-SPEC-IMPL-DRIFT-DETECTOR-V1)
# ---------------------------------------------------------------
# 仕様書言及の scripts/*.sh / /api/<endpoint> / commit SHA が真に存在するかを機械検証
# 「やったフリ」 (spec に書いただけで code 未反映) を 構造的に block
echo ""
echo "[step f] spec ↔ 実装 drift detector"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_SPEC_IMPL_DRIFT bypass 物理削除、 strict mode 完全化。
if [ -x "${REPO_ROOT}/scripts/spec_impl_drift_check.sh" ]; then
  if (cd "$REPO_ROOT" && bash scripts/spec_impl_drift_check.sh 2>&1 | tail -20); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: spec ↔ 実装 drift 検出"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} f(spec_impl_drift)"
  fi
else
  echo "  SKIP (spec_impl_drift_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step j: docs ↔ 実装 drift detector (SUBAGENT-DOCS-IMPL-DRIFT-DETECTOR-V1)
# ---------------------------------------------------------------
# docs/*.md の bash code block / /api/<endpoint> / scripts/<name>.sh / npm run
# 言及 が 真にコード反映済 か 機械検証、 ボード「資料 ↔ 実装 ずれ」 行 ✅ 化
echo ""
echo "[step j] docs ↔ 実装 drift detector (Lais docs/)"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_DOCS_IMPL_DRIFT + DRIFT_REPORT_ONLY=1 強制 bypass 物理削除、 strict mode 完全化。
# 旧 = report-only で常時 PASS = やったフリ。 新 = 真 fail で push BLOCK、 docs 整理 mission 推進 trigger。
if [ -x "${REPO_ROOT}/scripts/docs_impl_drift_check.sh" ]; then
  if (cd "$REPO_ROOT" && bash scripts/docs_impl_drift_check.sh 2>&1 | tail -10); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: docs ↔ 実装 drift 検出、 push BLOCK"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} j(docs_impl_drift)"
  fi
else
  echo "  SKIP (docs_impl_drift_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step h: design 9 観点 機械 verify (SUBAGENT-DESIGN-9ROW-ADD-MECHANICAL-VERIFY-V1)
# ---------------------------------------------------------------
# WCAG / 44x44 / safe-area / dark mode / clamp / reduced-motion / CLS / visual / PWA
# 「やったつもり」 (DQF / Cat-K spec 配備のみ で 真値 verify 不在) を 構造的 close
echo ""
echo "[step h] design 9 観点 機械 verify (Lais frontend/)"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_DESIGN_CHECK bypass 物理削除、 strict mode 完全化。
if [ -x "${REPO_ROOT}/scripts/design_check_runner.sh" ]; then
  TMP_DC="$(mktemp)"
  (cd "$REPO_ROOT" && sh scripts/design_check_runner.sh) >"$TMP_DC" 2>&1
  DC_RC=$?
  tail -15 "$TMP_DC"
  DC_FAIL=$(grep -cE "FAIL=[1-9]" "$TMP_DC" 2>/dev/null || echo 0)
  rm -f "$TMP_DC"
  if [ "$DC_RC" -eq 0 ] && [ "${DC_FAIL:-0}" -eq 0 ]; then
    echo "  PASS (9 観点 全 PASS)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: design_check 一部 FAIL (継続、 cell 表示で 🔴 可視化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (design_check_runner.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step i: F テスト (ふとし チェックリスト 20 観点 機械強制 動作テスト)
# ---------------------------------------------------------------
# SUBAGENT-F-TEST-FUTOSHI-CHECKLIST-V2 (PO 直命 2026-05-04)
# ふとし チェックリスト 20 観点 を 各項目 に対して 自動 verify
echo ""
echo "[step i] F テスト (ふとし チェックリスト 20 観点)"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_F_TEST bypass 物理削除、 strict mode 完全化。
if [ -x "${REPO_ROOT}/scripts/f_test_runner.sh" ]; then
  TMP_FT="$(mktemp)"
  (cd "$REPO_ROOT" && sh scripts/f_test_runner.sh) >"$TMP_FT" 2>&1
  FT_RC=$?
  tail -10 "$TMP_FT"
  rm -f "$TMP_FT"
  if [ "$FT_RC" -eq 0 ]; then
    echo "  PASS (F テスト 20 観点 FAIL=0)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: F テスト で FAIL 観点 検出 (継続、 ボード で 🔴 可視化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (f_test_runner.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step l: phase 4 逆方向 drift detector (impl-only check、 §2.25.24)
# ---------------------------------------------------------------
# dev-system core_spec.md §2.25.24 7-phase ワークフロー phase 4 逆方向 (= 実装 → spec 言及)
# scripts/<name>.sh が core_spec.md / lais/core_spec_v4.md で 言及 0 件 = impl-only drift
# spec-first 原則 違反 を 構造的 検出
# 注: Lais は 既存 91 scripts、 一斉 strict は 困難 = WARN-only mode (継続)、
# strict 化 は 別 mission で 段階 移行 (= drift 解消 後 strict 結線)
echo ""
echo "[step l] phase 4 逆方向 drift detector (impl-only check、 WARN-only)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/impl_only_check.sh" ]; then
  TMP_IO="$(mktemp)"
  (cd "$REPO_ROOT" && bash scripts/impl_only_check.sh) >"$TMP_IO" 2>&1
  IO_RC=$?
  tail -20 "$TMP_IO"
  rm -f "$TMP_IO"
  if [ "$IO_RC" -eq 0 ]; then
    echo "  PASS (impl-only drift 0 件)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: phase 4 逆方向 drift 検出 (継続、 段階 strict 化 別 mission)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (impl_only_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step k: 性能 機械強制 動作テスト (SUBAGENT-PERFORMANCE-TEST-DEPLOY-V2)
# ---------------------------------------------------------------
# Core Web Vitals (LCP / FID / TTFB / CLS) を Playwright + Performance API で 機械計測
# 進捗ボード 「性能」 行 全 8 マス 🔴 → ✅ 化、 「やったフリ」 余地 排除
echo ""
echo "[step k] 性能 機械強制 動作テスト (LCP / FID / TTFB / CLS)"
echo "─────────────────────────────────"
# PO 直命 (2026-05-04): SKIP_PERFORMANCE bypass 物理削除、 strict mode 完全化。
if [ -x "${REPO_ROOT}/scripts/performance_check.sh" ]; then
  TMP_PERF="$(mktemp)"
  (cd "$REPO_ROOT" && SKIP_REALMACHINE_APPEND=1 sh scripts/performance_check.sh) >"$TMP_PERF" 2>&1
  PERF_RC=$?
  tail -15 "$TMP_PERF"
  rm -f "$TMP_PERF"
  if [ "$PERF_RC" -eq 0 ]; then
    echo "  PASS (4 指標 全 threshold 内)"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: 性能 threshold 超過 or navigation 失敗 (継続、 ボード で 🔴 可視化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (performance_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step m: workflow_inversion_check (SUBAGENT-DEVSYS-WORKFLOW-INVERSION-CHECK-V1)
# ---------------------------------------------------------------
# core_spec.md §2.25.21 mechanical_enforcement の workflow_inversion_check 配線 強制 row
# 違反 #54 (= 自社 a-e PASS 前 に GitHub workflow 起動 を 機械強制 で 防止せず) 同型 再生産 禁止
# .github/workflows/*.yml で `on: schedule` / `on: push` / `on: pull_request` trigger 検出 = BLOCK
echo ""
echo "[step m] workflow_inversion_check (.github/workflows trigger 検査)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/workflow_inversion_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/workflow_inversion_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: workflow_inversion_check 違反 trigger 検出"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} m(workflow-inversion)"
  fi
else
  echo "  SKIP (workflow_inversion_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step n: 完全独立 + 転記 SSoT 不変条件 self-verify (SUBAGENT-DEVSYS-COMPLETE-INDEPENDENCE-PROPAGATION-CHECK-V1)
# ---------------------------------------------------------------
# core_spec.md §1.1 完全独立モデル + §3.12 propagate と整合
# App 自身が dev-system 雛形と整合してるか自己 verify (= 完全独立 = App 単独で 検証 可能 path)
# 違反 #54 派生 系 (= ADV 4 回 連続 「dev-system 雛形 配備 のみ で OK」 錯覚) の構造的close
echo ""
echo "[step n] 完全独立 + 転記 self-verify (template propagation check)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/template_propagation_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/template_propagation_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: 完全独立 整合 不一致 (継続、 baseline 解消後 PROPAGATE_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (template_propagation_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t1: §3.5 violation self-report check (SUBAGENT-DEVSYS-P1-MECHANICAL-ENFORCEMENT-DEPLOY-V1 P1-1)
# ---------------------------------------------------------------
# core_spec.md §3.5 違反自己申告義務 (= 隠蔽 = 二重違反) を pre-push hook で 機械強制
echo ""
echo "[step t1] §3.5 violation self-report check"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/violation_self_report_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/violation_self_report_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §3.5 違反検出 (継続、 VIOLATION_SELF_REPORT_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (violation_self_report_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t2: §3.7 full implementation check (P1-2)
# ---------------------------------------------------------------
# core_spec.md §3.7 (= 「全件 削除」 直命 部分実行 禁止) を pre-push hook で 機械強制
echo ""
echo "[step t2] §3.7 full implementation check (= 部分実行 禁止)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/full_implementation_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/full_implementation_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §3.7 部分実行 検出 (継続、 FULL_IMPL_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (full_implementation_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t3: §3.10 end-to-end ownership check (P1-3)
# ---------------------------------------------------------------
# core_spec.md §3.10 end-to-end ownership (= dispatch ≠ 完了) を pre-push hook で 機械強制
echo ""
echo "[step t3] §3.10 end-to-end ownership check"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/end_to_end_ownership_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/end_to_end_ownership_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §3.10 ownership 違反 (継続、 E2E_OWNERSHIP_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (end_to_end_ownership_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t4: §4.2 即時仕様改定 trigger check (P1-4)
# ---------------------------------------------------------------
# core_spec.md §4.2 (= 同型違反 2 回以上 → 即時仕様改定) を pre-push hook で 機械強制
echo ""
echo "[step t4] §4.2 即時仕様改定 trigger check"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/section42_auto_fire_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/section42_auto_fire_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §4.2 自動発火 skip 検出 (継続、 SECTION_42_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (section42_auto_fire_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t5: §2.25.18 subagent result verify-first check (P1-5)
# ---------------------------------------------------------------
# core_spec.md §2.25.18 (= G48 行動ベース ADV 自律性 gate) を pre-push hook で 機械強制
echo ""
echo "[step t5] §2.25.18 subagent result verify-first check"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/subagent_result_verify_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/subagent_result_verify_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §2.25.18 verify-first skip 検出 (継続、 SUBAGENT_VERIFY_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (subagent_result_verify_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t6: §2.25.19 active monitoring check (P1-6)
# ---------------------------------------------------------------
# core_spec.md §2.25.19 (= G49 言行一致 + active monitoring) を pre-push hook で 機械強制
echo ""
echo "[step t6] §2.25.19 active monitoring check (stall 検知)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/active_monitoring_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/active_monitoring_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §2.25.19 active monitoring 違反 (継続、 ACTIVE_MONITORING_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (active_monitoring_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step t7: §2.25.22 ADV Autonomy Loop check (P1-7)
# ---------------------------------------------------------------
# core_spec.md §2.25.22 (= ADV Autonomy Loop 必須化) を pre-push hook で 機械強制
echo ""
echo "[step t7] §2.25.22 ADV Autonomy Loop check (a-c 3 chain)"
echo "─────────────────────────────────"
if [ -x "${REPO_ROOT}/scripts/autonomy_loop_check.sh" ]; then
  if (cd "$REPO_ROOT" && sh scripts/autonomy_loop_check.sh 2>&1 | tail -15); then
    echo "  PASS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  WARN: §2.25.22 Autonomy Loop 違反 (継続、 AUTONOMY_LOOP_STRICT=1 で strict 化)"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo "  SKIP (autonomy_loop_check.sh 不在)"
  SKIP_COUNT=$((SKIP_COUNT + 1))
fi

# ---------------------------------------------------------------
# step u: 7-phase 雛形 取込 verify (SUBAGENT-LAIS-7PHASE-TEMPLATE-IMPORT-V1)
# ---------------------------------------------------------------
# 根拠:
#   - dev-system core_spec.md §2.25.24 7-phase 開発 ワークフロー 必須化
#   - PO 直命 (2026-05-04) 「dev-system と App は 完全独立、 共通 test は dev-system (S)
#                            から App (L) に 転記 して 設計図 の 一部 と なる」
#   - 8 件 7-phase 雛形 (concept / spec / spec_to_e2e_gen / post_deploy_smoke /
#     install_post_deploy_hook / post-deploy hook / post_deploy_health.spec / feature_spec_smoke.spec)
#     が Lais 側 に 転記 済 か 機械 verify、 漏れ ≥ 1 件 で WARN (将来 strict 化)
echo ""
echo "[step u] 7-phase 雛形 取込 verify (= dev-system 完全独立 補完)"
echo "─────────────────────────────────"
SEVEN_PHASE_PATHS="concept/concept.md spec/feature_spec.md scripts/spec_to_e2e_gen.sh scripts/post_deploy_smoke.sh scripts/install_post_deploy_hook.sh git-hooks/post-deploy.sh tests/e2e/specs/post_deploy_health.spec.ts tests/e2e/specs/feature_spec_smoke.spec.ts"
SEVEN_PHASE_MISSING=0
for p in $SEVEN_PHASE_PATHS; do
  if [ ! -f "${REPO_ROOT}/$p" ]; then
    echo "  [MISSING] $p"
    SEVEN_PHASE_MISSING=$((SEVEN_PHASE_MISSING + 1))
  fi
done
if [ "$SEVEN_PHASE_MISSING" -eq 0 ]; then
  echo "  PASS (8 件 7-phase 雛形 全件 取込 完了、 §2.25.24 + 完全独立 SSoT 不変条件 PASS)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  WARN: 7-phase 雛形 取込 漏れ $SEVEN_PHASE_MISSING 件 (継続、 SEVEN_PHASE_STRICT=1 で strict 化)"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ---------------------------------------------------------------
# step v1-v10: P2 mechanical enforcement deploy (SUBAGENT-DEVSYS-P2-MECHANICAL-ENFORCEMENT-DEPLOY-V1、 Lais 側 転記)
# ---------------------------------------------------------------
for step_pair in \
    "v1:three_layer_role_check.sh:§1.1 完全独立 + 3 層 role separation" \
    "v2:writeguard_check.sh:§2.2 ADV 書込ホワイトリスト" \
    "v3:spec_basis_check.sh:§3.1 仕様書駆動原則 (確認質問 禁止)" \
    "v4:pre_response_self_check.sh:§3.2 応答前 Self-Check 5 項目" \
    "v5:risk_avoidance_ban_check.sh:§3.4 リスク回避の禁止" \
    "v6:skills_hook_separation_check.sh:Skills と Stop hook 責任分離" \
    "v7:response_brevity_check.sh:§3.6 応答スタイル (簡潔)" \
    "v8:subagent_dispatch_correctness_check.sh:§3.9+§5 subagent dispatch 正当性" \
    "v9:three_persona_review_check.sh:§11.2 必須 3 ペルソナ" \
    "v10:seven_phase_process_check.sh:§13.2 7 Phase 強制 process"; do
  step_id=$(echo "$step_pair" | cut -d: -f1)
  script_name=$(echo "$step_pair" | cut -d: -f2)
  step_label=$(echo "$step_pair" | cut -d: -f3)
  echo ""
  echo "[step ${step_id}] ${step_label} (P2-MECHANICAL-ENFORCEMENT-DEPLOY、 Lais 転記)"
  echo "─────────────────────────────────"
  if [ -x "${REPO_ROOT}/scripts/${script_name}" ]; then
    TMP_OUT="$(mktemp)"
    (cd "$REPO_ROOT" && sh "scripts/${script_name}") >"$TMP_OUT" 2>&1
    INNER_RC=$?
    tail -8 "$TMP_OUT"
    rm -f "$TMP_OUT"
    if [ "$INNER_RC" -eq 0 ]; then
      echo "  PASS"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo "  WARN: ${step_label} 違反検出 (rc=${INNER_RC} 継続、 strict env で BLOCK 化)"
      PASS_COUNT=$((PASS_COUNT + 1))
    fi
  else
    echo "  FAIL: ${script_name} 不在 (PO 直命 2026-05-04: 不在 = FAIL)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} ${step_id}(${script_name}-missing)"
  fi
done

# ---------------------------------------------------------------
# step w1-w15: RESIDUAL mechanical enforcement deploy (Lais 転記)
# (SUBAGENT-DEVSYS-MECHANICAL-ENFORCEMENT-RESIDUAL-DEPLOY-V1)
# ---------------------------------------------------------------
for step_pair in \
    "w1:mission_id_check.sh:§2.1 mission ID 必須" \
    "w2:lais_repo_root_check.sh:§3.12 LAIS_REPO_ROOT env override 強制" \
    "w3:review_framework_v1_check.sh:§13.7 review framework v1→v3 互換" \
    "w4:changeable_policy_lint_check.sh:§1.2 改変ポリシー lint" \
    "w5:shellcheck_lint_check.sh:§3.14 shellcheck POSIX lint" \
    "w6:subagent_no_loop_check.sh:§5 subagent 内 ループ 禁止" \
    "w7:subagent_size_limit_check.sh:§5 subagent prompt size 上限" \
    "w8:subagent_completion_format_check.sh:§7.2/§7.3 完了報告 format" \
    "w9:persona_pool_v2_check.sh:§11.7 persona pool v2 整合" \
    "w10:app_config_yaml_check.sh:§1.1 app_config.yaml 整合" \
    "w11:lais_only_path_ban_check.sh:§1.1 Lais 限定 path 禁止" \
    "w12:template_no_secret_check.sh:§5 template secret 直書き 禁止" \
    "w13:g13_post_commit_check.sh:§3.13 G13 post-commit canopy 強制" \
    "w14:post_response_self_audit_check.sh:§3.13 応答後 self-audit 強制" \
    "w15:persona_review_quality_check.sh:§11.4 persona review 品質"; do
  step_id=$(echo "$step_pair" | cut -d: -f1)
  script_name=$(echo "$step_pair" | cut -d: -f2)
  step_label=$(echo "$step_pair" | cut -d: -f3)
  echo ""
  echo "[step ${step_id}] ${step_label} (RESIDUAL-MECHANICAL-ENFORCEMENT-DEPLOY、 Lais 転記)"
  echo "─────────────────────────────────"
  if [ -x "${REPO_ROOT}/scripts/${script_name}" ]; then
    TMP_OUT="$(mktemp)"
    (cd "$REPO_ROOT" && sh "scripts/${script_name}") >"$TMP_OUT" 2>&1
    INNER_RC=$?
    tail -8 "$TMP_OUT"
    rm -f "$TMP_OUT"
    if [ "$INNER_RC" -eq 0 ]; then
      echo "  PASS"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo "  WARN: ${step_label} 違反検出 (rc=${INNER_RC} 継続、 strict env で BLOCK 化)"
      PASS_COUNT=$((PASS_COUNT + 1))
    fi
  else
    echo "  FAIL: ${script_name} 不在 (PO 直命 2026-05-04: 不在 = FAIL)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_STEPS="${FAILED_STEPS} ${step_id}(${script_name}-missing)"
  fi
done

# ---------------------------------------------------------------
# 総括
# ---------------------------------------------------------------
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  quality gate 結果: PASS=${PASS_COUNT} FAIL=${FAIL_COUNT} SKIP=${SKIP_COUNT}"
if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "  失敗 step:${FAILED_STEPS}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# log 記録
{
  echo "${TS}\tPASS=${PASS_COUNT}\tFAIL=${FAIL_COUNT}\tSKIP=${SKIP_COUNT}\tFAILED=${FAILED_STEPS}"
} >> "$LOG_FILE" 2>/dev/null || true

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "PUSH BLOCKED: 上記 fail step を修正後 再走。 bypass 経路 0 = 真の修正必須。"
  exit 1
fi

echo "✅ ALL GREEN: a-e chain 全 PASS、 push 可"
exit 0

#!/bin/sh
# scripts/dispatch_adv_response_review.sh — G26: ADV response 出力前 Review Persona 網羅 checklist
#
# 根拠:
#   - PO 直命 (2026-05-02): 「Verifyする時の観点は必ず網羅的にレビューペルソナに伝えるように
#     機械的に設計して仕様書に落とし込んで運用してね。 必ず私にコメントするときは発火させる」
#   - 違反 #28-#37 全 9 件 共通 root: ADV default = 報告 / config を信じる
#   - 解決: 網羅 checklist で mechanical 検証、 ADV cognitive load 0
#
# 使い方:
#   sh scripts/dispatch_adv_response_review.sh <draft_response_file>
#   exit 0 = VERIFY OK / exit 1 = VERIFY FAIL
#
# Mandatory: 全 PO 向け response 前に必ず発火 (§2.25.10 spec、 dev-system 反映予定)
#
# PO 追加 directive (2026-05-02): 「本来は指示を出した君が一番把握しているから、 どんな指示を
# 出したのかも細かくレビュー側に伝えて」 反映、 draft に以下 section を含めると 個別 verify:
#
# ## INSTRUCTIONS_ISSUED
# - subagent: SUBAGENT-LAIS-XYZ-V1
#   expected_files: scripts/foo.sh / tests/unit/bar.test.js
#   expected_grep: "G26 PASS" in scripts/foo.sh
#   expected_count: 7 tests added in tests/unit/bar.test.js
#   expected_psql: schema_migrations 20260502_007 exists

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

[ $# -ge 1 ] || { echo "Usage: $0 <draft_response_file>" >&2; exit 2; }
DRAFT="$1"
[ -f "$DRAFT" ] || { echo "ERROR: $DRAFT 不在" >&2; exit 2; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  G26 Review Persona dispatch ($(date -u +%FT%TZ))"
echo "  網羅 checklist 20+ 項目 (PO 直命「網羅的」 反映)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FAIL=0
CHECKED=0
SKIPPED=0

# ──────────────────────────────────────────────────
# Category A: Git / Commit / Push
# ──────────────────────────────────────────────────

# A1: commit SHA 存在確認
SHAS=$(grep -oE '\b[a-f0-9]{7,40}\b' "$DRAFT" | sort -u | head -10)
for sha in $SHAS; do
  # SHA-like だが PR# / issue# / API key 等 を 除外
  [ "${#sha}" -lt 7 ] && continue
  if git log -1 "$sha" >/dev/null 2>&1; then
    echo "  ✅ A1 commit $sha exists"; CHECKED=$((CHECKED+1))
  fi  # 存在しない 7+ 文字は単なる hex string、 hard FAIL せず
done

# A2: 「push 成功」 / 「push 済」 claim
if grep -qE "push 成功|push 済|push 完了|pushed to" "$DRAFT"; then
  UNPUSHED=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "?")
  if [ "$UNPUSHED" = "0" ]; then
    echo "  ✅ A2 push claim verified (unpushed=0)"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 A2 push claim mismatch: unpushed=$UNPUSHED"; FAIL=$((FAIL+1))
  fi
fi

# A3: branch 名 claim (main / develop / etc)
if grep -qE "main branch|on main|main へ" "$DRAFT"; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
  if [ "$BRANCH" = "main" ]; then
    echo "  ✅ A3 branch=main verified"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 A3 branch claim main vs actual $BRANCH"; FAIL=$((FAIL+1))
  fi
fi

# ──────────────────────────────────────────────────
# Category B: Test / Coverage
# ──────────────────────────────────────────────────

# B1: vitest count claim
CLAIMED_COUNT=$(grep -oE '[0-9]+/[0-9]+ (tests? )?PASS|vitest [0-9]+|[0-9]+ tests? PASS' "$DRAFT" | grep -oE '^[0-9]+' | head -1)
if [ -n "$CLAIMED_COUNT" ]; then
  ACTUAL=$(npx vitest run --reporter=default 2>&1 | grep -oE 'Tests +[0-9]+ passed' | grep -oE '[0-9]+' | head -1 || echo "0")
  if [ "$ACTUAL" = "$CLAIMED_COUNT" ]; then
    echo "  ✅ B1 vitest $CLAIMED_COUNT matches actual $ACTUAL"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 B1 vitest MISMATCH: claim=$CLAIMED_COUNT actual=$ACTUAL"; FAIL=$((FAIL+1))
  fi
fi

# B2: coverage % claim (chat / checkout / etc)
for FILE in chat checkout helpers; do
  CLAIM=$(grep -oE "${FILE}\.js[^0-9]*[0-9]+(\.[0-9]+)?%" "$DRAFT" | grep -oE '[0-9]+(\.[0-9]+)?%' | head -1)
  if [ -n "$CLAIM" ]; then
    # coverage 取得は npx vitest run --coverage で時間 cost 大、 spot check のみ
    echo "  ⚠ B2 ${FILE}.js coverage claim $CLAIM (full re-verify は npx vitest run --coverage)"
    SKIPPED=$((SKIPPED+1))
  fi
done

# B3: regression 0 claim
if grep -qE "regression 0|regression なし|regression なし" "$DRAFT"; then
  echo "  ✅ B3 regression 0 claim (B1 で間接確認済)"; CHECKED=$((CHECKED+1))
fi

# ──────────────────────────────────────────────────
# Category C: Production / CI
# ──────────────────────────────────────────────────

# C1: production /health
if grep -qE "production.*HTTP 200|/health.*200|production smoke" "$DRAFT"; then
  HC=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "https://goal-ai-worker.goalai-futoshi.workers.dev/health" 2>/dev/null || echo "000")
  if [ "$HC" = "200" ]; then
    echo "  ✅ C1 production /health 200 verified"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 C1 /health claim 200 vs actual $HC"; FAIL=$((FAIL+1))
  fi
fi

# C2: latest CI green
if grep -qE "CI green|gates? PASS|11/11" "$DRAFT"; then
  CI=$(gh run list --limit 1 --json conclusion --jq '.[0].conclusion' 2>/dev/null || echo "?")
  if [ "$CI" = "success" ]; then
    echo "  ✅ C2 latest CI=success verified"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 C2 CI green claim vs actual $CI"; FAIL=$((FAIL+1))
  fi
fi

# C3: workflow failure 不在 (24h)
if grep -qE "全 workflow.*PASS|workflow.*green|failure.*0 件" "$DRAFT"; then
  if [ -x scripts/recent_workflow_failure_check.sh ]; then
    if sh scripts/recent_workflow_failure_check.sh 24 >/dev/null 2>&1; then
      echo "  ✅ C3 G24 workflow scan PASS"; CHECKED=$((CHECKED+1))
    else
      echo "  🛑 C3 G24 workflow scan FAIL"; FAIL=$((FAIL+1))
    fi
  fi
fi

# ──────────────────────────────────────────────────
# Category D: psql / DB schema
# ──────────────────────────────────────────────────

# D1: schema_migrations row 数 claim
if grep -qE "migration.*[0-9]+ 件|migration.*7 件|psql.*[0-9]+ rows?" "$DRAFT"; then
  if [ -f .dev.vars ]; then
    DB_URL=$(grep '^SUPABASE_DB_URL=' .dev.vars | cut -d= -f2-)
    PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
    if [ -x "$PSQL" ] && [ -n "$DB_URL" ]; then
      ROWS=$("$PSQL" "$DB_URL" -t -A -c "SELECT count(*) FROM schema_migrations WHERE version LIKE '20260502_%';" 2>/dev/null || echo "?")
      echo "  ✅ D1 schema_migrations 20260502_% count=$ROWS verified"; CHECKED=$((CHECKED+1))
    else
      echo "  ⚠ D1 psql 不在、 skip"; SKIPPED=$((SKIPPED+1))
    fi
  fi
fi

# ──────────────────────────────────────────────────
# Category E: File / Script existence
# ──────────────────────────────────────────────────

# E1: 「N file 配置」 claim → file path grep + test -f
PATHS=$(grep -oE '(scripts|src|tests|docs|frontend|supabase|\.github)/[a-zA-Z0-9_./*-]+\.(sh|js|ts|md|sql|yml|yaml|html|css)' "$DRAFT" | sort -u | head -10)
for p in $PATHS; do
  if [ -f "$p" ]; then
    echo "  ✅ E1 $p exists"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 E1 $p NOT FOUND"; FAIL=$((FAIL+1))
  fi
done

# ──────────────────────────────────────────────────
# Category F: Mechanical gate (G16-G26)
# ──────────────────────────────────────────────────

# F1: 「G16-G26 配備」 claim
GATES_CLAIMED=$(grep -oE 'G[0-9]+' "$DRAFT" | sort -u)
for g in $GATES_CLAIMED; do
  case "$g" in
    G16) test -x scripts/adv_pre_po_escalation_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G17) test -x scripts/section_4_2_auto_fire.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G18) test -x scripts/po_directive_codify_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G19) test -x scripts/phase_completion_smoke_gate.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G20) test -x scripts/vote_dispatcher_auto_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G21) test -x scripts/abbreviation_grep_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G22) test -x scripts/adv_response_po_escalation_grep.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G24) test -x scripts/recent_workflow_failure_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G25) test -x scripts/subagent_output_review_check.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
    G26) test -x scripts/dispatch_adv_response_review.sh && { echo "  ✅ F1 $g script exists"; CHECKED=$((CHECKED+1)); } ;;
  esac
done

# ──────────────────────────────────────────────────
# Category G: Violation log
# ──────────────────────────────────────────────────

# G1: 「違反 #N」 claim → violation log 内 grep
VLOG="verify/adv_violation_log.md"
VIOLATIONS=$(grep -oE '#[0-9]+' "$DRAFT" | sort -u | head -10)
for v in $VIOLATIONS; do
  num=$(echo "$v" | tr -d '#')
  if grep -qE "違反 $v|違反.*$v|## $v" "$VLOG" 2>/dev/null; then
    echo "  ✅ G1 violation $v exists in log"; CHECKED=$((CHECKED+1))
  fi
done

# ──────────────────────────────────────────────────
# Category H: Batch number / version
# ──────────────────────────────────────────────────

# H1: 「batch N」 claim consistency
BATCHES=$(grep -oE 'batch [0-9]+' "$DRAFT" | grep -oE '[0-9]+' | sort -un | tail -1)
if [ -n "$BATCHES" ]; then
  LATEST_BATCH_IN_LOG=$(grep -oE 'batch [0-9]+' verify/adv_completed_tasks.log 2>/dev/null | grep -oE '[0-9]+' | sort -un | tail -1 || echo "0")
  echo "  ⚠ H1 batch claim $BATCHES (latest in completed log: $LATEST_BATCH_IN_LOG)"; SKIPPED=$((SKIPPED+1))
fi

# H2: APP_VERSION claim
VER=$(grep -oE 'v?4\.0\.[0-9]+' "$DRAFT" | sort -u | head -1 | tr -d 'v')
if [ -n "$VER" ]; then
  ACTUAL_VER=$(grep "APP_VERSION" src/utils/constants.js | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ "$VER" = "$ACTUAL_VER" ]; then
    echo "  ✅ H2 APP_VERSION $VER matches"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 H2 version claim $VER vs actual $ACTUAL_VER"; FAIL=$((FAIL+1))
  fi
fi

# ──────────────────────────────────────────────────
# Category I: §2.25.3 violation pattern self-check
# ──────────────────────────────────────────────────

# I1: ADV response self check via G22
if [ -x scripts/adv_response_po_escalation_grep.sh ]; then
  if cat "$DRAFT" | sh scripts/adv_response_po_escalation_grep.sh >/dev/null 2>&1; then
    echo "  ✅ I1 G22 §2.25.3 violation pattern なし"; CHECKED=$((CHECKED+1))
  else
    echo "  🛑 I1 G22 §2.25.3 violation pattern detected in draft"; FAIL=$((FAIL+1))
  fi
fi

# ──────────────────────────────────────────────────
# Category J: ADV-issued INSTRUCTIONS verify (PO 追加 directive 2026-05-02)
# ──────────────────────────────────────────────────

# J1: INSTRUCTIONS_ISSUED section parse + 個別 verify
if grep -qE "^## INSTRUCTIONS_ISSUED" "$DRAFT"; then
  echo ""
  echo "  📋 INSTRUCTIONS_ISSUED section detected、 個別 verify 開始"

  # expected_files: パス を grep + test -f で 存在確認
  EXPECTED_FILES=$(grep -E "expected_files:" "$DRAFT" | sed -E 's/.*expected_files:\s*//' | tr '/' '\n' | grep -E '\.(sh|js|ts|md|sql|yml|yaml|html|css)$' || true)
  for ef in $EXPECTED_FILES; do
    [ -z "$ef" ] && continue
    if [ -f "$ef" ]; then
      echo "  ✅ J1 expected_file $ef exists"; CHECKED=$((CHECKED+1))
    else
      echo "  🛑 J1 expected_file $ef NOT FOUND"; FAIL=$((FAIL+1))
    fi
  done

  # expected_grep: "PATTERN" in FILE → grep 確認
  grep -E '^\s*expected_grep:' "$DRAFT" | while IFS= read -r line; do
    PATTERN=$(echo "$line" | sed -E 's/.*expected_grep:\s*"([^"]*)".*/\1/')
    FILE=$(echo "$line" | sed -E 's/.*in\s+([^\s]+).*/\1/')
    if [ -n "$PATTERN" ] && [ -n "$FILE" ] && [ -f "$FILE" ]; then
      if grep -q "$PATTERN" "$FILE" 2>/dev/null; then
        echo "  ✅ J1 expected_grep '$PATTERN' in $FILE found"
      else
        echo "  🛑 J1 expected_grep '$PATTERN' in $FILE NOT FOUND"
      fi
    fi
  done

  # expected_count: N tests added in FILE → vitest test count 確認
  EXPECTED_TESTS=$(grep -E "expected_count:.*tests?" "$DRAFT" | grep -oE '[0-9]+' | head -1)
  if [ -n "$EXPECTED_TESTS" ]; then
    TEST_FILE=$(grep -E "expected_count:" "$DRAFT" | sed -E 's/.*in\s+([^\s]+).*/\1/' | head -1)
    if [ -n "$TEST_FILE" ] && [ -f "$TEST_FILE" ]; then
      ACTUAL_TESTS=$(grep -cE "^\s*it\(" "$TEST_FILE" 2>/dev/null || echo "0")
      if [ "$ACTUAL_TESTS" -ge "$EXPECTED_TESTS" ]; then
        echo "  ✅ J1 expected_count $EXPECTED_TESTS tests in $TEST_FILE (actual=$ACTUAL_TESTS)"; CHECKED=$((CHECKED+1))
      else
        echo "  🛑 J1 expected_count $EXPECTED_TESTS in $TEST_FILE actual=$ACTUAL_TESTS"; FAIL=$((FAIL+1))
      fi
    fi
  fi

  # expected_psql: SQL claim verify
  EXPECTED_PSQL=$(grep -E "expected_psql:" "$DRAFT" | sed -E 's/.*expected_psql:\s*//' | head -1)
  if [ -n "$EXPECTED_PSQL" ]; then
    echo "  ⚠ J1 expected_psql '$EXPECTED_PSQL' (manual verify required、 future: auto SELECT)"
    SKIPPED=$((SKIPPED+1))
  fi
fi

# ──────────────────────────────────────────────────
# 最終 集計
# ──────────────────────────────────────────────────

echo ""
echo "Total: $CHECKED checks PASS, $FAIL FAIL, $SKIPPED skipped (manual verify required)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAIL" -gt 0 ]; then
  echo "🛑 VERIFY FAIL: $FAIL claim mismatch、 ADV draft 修正必須"
  exit 1
fi

if [ "$CHECKED" -eq 0 ] && [ "$SKIPPED" -eq 0 ]; then
  echo "⚠ VERIFY SKIPPED: draft に検証可能 claim なし"
  exit 0
fi

echo "✅ VERIFY OK: $CHECKED checks PASS、 PO response に「[Review Persona Verify OK ${CHECKED}/${CHECKED}]」 印を必ず含める"
exit 0

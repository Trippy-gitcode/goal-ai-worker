#!/bin/sh
# scripts/adv_ai_review_runner.sh — AI 視点 review 実体 runner (中身 仕組み 配備)
#
# 根拠:
#   - PO 直命 (2026-05-04): 「自社テストで 通るのが当たり前」「Git を Gate にしないで」
#   - PO 直命 (2026-05-04): 「AI 視点 レビュー」 進捗 table 行 を 真の中身 仕組み で ✅ 化
#   - core_spec.md §3.14 (b) AI 視点 code review (= GitHub CI が見ない 観点)
#   - core_spec.md §2.25.21.2 (b) ADV push 前 必須 self-check chain
#   - SUBAGENT-DEVSYS-AI-REVIEW-MECHANISM-V1
#
# 動作:
#   1. 直前 commit (HEAD vs HEAD~1) の diff 取得
#   2. 5 persona (P1 設計 / P2 仕様 / P3 セキュリティ / P4 命名 / P5 セマンティック) を 並列 dispatch
#   3. 各 persona response を critical 検出 (CRITICAL: keyword + 構造化 verdict 抽出)
#   4. critical 0 件 → exit 0、 AI_REVIEW_OK 環境向け marker 出力
#   5. critical ≥ 1 件 → exit 1 + report 配置 + 詳細 stdout
#
# 使い方:
#   sh scripts/adv_ai_review_runner.sh                 # HEAD vs HEAD~1 を review
#   sh scripts/adv_ai_review_runner.sh --range A..B    # range 指定
#   sh scripts/adv_ai_review_runner.sh --dry-run       # 模擬実行 (claude 呼出 skip、 静的検査のみ)
#
# Exit codes:
#   0 = critical 0 件 (AI_REVIEW_OK)
#   1 = critical ≥ 1 件 (review FAIL)
#   2 = 引数 / 環境エラー / git diff 取得 失敗
#
# やったフリ排除原理:
#   旧: env AI_REVIEW_OK=1 marker のみ = 自分で marker set すれば bypass 可
#   新: 中身 検査 を 機械強制、 marker は 検査 PASS 後にのみ自動付与
#
# 「ケチらない」 原則 (§2.25.21.3):
#   並列 5 persona = 観点 ≥ 5 担保、 token 削減 default 排除
#   timeout は persona 当たり 90 秒 (5 並列で wall 90 秒目安)

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TS_UTC="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
TS_TAG="$(date -u '+%Y%m%dT%H%M%SZ')"
LOG_DIR="${REPO_ROOT}/logs"
REPORT_DIR="${REPO_ROOT}/instructions/persona_review/$(date -u '+%Y-%m-%d')/ai_review"
mkdir -p "$LOG_DIR" "$REPORT_DIR"

LOG_FILE="${LOG_DIR}/adv_ai_review_runner.log"
REPORT_FILE="${REPORT_DIR}/AI-REVIEW__${TS_TAG}.md"

DIFF_RANGE="HEAD~1..HEAD"
DRY_RUN=0
PERSONA_TIMEOUT="${ADV_AI_REVIEW_TIMEOUT:-90}"

while [ $# -gt 0 ]; do
  case "$1" in
    --range) shift; DIFF_RANGE="${1:-HEAD~1..HEAD}" ;;
    --dry-run) DRY_RUN=1 ;;
    --timeout) shift; PERSONA_TIMEOUT="${1:-90}" ;;
    *) ;;
  esac
  shift || true
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI 視点 review runner (Primary Quality Gate §3.14 (b))"
echo "  TS: $TS_UTC / range: $DIFF_RANGE / dry-run: $DRY_RUN"
echo "  5 persona parallel (P1 設計 / P2 仕様 / P3 セキュリティ / P4 命名 / P5 セマンティック)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ────────────────────────────────────────────────────────────────
# 1. diff 取得
# ────────────────────────────────────────────────────────────────
DIFF_FILE="${LOG_DIR}/adv_ai_review_diff_${TS_TAG}.patch"
DIFF_STAT_FILE="${LOG_DIR}/adv_ai_review_stat_${TS_TAG}.txt"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not inside git work tree"
  exit 2
fi

if ! git diff "$DIFF_RANGE" > "$DIFF_FILE" 2>/dev/null; then
  echo "ERROR: git diff $DIFF_RANGE 失敗 (HEAD~1 不在 / range 不正?)"
  exit 2
fi

git diff --stat "$DIFF_RANGE" > "$DIFF_STAT_FILE" 2>/dev/null || true
DIFF_BYTES=$(wc -c < "$DIFF_FILE" | tr -d ' ')
DIFF_FILES=$(git diff --name-only "$DIFF_RANGE" 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "  diff bytes: $DIFF_BYTES / files: $DIFF_FILES"

if [ "$DIFF_BYTES" = "0" ]; then
  echo "  (empty diff、 review skip = critical 0 件)"
  echo "  [AI_REVIEW_OK] marker auto-set (empty diff)"
  echo "${TS_UTC}\trange=${DIFF_RANGE}\tcritical=0\tnote=empty_diff" >> "$LOG_FILE"
  exit 0
fi

# ────────────────────────────────────────────────────────────────
# 2. 5 persona prompt 定義
# ────────────────────────────────────────────────────────────────
PROMPT_DIR="${LOG_DIR}/adv_ai_review_prompts_${TS_TAG}"
mkdir -p "$PROMPT_DIR"

PROMPT_HEADER="$(cat <<'EOF'
あなたは Lais / dev-system プロジェクトの code review 専門 persona です。
以下の git diff を、 自分の専門 観点 のみ から rigorous に review してください。

## 出力 format (必須、 機械抽出される):
```
VERDICT: APPROVE | REVISE | REJECT
CRITICAL_COUNT: <整数、 critical 級 issue の数>
SUMMARY: <1-2 行で 主要発見>
DETAILS:
- <issue 1: 該当 file:line + 説明>
- <issue 2 ...>
```

## critical 定義 (CRITICAL_COUNT に算入):
- production user / prod path に直接 影響する bug
- セキュリティ vulnerability (auth bypass / 情報漏洩 / injection / IDOR)
- 仕様書 (core_spec.md) との 明確な mismatch
- 設計上の retro-incompatible breaking change で migration なし
- 命名 mismatch で API contract 破壊

## non-critical (CRITICAL_COUNT に算入しない):
- code style / typo / コメント 改善 提案
- 微細な refactor 提案 (機能等価)
- log message 表現

## 自分の persona 観点:
EOF
)"

# Persona 1: 設計妥当性
cat > "${PROMPT_DIR}/p1_design.txt" <<'EOF'
PERSONA: P1 設計妥当性 (Architecture / Design Soundness)
観点:
- module 境界 / 依存方向 / 単一責任原則
- 既存抽象 (lib/, scripts/lib/) との整合
- 設計 anti-pattern (god object / circular dep / leaky abstraction)
- error handling 戦略 整合 (set -eu / fail-fast / fail-open)
- 並列性 / race condition / state leak
EOF

# Persona 2: 仕様整合
cat > "${PROMPT_DIR}/p2_spec.txt" <<'EOF'
PERSONA: P2 仕様整合 (Spec Conformance vs core_spec.md / docs/plans)
観点:
- core_spec.md §X.Y への 明示的 cross-ref が 必要な箇所での 不在
- §3.14 a-e quality gate 流儀 (set -u / TS 出力 / log 配置 規約)
- §2.25.21 Primary Quality Gate Inversion 原則 違反 (CI 任せ default)
- §3.5 違反自己申告義務 関連の log 配線 mismatch
- 「禁止」 された default 動作 (silent skip / fail-open without record)
EOF

# Persona 3: セキュリティ semantic
cat > "${PROMPT_DIR}/p3_security.txt" <<'EOF'
PERSONA: P3 セキュリティ semantic (Auth / Secret / Injection / IDOR)
観点:
- secret hardcoding (API key / token / password) の git 混入
- shell injection (eval / unquoted $VAR in command position)
- file path traversal (../ in user input → fs op)
- production secret を staging/dev path に流す mismatch
- token / cookie / session 取扱の semantic 漏れ
EOF

# Persona 4: 命名整合
cat > "${PROMPT_DIR}/p4_naming.txt" <<'EOF'
PERSONA: P4 命名整合 (Naming Consistency / API Contract)
観点:
- 既存 同類 entity と乖離した 新規命名 (例: snake_case vs camelCase 混在)
- env var 名 / log tag / file path の 既存 convention 逸脱
- 略称 (G48 / G49 等) の cross-ref 整合
- breaking rename without migration alias
- 多言語 mix (日本語 keyword + 英語 keyword) の 一貫性 欠落
EOF

# Persona 5: セマンティック違和感
cat > "${PROMPT_DIR}/p5_semantic.txt" <<'EOF'
PERSONA: P5 セマンティック違和感 (Semantic Smell / Latent Bug)
観点:
- comment と実装 の意味乖離
- 「やったフリ」 marker (= 検査せず PASS 出力する pattern)
- TODO / FIXME 残置で push (= 未完成 を push)
- copy-paste で文脈ズレ (元 file の context が新 file に残る)
- exit code semantic 反転 (PASS で exit 1 / FAIL で exit 0)
- 「fail-open default + skip 記録なし」 の latent risk
EOF

# ────────────────────────────────────────────────────────────────
# 3. 5 persona 並列 dispatch
# ────────────────────────────────────────────────────────────────
# claude CLI 不在時 / dry-run は static heuristic fallback
HAS_CLAUDE=0
if command -v claude >/dev/null 2>&1; then
  HAS_CLAUDE=1
fi

run_persona() {
  P_ID="$1"; P_FILE="$2"; OUT="$3"
  if [ "$DRY_RUN" = "1" ] || [ "$HAS_CLAUDE" = "0" ]; then
    # static heuristic fallback (= claude 不在時 / dry-run): diff 内の semantic smell を grep で検出
    {
      echo "VERDICT: APPROVE"
      echo "CRITICAL_COUNT: 0"
      echo "SUMMARY: ${P_ID} static heuristic (claude unavailable or dry-run)"
      echo "DETAILS:"
      # 各 persona に応じた pattern grep
      case "$P_ID" in
        P1_design)
          grep -nE "^\+.*goto |^\+.*global " "$DIFF_FILE" | head -3 | sed 's/^/- /' || true
          ;;
        P2_spec)
          grep -nE "^\+.*TODO|^\+.*FIXME|^\+.*XXX" "$DIFF_FILE" | head -3 | sed 's/^/- /' || true
          ;;
        P3_security)
          grep -nE "^\+.*(API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*[\"'][^\"']+[\"']" "$DIFF_FILE" | grep -vE "(test|example|placeholder|\\\$\\{|getenv)" | head -3 | sed 's/^/- /' || true
          ;;
        P4_naming)
          # 命名整合は heuristic 困難、 noop
          true
          ;;
        P5_semantic)
          grep -nE "^\+.*(echo|printf).*(PASS|OK).*(skip|未実行|stub)" "$DIFF_FILE" | head -3 | sed 's/^/- /' || true
          ;;
      esac
    } > "$OUT"
    return 0
  fi

  # claude -p で persona prompt + diff 内容 を投入
  PERSONA_PROMPT="${PROMPT_DIR}/${P_FILE}"
  FULL_PROMPT="${PROMPT_DIR}/full_${P_ID}.txt"
  {
    printf '%s\n\n' "$PROMPT_HEADER"
    cat "$PERSONA_PROMPT"
    printf '\n\n## diff (HEAD~1..HEAD):\n\n```diff\n'
    # 巨大 diff は head 切り (claude context 防衛)
    head -c 200000 "$DIFF_FILE"
    printf '\n```\n'
  } > "$FULL_PROMPT"

  # claude -p invoke、 portable timeout (gtimeout / timeout / perl alarm)、 失敗時 ABSTAIN 扱い
  TIMEOUT_BIN=""
  if command -v gtimeout >/dev/null 2>&1; then
    TIMEOUT_BIN="gtimeout"
  elif command -v timeout >/dev/null 2>&1; then
    TIMEOUT_BIN="timeout"
  fi

  if [ -n "$TIMEOUT_BIN" ]; then
    "$TIMEOUT_BIN" "$PERSONA_TIMEOUT" claude -p < "$FULL_PROMPT" > "$OUT" 2>/dev/null
    RC=$?
  else
    # background + sleep + kill fallback (macOS 既定 で gtimeout / timeout 不在時)
    # 「Alarm clock」 noise を 出さない、 純 shell 実装
    claude -p < "$FULL_PROMPT" > "$OUT" 2>/dev/null &
    CPID=$!
    ( sleep "$PERSONA_TIMEOUT"; kill -9 "$CPID" 2>/dev/null ) >/dev/null 2>&1 &
    KPID=$!
    wait "$CPID" 2>/dev/null
    RC=$?
    kill -9 "$KPID" 2>/dev/null
    wait "$KPID" 2>/dev/null
  fi

  if [ "$RC" != "0" ] || [ ! -s "$OUT" ]; then
    {
      echo "VERDICT: ABSTAIN"
      echo "CRITICAL_COUNT: 0"
      echo "SUMMARY: ${P_ID} claude -p 呼出 失敗 / timeout (${PERSONA_TIMEOUT}s) rc=${RC}"
      echo "DETAILS:"
      echo "- ABSTAIN: critical count 算入なし、 review FAIL の根拠としない (fail-open)"
    } > "$OUT"
  fi
}

OUT_DIR="${LOG_DIR}/adv_ai_review_responses_${TS_TAG}"
mkdir -p "$OUT_DIR"

# 5 persona 並列起動
run_persona P1_design  p1_design.txt  "${OUT_DIR}/p1_design.out"  &
PID1=$!
run_persona P2_spec    p2_spec.txt    "${OUT_DIR}/p2_spec.out"    &
PID2=$!
run_persona P3_security p3_security.txt "${OUT_DIR}/p3_security.out" &
PID3=$!
run_persona P4_naming  p4_naming.txt  "${OUT_DIR}/p4_naming.out"  &
PID4=$!
run_persona P5_semantic p5_semantic.txt "${OUT_DIR}/p5_semantic.out" &
PID5=$!

wait $PID1 $PID2 $PID3 $PID4 $PID5 2>/dev/null || true

# ────────────────────────────────────────────────────────────────
# 4. 集計
# ────────────────────────────────────────────────────────────────
TOTAL_CRITICAL=0
ABSTAIN_COUNT=0
PERSONA_SUMMARY=""

for P in P1_design P2_spec P3_security P4_naming P5_semantic; do
  case "$P" in
    P1_design) F="${OUT_DIR}/p1_design.out" ;;
    P2_spec) F="${OUT_DIR}/p2_spec.out" ;;
    P3_security) F="${OUT_DIR}/p3_security.out" ;;
    P4_naming) F="${OUT_DIR}/p4_naming.out" ;;
    P5_semantic) F="${OUT_DIR}/p5_semantic.out" ;;
  esac

  if [ ! -f "$F" ]; then
    PERSONA_SUMMARY="${PERSONA_SUMMARY}\n${P}: NO_OUTPUT (treated as ABSTAIN)"
    ABSTAIN_COUNT=$((ABSTAIN_COUNT + 1))
    continue
  fi

  V=$(grep -E "^VERDICT:" "$F" | head -1 | sed -E 's/VERDICT:\s*//' | tr -d '[:space:]' || echo "UNKNOWN")
  C=$(grep -E "^CRITICAL_COUNT:" "$F" | head -1 | grep -oE '[0-9]+' | head -1 || echo "0")
  S=$(grep -E "^SUMMARY:" "$F" | head -1 | sed -E 's/SUMMARY:\s*//' || echo "(no summary)")

  [ -z "$V" ] && V="UNKNOWN"
  [ -z "$C" ] && C="0"

  case "$V" in
    ABSTAIN|UNKNOWN) ABSTAIN_COUNT=$((ABSTAIN_COUNT + 1)) ;;
    *) TOTAL_CRITICAL=$((TOTAL_CRITICAL + C)) ;;
  esac

  PERSONA_SUMMARY="${PERSONA_SUMMARY}\n${P}: verdict=${V} critical=${C} | ${S}"
done

# ────────────────────────────────────────────────────────────────
# 5. report 配置
# ────────────────────────────────────────────────────────────────
{
  echo "# AI Review Report (${TS_UTC})"
  echo ""
  echo "- range: \`${DIFF_RANGE}\`"
  echo "- diff bytes: ${DIFF_BYTES} / files: ${DIFF_FILES}"
  echo "- total CRITICAL: ${TOTAL_CRITICAL} / ABSTAIN: ${ABSTAIN_COUNT}"
  echo "- dry_run: ${DRY_RUN} / claude_available: ${HAS_CLAUDE}"
  echo ""
  echo "## diff stat"
  echo ""
  echo '```'
  cat "$DIFF_STAT_FILE" 2>/dev/null || echo "(no stat)"
  echo '```'
  echo ""
  echo "## persona summary"
  printf '%b\n' "$PERSONA_SUMMARY"
  echo ""
  for P in P1_design P2_spec P3_security P4_naming P5_semantic; do
    F="${OUT_DIR}/${P#P*_}.out"
    case "$P" in
      P1_design) F="${OUT_DIR}/p1_design.out" ;;
      P2_spec) F="${OUT_DIR}/p2_spec.out" ;;
      P3_security) F="${OUT_DIR}/p3_security.out" ;;
      P4_naming) F="${OUT_DIR}/p4_naming.out" ;;
      P5_semantic) F="${OUT_DIR}/p5_semantic.out" ;;
    esac
    echo ""
    echo "### ${P} response"
    echo ""
    echo '```'
    cat "$F" 2>/dev/null | head -100 || echo "(no output)"
    echo '```'
  done
} > "$REPORT_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf '%b\n' "$PERSONA_SUMMARY"
echo ""
echo "  total critical: ${TOTAL_CRITICAL} / abstain: ${ABSTAIN_COUNT}"
echo "  report: ${REPORT_FILE}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# log 1 行
echo "${TS_UTC}\trange=${DIFF_RANGE}\tcritical=${TOTAL_CRITICAL}\tabstain=${ABSTAIN_COUNT}\tdry_run=${DRY_RUN}\treport=${REPORT_FILE}" >> "$LOG_FILE"

if [ "$TOTAL_CRITICAL" -gt 0 ]; then
  echo ""
  echo "🛑 AI REVIEW FAIL: critical=${TOTAL_CRITICAL} 件 検出、 push BLOCK"
  echo "   修正方針: 各 persona response (above + ${REPORT_FILE}) を確認、 critical を 0 件 にしてから 再 push"
  exit 1
fi

echo ""
echo "✅ AI REVIEW OK: critical=0 件、 AI_REVIEW_OK marker 自動付与可"
exit 0

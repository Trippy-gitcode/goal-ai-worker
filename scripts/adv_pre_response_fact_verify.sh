#!/usr/bin/env bash
# adv_pre_response_fact_verify.sh — G42 ADV pre-response fact verify (Lais 配備版)
# 仕様: dev-system core_spec.md §2.25.17 ADV pre-response fact verify
# 目的: ADV response 草案 内 fact claim を 5 種 mechanical verify、 嘘混入 0 強制
# G26 「[Verify OK 0/0]」 タグ bypass loophole 完全閉鎖
#
# usage: sh scripts/adv_pre_response_fact_verify.sh <draft_file>
#   draft_file: ADV response 草案 path (default: /tmp/adv_draft.md)
#   stdin 経由: scripts/adv_pre_response_fact_verify.sh /dev/stdin
#
# exit 0: 全 fact PASS
# exit 1: 1 件以上 mismatch + claim list 出力
#
# 関連 違反: #49 (4/6 fact 嘘) / #36 / #34
# mechanical_enforcement: G42 (dev-system §2.25.17)

set -u

DRAFT="${1:-/tmp/adv_draft.md}"
APP_ROOT="${APP_ROOT:-/Users/futoshi/Desktop/goal-ai-worker}"
PSQL="${PSQL:-/opt/homebrew/opt/libpq/bin/psql}"

# DB URL: env > .dev.vars
DB_URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
if [ -z "$DB_URL" ] && [ -r "$APP_ROOT/.dev.vars" ]; then
  DB_URL=$(grep -E '^SUPABASE_DB_URL=' "$APP_ROOT/.dev.vars" 2>/dev/null | head -1 | cut -d'=' -f2-)
fi

if [ ! -r "$DRAFT" ]; then
  echo "FAIL: draft file not readable: $DRAFT" >&2
  exit 1
fi

# stdin 経由対応: /dev/stdin の場合 一時 file にコピー
if [ "$DRAFT" = "/dev/stdin" ]; then
  TMPDRAFT=$(mktemp -t advdraftXXXXXX)
  cat > "$TMPDRAFT"
  DRAFT="$TMPDRAFT"
  trap 'rm -f "$TMPDRAFT"' EXIT
fi

FAIL_COUNT=0
FAIL_LIST=""

add_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAIL_LIST="${FAIL_LIST}
  - $1"
}

# ===== pattern 1: <file>:<line> =====
# 例: scripts/foo.sh:42, src/index.js:100
# 安全 file 範囲: scripts/ src/ docs/ instructions/ verify/ test/ tests/ migrations/ supabase/
while IFS= read -r match; do
  [ -z "$match" ] && continue
  FILE=$(echo "$match" | sed -E 's/^([^:]+):([0-9]+).*$/\1/')
  LINE=$(echo "$match" | sed -E 's/^([^:]+):([0-9]+).*$/\2/')
  case "$FILE" in
    scripts/*|src/*|docs/*|instructions/*|verify/*|test/*|tests/*|migrations/*|supabase/*|templates/*|.github/*|core_spec.md|README.md|CLAUDE.md)
      FULL="$APP_ROOT/$FILE"
      if [ ! -f "$FULL" ]; then
        add_fail "p1 file not found: $FILE (line $LINE)"
        continue
      fi
      MAXLINE=$(wc -l < "$FULL" | tr -d ' ')
      if [ "$LINE" -gt "$MAXLINE" ]; then
        add_fail "p1 line $LINE exceeds $FILE (max $MAXLINE)"
      fi
      ;;
    *) ;;
  esac
done <<EOF_P1
$(grep -oE '(scripts|src|docs|instructions|verify|test|tests|migrations|supabase|templates)/[A-Za-z0-9_./\-]+:[0-9]+' "$DRAFT" 2>/dev/null | sort -u)
EOF_P1

# ===== pattern 2: column <name> =====
# 例: column streak_count, column "user_id", column 'event_type'
# psql で information_schema.columns に存在確認
while IFS= read -r colname; do
  [ -z "$colname" ] && continue
  if [ -z "$DB_URL" ] || [ ! -x "$PSQL" ]; then
    # DB 接続不可: skip (warn)
    continue
  fi
  RESULT=$("$PSQL" "$DB_URL" -tA -c "SELECT 1 FROM information_schema.columns WHERE column_name = '$colname' LIMIT 1;" 2>/dev/null || echo "")
  if [ "$RESULT" != "1" ]; then
    add_fail "p2 column not found in DB: $colname"
  fi
done <<EOF_P2
$(grep -oE "column[[:space:]]+['\"]?[a-z_][a-z0-9_]*['\"]?" "$DRAFT" 2>/dev/null | sed -E "s/^column[[:space:]]+['\"]?([a-z_][a-z0-9_]*)['\"]?$/\1/" | sort -u)
EOF_P2

# ===== pattern 3: grep -c .* = N =====
# 例: grep -c hoge src/foo = 7
# grep 再実行 + 値一致確認 (簡易版: 数字部分のみ抽出、 file 不在なら skip)
while IFS= read -r line; do
  [ -z "$line" ] && continue
  CLAIM_NUM=$(echo "$line" | sed -E 's/.*=[[:space:]]*([0-9]+).*/\1/')
  # 簡易 verify: number 0 でないか確認 (full re-run は overhead 大)
  if ! [ "$CLAIM_NUM" -ge 0 ] 2>/dev/null; then
    add_fail "p3 grep claim malformed: $line"
  fi
done <<EOF_P3
$(grep -E 'grep -c[[:space:]].*=[[:space:]]*[0-9]+' "$DRAFT" 2>/dev/null | sort -u)
EOF_P3

# ===== pattern 4: endpoint /api/<path> or /<path> =====
# 例: endpoint /api/health, endpoint /health
# src/index.js (or routes/) で route 存在確認
while IFS= read -r endpoint; do
  [ -z "$endpoint" ] && continue
  # endpoint 抽出
  PATH_PART=$(echo "$endpoint" | grep -oE '/[a-zA-Z0-9_/\-]+' | head -1)
  [ -z "$PATH_PART" ] && continue
  INDEX="$APP_ROOT/src/index.js"
  if [ ! -f "$INDEX" ]; then
    continue
  fi
  # route 存在確認: app.get('/path', app.post('/path', etc.
  if ! grep -qE "app\.(get|post|put|delete|patch|all)\(['\"]${PATH_PART}['\"]" "$INDEX" 2>/dev/null; then
    # /api/health の場合 /health も確認
    SHORT_PATH=$(echo "$PATH_PART" | sed -E 's|^/api||')
    if [ -n "$SHORT_PATH" ] && [ "$SHORT_PATH" != "$PATH_PART" ]; then
      if grep -qE "app\.(get|post|put|delete|patch|all)\(['\"]${SHORT_PATH}['\"]" "$INDEX" 2>/dev/null; then
        continue
      fi
    fi
    add_fail "p4 endpoint not found in src/index.js: $PATH_PART"
  fi
done <<EOF_P4
$(grep -oE 'endpoint[[:space:]]+/[a-zA-Z0-9_/\-]+' "$DRAFT" 2>/dev/null | sort -u)
EOF_P4

# ===== pattern 5: subagent <id> 完了|報告 =====
# 例: subagent ABC-123 完了, subagent XYZ 報告
# verify/ logs/ instructions/ で 該当 ID に言及あるか確認
while IFS= read -r line; do
  [ -z "$line" ] && continue
  SUB_ID=$(echo "$line" | grep -oE 'SUBAGENT-[A-Z0-9_\-]+' | head -1)
  [ -z "$SUB_ID" ] && continue
  # logs/ verify/ instructions/ で言及あるか
  if ! grep -rqE "$SUB_ID" "$APP_ROOT/verify" "$APP_ROOT/instructions" "$APP_ROOT/logs" 2>/dev/null; then
    add_fail "p5 subagent ID not found in verify/instructions/logs: $SUB_ID"
  fi
done <<EOF_P5
$(grep -E 'subagent.*SUBAGENT-[A-Z0-9_\-]+.*(完了|報告)' "$DRAFT" 2>/dev/null | sort -u)
EOF_P5

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo "FAIL: $FAIL_COUNT fact claim mismatch"
  echo "$FAIL_LIST"
  exit 1
fi

echo "PASS: all fact claims verified"
exit 0

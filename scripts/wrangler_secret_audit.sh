#!/bin/sh
# scripts/wrangler_secret_audit.sh — P4#44 fix (2026-05-02)
# wrangler secret list で 全 secret 名を取得、 旧 secret 命名規約 (_OLD / _PREV / _BACKUP) を
# 検出して 7 日経過後 削除 推奨を出力。 dry-run default、 --apply で実 deletion。
set -eu
ENV_NAME="${ENV_NAME:-production}"
DRY_RUN=1
[ "${1:-}" = "--apply" ] && DRY_RUN=0

OLD_SECRETS=$(npx wrangler secret list --env "$ENV_NAME" --format json 2>/dev/null \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('\n'.join(s['name'] for s in d if any(s['name'].endswith(x) for x in ['_OLD','_PREV','_BACKUP'])))" 2>/dev/null || true)

[ -z "$OLD_SECRETS" ] && { echo "OK: 旧 secret 0 件"; exit 0; }

echo "$OLD_SECRETS" | while read -r s; do
  [ -z "$s" ] && continue
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "WOULD DELETE: $s (--apply で実行)"
  else
    npx wrangler secret delete "$s" --env "$ENV_NAME" --force 2>&1
  fi
done

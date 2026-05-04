#!/bin/sh
# scripts/template_propagation_check.sh — App 自身 が dev-system 雛形 と 整合 か 自己 verify
#
# 根拠 (= 仕様 § 紐付):
#   - core_spec.md §1.1 完全独立モデル (= App 単独 で 検証 可能 path)
#   - core_spec.md §3.12 全改善 同時 propagate
#   - PO 直命 (2026-05-04): 「dev-system と App は 完全独立、 共通 test は dev-system (S)
#     から App (L) に 転記 して 設計図 の 一部 と なる」
#   - SUBAGENT-DEVSYS-COMPLETE-INDEPENDENCE-PROPAGATION-CHECK-V1
#
# 動作 (App 自身 の pre-push hook 経由 + manual invoke):
#   1. App 自身 が 想定 する dev-system path (DEVSYS_ROOT 環境変数 / default = $HOME/Desktop/dev-system)
#      を 経由 して dev-system 雛形 一覧 取得
#   2. 各 雛形 に対応 する App scripts/<name>.sh の 存在 を 自己確認
#   3. 不在 = App 側 「転記 漏れ」 = 設計図 不完全
#   4. PROPAGATE_STRICT=0 (default = baseline) → WARN-only (件数 列挙、 exit 0)
#   5. PROPAGATE_STRICT=1 (= ratchet 完了 後) → 漏れ ≥ 1 件 で exit 1 (= push BLOCK)
#
# 完全独立 設計:
#   - App は dev-system path を 知らないが 「DEVSYS_ROOT で 任意 上書き可」 = opt-in 確認
#   - DEVSYS_ROOT 不在 = skip (= App 単独 で run しても fail しない)
#   - dev-system 雛形 を 直接 参照 せず、 同名 .sh 存在 のみ 確認 = 完全独立 維持
#
# bypass 機構: 0 (PO 直命 2026-05-04 「bypass 機構 物理削除」)
#
# 連動:
#   - templates/scripts/template_propagation_check.sh.template (= 本 file の SSoT)
#   - dev-system 側 scripts/devs_template_propagation_check.sh (= 反対側 verify)
#   - adv_pre_push_quality_gate.sh: step 結線 候補

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVSYS_ROOT="${DEVSYS_ROOT:-$HOME/Desktop/dev-system}"
TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

APP_SCRIPTS_DIR="${REPO_ROOT}/scripts"
DEVSYS_TEMPLATES_DIR="${DEVSYS_ROOT}/templates/scripts"

PROPAGATE_STRICT="${PROPAGATE_STRICT:-0}"

echo "================================================================"
echo "  template propagation check (App 自身 自己 verify)"
echo "  完全独立 + 転記 SSoT 不変条件 (PO 直命 2026-05-04)"
echo "  TS: $TS"
echo "  STRICT: $PROPAGATE_STRICT (0=WARN / 1=BLOCK)"
echo "  DEVSYS_ROOT: $DEVSYS_ROOT"
echo "================================================================"

# ---------------------------------------------------------------
# step 1: dev-system path 不在 = skip (= App 完全独立 = 単独 動作 OK)
# ---------------------------------------------------------------
if [ ! -d "$DEVSYS_TEMPLATES_DIR" ]; then
  echo "[template_propagation_check] INFO: $DEVSYS_TEMPLATES_DIR 不在"
  echo "  = dev-system 不在 / DEVSYS_ROOT 不一致 → skip"
  echo "  (App は 完全独立 = dev-system 不在 でも 単独 動作 可能)"
  echo "  (DEVSYS_ROOT 環境変数 で 任意 path 上書き可)"
  exit 0
fi

# ---------------------------------------------------------------
# step 2: App scripts/ 不在 = FAIL (= scaffold 失敗)
# ---------------------------------------------------------------
if [ ! -d "$APP_SCRIPTS_DIR" ]; then
  echo "🛑 ERROR: $APP_SCRIPTS_DIR 不在 = App scaffold 不完全"
  exit 1
fi

# ---------------------------------------------------------------
# step 3: 雛形 全件 列挙 + 対応 App script 検査
# ---------------------------------------------------------------
TEMPLATE_COUNT=0
MISSING_COUNT=0
MISSING_LIST=""

for tpl in "$DEVSYS_TEMPLATES_DIR"/*.sh.template "$DEVSYS_TEMPLATES_DIR"/*.template.sh; do
  [ -f "$tpl" ] || continue
  TEMPLATE_COUNT=$((TEMPLATE_COUNT + 1))

  tpl_basename="$(basename "$tpl")"

  case "$tpl_basename" in
    *.sh.template)
      app_script="${tpl_basename%.template}"
      ;;
    *.template.sh)
      app_script="$(echo "$tpl_basename" | sed 's/\.template\.sh$/.sh/')"
      ;;
    *)
      continue
      ;;
  esac

  app_path="${APP_SCRIPTS_DIR}/${app_script}"

  if [ ! -f "$app_path" ]; then
    MISSING_COUNT=$((MISSING_COUNT + 1))
    MISSING_LIST="${MISSING_LIST}  - ${tpl_basename} → ${app_script} 不在 (App 側 転記 漏れ)\n"
  fi
done

echo ""
echo "雛形 件数 (dev-system 側): $TEMPLATE_COUNT"
echo "App 側 転記 漏れ 件数: $MISSING_COUNT"

# ---------------------------------------------------------------
# step 4: 漏れ 出力
# ---------------------------------------------------------------
if [ "$MISSING_COUNT" -gt 0 ]; then
  echo ""
  echo "----------------------------------------------------------------"
  echo "  App 自己 verify: dev-system 雛形 と 整合 不一致"
  echo "  PO 直命 (2026-05-04): 「設計図 の 一部 として App に 転記」"
  echo "----------------------------------------------------------------"
  printf "%b\n" "$MISSING_LIST"
  echo ""
  echo "対処:"
  echo "  1. dev-system templates/scripts/<name>.sh.template を 確認"
  echo "  2. App scripts/<name>.sh に 配置 + chmod +x + bash -n PASS"
  echo "  3. App commit + push"
  echo ""

  if [ "$PROPAGATE_STRICT" = "1" ]; then
    echo "BLOCK (PROPAGATE_STRICT=1): 完全独立 整合 違反 → push 拒否"
    exit 1
  fi

  echo "WARN-only mode (PROPAGATE_STRICT=0)"
  exit 0
fi

echo ""
echo "✅ ALL GREEN: 全 ${TEMPLATE_COUNT} 件 雛形 が App 側 に 転記 完了"
exit 0

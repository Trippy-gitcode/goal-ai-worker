#!/bin/sh
# scripts/lib/risk_patterns.sh — 高リスクパス SSOT
# 根拠: R2.2 §2.3 σcrit / §2.18 PD疑義2 / PD-105 最重要領域
# POSIX sh 互換。bash 拡張禁止。
#
# RISK_PATHS に prefix match するファイル変更があれば Hフロー発火対象。
# 本リストを lib/risk_match.sh が読み込み、is_risk_path 関数で prefix 判定する。
# hflow.enabled=false のオプトアウト時も mandatory_paths 変更は承認必須（§2.18）。

# 改行区切りの SSOT（POSIX sh の配列非対応のため文字列保持）。
# 変更時は docs/plans/sub_hflow_protocol.md §1 発火条件と同期更新。
RISK_PATHS='
src/auth/
src/payment/
src/services/supabase.ts
src/services/external/
src/services/stripe/
supabase/migrations/
.env
.dev.vars
wrangler.toml
app_config.yaml
'

# RISK_PATHS を改行区切りで stdout 出力（呼出側で iterate 可能）
print_risk_paths() {
  printf '%s\n' "$RISK_PATHS" | awk 'NF>0 { print }'
}

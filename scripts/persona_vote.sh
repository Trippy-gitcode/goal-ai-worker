#!/bin/sh
# scripts/persona_vote.sh
# MISSION-G49-PKG-FINAL-V2 Phase 2（PD-112 §2.25.23 14 票投票機構）
#
# 用途:
#   §2.25.14.7 定義の 10 ペルソナそれぞれに対し、grep ベース簡易判定で
#   FOR / AGAINST / ABSTAIN を出力する MVP 実装。完全版は subagent 起動だが、
#   本 MVP は提案テキストの語彙パターンから保守的に判定する。
#
# 引数:
#   --proposal "<提案テキスト>"（必須）
#   --persona "<ペルソナ名>"（必須、例: "LLM アプリケーション設計者"）
#
# 出力:
#   stdout: FOR | AGAINST | ABSTAIN（1 単語）
#   exit code: 0=正常出力 / 1=引数エラー
#
# 判定ルール（保守側、ABSTAIN 優先）:
#   - 提案テキストにペルソナ専門領域の懸念語が含まれる場合 → AGAINST
#   - 提案テキストにペルソナ専門領域の積極語が含まれる場合 → FOR
#   - どちらでもない場合 → ABSTAIN
#
# 根拠:
#   - lais/verify/dev_system_v34_package.md §2.25.14.7 / §2.25.23.4 step 2
#   - docs/po-decisions.md PD-112

set -eu

PROPOSAL=""
PERSONA=""

while [ $# -gt 0 ]; do
  case "$1" in
    --proposal) shift; PROPOSAL="${1:-}" ;;
    --persona) shift; PERSONA="${1:-}" ;;
    *) ;;
  esac
  shift || true
done

if [ -z "$PROPOSAL" ] || [ -z "$PERSONA" ]; then
  echo "[persona_vote] --proposal および --persona が必須" >&2
  exit 1
fi

# --- ペルソナ別判定（grep ベース MVP、保守側）-----------------------------
verdict="ABSTAIN"

case "$PERSONA" in
  *"LLM アプリケーション設計者"*)
    # 懸念: attention 散逸 / 非自己完結 / dedupe 不在
    if printf '%s' "$PROPOSAL" | grep -qiE "(リテラル|テンプレ応答|attention 散逸|非自己完結|dedupe 不在)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(自己完結|attention 独立|LP-030|dedupe)"; then
      verdict="FOR"
    fi
    ;;
  *"プロンプトエンジニア"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(過剰拡張|過小実装|暗黙仮定|横道)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(逐語|意図正確|スコープ明確)"; then
      verdict="FOR"
    fi
    ;;
  *"SW PM"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(コスト超過|進行阻害|リソース枯渇|ペース崩壊)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(プロダクト価値|コスト効率|進行整合)"; then
      verdict="FOR"
    fi
    ;;
  *"SW アーキテクト"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(循環依存|責務曖昧|SSoT 多重|分散実装)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(SSoT 一本化|責務明確|依存方向健全)"; then
      verdict="FOR"
    fi
    ;;
  *"SRE"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(ガードレール不在|fail-open 過剰|障害経路不明)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(ガードレール|fail-closed|連続失敗カウンタ|paused_until|サーキットブレーカ)"; then
      verdict="FOR"
    fi
    ;;
  *"QA テストエンジニア"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(テスト不在|証跡欠落|TDD 違反|カバレッジ未確認)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(テスト戦略|証跡|TDD|カバレッジ|機械チェック)"; then
      verdict="FOR"
    fi
    ;;
  *"テクニカルライター"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(用語ブレ|章番号穴|仕様書不整合|§C1.5 違反)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qE "(仕様書整合|用語統一|章番号連続|§C1.5)"; then
      verdict="FOR"
    fi
    ;;
  *"セキュリティエンジニア"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(秘密露出|シークレット leak|RLS 不在|XSS 経路)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qiE "(auth|RLS|CSP|シークレット保護|gitleaks)"; then
      verdict="FOR"
    fi
    ;;
  *"AI コンサルタント"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(コスト見積もり不在|ROI 未測定|モデル選定根拠不在)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qiE "(コスト見積|ROI|モデル選定根拠|効果測定)"; then
      verdict="FOR"
    fi
    ;;
  *"データガバナンス専門家"*)
    if printf '%s' "$PROPOSAL" | grep -qiE "(SSoT 多重化|データ消失|バックアップ不在|監査証跡断絶|バージョン履歴喪失)"; then
      verdict="AGAINST"
    elif printf '%s' "$PROPOSAL" | grep -qiE "(SSoT 一本化|バックアップ戦略|バージョン管理|監査ログ整合|データ整合)"; then
      verdict="FOR"
    fi
    ;;
  *)
    # 未知ペルソナ: ABSTAIN（保守側）
    verdict="ABSTAIN"
    ;;
esac

echo "$verdict"
exit 0

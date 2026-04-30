#!/bin/sh
# tests/persona_review_e2e.sh
# MISSION-G49-PKG Phase 2.2 e2e テスト
#
# 用途: 質問入力 → persona_selector.sh ペルソナ選択 → ラウンド記録検証

set -eu
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

SEL="${REPO_ROOT}/scripts/persona_selector.sh"
LOG="${REPO_ROOT}/logs/persona_review.log"

[ -x "$SEL" ] || { echo "FAIL: $SEL 未実行可"; exit 1; }

PASS=0
FAIL=0

# テスト 1: 必須 3 ペルソナ常時選択
out1=$(bash "$SEL" --query "短い応答" 2>/dev/null || true)
if printf '%s' "$out1" | grep -q "LLM アプリケーション設計者" \
   && printf '%s' "$out1" | grep -q "プロンプトエンジニア" \
   && printf '%s' "$out1" | grep -q "SW PM"; then
  echo "PASS: [1] 必須 3 ペルソナ常時選択 ($out1)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [1] 必須 3 ペルソナ欠落 ($out1)"
  FAIL=$((FAIL + 1))
fi

# テスト 2: アプリ実装質問 → SW アーキテクト追加
out2=$(bash "$SEL" --query "アプリ実装の質問、責務境界をどう定めるか" 2>/dev/null || true)
if printf '%s' "$out2" | grep -q "SW アーキテクト"; then
  echo "PASS: [2] 実装/責務 → SW アーキテクト追加 ($out2)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [2] SW アーキテクト未選択 ($out2)"
  FAIL=$((FAIL + 1))
fi

# テスト 3: テスト質問 → QA テストエンジニア追加
out3=$(bash "$SEL" --query "テスト戦略のカバレッジを評価したい" 2>/dev/null || true)
if printf '%s' "$out3" | grep -q "QA テストエンジニア"; then
  echo "PASS: [3] テスト/カバレッジ → QA 追加 ($out3)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [3] QA 未選択 ($out3)"
  FAIL=$((FAIL + 1))
fi

# テスト 4: 障害 + 監視 → SRE 追加
out4=$(bash "$SEL" --query "障害復旧と監視のガードレール設計" 2>/dev/null || true)
if printf '%s' "$out4" | grep -q "SRE"; then
  echo "PASS: [4] 障害/監視 → SRE 追加 ($out4)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [4] SRE 未選択 ($out4)"
  FAIL=$((FAIL + 1))
fi

# テスト 5: 仕様書 + 用語 → テクニカルライター追加
out5=$(bash "$SEL" --query "仕様書の用語整合と章構造の文書化" 2>/dev/null || true)
if printf '%s' "$out5" | grep -q "テクニカルライター"; then
  echo "PASS: [5] 仕様書/用語 → テクニカルライター追加 ($out5)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [5] テクニカルライター未選択 ($out5)"
  FAIL=$((FAIL + 1))
fi

# テスト 6: auth + RLS → セキュリティエンジニア追加
out6=$(bash "$SEL" --query "auth flow と RLS 設定の脅威モデル" 2>/dev/null || true)
if printf '%s' "$out6" | grep -q "セキュリティエンジニア"; then
  echo "PASS: [6] auth/RLS → セキュリティエンジニア追加 ($out6)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [6] セキュリティ未選択 ($out6)"
  FAIL=$((FAIL + 1))
fi

# テスト 7: コスト + Opus → AI コンサルタント追加
out7=$(bash "$SEL" --query "Opus モデルのコスト ROI 評価" 2>/dev/null || true)
if printf '%s' "$out7" | grep -q "AI コンサルタント"; then
  echo "PASS: [7] Opus/コスト → AI コンサルタント追加 ($out7)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [7] AI コンサルタント未選択 ($out7)"
  FAIL=$((FAIL + 1))
fi

# テスト 8: 追加候補 4 件以上ヒットでも最大 3 まで制限
out8=$(bash "$SEL" --query "実装の依存 SSoT、テスト カバレッジ、auth 監視、Opus コスト" 2>/dev/null || true)
ADDITIONAL_COUNT=$(printf '%s\n' "$out8" | tr ',' '\n' | grep -cE "(SW アーキテクト|SRE|QA|テクニカル|セキュリティ|AI コンサル)" || true)
if [ "${ADDITIONAL_COUNT:-0}" -le 3 ]; then
  echo "PASS: [8] 追加候補 ${ADDITIONAL_COUNT} 件、最大 3 制限内 ($out8)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [8] 追加候補 ${ADDITIONAL_COUNT} 件、最大 3 超過 ($out8)"
  FAIL=$((FAIL + 1))
fi

# テスト 9: ログ記録確認
if [ -f "$LOG" ]; then
  RECENT=$(wc -l <"$LOG" | tr -d ' ')
  if [ "${RECENT:-0}" -ge 7 ]; then
    echo "PASS: [LOG] persona_review.log にエントリ ${RECENT} 件記録"
    PASS=$((PASS + 1))
  else
    echo "FAIL: [LOG] エントリ不足 ($RECENT)"
    FAIL=$((FAIL + 1))
  fi
fi

# テスト 10: severity-summary 引数渡し
out10=$(bash "$SEL" --query "実装" --severity-summary "C0H1M2L3" --rounds 3 2>/dev/null || true)
if grep -q "C0H1M2L3" "$LOG" && grep -q "	3	" "$LOG"; then
  echo "PASS: [10] severity-summary + rounds 引数記録 ($out10)"
  PASS=$((PASS + 1))
else
  echo "FAIL: [10] severity / rounds 記録欠落"
  FAIL=$((FAIL + 1))
fi

echo "---"
echo "persona_review_e2e: PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
exit 0

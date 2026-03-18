#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# GOAL AI — 一括検証スクリプト
# fix_chat_bubbles.md (SECTION A-B) + engineering_audit_50.md (A-E)
# 
# 使い方: Claude Codeにこのスクリプト全体を貼り付けて実行
# 結果の見方: 🔴=要対応 🟡=要確認 🟢=情報収集 ✅=OK ❌=問題あり
# ═══════════════════════════════════════════════════════════════

set -e
cd ~/Desktop/goal-ai-worker 2>/dev/null || cd /home/claude/goal-ai-worker 2>/dev/null || { echo "❌ プロジェクトディレクトリが見つかりません"; exit 1; }

PASS=0
FAIL=0
WARN=0
RESULTS=""

# ── ヘルパー関数 ──
check() {
  local label="$1" priority="$2" desc="$3" cmd="$4" expect="$5"
  local result
  result=$(eval "$cmd" 2>/dev/null || echo "ERROR")
  
  local status=""
  if [ "$expect" = "REPORT" ]; then
    status="📊"
    WARN=$((WARN+1))
    RESULTS+="$priority $label: $result ($desc)\n"
  elif [ "$expect" = ">0" ] && [ "$result" -gt 0 ] 2>/dev/null; then
    status="✅"
    PASS=$((PASS+1))
    RESULTS+="✅ $label: $result ($desc)\n"
  elif [ "$expect" = "=0" ] && [ "$result" = "0" ] 2>/dev/null; then
    status="✅"
    PASS=$((PASS+1))
    RESULTS+="✅ $label: $result ($desc)\n"
  elif [ "$expect" = "EXISTS" ] && [ -n "$result" ] && [ "$result" != "ERROR" ] && [ "$result" != "0" ]; then
    status="✅"
    PASS=$((PASS+1))
    RESULTS+="✅ $label: $result ($desc)\n"
  else
    status="❌"
    FAIL=$((FAIL+1))
    RESULTS+="❌ $label: $result — 期待値:$expect ($desc)\n"
  fi
  echo "$status $priority $label: $result"
}

report() {
  local label="$1" priority="$2" desc="$3" cmd="$4"
  local result
  result=$(eval "$cmd" 2>/dev/null || echo "(実行エラー)")
  WARN=$((WARN+1))
  echo "📊 $priority $label: $result"
  RESULTS+="📊 $priority $label: $result ($desc)\n"
}

section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ═══════════════════════════════════════════════════════════════
section "FIX_CHAT_BUBBLES: SECTION A — 報告済み3件のバグ"
# ═══════════════════════════════════════════════════════════════

echo "── A-1: 空バブル（parentElement.remove → closest 修正） ──"
report "parentElement.remove残存数" "🔴" "0件が正常" \
  "grep -c 'parentElement.*remove\|parentElement?.remove' frontend/js/chat.js 2>/dev/null || echo 0"

report "closest(.msg)使用数" "🔴" "5以上が正常" \
  "grep -c \"closest.*msg\" frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── A-2: 段落間余白（<br><br> → <p>タグ変換） ──"
report "<br><br>残存" "🔴" "0件が正常" \
  "grep -c '<br><br>\|<br>.*<br>' frontend/js/chat.js 2>/dev/null || echo 0"

report "<p>タグ生成" "🔴" "1以上が正常" \
  "grep -c '<p>' frontend/js/chat.js 2>/dev/null || echo 0"

report "renderMsgContent関数" "🔴" "存在確認" \
  "grep -c 'renderMsgContent\|function renderMsg' frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── A-3: アイコンずれ（セレクタ不一致） ──"
report ".chat-message .msg-header CSS残存" "🔴" "0件が正常" \
  "grep -c 'chat-message.*msg-header\|\.msg-header' frontend/style.css 2>/dev/null || echo 0"

report ".bubble padding:4px残存" "🔴" "0件が正常" \
  "grep -c 'padding.*4px.*0\|padding:.*4px' frontend/style.css 2>/dev/null | head -1 || echo 0"

report ".msg-actions position:absolute" "🟡" "1以上が正常" \
  "grep -c 'msg-actions.*position.*absolute\|msg-actions.*absolute' frontend/style.css 2>/dev/null || echo 0"


# ═══════════════════════════════════════════════════════════════
section "FIX_CHAT_BUBBLES: SECTION B — 類似バグ10件"
# ═══════════════════════════════════════════════════════════════

echo "── B-1: グラステーマ .ai-bubble vs .bubble 不一致 ──"
report "CSS内の.ai-bubble参照数" "🔴" "JSと一致すべき" \
  "grep -c '\.ai-bubble\|ai-bubble' frontend/style.css 2>/dev/null || echo 0"

report "JS内のai-bubbleクラス生成数" "🔴" "CSSと一致すべき" \
  "grep -c 'ai-bubble' frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── B-2: .chat-message がDOMに存在しない ──"
report "CSS内の.chat-message参照数" "🔴" "JSと一致すべき" \
  "grep -c '\.chat-message' frontend/style.css 2>/dev/null || echo 0"

report "JS内のchat-messageクラス生成数" "🔴" "CSSと一致すべき" \
  "grep -c 'chat-message' frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── B-3: モードクラス接続 ──"
report "setModeClass定義" "🔴" "1以上が正常" \
  "grep -c 'setModeClass' frontend/js/chat.js frontend/js/ui.js 2>/dev/null || echo 0"

report "mode-spartan CSS" "🔴" "1以上が正常" \
  "grep -c 'mode-spartan' frontend/style.css 2>/dev/null || echo 0"

echo ""
echo "── B-4: フォントサイズCSS変数 ──"
report "font-size-chat CSS定義" "🟡" "1以上が正常" \
  "grep -c 'font-size-chat' frontend/style.css 2>/dev/null || echo 0"

report "font-size-chat JS設定" "🟡" "1以上が正常" \
  "grep -c 'font-size-chat\|font_size\|fontSize' frontend/js/ui.js 2>/dev/null || echo 0"

echo ""
echo "── B-5: goals.js内のparentElement.remove ──"
report "goals.js parentElement.remove" "🟡" "0件が正常" \
  "grep -c 'parentElement.*remove' frontend/js/goals.js 2>/dev/null || echo 0"

echo ""
echo "── B-6: タイピングインジケーター構造 ──"
report "showChatTyping生成HTML" "🟡" "構造確認" \
  "grep -c 'showChatTyping\|typing-indicator' frontend/js/chat.js frontend/js/api.js 2>/dev/null || echo 0"

echo ""
echo "── B-7: MEMBERSHIP初期値 ──"
report "plan:'pro'がデフォルト（バグ）" "🟡" "0件が正常" \
  "grep -c \"plan:.*'pro'\|plan:.*\\\"pro\\\"\" frontend/js/ui.js frontend/js/globals.js 2>/dev/null || echo 0"

echo ""
echo "── B-9: チャット背景プリセット ──"
report "setChatBg定義" "🟢" "存在確認" \
  "grep -c 'setChatBg\|BG_PRESETS' frontend/js/ui.js frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── B-10: sidebar-section-label ──"
report "CSS定義" "🟢" "" \
  "grep -c 'sidebar-section-label' frontend/style.css 2>/dev/null || echo 0"
report "HTML/JS使用" "🟢" "" \
  "grep -c 'sidebar-section-label' frontend/index.html frontend/js/ui.js 2>/dev/null || echo 0"


# ═══════════════════════════════════════════════════════════════
section "AUDIT A: セキュリティ（12項目）"
# ═══════════════════════════════════════════════════════════════

echo "── A-01: Webhook署名のreplay attack防止 ──"
report "タイムスタンプ検証" "🔴" "timestamp/age/replay/safeCompareのいずれか" \
  "grep -c 'timestamp\|age.*300\|Math.abs.*age\|replay\|svix-timestamp\|stripeTimestamp\|webhookAge' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-02: 管理者認証のタイミング攻撃対策 ──"
report "constant-time比較" "🔴" "timingSafe/subtle.verify" \
  "grep -c 'timingSafe\|subtle.*verify\|crypto.*compare' src/worker.js 2>/dev/null || echo 0"

report "TOKEN_SECRET比較方法" "🔴" "===は脆弱" \
  "grep -n 'TOKEN_SECRET' src/worker.js | head -5"

echo ""
echo "── A-03: Supabase SQLインジェクション ──"
report "ユーザー入力の直接埋め込み" "🔴" "文字列結合なしが正常" \
  "grep -c '\\.eq.*body\\.\|\\+.*token_id\|\\$.*user' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-04: CORS AllowedOrigins ──"
report "ハードコードOrigin" "🟡" "" \
  "grep -n 'allowedOrigin\|ALLOWED_ORIGIN\|goal-ai-frontend' src/worker.js | head -5"

echo ""
echo "── A-05: Free自動登録の重複防止 ──"
report "IP/fingerprint検証" "🟡" "" \
  "grep -c 'deviceId\|device_id\|fingerprint\|ip.*register' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-06: innerHTML vs escapeHtml 網羅性 ──"
for f in frontend/js/chat.js frontend/js/goals.js frontend/js/ui.js frontend/js/profile.js; do
  if [ -f "$f" ]; then
    ih=$(grep -c "innerHTML" "$f" 2>/dev/null || echo 0)
    eh=$(grep -c "escapeHtml" "$f" 2>/dev/null || echo 0)
    echo "  📊 $(basename $f): innerHTML=$ih / escapeHtml=$eh"
  fi
done

echo ""
echo "── A-07: Cookie SameSite属性 ──"
report "SameSiteなしのcookie設定" "🟡" "0件が正常" \
  "grep 'document.cookie' frontend/js/*.js 2>/dev/null | grep -vc 'SameSite' || echo 0"

echo ""
echo "── A-08: ゴール所有者チェック ──"
report "PATCH/DELETEでtoken_id照合" "🟡" "" \
  "grep -c 'token_id.*goal\|owner.*check\|auth.*tokenId.*goal' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-09: フィードバックGETの認証 ──"
report "feedbacks GET認証" "🟡" "" \
  "grep -B5 -A5 'feedbacks.*GET\|handleFeedback.*Get\|handleFeedback.*List' src/worker.js 2>/dev/null | grep -c 'auth\|SECRET\|admin' || echo 0"

echo ""
echo "── A-10: 音声サイズ制限 ──"
report "Content-Length/maxSize" "🟢" "" \
  "grep -c 'Content-Length\|maxSize\|size.*limit\|MAX.*SIZE\|25.*MB\|25000000' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-11: スタックトレース漏洩 ──"
report "e.stack露出" "🟢" "0件が正常" \
  "grep -c 'e\.stack\|error.*stack\|stringify.*error' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── A-12: Stripe URL ──"
report "netlify残存" "🟢" "0件が正常" \
  "grep -c 'netlify' src/worker.js 2>/dev/null || echo 0"
report "pages.dev参照" "🟢" "1以上が正常" \
  "grep -c 'goal-ai-frontend.pages.dev' src/worker.js 2>/dev/null || echo 0"


# ═══════════════════════════════════════════════════════════════
section "AUDIT B: 信頼性・耐障害性（10項目）"
# ═══════════════════════════════════════════════════════════════

echo "── B-01: KV⇔Supabase二重管理 ──"
report "Webhook内KV put数" "🔴" "Supabase updateと同数が理想" \
  "grep -A80 'checkout.session.completed' src/worker.js 2>/dev/null | grep -c 'TOKEN_KV.*put\|KV.*put\|\.put(' || echo 0"
report "Webhook内Supabase update数" "🔴" "" \
  "grep -A80 'checkout.session.completed' src/worker.js 2>/dev/null | grep -c 'supabase\|SUPABASE\|rest/v1/users\|users.*patch\|users.*update\|users.*upsert' || echo 0"

echo ""
echo "── B-02: SSEストリーミングAbort ──"
report "AbortController使用" "🔴" "1以上が正常" \
  "grep -c 'AbortController\|signal\|abort' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── B-03: 3AI途中失敗リカバリー ──"
report "ディープ分析のtry-catch" "🟡" "" \
  "grep -c 'try\|catch' frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── B-04: KV expirationTtl誤適用 ──"
report "TTL付きput（レート制限以外）" "🟡" "" \
  "grep -n 'expirationTtl' src/worker.js 2>/dev/null | head -10"

echo ""
echo "── B-06: レート制限race condition ──"
report "KV get→put間のatomic操作" "🟡" "情報収集" \
  "grep -A5 'checkRateLimit' src/worker.js 2>/dev/null | grep -c 'get\|put' || echo 0"

echo ""
echo "── B-07: ストリーミングタイムアウト ──"
report "フロントエンドのtimeout設定" "🟡" "" \
  "grep -c 'timeout\|setTimeout\|AbortController\|30000\|60000' frontend/js/api.js frontend/js/chat.js 2>/dev/null || echo 0"

echo ""
echo "── B-08: PWA Cache更新 ──"
report "sw.js CACHE_NAME" "🟢" "" \
  "grep 'CACHE_NAME\|cacheName\|cacheVersion' frontend/sw.js 2>/dev/null | head -3 || echo '(sw.js未検出)'"

echo ""
echo "── B-10: chat_messages行数推定 ──"
report "チャット保存のINSERT箇所" "🟢" "" \
  "grep -c 'chat_messages.*insert\|history.*insert\|POST.*history' src/worker.js 2>/dev/null || echo 0"


# ═══════════════════════════════════════════════════════════════
section "AUDIT C: コード品質・保守性（10項目）"
# ═══════════════════════════════════════════════════════════════

echo "── C-01: worker.js規模 ──"
report "worker.js行数" "🔴" "1000行超は要分割" \
  "wc -l < src/worker.js 2>/dev/null || echo '?'"
report "関数定義数" "🔴" "" \
  "grep -c '^async function\|^function' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── C-02: グローバル変数・ESModules状況 ──"
report "globals.js export/import" "🔴" "0=旧式グローバル" \
  "grep -c '^export\|^import' frontend/js/globals.js 2>/dev/null || echo 0"

report "script読み込み順（moduleか）" "🔴" "" \
  "grep -c 'type=\"module\"\|type=module' frontend/index.html 2>/dev/null || echo 0"

echo ""
echo "── C-03: エラーメッセージ言語混在 ──"
report "Worker英語エラー数" "🟡" "" \
  "grep -c \"error.*'[A-Z]\|error.*\\\"[A-Z]\" src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── C-04: マジックナンバー ──"
report "max_tokens直書き" "🟡" "" \
  "grep -c 'max_tokens.*[0-9]\|maxTokens.*[0-9]' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── C-05: エラーログ永続化 ──"
report "error_logsテーブル参照" "🟡" "0=未実装" \
  "grep -c 'error_log\|error.*insert\|logError' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── C-06: CSS変数命名 ──"
report "CSS変数の総定義数" "🟡" "" \
  "grep -c '^\s*--' frontend/style.css 2>/dev/null || echo 0"

echo ""
echo "── C-07: インラインイベント数 ──"
report "onclick/onkeydown/onchange/oninput" "🟡" "Vite移行時に全置換必要" \
  "grep -c 'onclick=\|onkeydown=\|onchange=\|oninput=' frontend/index.html 2>/dev/null || echo 0"

echo ""
echo "── C-08: テストコード ──"
report "テストファイル存在" "🟢" "" \
  "find . -name '*.test.*' -o -name '*.spec.*' -o -name '__tests__' 2>/dev/null | head -3 || echo '(なし)'"

echo ""
echo "── C-09: CI/CDパイプライン ──"
report "GitHub Actions" "🟢" "" \
  "ls .github/workflows/*.yml 2>/dev/null | head -3 || echo '(なし)'"

echo ""
echo "── C-10: console.log残存 ──"
for f in frontend/index.html frontend/js/chat.js frontend/js/goals.js frontend/js/ui.js frontend/js/api.js frontend/js/profile.js frontend/js/app.js; do
  if [ -f "$f" ]; then
    cnt=$(grep -c "console.log" "$f" 2>/dev/null || echo 0)
    [ "$cnt" -gt 0 ] && echo "  ❌ $(basename $f): console.log=$cnt"
  fi
done


# ═══════════════════════════════════════════════════════════════
section "AUDIT D: デバッグ・可観測性（8項目）"
# ═══════════════════════════════════════════════════════════════

echo "── D-01: エラー通知 ──"
report "window.onerror" "🔴" "1以上が正常" \
  "grep -c 'window.onerror\|addEventListener.*error\|error-report' frontend/js/*.js 2>/dev/null || echo 0"

echo ""
echo "── D-02: 操作ログ ──"
report "/api/event エンドポイント" "🔴" "" \
  "grep -c 'api/event\|analytics\|trackEvent' src/worker.js frontend/js/*.js 2>/dev/null || echo 0"

echo ""
echo "── D-03: 空catchブロック ──"
report "catch後に処理なし（手動確認推奨）" "🟡" "" \
  "grep -B0 -A1 'catch.*{' frontend/js/*.js 2>/dev/null | grep -c '^\s*}' || echo 0"

echo ""
echo "── D-04: Webhookべき等性 ──"
report "event.id重複チェック" "🟡" "" \
  "grep -c 'event\.id\|event_id\|idempotent\|already.*processed' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── D-05: KV JSONパースの安全性 ──"
report "JSON.parse try-catch" "🟡" "" \
  "grep -B2 'JSON.parse' src/worker.js 2>/dev/null | grep -c 'try' || echo 0"

echo ""
echo "── D-06: APIレスポンスタイム計測 ──"
report "performance.now/X-Latency" "🟡" "" \
  "grep -c 'performance.now\|X-.*Latency\|X-.*Duration' src/worker.js 2>/dev/null || echo 0"

echo ""
echo "── D-07: ディープ分析段階ログ ──"
report "phases_completed" "🟢" "" \
  "grep -c 'phases_completed\|phase.*log\|phase.*track' src/worker.js frontend/js/*.js 2>/dev/null || echo 0"


# ═══════════════════════════════════════════════════════════════
section "AUDIT E: 構造的抑止（10項目）"
# ═══════════════════════════════════════════════════════════════

echo "── E-01: CSSセレクタ⇔DOM交差検証 ──"
if [ -f frontend/style.css ] && [ -d frontend/js ]; then
  css_only=$(grep -oh '\.[a-z][a-z0-9_-]*' frontend/style.css 2>/dev/null | sort -u | wc -l)
  js_classes=$(grep -oh "'[a-z][a-z0-9_-]*'" frontend/js/*.js 2>/dev/null | tr -d "'" | sort -u | wc -l)
  echo "  📊 CSS固有クラス数: $css_only / JSクラス生成数: $js_classes"
  echo "  📊 CSS⇔JSの未一致候補（上位10件）:"
  comm -23 \
    <(grep -oh '\.[a-z][a-z0-9_-]*' frontend/style.css 2>/dev/null | sed 's/^\.//' | sort -u) \
    <(grep -oh "'[a-z][a-z0-9_-]*'" frontend/js/*.js 2>/dev/null | tr -d "'" | sort -u) \
    2>/dev/null | head -10 | sed 's/^/    ⚠️  ./'
else
  echo "  ⚠️ ファイル未検出（スキップ）"
fi

echo ""
echo "── E-03: parentElement.remove 全面禁止 ──"
report "全JS内の残存数" "🔴" "0件必須" \
  "grep -c 'parentElement.*remove\|parentElement?.remove' frontend/js/*.js 2>/dev/null || echo 0"

echo ""
echo "── E-06: HTML onclick → JS関数の接続確認 ──"
if [ -f frontend/index.html ] && [ -d frontend/js ]; then
  echo "  📊 HTMLから呼ばれるがJSに定義が見つからない関数:"
  comm -23 \
    <(grep -oh 'onclick="[a-zA-Z_]*(' frontend/index.html 2>/dev/null | sed 's/onclick="//;s/($//' | sort -u) \
    <(grep -oh 'function [a-zA-Z_]*' frontend/js/*.js 2>/dev/null | sed 's/function //' | sort -u) \
    2>/dev/null | head -10 | sed 's/^/    ❓  /'
  orphan_count=$(comm -23 \
    <(grep -oh 'onclick="[a-zA-Z_]*(' frontend/index.html 2>/dev/null | sed 's/onclick="//;s/($//' | sort -u) \
    <(grep -oh 'function [a-zA-Z_]*' frontend/js/*.js 2>/dev/null | sed 's/function //' | sort -u) \
    2>/dev/null | wc -l)
  [ "$orphan_count" -gt 0 ] && echo "  ❌ 未定義関数: ${orphan_count}件" || echo "  ✅ 全関数が定義済み"
else
  echo "  ⚠️ ファイル未検出（スキップ）"
fi

echo ""
echo "── E-07: CSS重複セレクタ ──"
if [ -f frontend/style.css ]; then
  echo "  📊 重複定義されているセレクタ（上位10件）:"
  grep -oh '^\.[a-z][a-z0-9_-]*\|^#[a-z][a-z0-9_-]*' frontend/style.css 2>/dev/null | sort | uniq -cd | sort -rn | head -10 | sed 's/^/    ⚠️  /'
fi


# ═══════════════════════════════════════════════════════════════
section "保全確認grep（既存の鉄則ルール）"
# ═══════════════════════════════════════════════════════════════

check "escapeHtml" "🔴" "XSS対策" \
  "grep -c 'escapeHtml' frontend/js/api.js frontend/js/chat.js frontend/js/ui.js frontend/js/profile.js 2>/dev/null | awk -F: '{s+=\$2}END{print s+0}'" ">0"

check "Cookie Secure" "🔴" "Cookie安全性" \
  "grep -c 'Secure' frontend/js/globals.js frontend/js/ui.js frontend/index.html 2>/dev/null | awk -F: '{s+=\$2}END{print s+0}'" ">0"

check "console.log" "🔴" "本番汚染防止" \
  "grep -c 'console.log' frontend/index.html frontend/js/chat.js frontend/js/goals.js frontend/js/ui.js frontend/js/api.js frontend/js/profile.js frontend/js/app.js frontend/js/globals.js 2>/dev/null | awk -F: '{s+=\$2}END{print s+0}'" "=0"

check "overscroll-behavior" "🟡" "スマホスクロール" \
  "grep -c 'overscroll-behavior' frontend/style.css 2>/dev/null || echo 0" ">0"

check "renderAIUnderstanding" "🟡" "Phase1機能" \
  "grep -c 'renderAIUnderstanding' frontend/js/goals.js frontend/js/chat.js 2>/dev/null | awk -F: '{s+=\$2}END{print s+0}'" ">0"

check "壁打ちモード" "🟡" "Phase1機能" \
  "grep -c 'kabeuchi\|壁打ち\|ソクラテス' frontend/js/chat.js 2>/dev/null || echo 0" ">0"

check "マイルストーン" "🟡" "Phase1機能" \
  "grep -c 'launchConfetti\|checkMilestone' frontend/js/goals.js 2>/dev/null || echo 0" ">0"

check "音声入力" "🟡" "Phase1機能" \
  "grep -c 'transcribeAudio\|MediaRecorder' frontend/js/chat.js 2>/dev/null || echo 0" ">0"

check "Stripe URL" "🟡" "netlify残存なし" \
  "grep -c 'netlify' src/worker.js 2>/dev/null || echo 0" "=0"

check "旧AIモデル" "🟡" "gpt-4o/gemini-2.0残存なし" \
  "grep -c 'gpt-4o\|gemini-2.0\|gemini-1.5' src/worker.js 2>/dev/null || echo 0" "=0"


# ═══════════════════════════════════════════════════════════════
section "ファイル・構成情報"
# ═══════════════════════════════════════════════════════════════

echo "── ファイルサイズ ──"
for f in src/worker.js frontend/index.html frontend/style.css frontend/sw.js; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    bytes=$(wc -c < "$f")
    echo "  📊 $f: ${lines}行 / ${bytes}バイト"
  fi
done

echo ""
echo "── JSファイル行数 ──"
for f in frontend/js/*.js; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    echo "  📊 $(basename $f): ${lines}行"
  fi
done


# ═══════════════════════════════════════════════════════════════
section "最終サマリー"
# ═══════════════════════════════════════════════════════════════

echo ""
echo "  ✅ パス: $PASS件"
echo "  ❌ 要対応: $FAIL件"
echo "  📊 情報収集: $WARN件"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  結果をこのチャットに貼り付けてください。"
echo "  対応優先度の判定と修正指示書を作成します。"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

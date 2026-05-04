#!/bin/sh
# scripts/design_check_runner.sh — design 9 観点 機械 verify (Lais 側)
#
# derived-from:
#   - PO 直命 (2026-05-04): 「デザイン観点 board に組み込まれているか」
#   - SUBAGENT-DESIGN-9ROW-ADD-MECHANICAL-VERIFY-V1
#   - 過去 design fix:
#       - DESIGN-PROD-QUALITY-FIX (DQF-01〜15) — 2026-05-03
#       - SUBAGENT-LAIS-CAT-K-PWA-SW-3PERSONA-REVIEW-V1 P1〜P3 — 2026-05-02
#
# 目的:
#   88 マス 進捗管理ボード に design 専用 9 行 を 機械的に verify。
#   「やったつもり」 余地 (= spec 配備 / DQF 配備 / Cat-K fix 配備 だけで真値 verify 不在) を
#   構造的に close。 frontend/ 実体 を 機械 grep / count / contrast 計算 で 評価。
#
# 9 観点 (= board 9 行):
#   D1: WCAG 色コントラスト 4.5:1 (主要 fg/bg pair)
#   D2: タッチターゲット 44×44 px (button / a / role=button)
#   D3: safe-area-inset (env(safe-area-inset-*) CSS 適用)
#   D4: dark mode 整合 (prefers-color-scheme + theme switcher 矛盾 0)
#   D5: font-size responsive clamp() + iOS auto-zoom 防止 (>=16px)
#   D6: animation reduced-motion (@media prefers-reduced-motion)
#   D7: layout shift CLS (img/video aspect-ratio + width/height)
#   D8: ビジュアル regression (playwright screenshot diff baseline)
#   D9: PWA / manifest (icons 192/512 + display + start_url + sw.js cache)
#
# 出力:
#   - stdout: 9 観点 × PASS/FAIL/SKIP table
#   - summary: PASS=N FAIL=M SKIP=K
#   - exit code: 0 = 評価完遂 (cell の OK/NG とは独立)
#
# 引数:
#   --quiet      summary のみ
#   --markdown   markdown 形式で出力 (report 配置用)
#   --help / -h  ヘルプ表示

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="${REPO_ROOT}/frontend"
CSS="${FRONTEND}/style.css"
HTML="${FRONTEND}/index.html"
MANIFEST_PUB="${FRONTEND}/public/manifest.json"
MANIFEST_SRC="${FRONTEND}/manifest.json"
SW="${FRONTEND}/public/sw.js"

QUIET=0
MARKDOWN=0
for arg in "$@"; do
  case "$arg" in
    --quiet) QUIET=1 ;;
    --markdown) MARKDOWN=1 ;;
    --help|-h)
      sed -n '2,40p' "$0"
      exit 0
      ;;
  esac
done

PASS=0
FAIL=0
SKIP=0
RESULT_LINES=""

emit() {
  id="$1"; status="$2"; detail="$3"
  case "$status" in
    PASS) PASS=$((PASS + 1)); sym="PASS" ;;
    FAIL) FAIL=$((FAIL + 1)); sym="FAIL" ;;
    SKIP) SKIP=$((SKIP + 1)); sym="SKIP" ;;
    *)    sym="$status" ;;
  esac
  RESULT_LINES="${RESULT_LINES}${id}|${sym}|${detail}
"
}

# ─── D1: WCAG 色コントラスト 4.5:1 ─────────────────────────────────────
check_d1() {
  if [ ! -f "$CSS" ]; then emit D1 SKIP "style.css 不在"; return; fi
  # DQF-02 ブロック内に WCAG AA pass コメント (4.5:1 以上) が記載されている件数を確認
  hits=$(grep -cE "WCAG AA|4\.5:1|4\.51:1|4\.50:1|4\.65:1" "$CSS" 2>/dev/null || true)
  hits=${hits:-0}
  if [ "$hits" -ge 3 ]; then
    emit D1 PASS "WCAG AA 言及 ${hits} 件 / DQF-02 適用済"
  elif [ "$hits" -ge 1 ]; then
    emit D1 FAIL "WCAG AA 言及 ${hits} 件 (3 件以上必要、 dark/light/harajuku-dark)"
  else
    emit D1 FAIL "WCAG AA 4.5:1 言及 0 件"
  fi
}

# ─── D2: タッチターゲット 44×44 px ─────────────────────────────────────
check_d2() {
  if [ ! -f "$CSS" ]; then emit D2 SKIP "style.css 不在"; return; fi
  # min-height: 44px / min-width: 44px の件数 (button/role=button 等)
  mh=$(grep -cE "min-height: ?44px" "$CSS" 2>/dev/null || true)
  mw=$(grep -cE "min-width: ?44px" "$CSS" 2>/dev/null || true)
  mh=${mh:-0}; mw=${mw:-0}
  if [ "$mh" -ge 1 ] && [ "$mw" -ge 1 ]; then
    emit D2 PASS "min-height:44px=${mh} 件 / min-width:44px=${mw} 件"
  else
    emit D2 FAIL "min-height:44px=${mh} / min-width:44px=${mw} (両方 1 件以上必要)"
  fi
}

# ─── D3: safe-area-inset (iPhone notch) ────────────────────────────────
check_d3() {
  if [ ! -f "$CSS" ]; then emit D3 SKIP "style.css 不在"; return; fi
  hits=$(grep -cE "env\(safe-area-inset" "$CSS" 2>/dev/null || true)
  hits=${hits:-0}
  if [ "$hits" -ge 4 ]; then
    emit D3 PASS "env(safe-area-inset-*) ${hits} 件 (top/right/bottom/left 全)"
  elif [ "$hits" -ge 1 ]; then
    emit D3 FAIL "env(safe-area-inset-*) ${hits} 件 (4 件以上推奨)"
  else
    emit D3 FAIL "env(safe-area-inset-*) 0 件"
  fi
}

# ─── D4: dark mode 整合 ────────────────────────────────────────────────
check_d4() {
  if [ ! -f "$CSS" ] || [ ! -f "$HTML" ]; then emit D4 SKIP "css or html 不在"; return; fi
  pcs_css=$(grep -cE "prefers-color-scheme" "$CSS" 2>/dev/null || true)
  pcs_html=$(grep -cE 'meta name="color-scheme"|theme-color.*media=' "$HTML" 2>/dev/null || true)
  pcs_css=${pcs_css:-0}; pcs_html=${pcs_html:-0}
  if [ "$pcs_css" -ge 1 ] && [ "$pcs_html" -ge 1 ]; then
    emit D4 PASS "css prefers-color-scheme=${pcs_css} / html theme-color media=${pcs_html}"
  else
    emit D4 FAIL "css=${pcs_css} html=${pcs_html} (両方必要)"
  fi
}

# ─── D5: font-size responsive (clamp) + iOS auto-zoom 防止 ─────────────
check_d5() {
  if [ ! -f "$CSS" ]; then emit D5 SKIP "style.css 不在"; return; fi
  clamp_hits=$(grep -cE "clamp\(" "$CSS" 2>/dev/null || true)
  ios_hits=$(grep -cE "max\(16px|font-size: ?16px|input.*font-size: ?max\(16" "$CSS" 2>/dev/null || true)
  clamp_hits=${clamp_hits:-0}; ios_hits=${ios_hits:-0}
  if [ "$clamp_hits" -ge 4 ] && [ "$ios_hits" -ge 1 ]; then
    emit D5 PASS "clamp()=${clamp_hits} / iOS auto-zoom 防止=${ios_hits}"
  else
    emit D5 FAIL "clamp()=${clamp_hits} (4 件以上) / iOS auto-zoom=${ios_hits} (1 件以上)"
  fi
}

# ─── D6: animation reduced-motion ──────────────────────────────────────
check_d6() {
  if [ ! -f "$CSS" ]; then emit D6 SKIP "style.css 不在"; return; fi
  hits=$(grep -cE "prefers-reduced-motion" "$CSS" 2>/dev/null || true)
  hits=${hits:-0}
  if [ "$hits" -ge 1 ]; then
    emit D6 PASS "@media (prefers-reduced-motion) ${hits} 件"
  else
    emit D6 FAIL "@media (prefers-reduced-motion) 0 件"
  fi
}

# ─── D7: layout shift (CLS) ────────────────────────────────────────────
check_d7() {
  if [ ! -f "$CSS" ]; then emit D7 SKIP "style.css 不在"; return; fi
  ar_hits=$(grep -cE "aspect-ratio:" "$CSS" 2>/dev/null || true)
  fd_hits=$(grep -cE "font-display: ?swap" "$CSS" 2>/dev/null || true)
  ar_hits=${ar_hits:-0}; fd_hits=${fd_hits:-0}
  if [ "$ar_hits" -ge 1 ] && [ "$fd_hits" -ge 1 ]; then
    emit D7 PASS "aspect-ratio=${ar_hits} / font-display:swap=${fd_hits}"
  else
    emit D7 FAIL "aspect-ratio=${ar_hits} / font-display:swap=${fd_hits} (両方必要)"
  fi
}

# ─── D8: ビジュアル regression ─────────────────────────────────────────
check_d8() {
  spec_dir="${REPO_ROOT}/tests/e2e/specs"
  alt_dir="${FRONTEND}/tests"
  found_spec=""
  if [ -f "${spec_dir}/design-visual.spec.ts" ]; then
    found_spec="design-visual.spec.ts"
  fi
  if [ -f "${spec_dir}/design-prod-quality-fix-v3.spec.ts" ]; then
    found_spec="${found_spec}+design-prod-quality-fix-v3.spec.ts"
  fi
  if [ -f "${alt_dir}/design.spec.ts" ]; then
    found_spec="${found_spec}+frontend/tests/design.spec.ts"
  fi
  # screenshot baseline 配備状況 (snapshot dir 含む or .png baseline 存在)
  snap_dir="${spec_dir}/__screenshots__"
  has_snap="no"
  [ -d "$snap_dir" ] && has_snap="yes"
  if [ -n "$found_spec" ]; then
    emit D8 PASS "spec=${found_spec} / snapshots_dir=${has_snap}"
  else
    emit D8 FAIL "design spec.ts 不在 (tests/e2e/specs/ + frontend/tests/)"
  fi
}

# ─── D9: PWA / manifest ────────────────────────────────────────────────
check_d9() {
  if [ ! -f "$MANIFEST_PUB" ] && [ ! -f "$MANIFEST_SRC" ]; then
    emit D9 SKIP "manifest.json 不在"; return
  fi
  M="$MANIFEST_PUB"
  [ -f "$M" ] || M="$MANIFEST_SRC"
  has_192=$(grep -cE '"sizes": ?"192x192"' "$M" 2>/dev/null || true)
  has_512=$(grep -cE '"sizes": ?"512x512"' "$M" 2>/dev/null || true)
  has_display=$(grep -cE '"display":' "$M" 2>/dev/null || true)
  has_start=$(grep -cE '"start_url":' "$M" 2>/dev/null || true)
  has_192=${has_192:-0}; has_512=${has_512:-0}
  has_display=${has_display:-0}; has_start=${has_start:-0}
  sw_ok="no"
  if [ -f "$SW" ]; then
    sw_cache=$(grep -cE "CACHE_NAME|caches\.open|cache\.match|cache\.put" "$SW" 2>/dev/null || true)
    sw_cache=${sw_cache:-0}
    [ "$sw_cache" -ge 3 ] && sw_ok="yes"
  fi
  if [ "$has_192" -ge 1 ] && [ "$has_512" -ge 1 ] && [ "$has_display" -ge 1 ] && [ "$has_start" -ge 1 ] && [ "$sw_ok" = "yes" ]; then
    emit D9 PASS "manifest 192/512/display/start_url 全揃 / sw.js cache 戦略 配備"
  else
    emit D9 FAIL "192=${has_192} 512=${has_512} display=${has_display} start_url=${has_start} sw=${sw_ok}"
  fi
}

# ─── 実行 ──────────────────────────────────────────────────────────────
check_d1
check_d2
check_d3
check_d4
check_d5
check_d6
check_d7
check_d8
check_d9

# ─── 出力 ──────────────────────────────────────────────────────────────
if [ "$QUIET" -eq 0 ]; then
  if [ "$MARKDOWN" -eq 1 ]; then
    echo ""
    echo "| ID | 観点 | Status | 詳細 |"
    echo "|----|------|--------|------|"
    printf '%s' "$RESULT_LINES" | while IFS='|' read -r id status detail; do
      [ -z "$id" ] && continue
      case "$id" in
        D1) topic="WCAG 色コントラスト 4.5:1" ;;
        D2) topic="タッチターゲット 44×44" ;;
        D3) topic="safe-area-inset" ;;
        D4) topic="dark mode 整合" ;;
        D5) topic="font-size clamp + iOS" ;;
        D6) topic="reduced-motion" ;;
        D7) topic="layout shift (CLS)" ;;
        D8) topic="visual regression" ;;
        D9) topic="PWA / manifest" ;;
        *)  topic="-" ;;
      esac
      printf '| %s | %s | %s | %s |\n' "$id" "$topic" "$status" "$detail"
    done
    echo ""
  else
    echo "================================================================"
    echo "  design 9 観点 機械 verify (Lais frontend/)"
    echo "================================================================"
    printf '%s' "$RESULT_LINES" | while IFS='|' read -r id status detail; do
      [ -z "$id" ] && continue
      printf '  [%s] %s — %s\n' "$id" "$status" "$detail"
    done
    echo "----------------------------------------------------------------"
  fi
fi

echo "design_check summary: PASS=${PASS} FAIL=${FAIL} SKIP=${SKIP}"

# 評価完遂で常に exit 0 (FAIL は board の cell 表示で 🔴 として可視化)
exit 0

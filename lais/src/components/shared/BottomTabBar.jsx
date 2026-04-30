import { IconHome, IconTalk, IconMe } from '../icons/index.js';
import './BottomTabBar.css';

/*
 * BottomTabBar — 共有コンポーネント（S10-10 仕様）
 *
 * Stage 7-2 (STAGE7-2-EMOJI-TO-SVG-V1, 2026-04-28):
 *   旧インライン SVG 3 種を icons/ パッケージの IconHome / IconTalk / IconMe に置換。
 *   4 テーマ (apple / totoro / dq / cyberpunk) で各 Icon が異なるビジュアルを返す。
 *
 * 3 タブ（GROW / TALK / ME）のうち、active なタブのみ pill + ラベル表示、
 * それ以外は SVG のみ。
 *
 * Props:
 * - active: 'grow' | 'talk' | 'me' — 現在 active なタブ ID
 * - onSelect: (id) => void — タブタップ時のコールバック（未指定なら no-op）
 *
 * design_spec_v1.md §4.4 S10-10:
 *   高さ 82px / 背景 --bg-surface / border-top 1px --border-strong / padding-top 10px
 *   Active: pill 背景 --accent-subtle / padding 6px 16px / SVG 20×20 stroke --accent + ラベル 11px --accent 600
 *   Inactive: SVG 20×20 stroke --text-secondary のみ
 */

const TABS = [
  {
    id: 'grow',
    label: 'GROW',
    Icon: IconHome,
  },
  {
    id: 'talk',
    label: 'TALK',
    Icon: IconTalk,
  },
  {
    id: 'me',
    label: 'ME',
    Icon: IconMe,
  },
];

/*
 * ARIA 設計（M4-C R2-B1 で確定）:
 * 本コンポーネントは画面遷移ナビゲーションであり、tabpanel を持つタブウィジェットではない。
 * そのため role="tablist" / role="tab" / aria-selected は使わず、
 * <nav> + <button> + aria-current="page" で表現する（WAI-ARIA 1.2 Authoring Practices 準拠）。
 * Batch 2 以降の全画面で同じ設計を共有する。
 */
export function BottomTabBar({ active = 'grow', onSelect }) {
  const handleClick = (id) => {
    if (typeof onSelect === 'function') onSelect(id);
  };

  return (
    <nav class="bottom-tab-bar" aria-label="メインナビゲーション">
      <ul class="bottom-tab-bar-list">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <li key={tab.id} class="bottom-tab-bar-item">
              <button
                type="button"
                aria-current={isActive ? 'page' : undefined}
                aria-label={tab.label}
                class={
                  'bottom-tab-bar-btn ' +
                  (isActive ? 'bottom-tab-bar-btn-active' : '')
                }
                onClick={() => handleClick(tab.id)}
              >
                <span class="bottom-tab-bar-icon"><tab.Icon size={20} /></span>
                {isActive && <span class="bottom-tab-bar-label">{tab.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default BottomTabBar;

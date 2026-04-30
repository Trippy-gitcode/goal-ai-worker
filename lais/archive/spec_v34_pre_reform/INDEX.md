# spec_v34_pre_reform/INDEX.md — 旧 SSoT 廃止 archive INDEX

> **位置づけ**: dev-system v0.1.0 移行に伴い廃止された旧 SSoT (`dev_system_v34_package.md` 系) のメタデータ INDEX。
> **作成**: 2026-04-30 (SUBAGENT-DEVSYS-LAIS-RETRO-IMPL Step 6、E2-3 (c) 条件)
> **元 SSoT**: `goal-ai-worker/lais/verify/dev_system_v34_package.md` (v3.4 / R2.1.1、3503 行)
> **新 SSoT**: `dev-system/core_spec.md` (v0.1.0、471 行) + `goal-ai-worker/core_spec.md` (root コピー)

---

## 1. 廃止経緯

### 1.1 廃止日

2026-04-30 (SUBAGENT-DEVSYS-LAIS-RETRO-IMPL Step 6 / PD-015)

### 1.2 廃止理由

`dev_system_v34_package.md` (3503 行) は **Lais 固有事項** と **dev-system 共通仕様** が混在しており、Lais 以外の App で再利用不能だった。

dev-system v0.1.0 では:

1. App 非依存部分を `dev-system/core_spec.md` (471 行) に抽出 (SUBAGENT-DEVSYS-CORE-EXTRACT)
2. Lais 固有事項は Lais 側 `app_config.yaml` / 個別 `docs/plans/sub_<lais>_*.md` で管理
3. 旧 SSoT は本 archive に退避、cross-reference は **dev-system/core_spec.md** 参照に切替予定 (cleanup subagent 後送り、SUBAGENT-DEVSYS-LAIS-V34-XREF-CLEANUP)

### 1.3 PO 承認

PO-DIRECTIVE-006 / PD-015 (4/30 「OK 進めて」、E2-3 一括承認、3 条件適用)

---

## 2. archive 対象 file メタデータ

| # | file | 行数 | SHA256 | archive 日 | 廃止理由 |
|---|---|---|---|---|---|
| 1 | `dev_system_v34_package_archived_2026-04-30.md` | 3503 | `c1978990de9b9e1250449da62d1e674b6a62eef8d0b23f3b6d0ad5c6eda73a23` | 2026-04-30 | 旧 SSoT 本体、dev-system/core_spec.md に移行 |
| 2 | `dev_system_v34_package_pre_reform.md` (既 archive、`package_full/`) | - | - | (既存 archive、4/27 reform 時) | reform 過程の中間 SSoT |

`dev_system_v34_patches.md` (2373 行、SHA256: `9a3773eaba3ae0b15aebe3aedaac472c072dabcc2f680be696605ccdbb69ae20`) は本 retro では archive 対象外 (active 運用中の patch log として `lais/verify/` に保持、将来別途検討)。

---

## 3. 既 archive 内容 (2026-04-30 以前)

`spec_v34_pre_reform/` 配下に既存:

- `package_full/dev_system_v34_package_pre_reform.md` (4/27 reform 時 archive)
- `verify/` (golden_reviews, pre_reviews, round_reviews, screen_reviews, external_review)
- `instructions/` (旧 SSoT 4 ファイル archive)
- `docs_plans/` (旧 sub_*.md archive、6 件)

これらは PD-012 (lais/verify/ 過去レポート整理 = (d) 触らない) 適用範囲外の既存 archive。

---

## 4. 新 SSoT への移行表

| 旧参照 | 新参照 |
|---|---|
| `lais/verify/dev_system_v34_package.md` §2.25.16.x | `dev-system/core_spec.md` §2.x / §5.x |
| `lais/verify/dev_system_v34_package.md` §2.25.21.x | `dev-system/core_spec.md` §7 完了条件 |
| `lais/verify/dev_system_v34_package.md` §2.25.22.x | `dev-system/core_spec.md` §9 夜間自動着手モード |
| `lais/verify/dev_system_v34_package.md` §2.25.23.x | `dev-system/core_spec.md` §8 14 票投票機構 |
| `lais/verify/dev_system_v34_package.md` §C1.5 | `dev-system/core_spec.md` §3 ADV 行動規範 |

---

## 5. cross-reference 残存処理 (cleanup subagent 後送り)

本 retro merge 時点で、以下 active code path に historic reference が残存:

- `scripts/*.sh` コメント (~24 件) → `dev-system/core_spec.md` 参照置換予定 (SUBAGENT-DEVSYS-LAIS-V34-XREF-CLEANUP)
- `docs/plans/sub_*.md` Lais 既存版 (3 件)、`docs/dev-system_core_spec.md` (生成 App 配置 core_spec.md 自体に "元 dev_system_v34_package.md から抽出" の歴史記述)
- `docs/decision_log.md` / `docs/po-decisions.md` (歴史記述、保持)
- `MIGRATION.md` (新設、本 retro での引用、保持)
- `docs/research/`, `docs/ops/` 各種 ops 文書 (歴史的事故記録、保持)
- `lais/verify/dev_system_v3*` 系過去 review レポート (PD-012 (d) 適用、保持)
- `lais/specs/`, `lais/core_spec_v4.md` 等 Lais 固有 (保持)

active code path のコメント置換は本 retro 範囲外、別 subagent (`SUBAGENT-DEVSYS-LAIS-V34-XREF-CLEANUP`) で後日対応。

---

## 6. rollback 経路

万一旧 SSoT 復元が必要な場合:

```bash
# Option A: archive ファイルから手動 restore
cp /Users/futoshi/Desktop/goal-ai-worker/lais/archive/spec_v34_pre_reform/dev_system_v34_package_archived_2026-04-30.md \
   /Users/futoshi/Desktop/goal-ai-worker/lais/verify/dev_system_v34_package.md

# Option B: dev-system 側 git revert
cd /Users/futoshi/Desktop/dev-system
git tag -l | grep step-5-checkpoint  # rollback target
git reset --hard step-5-checkpoint    # ※ Lais 側 mv の git operation は別途 git restore 必要
```

完全 rollback (tar.gz):

```bash
cd /Users/futoshi/Desktop/
tar -xzf goal-ai-worker-pre-retro-2026-04-30.tar.gz  # SHA256: 81dc54b2373e9756b63671d86e38c8fad6d5c0ba9eecc658c4e462debb6e3dde
```

---

## 7. 関連ファイル

- `dev-system/core_spec.md` — 新マスター仕様 SSoT
- `dev-system/docs/architecture.md` — 完全独立モデル設計思想
- `dev-system/docs/plans/sub_lais_retro.md` — 本 retro 設計 SSoT
- `goal-ai-worker/MIGRATION.md` — opt-in 取込チェックリスト
- `goal-ai-worker/lais/archive/pre-retro-2026-04-30/` — `[breaking]` 4 件 archive snapshot

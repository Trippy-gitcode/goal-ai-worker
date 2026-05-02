# instructions/persona_review/

> Round 31 honest audit P1#12 fix (2026-05-02): 「persona review 本体不在」 (`_context_frozen.md` のみ存在) の location obfuscation を解消、 ディレクトリ構造を正規化。

## 目的

3-persona / 5-persona / 6-persona など複数 persona 並列 review の input / output を体系的に保管。
ADV が `dispatch_3persona.sh` 等で起動した review の生成物を本ディレクトリに集約することで、
- 後続 audit で「review した」 主張の証跡を mechanical に grep 可能
- 重複 review の検出 (同 mission 同 persona 二重起動の wastage 削減)
- meta integration (Wave 5 等) の統合 source として安定参照

## ディレクトリ構造

```
instructions/persona_review/
├── README.md                    (本ファイル)
├── _context_frozen.md           (各 review が共通に参照する frozen context、 既存)
├── _context_frozen.sha256       (改竄検出用 hash、 既存)
└── YYYY-MM-DD/                  (日付別 sub-dir)
    ├── <mission_id>__P1_adv_honesty.md
    ├── <mission_id>__P2_sre.md
    ├── <mission_id>__P3_compliance.md
    ├── <mission_id>__P4_security.md
    └── <mission_id>__P5_test_coverage.md
```

## ファイル命名規約

`<MISSION_ID>__P<N>_<persona_short_name>.md`
- 例: `ROUND31-CAT-J__P2_sre.md`
- 区切り `__` (double underscore) で mission ID と persona ID を分離
- persona short name: `adv_honesty` / `sre` / `compliance` / `security` / `test_coverage` 等 lowercase

## 既存 reviews の場所

過去 60 persona comprehensive review (Wave 1-4) の本体は `lais/persona_review/` および `dev-system/`
に散在しているのが現状。 本ディレクトリへの集約は次回 SUBAGENT-LAIS-PERSONA-REVIEW-CONSOLIDATE-V1
で実施予定 (P1#12 follow-up)。

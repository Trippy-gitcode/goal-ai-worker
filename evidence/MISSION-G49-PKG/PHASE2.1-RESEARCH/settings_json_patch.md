# `~/.claude/settings.json` Hook 結線パッチ（PO 手動適用必須）

**ミッション**: MISSION-G49-PKG Phase 2.2（PD-111 §2.25.9-.14 機械ゲート）
**作成日**: 2026-04-25
**理由**: ENG subagent から `~/.claude/settings.json` への直接書込が harness レベルで保護されているため、PO 手動適用 or `update-config` skill 経由の適用が必要。

## 適用前ベースライン（現在）

```json
{
  "permissions": {
    "allow": ["Bash", "Read", "Edit", "Write", "Glob", "Grep", "Skill"],
    "defaultMode": "bypassPermissions"
  },
  "skipDangerousModePermissionPrompt": true
}
```

## 適用後（merge 結果）

```json
{
  "permissions": {
    "allow": ["Bash", "Read", "Edit", "Write", "Glob", "Grep", "Skill"],
    "defaultMode": "bypassPermissions"
  },
  "skipDangerousModePermissionPrompt": true,
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/futoshi/Desktop/goal-ai-worker 2>/dev/null && [ -x scripts/adv_hot_summary.sh ] && bash scripts/adv_hot_summary.sh --section all --max-lines 30 || echo '{}'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/futoshi/Desktop/goal-ai-worker 2>/dev/null && [ -x scripts/adv_response_gate.sh ] && bash scripts/adv_response_gate.sh || exit 0"
          }
        ]
      }
    ]
  }
}
```

## 既存 hook との共存

プロジェクト `.claude/settings.json` (`/Users/futoshi/Desktop/goal-ai-worker/.claude/settings.json`) は既に下記 hook を持つ。**両者は merge され併走**する（user hook + project hook が両方発火）:

- PreToolUse(Bash): `pre-deploy-gate.sh`
- PostToolUse(Write|Edit): `post-test-antipattern.sh`
- SessionStart: `session-start-context.sh` ← 本ミッションの `adv_hot_summary` と並列発火
- SessionEnd: `session-end-report.sh`
- UserPromptSubmit: `prompt-context.sh`
- Stop: `stop-test-check.sh` ← 本ミッションの `adv_response_gate` と並列発火

両 SessionStart が `additionalContext` を出力する場合、Claude Code は両方を context に注入する（changelog 確認済）。
両 Stop hook が同時に発火しても、`adv_response_gate.sh` 側が `decision: "block"` を出した時点で応答停止される。

## fail-open 設計

- スクリプト不在時: hook command の `[ -x ... ] && bash ... || exit 0` で自動 exit 0（fail-open）
- スクリプト連続失敗 3 回: `adv_response_gate.sh` 内蔵の `$HOME/.dev-system/gate_failures` カウンタで自動 fail-open
- PO 緊急解除: `instructions/gate_override.flag` を `touch` するだけで全 gate 無効化

## 適用手順（PO 用）

```bash
# 1. 現状バックアップ
cp ~/.claude/settings.json ~/.claude/settings.json.bak.$(date +%Y%m%d)

# 2. update-config skill 起動 or 手動編集（vi / VS Code）
#    上記「適用後」JSON で書き換え

# 3. JSON 構文確認
python3 -m json.tool ~/.claude/settings.json >/dev/null && echo OK

# 4. 動作確認
echo '{}' | bash -c 'cd /Users/futoshi/Desktop/goal-ai-worker && bash scripts/adv_hot_summary.sh --section all --max-lines 30'
echo '{"session_id":"test","last_assistant_message":"完了。詳細は省略。[Review: 1 rounds, 3 personas]"}' | bash /Users/futoshi/Desktop/goal-ai-worker/scripts/adv_response_gate.sh
```

## 適用後の検証

新規 Claude Code セッション起動 → SessionStart hook で §2.25 ホットサマリーが context 注入されることを確認。
ADV 応答末尾に `[Review: N rounds, M personas]` が無い応答を生成 → Stop hook で BLOCK されることを確認。

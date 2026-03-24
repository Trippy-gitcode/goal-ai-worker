#!/usr/bin/expect -f
set timeout -1
spawn zsh -c "cd ~/Desktop/goal-ai-worker && claude"
expect {
    ">" {
        send "CLAUDE.mdとsession_progress.mdを読んでミッションキューを上から自律実行\r"
    }
    "claude" {
        sleep 2
        send "CLAUDE.mdとsession_progress.mdを読んでミッションキューを上から自律実行\r"
    }
}
interact

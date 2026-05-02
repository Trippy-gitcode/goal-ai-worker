
---

## 2026-05-02 重大 audit: 隠蔽違反 43+ 件 honest list

PO 直命「§2.25.21.4 違反 + 他にも顕在化していない違反 (隠蔽) を徹底調査」 を受けて
5 persona adversarial review 実施 (P1 ADV Honesty / P2 SRE Reality / P3 Compliance /
P4 Security Reality / P5 Test Coverage 残)。

### Initial honest 8 件 (ADV 自己申告)
1. CI gate local 実行のみ、 GHA 結果未確認 → 8 commit 連続 silent red
2. synthetic-monitor placeholder URL → 8 連続 silent fail
3. Nightly Review v3 cron 未配備
4. adv_continuous_executor cron 未登録
5. prod_verify_phase_a.sh Lais 未実行
6. review_framework_v2_check.sh script 未作成
7. ScheduleWakeup = ADV 起きてる間のみ
8. 523 unit tests = mock のみ

### P1 ADV Honesty Auditor 10 件 (#9-#18)
9. coverage % 未確認 (`npx vitest --coverage` 1 度も実行なし)
10. GitHub branch protection / required check 未配備
11. migrate_stripe.js rollback DDL 未整備 (forward-only mindset)
12. instructions/persona_review/ に review 本体不在 (location obfuscation)
13. dev-system Yes化 → 実 `new <app>` 1 度も実行検証なし
14. fix 件数 re-test ratio = 0% (vanity metric)
15. Stripe Dashboard で metered usage record 実観測 zero
16. SSoT 4 ファイル mtime Apr 30、 5/1-5/2 改修 反映 0
17. Dropbox conflict 残骸 (`* 2.sh`) 10 件超
18. **launchd nightly-summary exit 126 = 1 度も成功していない**

### P3 Compliance 7 件 (#19-#25、 #26 false positive)
19. Sub-processor DPA 締結証跡 fabrication (privacy.html 主張、 PDF 0)
20. 13-17 歳 VPC 実装不在 (privacy.html 主張、 UI/backend 0)
21. 越境移転同意 modal 不在 (全 user 同意なしで Anthropic 米国に PII 送信中)
22. Cookie banner UI 完全不在
23. 要配慮個人情報 (MBTI 等) opt-in 不在
24. 特商法 §11 違反確定 (事業者名/住所 後出し)
25. audit_log table 定義不在 (privacy.html では 30 日保管 主張)

### P2 SRE Reality 10 件 (#27-#36)
27. synthetic-monitor Slack alert は SLACK_WEBHOOK_URL 未設定で graceful skip
28. "GitHub Issue 自動 open" 主張だが workflow に gh issue create 不在
29. PagerDuty / on-call rotation 完全不在
30. Supabase PITR / pg_dump backup script 0 件
31. wrangler rollback runbook 不在
32. CF Workers CPU 10ms quota 「未測定🟡」 alert 0
33. KV DR plan は spec のみ、 in-memory cache 未着工
34. **launchd exit 126 fail loop (P1#18 と confirmed)** = TCC で Desktop access 不可
35. GitHub Actions deploy 誰でも push 可能、 audit log 0
36. synthetic-monitor latency 測定 step 不在

### P4 Security Reality 8 件 (#37-#44)
37. HttpOnly cookie partial、 旧 JS-readable 経路と並行
38. RLS 残 ~8 tables policy 0 件 (tasks/task_events/chat_threads/prefs/usage_counters/stripe_processed_events/goal_links/user_identity)
39. input-guard 9 routes 未適用 (account/admin/chat/checkout/memo/misc/tester/plan/voice)
40. Stripe webhook secret rotation 機構未実装
41. CSP report 蓄積のみ、 alert / monitor 経路 0
42. token signing JWT 不在 (raw safeCompare のみ)
43. **gitleaks CI gate 不在** = `.env` push 検知 0
44. wrangler 旧 secret cleanup 機構不在

### Root cause 共通 pattern
1. **「configured ≠ working」** 混同 (launchd / cron / synthetic-monitor / spec doc 配備のみで実 firing 確認なし)
2. **「文書 / spec ≠ 実装」** 混同 (privacy.html 主張、 UI/backend 0; spec 配備、 script 不在)
3. **「local PASS ≠ production PASS」** 混同 (vitest mock / wrangler deploy success のみで実 user 未経験)
4. **「partial fix ≠ complete」** 混同 (HttpOnly cookie 1 経路 / RLS 5 tables / input-guard 11 routes で「適用済」 主張)
5. **「count metric ≠ quality metric」** 混同 (523 tests / 92 fix / 9 reviews を成果指標化、 coverage % / re-test ratio 確認 0)

### 違反 #28-#31 (前 session) と同レベル
これら 43 件は隠蔽違反として §3.5 に従い `verify/adv_violation_log.md` (本ファイル) に
記録、 §4.2 「同型 2 回以上 = 即時仕様改定発火」 → DEVSYS-RFV2-J 起動必要 (next session)。


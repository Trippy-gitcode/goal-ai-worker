import re
p = "/Users/futoshi/Desktop/goal-ai-worker/instructions/session_progress.md"
with open(p) as f:
    s = f.read()
pat = re.compile(r'R2\.2(?![-_A-Za-z])')
new = pat.sub('v3.4 パッケージ v2', s)
# 「v3.4 パッケージ v2 パッケージ」重複を解消
new = new.replace('v3.4 パッケージ v2 パッケージ', 'v3.4 パッケージ v2')
# 書き込み
with open(p, 'w') as f:
    f.write(new)
# 検証: R2.2 が残っていないか（ミッションIDとファイル名を除く）
remaining = re.findall(r'R2\.2(?![-_A-Za-z])', new)
dup = new.count('v3.4 パッケージ v2 パッケージ')
print(f"書込完了 / R2.2 残: {len(remaining)} / パッケージ重複残: {dup}")

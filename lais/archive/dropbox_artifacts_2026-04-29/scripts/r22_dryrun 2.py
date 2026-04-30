import re
p = "/Users/futoshi/Desktop/goal-ai-worker/instructions/session_progress.md"
with open(p) as f:
    s = f.read()
pat = re.compile(r'R2\.2(?![-_A-Za-z])')
matches = pat.findall(s)
print(f"置換対象: {len(matches)} 件")
new = pat.sub('v3.4 パッケージ v2', s)
print(f"before len={len(s)}, after len={len(new)}, diff={len(new)-len(s)}")
diff_count = 0
for line_old, line_new in zip(s.splitlines(), new.splitlines()):
    if line_old != line_new:
        diff_count += 1
        print("OLD:", line_old[:120])
        print("NEW:", line_new[:120])
        print("---")
print(f"差分行数: {diff_count}")

# Lais M4-E R2 実装レビューパッケージ — S-13 Task Detail

> R1 ゴールデン (GPT-5 × 7 ペルソナ) 結果: CRITICAL 2 / HIGH 19 / MEDIUM/LOW 56 (計77)
> R2 スコープ: R1 で検出された CRITICAL 2 件を修正。HIGH 以下は PD-006 に従い Phase A 完了後一括対応。
> 3ペルソナ判定: PD-101（外部AI CRITICAL 棄却禁止）→ 両 CRITICAL とも対応必須。ADV/QA/PO代理 3者合意

---

## R1 CRITICAL 対応記録

### CRITICAL-1 (code_reviewer R-001): edit→保存で未設定フィールドが固定デフォルト値で上書きされる

**R1 指摘:** `setDraftTime(task.time || '10:00')` / `setDraftDuration(task.duration || 30)` のように `||` フォールバックでデフォルト値を入れている。task.time が undefined/null の場合、ユーザーが何も触らずに [保存] すると `'10:00'` / `30` が保存され、未設定（'—'）の意味が壊れる。

**R2 対応:**
- draft 初期値を空文字列に変更（`?? ''`）
- handleCancelEdit も同様
- handleSave で空文字列を `null` に変換して保存
- duration の `<select>` に `<option value="">未設定</option>` を追加して空状態を選択可能に
- duration を string state にして `Number()` 変換は保存時のみ

### CRITICAL-2 (sw_debugger R-001): edit モードで `aria-labelledby` が無効になり WCAG 2.4.6 / 4.1.2 違反

**R1 指摘:** `<section role="dialog" aria-labelledby={titleId}>` が参照する `<h2 id={titleId}>` は edit モードで `<input id={titleId}>` に置換されるため、ダイアログのアクセシブルネームが消失する。スクリーンリーダーがダイアログを名前で識別できない。

**R2 対応:** `aria-labelledby` を廃止し、`aria-label={` `タスク詳細: ${task.name}` `}` に切替え。常に有効なアクセシブルネームを提供。edit モードの input には別 id (`editNameId = useId()`) を割り当てる。

---

## 変更ファイル（R1 → R2 差分）

### lais/src/components/screens/S13TaskDetail.jsx

```jsx
// import 追加: editNameId
const titleId = useId();
const editNameId = useId();

// state 初期値を空文字列に変更
const [draftName, setDraftName] = useState('');
const [draftTime, setDraftTime] = useState('');
const [draftDuration, setDraftDuration] = useState('');
const [draftMemo, setDraftMemo] = useState('');

// open 時の初期化
useEffect(() => {
  if (!open || !task) return;
  setMode('view');
  setDraftName(task.name ?? '');
  setDraftTime(task.time ?? '');
  setDraftDuration(task.duration != null ? String(task.duration) : '');
  setDraftMemo(task.memo ?? '');
}, [open, task]);

// キャンセル復帰
const handleCancelEdit = useCallback(() => {
  if (!task) return;
  setDraftName(task.name ?? '');
  setDraftTime(task.time ?? '');
  setDraftDuration(task.duration != null ? String(task.duration) : '');
  setDraftMemo(task.memo ?? '');
  setMode('view');
}, [task]);

// 保存時に空文字列を null として保持
const payload = {
  ...task,
  name: draftName.trim(),
  time: draftTime === '' ? null : draftTime,
  duration: draftDuration === '' ? null : Number(draftDuration),
  memo: draftMemo,
};

// dialog の aria-label に切替
<section
  ref={dialogRef}
  class="s13-modal"
  role="dialog"
  aria-modal="true"
  aria-label={`タスク詳細: ${task.name}`}
>

// edit モードの input に別 id
{mode === 'view' ? (
  <h2 id={titleId} class="s13-task-name">{task.name}</h2>
) : (
  <input
    ref={editFirstFocusRef}
    id={editNameId}
    class="s13-task-name s13-input s13-edit-name"
    type="text"
    value={draftName}
    onInput={(e) => setDraftName(e.currentTarget.value)}
    placeholder="タスク名"
    aria-label="タスク名"
    maxLength={120}
  />
)}

// duration select に空オプション追加
<select
  class="s13-input s13-edit-duration"
  value={draftDuration}
  onChange={(e) => setDraftDuration(e.currentTarget.value)}
  aria-label="所要時間"
>
  <option value="">未設定</option>
  {DURATION_OPTIONS.map((min) => (
    <option key={min} value={String(min)}>{min}分</option>
  ))}
</select>
```

---

## 未対応 (HIGH 以下) の扱い

R1 で検出された HIGH 19 / MEDIUM 26 / LOW 30 は PD-006 に従い **Phase A 完了後まとめて対応**。security_engineer の HIGH 1 件は session_progress.md 提案ログに記録予定（PD-102）。R2 の目的は **CRITICAL 0 確定**。

---

## レビュアーへの依頼

1. R1 の CRITICAL 2 件が正しく解消されているか確認
2. CRITICAL が 0 件であることを確認
3. HIGH 以下は許容（Phase A 完了後一括対応）

JSON 形式で指摘ください。

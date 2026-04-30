// REWRITE-03: 3ステップタスク追加フロー Preactコンポーネント
import { h } from 'preact';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

// ローカル推論辞書
const LOCATION_HINTS = {
  '役所|区役所|市役所|銀行|郵便局|病院|クリニック|歯医者|美容院|美容室|整体|ジム': { location: '外出先', time_constraint: '営業時間内', energy_level: 'low' },
  '買い物|スーパー|コンビニ|ドラッグストア|ホームセンター|百均': { location: '外出先', energy_level: 'low' },
  '調査|調べ|リサーチ|投稿|メール|レポート|資料|企画|設計': { location: '自宅', energy_level: 'high' },
  '掃除|洗濯|片付け|整理|ゴミ出し': { location: '自宅', energy_level: 'low', estimated_minutes: 30 },
  '勉強|学習|読書|本を読む|資格': { location: '自宅', energy_level: 'high', estimated_minutes: 60 },
  '電話|連絡|予約|申し込み': { location: '自宅', energy_level: 'low', estimated_minutes: 15 },
  '打ち合わせ|ミーティング|MTG|会議': { location: 'オフィス', energy_level: 'high', estimated_minutes: 60 },
  '引っ越し|転居届|転入届|住民票': { location: '外出先', time_constraint: '営業時間内', estimated_minutes: 60 },
};

function localInferTask(title) {
  const result = { location: null, time_constraint: null, energy_level: 'medium', estimated_minutes: null };
  for (const [pattern, defaults] of Object.entries(LOCATION_HINTS)) {
    if (new RegExp(pattern).test(title)) { Object.assign(result, defaults); break; }
  }
  return result;
}

function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function getDeadlinePresets() {
  const today = new Date(); const tmr = new Date(today); tmr.setDate(today.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + (7 - today.getDay()));
  const nextWeekEnd = new Date(weekEnd); nextWeekEnd.setDate(weekEnd.getDate() + 7);
  const fmt = d => d.toISOString().slice(0, 10);
  return [
    { label: '今日', value: fmt(today) }, { label: '明日', value: fmt(tmr) },
    { label: '今週中', value: fmt(weekEnd) }, { label: '来週中', value: fmt(nextWeekEnd) },
    { label: '日付選択', value: 'pick' }, { label: 'なし', value: '' }
  ];
}

export function TaskAddFlow() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({ name: '', deadline: null, location: null, estimated_minutes: null, energy_level: null, time_constraint: null, context: null, risk: null });
  const [selectedDeadline, setSelectedDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([]);
  const chatHistoryRef = useRef([]);
  const nameRef = useRef(null);
  const dateRef = useRef(null);
  const chatInputRef = useRef(null);
  const drumRef = useRef(null);

  // ═══ Window bridge ═══
  useEffect(() => {
    window.openTodayAddTask = () => {
      setIsOpen(true); setStep(1);
      setDraft({ name: '', deadline: null, location: null, estimated_minutes: null, energy_level: null, time_constraint: null, context: null, risk: null });
      setSelectedDeadline(null); setShowDatePicker(false); setChatMsgs([]);
      chatHistoryRef.current = [];
      setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 100);
    };
    window.closeTodayAddTask = () => { setIsOpen(false); };
    window._preactTaskAddMounted = true;
    return () => { delete window.openTodayAddTask; delete window.closeTodayAddTask; delete window._preactTaskAddMounted; };
  }, []);

  // ═══ Step 1 → Step 2 ═══
  const goStep2 = useCallback(() => {
    const name = nameRef.current?.value?.trim();
    if (!name) { if (typeof window.toast === 'function') window.toast('タスク名を入力してください'); return; }
    const dl = showDatePicker && dateRef.current?.value ? dateRef.current.value : (selectedDeadline || null);
    const inferred = localInferTask(name);
    const newDraft = { ...draft, name, deadline: dl, ...inferred };
    if (!newDraft.estimated_minutes) newDraft.estimated_minutes = 30;
    setDraft(newDraft); setStep(2);
    // Scroll drum to selected value
    setTimeout(() => {
      if (drumRef.current) {
        const target = drumRef.current.querySelector(`[data-min="${newDraft.estimated_minutes}"]`);
        if (target) target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    }, 100);
  }, [draft, selectedDeadline, showDatePicker]);

  // ═══ Step 2 pick ═══
  const pickField = useCallback((field, val) => {
    setDraft(prev => ({ ...prev, [field]: field === 'estimated_minutes' ? parseInt(val, 10) : val }));
  }, []);

  // ═══ Step 2 → Step 3 ═══
  const goStep3 = useCallback(() => {
    setStep(3);
    setChatMsgs([{ role: 'ai', text: `「${esc(draft.name)}」について教えてください。何の用件ですか？` }]);
    chatHistoryRef.current = [];
    setTimeout(() => chatInputRef.current?.focus({ preventScroll: true }), 100);
  }, [draft.name]);

  // ═══ Complete (from Step 2) ═══
  const complete = useCallback(async () => {
    const d = draft;
    const parts = [];
    if (d.deadline) parts.push(`deadline=${d.deadline}`);
    if (d.location) parts.push(`location=${d.location}`);
    if (d.estimated_minutes) parts.push(`estimated_minutes=${d.estimated_minutes}`);
    if (d.energy_level) parts.push(`energy_level=${d.energy_level}`);
    if (d.time_constraint) parts.push(`time_constraint=${d.time_constraint}`);
    if (d.context) parts.push(`context=${d.context}`);
    if (d.risk) parts.push(`risk=${d.risk}`);
    const tag = `[TASK_UPDATE:add:${d.name}${parts.length ? ':' + parts.join(':') : ''}]`;
    if (typeof window.processTaskUpdateTags === 'function') await window.processTaskUpdateTags(tag);
    setIsOpen(false);
    if (typeof window.renderTodayScreen === 'function') window.renderTodayScreen();
    if (typeof window.toast === 'function') window.toast('タスクを追加しました');
  }, [draft]);

  // ═══ Step 3: AI chat ═══
  const sendChatMsg = useCallback(async () => {
    const text = chatInputRef.current?.value?.trim();
    if (!text) return;
    chatInputRef.current.value = '';
    setChatMsgs(prev => [...prev, { role: 'user', text }]);

    const prompt = chatHistoryRef.current.length === 0
      ? `タスク「${draft.name}」(期日:${draft.deadline || '未定'}, 場所:${draft.location || '未定'})について、ユーザーが「${text}」と答えた。context, risk, worst_case, estimated_minutesを推測してJSONで返して。`
      : text;
    chatHistoryRef.current.push({ role: 'user', content: prompt });

    try {
      const res = await fetch(`${window.WORKER_URL}/api/chat/gpt-simple`, {
        method: 'POST', headers: window.getAuthHeaders(),
        body: JSON.stringify({ system: 'タスク詳細ヒアリングアシスタント。JSONで返答: {"context":"","risk":"","worst_case":"","estimated_minutes":30}', messages: chatHistoryRef.current.slice(-6), maxTokens: 300 })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      chatHistoryRef.current.push({ role: 'assistant', content: reply });
      setChatMsgs(prev => [...prev, { role: 'ai', text: reply }]);
      // Try to extract JSON
      try {
        const json = JSON.parse(reply.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (json.context || json.risk || json.estimated_minutes) {
          setDraft(prev => ({ ...prev, ...json }));
          setTimeout(() => complete(), 500);
        }
      } catch (e) { /* continue dialogue */ }
    } catch (e) {
      setChatMsgs(prev => [...prev, { role: 'ai', text: 'エラーが発生しました。' }]);
      setTimeout(() => complete(), 1000);
    }
  }, [draft, complete]);

  if (!isOpen) return null;

  const presets = getDeadlinePresets();
  const locationOpts = ['自宅', '外出先', 'オフィス'];
  const timeOpts = ['営業時間内', '午前のみ', '午後のみ', 'いつでも'];
  const minuteValues = [];
  for (let m = 5; m <= 240; m += 5) minuteValues.push(m);

  const chipStyle = (sel) => `padding:5px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:var(--ff);border:1px solid ${sel ? 'var(--amber)' : 'var(--border-card)'};background:${sel ? 'var(--amber-d)' : 'var(--bg3)'};color:var(--cream);transition:all .15s;`;

  return h('div', { style: 'display:contents;' },
    // Overlay
    h('div', { onClick: () => setIsOpen(false), style: 'position:fixed;inset:0;z-index:299;background:rgba(0,0,0,.3);' }),
    // Sheet
    h('div', { id: 'task-add-sheet', style: 'position:fixed;bottom:0;left:0;right:0;z-index:300;background:var(--bg2);border-top:1px solid var(--border2);border-radius:16px 16px 0 0;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 -4px 24px rgba(0,0,0,.4);overflow-y:auto;' },
      // Header
      h('div', { style: 'display:flex;align-items:center;padding:12px 16px;border-bottom:0.5px solid var(--border);' },
        h('div', { style: 'font-size:13px;font-weight:500;color:var(--cream);flex:1;' },
          step === 1 ? 'タスクを追加' : step === 2 ? `「${esc(draft.name)}」の詳細` : 'もう少し詳しく'),
        h('button', { onClick: () => setIsOpen(false), style: 'background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:4px 8px;' }, '✕')
      ),

      // Step 1
      step === 1 ? h('div', { style: 'padding:16px;' },
        h('label', { style: 'font-size:12px;color:var(--muted);display:block;margin-bottom:6px;' }, 'タスク名'),
        h('input', { ref: nameRef, placeholder: 'やりたいことを入力...', onKeyDown: (e) => { if (e.key === 'Enter') goStep2(); },
          style: 'width:100%;padding:10px 12px;background:var(--bg3);border:0.5px solid var(--border);border-radius:10px;color:var(--cream);font-family:var(--ff);font-size:13px;outline:none;box-sizing:border-box;margin-bottom:12px;' }),
        h('label', { style: 'font-size:12px;color:var(--muted);display:block;margin-bottom:6px;' }, 'いつまで？（任意）'),
        h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;' },
          presets.map(p => h('button', { key: p.value, class: 'task-dl-btn',
            onClick: () => {
              if (p.value === 'pick') { setShowDatePicker(true); setSelectedDeadline(null); }
              else { setSelectedDeadline(p.value); setShowDatePicker(false); }
            },
            style: `padding:6px 12px;background:${selectedDeadline === p.value ? 'var(--amber-d)' : 'var(--bg3)'};border:1px solid ${selectedDeadline === p.value ? 'var(--amber)' : 'var(--border-card)'};border-radius:8px;font-size:12px;color:var(--cream);cursor:pointer;font-family:var(--ff);transition:all .15s;`
          }, p.label))
        ),
        showDatePicker ? h('input', { ref: dateRef, type: 'date', style: 'padding:8px 10px;background:var(--bg3);border:0.5px solid var(--border);border-radius:8px;color:var(--cream);font-family:var(--ff);font-size:12px;margin-bottom:16px;color-scheme:dark;' }) : null,
        h('button', { onClick: goStep2, style: 'width:100%;padding:10px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;' }, '次へ →')
      ) : null,

      // Step 2
      step === 2 ? h('div', { style: 'padding:16px;' },
        // Location chips
        h('div', { style: 'margin-bottom:12px;' },
          h('div', { style: 'font-size:12px;color:var(--muted);margin-bottom:4px;' }, '📍 場所は？'),
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;' },
            locationOpts.map(o => h('button', { key: o, onClick: () => pickField('location', o), style: chipStyle(draft.location === o) }, (draft.location === o ? '▶ ' : '') + o))
          )
        ),
        // Drum picker for minutes
        h('div', { style: 'margin-bottom:12px;' },
          h('div', { style: 'font-size:12px;color:var(--muted);margin-bottom:4px;' }, '⏱ どのくらい？'),
          h('div', { style: 'position:relative;height:100px;overflow:hidden;border:1px solid var(--border-card);border-radius:10px;background:var(--bg3);' },
            h('div', { style: 'position:absolute;top:50%;left:0;right:0;height:32px;transform:translateY(-50%);background:var(--amber-d);border-top:1px solid var(--amber);border-bottom:1px solid var(--amber);pointer-events:none;z-index:1;' }),
            h('div', { ref: drumRef, style: 'overflow-y:scroll;height:100%;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;' },
              h('div', { style: 'height:34px;' }),
              minuteValues.map(m => {
                const lbl = m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? m % 60 + '分' : ''}` : `${m}分`;
                return h('div', { key: m, 'data-min': m, onClick: () => pickField('estimated_minutes', m),
                  style: 'height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--cream);scroll-snap-align:center;cursor:pointer;' }, lbl);
              }),
              h('div', { style: 'height:34px;' })
            )
          )
        ),
        // Time constraint chips
        h('div', { style: 'margin-bottom:16px;' },
          h('div', { style: 'font-size:12px;color:var(--muted);margin-bottom:4px;' }, '🕐 時間の制約は？'),
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;' },
            timeOpts.map(o => h('button', { key: o, onClick: () => pickField('time_constraint', o), style: chipStyle(draft.time_constraint === o) }, (draft.time_constraint === o ? '▶ ' : '') + o))
          )
        ),
        // Buttons
        h('div', { style: 'display:flex;gap:8px;' },
          h('button', { onClick: complete, style: 'flex:1;padding:10px;background:var(--send-btn-grad);color:var(--text-on-accent);border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;' }, 'これでOK'),
          h('button', { onClick: goStep3, style: 'flex:1;padding:10px;background:var(--bg3);color:var(--cream);border:1px solid var(--border-card);border-radius:10px;font-size:13px;cursor:pointer;' }, 'もう少し詳しく')
        )
      ) : null,

      // Step 3
      step === 3 ? h('div', { style: 'padding:0;' },
        h('div', { style: 'overflow-y:auto;padding:10px 16px;max-height:30vh;' },
          chatMsgs.map((m, i) => h('div', { key: i, style: `margin:6px 0;text-align:${m.role === 'user' ? 'right' : 'left'};` },
            h('span', { style: `display:inline-block;padding:6px 10px;border-radius:8px;font-size:12px;max-width:85%;text-align:left;background:${m.role === 'user' ? 'var(--amber-d)' : 'var(--bg3)'};color:var(--cream);` }, m.text)
          ))
        ),
        h('div', { style: 'padding:8px 16px 12px;display:flex;gap:6px;align-items:center;' },
          h('input', { ref: chatInputRef, placeholder: '詳細を入力...', onKeyDown: (e) => { if (e.key === 'Enter') sendChatMsg(); },
            style: 'flex:1;padding:10px 12px;background:var(--bg3);border:0.5px solid var(--border);border-radius:10px;color:var(--cream);font-family:var(--ff);font-size:13px;outline:none;' }),
          h('button', { onClick: sendChatMsg, style: 'width:36px;height:36px;border-radius:50%;background:var(--amber);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;' },
            h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2 },
              h('line', { x1: 22, y1: 2, x2: 11, y2: 13 }),
              h('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })
            )
          )
        )
      ) : null
    )
  );
}

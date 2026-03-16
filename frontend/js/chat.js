// ════════ CHAT ════════
function getLogoSVG(size){return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="lg${size}" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8920a"/><stop offset="100%" stop-color="#f5d380"/></linearGradient></defs><path d="M26 70 L32 40 L42 55 L50 24 L58 55 L68 40 L74 70 Z" fill="url(#lg${size})"/></svg>`;}
function getUserAvatarText(){const n=USER_PROFILE.nickname||USER_PROFILE.name||'';return n?n.charAt(0):'';}
function showTyping() { showChatTyping(document.getElementById('home-chat-inner'), 'typing-indicator'); }
function hideTyping() { hideChatTyping('typing-indicator'); }

function startReview() {
  showPage('home');
  const reviewMsg = spartanMode
    ? 'スパルタレビューを開始します。今月の進捗と遅延理由を正直に報告してください。'
    : '月次レビューを始めましょう。今月どうでしたか？';
  document.getElementById('home-msg-in').value = reviewMsg;
  sendHomeMsg();
}

// ════════ WELCOME / NEW GOAL ════════
function showWelcome(){showPage('welcome');}
function setEx(t){document.getElementById('wlc-in').value=t;document.getElementById('wlc-in').focus();}
async function startGoal(){
  const v=document.getElementById('wlc-in').value.trim();if(!v)return;

  // Supabaseにゴール作成
  const colors = ['var(--amber)','var(--blue)','var(--green)','var(--purple)','var(--orange)'];
  let goalObj = {
    id: 'temp_'+Date.now(), supabaseId: null,
    title: v, color: colors[ALL_GOALS.length % colors.length],
    actual: 0, target: 0, deadline: null,
    phases: [], archived: false, lastMilestonePct: 0
  };

  if (AUTH_TOKEN) {
    const saved = await apiCreateGoal(v);
    if (saved) {
      goalObj.id = saved.id;
      goalObj.supabaseId = saved.id;
      goalObj.deadline = saved.target_date || null;
    }
  }

  ALL_GOALS.push(goalObj);
  renderSidebarGoals();

  // Open goal hub chat with AI hearing
  const idx = ALL_GOALS.length - 1;
  openGoalHub(idx);
  switchHubTab('chat');

  // Start AI hearing conversation
  const hearingSys = `あなたはGOAL AIのゴール設定パートナーです。ユーザーが「${v}」というゴールを立てました。

【あなたの役割】
このゴールを具体的で達成可能な形に固めるため、ヒアリングを行います。

【進め方】
1. まず「なぜこのゴールを達成したいのか？」を聞く
2. 次に「いつまでに達成したいか？」を聞く
3. 「成功の定義（何ができたら達成と言える？）」を聞く
4. ヒアリングが十分になったら、タイトル・期限・成功基準をまとめて確認する
5. ユーザーが納得したら、具体的なタスクを一緒に考える

【ルール】
- 1回に1つの質問だけ
- 2〜3文で端的に
- 温かく、でも核心を突く
- ユーザーが納得するまで次に進まない`;

  hubChatHistories[goalObj.id] = [];
  hubChatMsgs[goalObj.id] = [];

  // Send initial AI message
  hubChatLoading = true;
  try {
    await chatStream({
      system: hearingSys, messages:[{role:'user',content:`「${v}」をゴールにしたい`}], maxTokens:300,
      innerEl: 'hub-chat-inner', scrollEl: 'hub-chat-wrap',
      onDone(t){
        hubChatMsgs[goalObj.id].push({role:'ai',content:t,time:now()});
        hubChatHistories[goalObj.id].push({role:'user',content:`「${v}」をゴールにしたい`});
        hubChatHistories[goalObj.id].push({role:'assistant',content:t});
        renderHubChat();
        if(goalObj.supabaseId) apiSaveMessages([{role:'assistant',content:t,goalId:goalObj.supabaseId,aiModel:'claude',messageType:'hub_chat'}]);
      }
    });
  }catch(e){}
  hubChatLoading = false;
}
document.getElementById('wlc-in').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&!_isComposing)startGoal();});


// ════════ VOICE INPUT（ハイブリッド：Web Speech API + Whisper + 音量連動）════════
let homeRecording = false;
let homeMediaRecorder = null;
let homeAudioChunks = [];
let homeSpeechRecognition = null;
let homeSpeechResult = '';
let homeSpeechGotResult = false;
let voiceAudioCtx = null;
let voiceAnalyser = null;
let voiceAnimFrame = null;
let voiceInterimBubbleEl = null;
let voiceTimeoutId = null;

function voiceUIStart(){
  const btn = document.getElementById('home-voice-btn');
  const inp = document.getElementById('home-msg-in');
  const area = document.getElementById('home-input-area');
  btn.classList.add('recording');
  btn.title = '録音中（クリックで停止）';
  inp.classList.add('voice-interim');
  if(area) area.classList.add('voice-active');
  homeRecording = true;
}

function voiceUIStop(){
  const btn = document.getElementById('home-voice-btn');
  const inp = document.getElementById('home-msg-in');
  const area = document.getElementById('home-input-area');
  btn.classList.remove('recording');
  btn.title = '音声入力';
  btn.style.opacity = '';
  inp.classList.remove('voice-interim');
  inp.classList.remove('voice-final');
  if(area) area.classList.remove('voice-active');
  homeRecording = false;
  // タイムアウトクリア
  if(voiceTimeoutId){ clearTimeout(voiceTimeoutId); voiceTimeoutId=null; }
  // アニメーション停止
  if(voiceAnimFrame){ cancelAnimationFrame(voiceAnimFrame); voiceAnimFrame=null; }
  // リングリセット
  const rings = btn.querySelectorAll('.voice-ring');
  rings.forEach(r=>{ r.style.transform='scale(1)'; r.style.opacity='0'; });
  const icon = document.getElementById('home-voice-icon');
  if(icon){ icon.style.transform=''; icon.style.filter=''; }
  // AudioContext閉じる
  if(voiceAudioCtx){ try{voiceAudioCtx.close();}catch(e){} voiceAudioCtx=null; voiceAnalyser=null; }
  // インテリムバブル削除
  removeVoiceInterimBubble();
}

function voiceSetFinal(text){
  const inp = document.getElementById('home-msg-in');
  inp.value = text;
  inp.classList.remove('voice-interim');
  inp.classList.add('voice-final');
  homeResize(inp);
  setTimeout(()=>inp.classList.remove('voice-final'), 600);
  // Feature 9: 長い音声入力ならタスク変換を提案
  if(text.length > 50) setTimeout(()=>proposeVoiceTask(text), 1000);
}

// 音量レベル連動アニメーション
function startVoiceLevelAnim(stream){
  try{
    voiceAudioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const source = voiceAudioCtx.createMediaStreamSource(stream);
    voiceAnalyser = voiceAudioCtx.createAnalyser();
    voiceAnalyser.fftSize = 256;
    voiceAnalyser.smoothingTimeConstant = 0.7;
    source.connect(voiceAnalyser);
    const dataArr = new Uint8Array(voiceAnalyser.frequencyBinCount);
    const btn = document.getElementById('home-voice-btn');
    const icon = document.getElementById('home-voice-icon');
    const rings = btn.querySelectorAll('.voice-ring');
    const innerRing = rings[0], outerRing = rings[1];

    function tick(){
      if(!homeRecording) return;
      voiceAnalyser.getByteFrequencyData(dataArr);
      // 平均音量を0〜1に正規化
      let sum=0; for(let i=0;i<dataArr.length;i++) sum+=dataArr[i];
      const avg = sum/dataArr.length/255;
      const level = Math.min(avg*2.5, 1); // 感度ブースト

      // アイコンスケール 1.0〜1.3
      const iconScale = 1 + level*0.3;
      const glowSize = 4 + level*12;
      const glowAlpha = 0.3 + level*0.5;
      if(icon){
        icon.style.transform = `scale(${iconScale})`;
        icon.style.filter = `drop-shadow(0 0 ${glowSize}px rgba(224,104,104,${glowAlpha}))`;
      }
      // 内側リング
      if(innerRing){
        const s1 = 1 + level*0.8;
        innerRing.style.transform = `translate(-50%,-50%) scale(${s1})`;
        innerRing.style.opacity = 0.3 + level*0.5;
      }
      // 外側リング
      if(outerRing){
        const s2 = 1 + level*1.2;
        outerRing.style.transform = `translate(-50%,-50%) scale(${s2})`;
        outerRing.style.opacity = 0.15 + level*0.4;
      }

      voiceAnimFrame = requestAnimationFrame(tick);
    }
    voiceAnimFrame = requestAnimationFrame(tick);
  }catch(e){
    // AudioContext unavailable for level animation
  }
}

// チャットウィンドウ内にインテリムバブルを表示
function showVoiceInterimBubble(text){
  const container = document.getElementById('home-chat-inner');
  if(!container) return;
  if(!voiceInterimBubbleEl){
    const wrap = document.createElement('div');
    wrap.className = 'msg user';
    wrap.id = 'voice-interim-msg';
    wrap.style.marginBottom = '16px';
    const av = document.createElement('div');
    av.className = 'msg-av user';
    const ut = getUserAvatarText();
    if(ut) av.textContent=ut;
    else av.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';
    const body = document.createElement('div');
    body.className = 'msg-body';
    const bub = document.createElement('div');
    bub.className = 'bubble voice-interim-bubble';
    bub.id = 'voice-interim-bub';
    body.appendChild(bub);
    wrap.appendChild(av);
    wrap.appendChild(body);
    container.appendChild(wrap);
    voiceInterimBubbleEl = wrap;
  }
  const bub = document.getElementById('voice-interim-bub');
  if(bub) bub.innerHTML = text.replace(/\n/g,'<br>') + '<span style="animation:voiceFadeIn .5s ease infinite alternate;display:inline-block;margin-left:2px;">|</span>';
  // スクロール追従
  const chatWrap = document.getElementById('home-chat-wrap');
  if(chatWrap) chatWrap.scrollTop = chatWrap.scrollHeight;
}

function removeVoiceInterimBubble(){
  if(voiceInterimBubbleEl){
    voiceInterimBubbleEl.remove();
    voiceInterimBubbleEl = null;
  }
}

async function toggleHomeVoice(){
  if(homeRecording){
    if(voiceTimeoutId){ clearTimeout(voiceTimeoutId); voiceTimeoutId=null; }
    homeSpeechRecognition?.stop();
    homeMediaRecorder?.stop();
    return;
  }
  homeSpeechResult = '';
  homeSpeechGotResult = false;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasWebSpeech = !!SR;

  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    homeAudioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
                   : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
    homeMediaRecorder = new MediaRecorder(stream, {mimeType});
    homeMediaRecorder.ondataavailable = e => homeAudioChunks.push(e.data);

    homeMediaRecorder.onstop = async ()=>{
      // ストリームはまだ閉じない（AudioContextが使っている可能性）
      const btn = document.getElementById('home-voice-btn');
      const inp = document.getElementById('home-msg-in');

      // インテリムバブル削除
      removeVoiceInterimBubble();

      // Web Speechの結果があればそれを使う
      if(homeSpeechGotResult && homeSpeechResult){
        voiceSetFinal(homeSpeechResult);
        stream.getTracks().forEach(t=>t.stop());
        voiceUIStop();
        updateHomePlaceholder();
        return;
      }

      // Whisperフォールバック
      stream.getTracks().forEach(t=>t.stop());
      voiceUIStop();
      inp.value = '';
      inp.placeholder = '音声を認識中…';
      btn.style.opacity = '.4';

      try{
        const blob = new Blob(homeAudioChunks, {type:mimeType});
        const base64 = await new Promise((resolve,reject)=>{
          const reader = new FileReader();
          reader.onload = ()=>resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const res = await fetch(`${WORKER_URL}/api/voice/transcribe`,{
          method:'POST', headers:getAuthHeaders(),
          body:JSON.stringify({audio:base64, mimeType})
        });
        const data = await res.json();
        if(data.text){
          voiceSetFinal(data.text);
        } else {
          toast('音声を認識できませんでした');
        }
      }catch(e){
        toast('音声認識に失敗しました');
      }
      btn.style.opacity = '';
      updateHomePlaceholder();
    };

    // 録音開始
    homeMediaRecorder.start();
    voiceUIStart();

    // 音量レベル連動アニメーション開始
    startVoiceLevelAnim(stream);

    // R: 4秒タイムアウトで自動停止
    voiceTimeoutId = setTimeout(()=>{
      if(homeRecording){
        homeSpeechRecognition?.stop();
        homeMediaRecorder?.stop();
      }
    }, 4000);

    // Web Speech APIも同時に開始
    if(hasWebSpeech){
      try{
        const recognition = new SR();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;
        homeSpeechRecognition = recognition;

        recognition.onresult = (e)=>{
          let interim = '', final = '';
          for(let i=0; i<e.results.length; i++){
            if(e.results[i].isFinal){
              final += e.results[i][0].transcript;
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          if(final){
            homeSpeechResult = final;
            homeSpeechGotResult = true;
          }
          const display = (final || '') + (interim || '');
          // 入力欄にリアルタイム表示
          const inp = document.getElementById('home-msg-in');
          if(display){
            inp.value = display;
            inp.classList.toggle('voice-interim', !!(interim && !final));
            homeResize(inp);
          }
          // チャットウィンドウ内にインテリムバブル表示
          if(display){
            showVoiceInterimBubble(display);
          }
        };
        recognition.onerror = (e)=>{
          if(e.error !== 'no-speech' && e.error !== 'aborted'){
            // Web Speech error (non-critical)
          }
        };
        recognition.onend = ()=>{
          homeSpeechRecognition = null;
        };
        recognition.start();
      }catch(e){
        // Web Speech unavailable, using Whisper only
      }
    }
  }catch(e){
    toast('マイクへのアクセスが許可されていません');
    voiceUIStop();
  }
}

// ════════ IMAGE INPUT ════════
let homeImageData = null;

function handleHomeImage(input){
  const file = input.files?.[0];
  if(!file) return;
  processHomeImageFile(file);
  input.value = '';
}

function handleHomePaste(e){
  const items = e.clipboardData?.items;
  if(!items) return;
  for(const item of items){
    if(item.type.startsWith('image/')){
      e.preventDefault();
      const file = item.getAsFile();
      if(file) processHomeImageFile(file);
      return;
    }
  }
}

function handleHomeDrop(e){
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if(files && files.length > 0){
    const file = files[0];
    if(file.type.startsWith('image/')) processHomeImageFile(file);
  }
}

function processHomeImageFile(file){
  if(file.size > 5*1024*1024){ toast('画像サイズは5MB以下にしてください'); return; }
  compressImage(file, 1200).then(result => {
    homeImageData = { base64: result.base64, type: result.type, name: result.name };
    showHomeImagePreview();
  });
}

function showHomeImagePreview(){
  if(!homeImageData) return;
  const preview = document.getElementById('home-img-preview');
  preview.style.display = 'block';
  preview.innerHTML = `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;">
    <img id="home-img-thumb" src="data:${homeImageData.type};base64,${homeImageData.base64}" style="width:auto;height:60px;object-fit:cover;border-radius:5px;">
    <span id="home-img-name" style="font-size:11px;color:var(--muted);flex:1;">${escapeHtml(homeImageData.name)}</span>
    <span onclick="clearHomeImage()" style="font-size:11px;color:var(--muted);cursor:pointer;padding:2px 6px;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--muted)'">✕ 削除</span>
  </div>`;
}
function clearHomeImage(){
  homeImageData=null;
  document.getElementById('home-img-preview').style.display='none';
  document.getElementById('home-img-in').value='';
}

// ════════ DRAG & DROP（チャット画面全体）════════
(function(){
  let dragCounter=0;
  const getOverlay=()=>document.getElementById('drop-overlay');
  document.addEventListener('dragenter',(e)=>{
    if(!e.dataTransfer.types.includes('Files'))return;
    e.preventDefault();
    dragCounter++;
    const ov=getOverlay();if(ov)ov.classList.add('show');
  });
  document.addEventListener('dragover',(e)=>{
    if(!e.dataTransfer.types.includes('Files'))return;
    e.preventDefault();e.dataTransfer.dropEffect='copy';
  });
  document.addEventListener('dragleave',(e)=>{
    dragCounter--;
    if(dragCounter<=0){dragCounter=0;const ov=getOverlay();if(ov)ov.classList.remove('show');}
  });
  document.addEventListener('drop',(e)=>{
    e.preventDefault();dragCounter=0;
    const ov=getOverlay();if(ov)ov.classList.remove('show');
    const file=e.dataTransfer.files[0];
    if(!file||!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      homeImageData={base64:ev.target.result.split(',')[1], type:file.type, name:file.name};
      const prev=document.getElementById('home-img-preview');
      const thumb=document.getElementById('home-img-thumb');
      const name=document.getElementById('home-img-name');
      prev.style.display='block';
      thumb.src=ev.target.result;
      thumb.style.height='60px';thumb.style.width='auto';thumb.style.maxWidth='120px';
      name.textContent=file.name;
    };
    reader.readAsDataURL(file);
  });
})();

// ════════ HOME CHAT PLACEHOLDER ════════
function updateHomePlaceholder(){
  const el=document.getElementById('home-msg-in');
  if(!el)return;
  el.placeholder = homeMsgs.length > 0 ? '返信する' : '会話を始める';
}
function initHomePlaceholder(){ updateHomePlaceholder(); }


// ════════ HOME ════════
const HOME_CHAT_KEY = 'goalai_home_chat_v1';
let homeMsgs = [];
let homeHistory = [];
let homeLoading = false;

const SYS_HOME = `あなたはGOAL AIの「ゴール形成パートナー」です。
ユーザーがまだ漠然としたビジョンや思いを話してきたとき、すぐに提案や作業指示をしてはいけません。
まずユーザーの内側にある想いを一緒に掘り下げて、ゴールの輪郭を形作ることが最優先です。

【進め方】
1. ユーザーが曖昧なビジョンを話したら、すぐ作業提案せず「なぜそう思ったの？」「それが実現したらどうなる？」のように掘り下げる
2. ユーザーの発言から「何をしたいか（What）」と「なぜしたいか（Why）」の両方が読み取れた時点で「こういうゴールにまとめてみない？」と提案する。時間軸（When）は後から設定できるので必須ではない。WhatもWhyも曖昧な段階では掘り下げを続ける
3. ゴールが確定して初めて、タスクや具体的なアクションの話に入る
4. ゴールが確定するまでは、ロードマップ・タスク・スケジュールの話は一切しない

【スタイル】
- 端的に、2〜3文で返す。長文禁止
- 質問は1回に1つだけ。本文中で質問した場合、末尾に同じ質問を繰り返さない
- 温かく、でも核心を突く問いかけをする
- 日本語・現場の言葉

【ゴールに関係ない話題への対応】
- ゴールに関係ない雑談（翻訳依頼、一般的な質問など）には普通に答える。無理にゴールに結びつけない

【対話の確認ルール】
- まとめや結論を出した後、必ず「これで合ってますか？」「しっくりきますか？」とユーザーに確認する
- ユーザーが「違う」「ちょっと違う」と言ったら、決めつけずに「どの部分が違いますか？」と対話を続ける
- ユーザーが納得して明確に同意するまで次のフェーズに進まない
- AIが勝手に「では次に進みましょう」と進めることを禁止する`;

function saveHomeMsgs(){
  // 最後の2メッセージ（user + ai）をSupabaseに保存
  if (!AUTH_TOKEN || homeMsgs.length < 2) return;
  const last2 = homeMsgs.slice(-2);
  const toSave = last2.filter(m => m.role === 'user' || m.role === 'ai').map(m => ({
    role: m.role === 'ai' ? 'assistant' : m.role,
    content: m.content,
    messageType: 'home_chat',
  }));
  if (toSave.length) apiSaveMessages(toSave);
}

function buildEmptyHomeHTML(){
  const presets=[
    {icon:'💰',text:'副業を始めたい'},
    {icon:'📚',text:'英語を話せるようになりたい'},
    {icon:'💪',text:'ダイエットを成功させたい'},
    {icon:'🚀',text:'自分のビジネスを立ち上げたい'},
    {icon:'✍️',text:'資格を取りたい'},
    {icon:'🎯',text:'転職を成功させたい'}
  ];
  const cards=presets.map(p=>'<div onclick="document.getElementById(\'home-msg-in\').value=\''+p.text+'\';sendHomeMsg();" style="padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:border-color .15s,background .15s;display:flex;align-items:center;gap:10px;" onmouseover="this.style.borderColor=\'var(--amber)\';this.style.background=\'var(--amber-g)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--bg3)\'"><span style="font-size:20px;">'+p.icon+'</span><span style="font-size:12px;color:var(--cream);line-height:1.4;">'+p.text+'</span></div>').join('');
  return '<div style="text-align:center;padding:60px 20px 10px;color:var(--muted);line-height:2;">'
    +'<div style="margin:0 auto 16px;opacity:.4;">'+getLogoSVG(56)+'</div>'
    +'<div style="font-size:18px;color:var(--cream);font-weight:500;margin-bottom:6px;">何を達成したいですか？</div>'
    +'<div style="font-size:14px;margin-bottom:20px;">やりたいこと、気になること、何でも大丈夫です。</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;max-width:360px;margin:0 auto;text-align:left;">'+cards+'</div>'
    +'</div>';
}

function renderHomeMsgs(){
  const c=document.getElementById('home-chat-inner'); c.innerHTML='';
  if(homeMsgs.length===0){
    c.innerHTML=buildEmptyHomeHTML();
    return;
  }
  let lastDate='';
  const displayMsgs = homeMsgs.length > 100 ? homeMsgs.slice(-100) : homeMsgs;
  displayMsgs.forEach(m=>{
    if(m.role==='_sep'){
      const sep=document.createElement('div'); sep.className='hist-date-sep';
      sep.innerHTML=`<span style="color:var(--muted2)">新しい会話</span>`; c.appendChild(sep); return;
    }
    if(m.date&&m.date!==lastDate){
      lastDate=m.date;
      const sep=document.createElement('div'); sep.className='hist-date-sep';
      sep.innerHTML=`<span>${m.date}</span>`; c.appendChild(sep);
    }
    c.appendChild(mkHomeMsg(m));
  });
  setTimeout(()=>{ document.getElementById('home-chat-wrap').scrollTop=99999; },50);
  updateHomePlaceholder();
}

// Helper: render message content (Markdown → HTML, XSS safe)
function renderMsgContent(text){
  if(!text) return '';
  // Extract code blocks first
  const codeBlocks = [];
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (m,lang,code) => {
    codeBlocks.push(code);
    return `%%CODE_${codeBlocks.length-1}%%`;
  });
  // Strip JSON blocks
  html = html.replace(/```json[\s\S]*?```/g,'');
  // Sanitize HTML
  html = html.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Restore code blocks (already sanitized)
  codeBlocks.forEach((code,i) => {
    const safeCode = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    html = html.replace(`%%CODE_${i}%%`, `<pre style="background:var(--bg2);padding:10px 12px;border-radius:8px;overflow-x:auto;font-family:var(--fm);font-size:12px;margin:8px 0;white-space:pre-wrap;"><code>${safeCode}</code></pre>`);
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg2);padding:1px 5px;border-radius:4px;font-family:var(--fm);font-size:12px;">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Lists
  html = html.replace(/^[-•]\s+(.+)$/gm, '<div style="padding-left:16px;position:relative;"><span style="position:absolute;left:4px;">•</span>$1</div>');
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding-left:20px;position:relative;"><span style="position:absolute;left:0;color:var(--amber);font-weight:500;">$1.</span>$2</div>');
  // URLs
  html = html.replace(/(https?:\/\/[^\s&lt;]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--amber);text-decoration:underline;">$1</a>');
  // Newlines
  html = html.replace(/\n/g,'<br>');
  return html;
}

function mkHomeMsg(m){
  const wrap=document.createElement('div'); wrap.className=`msg ${m.role}`; wrap.style.marginBottom='16px';
  const av=document.createElement('div'); av.className=`msg-av ${m.role}`;
  if(m.role==='ai'){av.innerHTML=getLogoSVG(14);}else{const ut=getUserAvatarText();if(ut)av.textContent=ut;else av.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';}
  const body=document.createElement('div'); body.className='msg-body';
  if(m.img){
    const imgEl=document.createElement('img');
    imgEl.src=`data:${m.imgType||'image/jpeg'};base64,${m.img}`;
    imgEl.className='msg-img'; body.appendChild(imgEl);
  }
  const bub=document.createElement('div'); bub.className='bubble';
  bub.innerHTML=renderMsgContent(m.content);
  const t=document.createElement('div'); t.className='msg-time'; t.textContent=m.time||'';
  body.appendChild(bub); body.appendChild(t); wrap.appendChild(av); wrap.appendChild(body);
  return wrap;
}

async function sendHomeMsg(){
  if(homeLoading) return;
  if(!AUTH_TOKEN){ await ensureAuth(); }
  document.getElementById('home-send-btn').disabled = true;

  const inp = document.getElementById('home-msg-in');
  const text = inp.value.trim();
  if(!text && !homeImageData){ document.getElementById('home-send-btn').disabled=false; return; }

  // Image handling
  let userContent;
  if(homeImageData){
    userContent = [
      {type:'image',source:{type:'base64',media_type:homeImageData.type,data:homeImageData.base64}},
      {type:'text',text:text||'この画像について話しましょう'}
    ];
  } else {
    userContent = text;
  }
  const displayText = text || (homeImageData ? `📷 ${homeImageData.name}` : '');
  const today = new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
  inp.value = ''; homeResize(inp);

  const sendBtn = document.getElementById('home-send-btn');
  if(sendBtn) sendBtn.classList.add('sending');

  homeMsgs.push({role:'user',content:displayText,time:now(),date:today,
    img:homeImageData?homeImageData.base64:null, imgType:homeImageData?.type});
  homeHistory.push({role:'user',content:userContent});
  clearHomeImage();
  renderHomeMsgs(); homeLoading = true;
  updateStreak();

  const homeInner = document.getElementById('home-chat-inner');
  const homeWrap = document.getElementById('home-chat-wrap');

  // Deep analysis check
  if(text && !homeImageData && isDeepAnalysisNeeded(text) && AUTH_TOKEN){
    showDeepConfirm('home-chat-inner', 'home-chat-wrap',
      async () => {
        await runDeepAnalysis(text, 'home-chat-inner', 'home-chat-wrap', (results) => {
          if(results){
            renderDeepResult('home-chat-inner', 'home-chat-wrap', results, text);
            homeMsgs.push({role:'ai', content:`【ディープ分析完了】${results.finalOutput.slice(0,200)}…`, time:now(), date:today});
            homeHistory.push({role:'assistant', content:results.finalOutput});
            saveHomeMsgs();
          }
          homeLoading = false; homeSendRestore();
        });
      },
      async () => {
        await homeSmartRoute(text, today, homeInner, homeWrap);
        homeLoading = false; homeSendRestore();
      }
    );
    return;
  }

  try{
    await homeSmartRoute(text, today, homeInner, homeWrap);
  }catch(e){
    // フォールバック: エラー表示
    const errBub = document.createElement('div');
    errBub.className = 'msg ai';
    errBub.style.marginBottom = '16px';
    errBub.innerHTML = `<div class="msg-av ai">${getLogoSVG(14)}</div><div class="msg-body"><div class="bubble" style="color:var(--red)">通信エラーが発生しました。もう一度お試しください。</div></div>`;
    homeInner.appendChild(errBub);
  }
  homeLoading = false; homeSendRestore();
}

// ════════ AI SMART ROUTING (GPT-5 mini判定) ════════
const ROUTE_PROMPT = `ユーザーのメッセージを分類せよ。以下の1単語のみ返せ。
gemini: 天気、ニュース、検索、最新情報、長文の要約依頼（500文字超）
gpt: 翻訳、SNS投稿案、キャッチコピー、短い要約（500文字以下）、アイデア出し、ブレスト
gpt-simple: 相槌や短い返事（ありがとう、OK、うん、了解、いいね等）
claude: 上記以外（感情、悩み、ゴール、戦略、コーチング、雑談で深い対話が必要なもの）`;

async function routeMessage(text){
  // 500文字超の要約依頼はgemini
  if(text.length > 500) return 'gemini';
  // 短い相槌パターンはgpt-simple（API呼び出し不要）
  const simplePatterns = /^(ありがとう|OK|うん|はい|いいえ|了解|わかった|なるほど|そうだね|いいね|おはよう|おやすみ|お疲れ)$/i;
  if(simplePatterns.test(text.trim())) return 'gpt-simple';
  // Claude APIでルーティング判定（chat endpoint、deep使用量カウントなし）
  try{
    const res = await fetch(`${WORKER_URL}/api/chat`, {
      method:'POST', headers:getAuthHeaders(),
      body:JSON.stringify({
        system: ROUTE_PROMPT,
        messages:[{role:'user',content:text}],
        maxTokens:20
      })
    });
    if(!res.ok) return 'claude';
    const data = await res.json();
    const answer = (data.content?.[0]?.text || 'claude').trim().toLowerCase().replace(/[^a-z-]/g,'');
    if(['gemini','gpt','gpt-simple','claude'].includes(answer)) return answer;
  }catch(e){}
  return 'claude';
}

async function homeSmartRoute(text, today, homeInner, homeWrap){
  const inner = typeof homeInner === 'string' ? document.getElementById(homeInner) : homeInner;
  const scroll = typeof homeWrap === 'string' ? document.getElementById(homeWrap) : homeWrap;
  // 全メッセージをClaudeストリーミングで直接処理（ルーティング廃止）
  await homeClaudeStream(today, inner, scroll);
}

async function executeRoute(route, text, today, inner, scroll, indicatorBub){
  const ctx = buildAIContextCached();
  const query = route.query || text;
  try{
    let result;
    if(route.route === 'gemini'){
      result = await callGemini(query, `ユーザーの質問に簡潔かつ正確に答えてください。日本語で回答。\n\nユーザー背景：${ctx}`);
    } else {
      result = await callOpenAI(query, `ユーザーのリクエストに創造的かつ実用的に応えてください。日本語で回答。\n\nユーザー背景：${ctx}`, 800);
    }
    // インジケーターバブルを結果で置換
    indicatorBub.innerHTML = renderMsgContent(result);
    indicatorBub.classList.remove('stream-bubble');
    indicatorBub.style.cssText = '';
    homeMsgs.push({role:'ai',content:result,time:now(),date:today});
    homeHistory.push({role:'assistant',content:result});
    saveHomeMsgs();
    // Claude補足コメント
    await addRouteFollowUp(text, result, route.route==='gemini'?'Gemini':'GPT', today, inner, scroll);
  }catch(e){
    // フォールバック: Claudeで直接回答
    indicatorBub.innerHTML = '';
    indicatorBub.style.cssText = '';
    indicatorBub.classList.remove('stream-bubble');
    indicatorBub.parentElement?.remove();
    await homeClaudeStream(today, inner, scroll);
  }
}

async function homeClaudeStream(today, homeInner, homeWrap){
  const sys = SYS_HOME + `\n\n${buildAIContextCached()}`;
  await chatStream({
    system: sys, messages: homeHistory.slice(-10), maxTokens: 500,
    innerEl: homeInner, scrollEl: homeWrap,
    onDone(t){ homeMsgs.push({role:'ai',content:t,time:now(),date:today}); homeHistory.push({role:'assistant',content:t}); saveHomeMsgs(); }
  });
}

function retryLastHomeMsg(){
  const lastUser = homeMsgs.filter(m=>m.role==='user').pop();
  if(lastUser){
    const inner = document.getElementById('home-chat-inner');
    const lastMsg = inner.lastElementChild;
    if(lastMsg) lastMsg.remove();
    homeHistory.pop();
    homeMsgs.pop();
    document.getElementById('home-msg-in').value = lastUser.content;
    sendHomeMsg();
  }
}

async function addRouteFollowUp(userText, aiResult, source, today, homeInner, homeWrap){
  try{
    await chatStream({
      system: `あなたはGOAL AIのコーチです。${source}が回答した内容を踏まえ、ユーザーのゴールや文脈に絡めて一言だけ補足してください。1〜2文で短く。\n\n${buildAIContextCached()}`,
      messages:[
        {role:'user',content:userText},
        {role:'assistant',content:`[${source}の回答]\n${aiResult.slice(0,500)}`},
        {role:'user',content:'この回答について、私のゴールの観点から一言補足して。'}
      ],
      maxTokens: 150, innerEl: homeInner, scrollEl: homeWrap,
      onDone(t){ homeMsgs.push({role:'ai',content:t,time:now(),date:today}); homeHistory.push({role:'assistant',content:t}); saveHomeMsgs(); }
    });
  }catch(e){}
}

// ═══ UNIFIED HOME SCREEN ═══
// リロード時・「新しい会話」押下時の両方でこの関数を呼ぶ
function showHomeScreen(){
  // 1. 既存会話の保存とタイトル生成（会話がある場合のみ）
  if(homeMsgs.length > 0){
    const recentMsgs = homeMsgs.filter(m=>m.role==='user'||m.role==='ai').slice(-6);
    if(recentMsgs.length > 0){
      const summary = recentMsgs.map(m=>m.content).join(' ').slice(0,200);
      generateSessionTitle(currentSessionId, summary);
    }
  }

  // 2. チャット状態リセット
  currentSessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Date.now();
  homeMsgs = [];
  homeHistory = [];

  // 3. ウェルカム表示
  renderWelcomeView();
  renderSidebarChatRecords();
}

function renderWelcomeView(){
  const chatInner = document.getElementById('home-chat-inner');
  if(!chatInner) return;
  chatInner.innerHTML = buildEmptyHomeHTML();
  updateHomePlaceholder();
}

function newHomeChat(){ showHomeScreen(); }

let chatRecords = []; // {sessionId, title, date, count}

async function generateSessionTitle(sessionId, summary){
  try{
    const res = await fetch(`${WORKER_URL}/api/chat`, {
      method:'POST', headers:getAuthHeaders(),
      body:JSON.stringify({
        system:'会話の要約から15文字以内の短いタイトルを生成してください。タイトルだけを返してください。',
        messages:[{role:'user',content:summary}], maxTokens:30
      })
    });
    const data = await res.json();
    const title = (data.content?.[0]?.text || summary.slice(0,15)).trim();
    const existing = chatRecords.find(r=>r.sessionId===sessionId);
    if(existing){ existing.title = title; }
    else { chatRecords.unshift({sessionId, title, date:new Date().toISOString(), count:0}); }
    if(chatRecords.length > 20) chatRecords = chatRecords.slice(0,20);
    renderSidebarChatRecords();
  }catch(e){
    const fallback = summary.slice(0,15) + '…';
    chatRecords.unshift({sessionId, title:fallback, date:new Date().toISOString(), count:0});
    if(chatRecords.length > 20) chatRecords = chatRecords.slice(0,20);
    renderSidebarChatRecords();
  }
}

function renderSidebarChatRecords(){
  const el = document.getElementById('sb-chat-records');
  if(!el) return;
  const recent = chatRecords.slice(0,5);
  if(recent.length === 0){
    el.innerHTML = '<div style="padding:4px 16px 8px;font-size:10px;color:var(--muted2);">まだ会話がありません</div>';
    return;
  }
  el.innerHTML = recent.map(r => `
    <div onclick="toggleSidebar();loadChatSession('${r.sessionId}')" style="padding:6px 16px;cursor:pointer;transition:background .15s;display:flex;align-items:center;gap:8px;" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
      <svg width="12" height="12" style="color:var(--muted2);flex-shrink:0" class="svg-ic"><use href="#ic-chat"/></svg>
      <div style="font-size:11px;color:var(--cream);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(r.title)}</div>
    </div>`).join('');
}

function homeResize(el) {
  chatResize(el, 110);
  const btn = document.getElementById('home-send-btn');
  if (btn) btn.disabled = !el.value.trim() && !homeImageData;
}
function homeSendRestore(){ const b=document.getElementById('home-send-btn'); if(b){b.classList.remove('sending');b.disabled=false;} }

// ═══ CHAT HISTORY PANEL ═══
let chatSessions = [];
async function openChatHistory(){
  const panel = document.getElementById('chat-history-panel');
  panel.style.display = 'flex';
  const list = document.getElementById('chat-history-list');
  list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">読み込み中…</div>';
  try {
    const res = await fetch(`${WORKER_URL}/api/history?sessions=true`, {headers: getAuthHeaders()});
    const data = await res.json();
    chatSessions = data.sessions || [];
    renderChatHistoryList(chatSessions);
  } catch(e) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">履歴を読み込めませんでした</div>';
  }
}
function closeChatHistory(){ document.getElementById('chat-history-panel').style.display='none'; }
function renderChatHistoryList(sessions){
  const list = document.getElementById('chat-history-list');
  if(!sessions.length){ list.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);">まだ会話がありません</div>'; return; }
  list.innerHTML = sessions.map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('ja-JP',{month:'short',day:'numeric'});
    const preview = (s.firstMsg || '会話').substring(0, 30);
    return `<div onclick="toggleSidebar();loadChatSession('${s.sessionId}')" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s;" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;color:var(--cream);font-weight:500;">${preview}…</div>
        <div style="font-size:10px;color:var(--muted2);flex-shrink:0;margin-left:10px;">${dateStr}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;">${s.count}メッセージ</div>
    </div>`;
  }).join('');
}
function filterChatHistory(q){
  if(!q){ renderChatHistoryList(chatSessions); return; }
  const filtered = chatSessions.filter(s => (s.firstMsg||'').includes(q));
  renderChatHistoryList(filtered);
}
async function loadChatSession(sessionId){
  closeChatHistory();
  try {
    const res = await fetch(`${WORKER_URL}/api/history?sessionId=${sessionId}&limit=200`, {headers: getAuthHeaders()});
    const data = await res.json();
    const messages = (data.messages || []).reverse();
    homeMsgs = [];
    homeHistory = [];
    messages.forEach(m => {
      const time = new Date(m.created_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
      const date = new Date(m.created_at).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
      homeMsgs.push({role: m.role==='assistant'?'ai':m.role, content: m.content, time, date});
      homeHistory.push({role: m.role, content: m.content});
    });
    currentSessionId = sessionId;
    renderHomeMsgs();
  } catch(e) { toast('会話の読み込みに失敗しました'); }
}

// ═══ KEYBOARD HANDLING (iOS visualViewport) ═══
if(window.visualViewport){
  window.visualViewport.addEventListener('resize', ()=>{
    const kbHeight = window.innerHeight - window.visualViewport.height;
    const inputs = [document.getElementById('home-input-area'), document.getElementById('hub-chat-input-row')].filter(Boolean);
    inputs.forEach(el => {
      el.style.paddingBottom = kbHeight > 50 ? kbHeight + 'px' : 'env(safe-area-inset-bottom)';
    });
  });
}
function homeKey(e) { chatKey(sendHomeMsg, e); }

// ─ Summary strip ─

function renderHomeSummary(){
  const mode=getActiveMode();
  const modeIcons={normal:'💬',spartan:'🔥',mencare:'🌸',kabeuchi:'💭'};
  const modeNames={normal:'通常',spartan:'スパルタ',mencare:'メンケア',kabeuchi:'壁打ち'};
  document.getElementById('hs-mode-icon').textContent=modeIcons[mode];
  document.getElementById('hs-mode-name').textContent=modeNames[mode];

  const goalsEl=document.getElementById('hs-goals'); goalsEl.innerHTML='';
  if(ALL_GOALS.filter(g=>!g.archived).length === 0){
    goalsEl.innerHTML=`<div style="text-align:center;padding:16px 0;color:var(--muted2);font-size:11.5px;line-height:1.8;">
      まだゴールがありません。<br>
      <span style="color:var(--amber);cursor:pointer;font-weight:500;" onclick="showWelcome()">まずはゴールを一緒に考えましょう →</span>
    </div>`;
  } else {
    ALL_GOALS.filter(g=>!g.archived).forEach(g=>{
      const isOk=g.actual>=g.target;
      const row=document.createElement('div'); row.className='hs-goal-row';
      row.innerHTML=`<div class="hs-goal-name">${escapeHtml(g.title)}</div>
        <div class="hs-goal-bar">
          <div class="hs-goal-actual" style="width:${g.actual}%;background:${isOk?'var(--green)':'var(--red)'}"></div>
          <div class="hs-goal-marker" style="left:${g.target}%"></div>
        </div>
        <div class="hs-goal-pct" style="color:${isOk?'var(--green)':'var(--red)'}">${g.actual}%</div>`;
      goalsEl.appendChild(row);
    });
  }

  const todayEl=document.getElementById('hs-today-tasks');
  // Today only - show urgent/in-progress tasks
  const todayItems = getTodayTasks().filter(i => i.urgency==='urgent'||i.urgency==='in-progress').slice(0,4);
  const items = todayItems.length ? todayItems : getTodayTasks().slice(0,3);
  todayEl.innerHTML = '';
  if(!items.length){
    todayEl.innerHTML = '<div style="font-size:11px;color:var(--muted2)">今日のタスクなし 🎉</div>';
  } else {
    items.forEach(item => {
      const row = document.createElement('div'); row.className = 'hs-task-row'; row.style.cursor='pointer';
      const isDone = item.task.status==='done';
      const urgColor = item.urgency==='urgent'?'var(--red)':item.urgency==='in-progress'?'var(--amber)':'var(--muted2)';
      row.innerHTML = `
        <div class="hs-task-check ${isDone?'done':''}" onclick="event.stopPropagation();hsToggleTask('${item.task.id}',this)">${isDone?'✓':''}</div>
        <div class="hs-task-title ${isDone?'done':''}" style="flex:1">${escapeHtml(item.task.title)}</div>
        <div style="width:5px;height:5px;border-radius:50%;background:${urgColor};flex-shrink:0;margin-left:4px"></div>`;
      row.addEventListener('click', ()=>openHomeTaskPanel(item));
      todayEl.appendChild(row);
    });
  }

  // 今日の1%マイクロタスク
  renderMicroTask();
  // Quote loaded from memory only (set by refreshQuote)
}

let _hsTaskTab = 'today';
function switchHsTaskTab(tab){
  _hsTaskTab = tab;
  document.getElementById('hs-tab-today').className = 'hs-task-tab' + (tab==='today'?' active':'');
  document.getElementById('hs-tab-week').className  = 'hs-task-tab' + (tab==='week'?' active':'');
  renderHsTaskList(document.getElementById('hs-today-tasks'), tab);
}

function getThisWeekTasks(){
  // Monday–Sunday of current week
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const monStr = monday.toISOString().slice(0,10);
  const sunStr = sunday.toISOString().slice(0,10);

  const result = [];
  ALL_GOALS.forEach(goal => {
    goal.phases.forEach(phase => {
      phase.tasks.forEach(task => {
        if(task.status === 'done') return;
        // include if due this week OR currently in-progress
        if((task.due && task.due >= monStr && task.due <= sunStr) || task.status === 'current'){
          result.push({task, phase, goal, urgency: task.due < now.toISOString().slice(0,10) ? 'urgent' : 'this-week'});
        }
      });
    });
  });
  return result;
}

function renderHsTaskList(el, tab){
  el.innerHTML = '';
  const allItems = tab === 'week' ? getThisWeekTasks() : getTodayTasks();
  let items;
  if(tab === 'today'){
    items = allItems.filter(i => i.urgency === 'urgent' || i.urgency === 'in-progress').slice(0,4);
    if(items.length === 0) items = allItems.slice(0,3);
  } else {
    items = allItems.slice(0,8);
  }
  if(items.length === 0){
    el.innerHTML = `<div style="font-size:11px;color:var(--muted2)">${tab==='today'?'今日のタスクなし 🎉':'今週のタスクなし 🎉'}</div>`;
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'hs-task-row';
    row.style.cursor = 'pointer';
    const isDone = item.task.status === 'done';
    const urgColor = item.urgency==='urgent' ? 'var(--red)' : item.urgency==='in-progress' ? 'var(--amber)' : 'var(--muted2)';
    row.innerHTML = `
      <div class="hs-task-check ${isDone?'done':''}"
        onclick="event.stopPropagation();hsToggleTask('${item.task.id}',this)">${isDone?'✓':''}</div>
      <div class="hs-task-title ${isDone?'done':''}" style="flex:1">${escapeHtml(item.task.title)}</div>
      <div style="width:5px;height:5px;border-radius:50%;background:${urgColor};flex-shrink:0;margin-left:4px"></div>`;
    row.addEventListener('click', () => openHomeTaskPanel(item));
    el.appendChild(row);
  });
}


function hsToggleTask(taskId,el){
  for(const goal of ALL_GOALS){ for(const phase of goal.phases){
    const t=phase.tasks.find(t=>t.id===taskId);
    if(t){
      t.status=t.status==='done'?'todo':'done';
      el.className='hs-task-check '+(t.status==='done'?'done':'');
      el.textContent=t.status==='done'?'✓':'';
      const titleEl=el.nextElementSibling;
      if(titleEl) titleEl.className='hs-task-title '+(t.status==='done'?'done':'');
      // 進捗再計算＆マイルストーンチェック
      recalcGoalProgress(goal);
      checkMilestone(goal);
      return;
    }
  }}
}

function recalcGoalProgress(goal){
  let total=0, done=0;
  (goal.phases||[]).forEach(ph=>{
    (ph.tasks||[]).forEach(t=>{total++;if(t.status==='done')done++;});
  });
  if(total>0) goal.actual = Math.max(0, Math.min(100, Math.round(done/total*100)));
}


// ════════ HOME TASK PANEL ════════
let htpTask = null;
let htpPhase = null;
let htpHistory = [];
let htpLoading = false;

function openHomeTaskPanel(item){
  htpTask = item.task;
  htpPhase = item.phase;
  htpHistory = [];

  document.getElementById('htp-name').textContent = htpTask.title;
  const tag = document.getElementById('htp-phase-tag');
  tag.textContent = htpPhase?.phaseTitle || '';
  tag.style.background = (htpPhase?.phaseColor||'var(--amber)') + '22';
  tag.style.color = htpPhase?.phaseColor || 'var(--amber)';
  tag.style.border = '1px solid ' + (htpPhase?.phaseColor||'var(--amber)') + '44';
  document.getElementById('htp-due').textContent = htpTask.due ? '期限: ' + htpTask.due : '';
  document.getElementById('htp-status-sel').value = htpTask.status || 'todo';

  // Init chat
  const chat = document.getElementById('htp-chat');
  chat.innerHTML = '';
  const intro = document.createElement('div');
  intro.className = 'tdp-msg ai';
  intro.innerHTML = `<div class="tdp-bubble">「<strong>${escapeHtml(htpTask.title)}</strong>」について、何でも聞いてください。進め方・詰まりの相談・タスク分解など対応します。</div>`;
  chat.appendChild(intro);

  document.getElementById('home-task-panel').classList.add('open');
  document.getElementById('htp-msg-in').focus();
}

function closeHomeTaskPanel(){
  document.getElementById('home-task-panel').classList.remove('open');
  htpTask = null; htpPhase = null; htpHistory = [];
  // Refresh task list
  renderHsTaskList(document.getElementById('hs-today-tasks'), _hsTaskTab);
}

function htpUpdateStatus(val){
  if(!htpTask) return;
  htpTask.status = val;
}

function htpQuickChat(text){
  document.getElementById('htp-msg-in').value = text;
  sendHtpMsg();
}

async function sendHtpMsg(){
  if(htpLoading || !htpTask) return;
  const inp = document.getElementById('htp-msg-in');
  const text = inp.value.trim(); if(!text) return;
  inp.value = ''; htpResize(inp);

  const chat = document.getElementById('htp-chat');
  const uBub = document.createElement('div'); uBub.className = 'tdp-msg user';
  uBub.innerHTML = `<div class="tdp-bubble">${renderMsgContent(text)}</div>`;
  chat.appendChild(uBub); chat.scrollTop = 99999;
  htpHistory.push({role:'user', content:text});
  htpLoading = true;

  const htpSys = `あなたはGOAL AIのタスク専門コーチです。
タスク：「${htpTask.title}」| フェーズ：${htpPhase?.phaseTitle||''} | ステータス：${htpTask.status} | 期限：${htpTask.due||'未設定'}

${buildAIContextCached()}

このタスクに特化した具体的・実践的なアドバイスを3〜5文で。${USER_PROFILE.weaknesses[0]||'先延ばし'}対策を意識して。`;

  // Custom bubble (tdp style)
  const htpWrap = document.createElement('div'); htpWrap.className = 'tdp-msg ai';
  const htpBub = document.createElement('div'); htpBub.className = 'tdp-bubble stream-bubble';
  htpWrap.appendChild(htpBub); chat.appendChild(htpWrap); chat.scrollTop = 99999;

  await streamAI(
    { system: htpSys, messages: htpHistory.slice(-12), maxTokens: 400 },
    (t) => { htpBub.innerHTML = renderMsgContent(t); chat.scrollTop = 99999; },
    (t) => { htpBub.classList.remove('stream-bubble'); htpHistory.push({role:'assistant',content:t}); },
    (e) => { htpBub.classList.remove('stream-bubble'); htpBub.textContent = 'エラーが発生しました。'; }
  );
  htpLoading = false;
}

function htpResize(el) { chatResize(el, 80); }
function htpKey(e) { chatKey(sendHtpMsg, e); }


async function refreshQuote(){
  if(ALL_GOALS.filter(g=>!g.archived).length === 0) return;
  const btn=document.getElementById('hs-refresh-btn');
  btn.classList.add('spinning');
  try{
    const mode=getActiveMode();
    const name = USER_PROFILE.nickname||USER_PROFILE.name||'ユーザー';
    const goalsInfo = ALL_GOALS.filter(g=>!g.archived).map(g=>`${g.title}（進捗${g.actual}%/目安${g.target}%）`).join('、');
    const prompt=`${name}への今日の一言を1〜2文で生成してください。
モード：${mode} | ゴール：${goalsInfo}
${mode==='spartan'?'断定的で数字を使う':mode==='mencare'?'とても温かく気持ちに寄り添う':'バランスよく前向きに'}
※かぎかっこ・前置き不要。本文のみ。`;
    const res=await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body:JSON.stringify({messages:[{role:'user',content:prompt}],maxTokens:100})
    });
    const data=await res.json();
    const text=data.content?.map(b=>b.text||'').join('').trim();
    if(text){ document.getElementById('hs-quote').textContent=`「${text}」`; }
  }catch(e){}
  btn.classList.remove('spinning');
}


// ════════ FEEDBACK CHAT ════════
let fbMsgs = [];
let fbHistory = [];
let fbLoading = false;
let fbTurnCount = 0;
let fbSummary = '';
let fbThemes = {good:null, bad:null, wish:null};

const FB_SYS = `あなたはGOAL AIのフィードバック収集AIです。

【ミッション】
ユーザーとの自然な対話で以下3テーマを引き出す：
1. good: 良かったところ
2. bad: 使いにくかった・不満なところ
3. wish: 欲しい機能・改善アイデア

【ルール】
- 1〜2文で端的に返す。長文禁止
- 質問は1回に1つ
- 3テーマを直接聞くな。ユーザーの発言を掘り下げて自然に引き出す
- ユーザーが「チャットは良かった」→「チャットのどこが良かった？」のように具体化する
- ユーザーの発言に含まれるテーマを拾って、まだ出ていないテーマに自然に話を向ける
- 全体5〜7ターンで完了を目指す

【現在の収集状況】
下記JSONで管理中。nullのテーマをまだ引き出せていない：
%%THEMES%%

収集済みテーマの内容をさらに深掘りするより、未収集テーマへ自然に話題を向けること。
3テーマすべて揃ったら、まとめを表示。まとめフォーマット：
📋 フィードバックまとめ
✅ 良かった点：（1文）
⚠️ 改善点：（1文）
💡 ほしい機能：（1文）

まとめの末尾に「この内容で合っていますか？」と聞く。`;

function openFeedbackChat(){
  fbMsgs = []; fbHistory = []; fbLoading = false; fbTurnCount = 0; fbSummary = '';
  fbThemes = {good:null, bad:null, wish:null};
  const modal = document.getElementById('feedback-modal');
  modal.style.display = 'flex';
  const chat = document.getElementById('feedback-chat');
  chat.innerHTML = '';
  appendFbMsg('ai', '使ってみてどうでしたか？');
  fbHistory.push({role:'assistant', content:'使ってみてどうでしたか？'});
  document.getElementById('feedback-input-area').style.display = 'flex';
}
function closeFeedback(){ document.getElementById('feedback-modal').style.display = 'none'; }

function appendFbMsg(role, text){
  const chat = document.getElementById('feedback-chat');
  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;gap:10px;align-items:flex-start;${role==='user'?'flex-direction:row-reverse':''}`;
  const av = document.createElement('div');
  av.style.cssText = `width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;${role==='ai'?'background:var(--amber-d);color:var(--amber);border:1px solid rgba(228,184,106,.3)':'background:var(--bg3);border:1px solid var(--border2);color:var(--cream)'}`;
  if(role==='ai'){av.innerHTML=getLogoSVG(16);}else{av.textContent=getUserAvatarText()||'U';}
  const bub = document.createElement('div');
  bub.style.cssText = `max-width:85%;padding:10px 14px;border-radius:10px;font-size:12.5px;line-height:1.7;white-space:pre-line;${role==='ai'?'background:var(--bg3);border:1px solid var(--border);color:var(--cream)':'background:var(--amber-d);border:1px solid rgba(228,184,106,.2);color:var(--cream)'}`;
  bub.textContent = text;
  wrap.appendChild(av); wrap.appendChild(bub);
  chat.appendChild(wrap);
  chat.scrollTop = 99999;
  return bub;
}

function appendFbButtons(){
  const chat = document.getElementById('feedback-chat');
  // 既存ボタン除去
  chat.querySelectorAll('.fb-btn-row').forEach(el=>el.remove());
  const row = document.createElement('div');
  row.className = 'fb-btn-row';
  row.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px;';
  const mkBtn = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:10px 18px;min-height:44px;background:transparent;color:var(--amber);border:1.5px solid var(--amber);border-radius:999px;font-size:12px;cursor:pointer;font-family:var(--ff);font-weight:500;transition:all .15s;';
    b.onmouseover = ()=>{b.style.background='var(--amber)';b.style.color='var(--bg)';};
    b.onmouseout = ()=>{b.style.background='transparent';b.style.color='var(--amber)';};
    b.onclick = ()=>{ row.remove(); fn(); };
    return b;
  };
  row.appendChild(mkBtn('はい', ()=>submitFeedback()));
  row.appendChild(mkBtn('はい、他にもあります', ()=>continueFeedback()));
  row.appendChild(mkBtn('いいえ、違います', ()=>correctFeedback()));
  chat.appendChild(row);
  chat.scrollTop = 99999;
}

async function sendFeedbackMsg(){
  if(fbLoading) return;
  const inp = document.getElementById('feedback-msg-in');
  const text = inp.value.trim(); if(!text) return;
  inp.value = '';
  inp.style.height = 'auto';
  appendFbMsg('user', text);
  fbMsgs.push({role:'user', content:text});
  fbHistory.push({role:'user', content:text});
  fbTurnCount++;
  fbLoading = true;

  try {
    // まずテーマ抽出を試みる
    await extractThemes();

    const allFilled = fbThemes.good && fbThemes.bad && fbThemes.wish;

    if(allFilled){
      // 3テーマ揃った → まとめ生成
      const summary = `📋 フィードバックまとめ\n✅ 良かった点：${fbThemes.good}\n⚠️ 改善点：${fbThemes.bad}\n💡 ほしい機能：${fbThemes.wish}`;
      fbSummary = summary;
      appendFbMsg('ai', summary + '\n\nこの内容で合っていますか？');
      fbHistory.push({role:'assistant', content: summary + '\nこの内容で合っていますか？'});
      appendFbButtons();
    } else {
      // 掘り下げ対話
      const themesStr = JSON.stringify(fbThemes, null, 0);
      const sys = FB_SYS.replace('%%THEMES%%', themesStr);
      const res = await fetch(`${WORKER_URL}/api/chat`,{
        method:'POST', headers:getAuthHeaders(),
        body: JSON.stringify({ system:sys, messages:fbHistory.slice(-8), maxTokens:120 })
      });
      const data = await res.json();
      const aiText = (data.content?.map(b=>b.text||'').join('') || '他に気になったことはありますか？').trim();
      fbHistory.push({role:'assistant', content:aiText});
      appendFbMsg('ai', aiText);
    }
  } catch(e){
    appendFbMsg('ai', 'エラーが発生しました。もう一度お試しください。');
  }
  fbLoading = false;
}

async function extractThemes(){
  try {
    const conv = fbHistory.filter(m=>m.role==='user').map(m=>m.content).join('\n');
    const res = await fetch(`${WORKER_URL}/api/chat`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        system:`ユーザーの発言から3カテゴリを抽出してJSON形式で返せ。該当なしはnull。1文で端的に。他の文字を出力するな。
{"good":"良かった点 or null","bad":"不満点 or null","wish":"欲しい機能 or null"}`,
        messages:[{role:'user', content:conv}],
        maxTokens:120
      })
    });
    const data = await res.json();
    const raw = (data.content?.map(b=>b.text||'').join('') || '').trim();
    const m = raw.match(/\{[\s\S]*?\}/);
    if(m){
      const parsed = JSON.parse(m[0]);
      if(parsed.good && parsed.good !== 'null') fbThemes.good = parsed.good;
      if(parsed.bad && parsed.bad !== 'null') fbThemes.bad = parsed.bad;
      if(parsed.wish && parsed.wish !== 'null') fbThemes.wish = parsed.wish;
    }
  }catch(e){}
}

function continueFeedback(){
  appendFbMsg('ai', '了解です、他にもあれば教えてください。');
  fbHistory.push({role:'assistant', content:'了解です、他にもあれば教えてください。'});
  // テーマリセットせず追加情報を受け付ける
}

function correctFeedback(){
  appendFbMsg('ai', 'どの部分が違いますか？');
  fbHistory.push({role:'assistant', content:'どの部分が違いますか？'});
  // テーマリセットして修正対話
  fbThemes = {good:null, bad:null, wish:null};
}

async function submitFeedback(){
  if(!AUTH_TOKEN){ toast('ログインが必要です'); return; }
  try {
    await fetch(`${WORKER_URL}/api/feedbacks`,{
      method:'POST', headers:getAuthHeaders(),
      body: JSON.stringify({
        summary: fbSummary,
        rawChat: { messages: fbMsgs, themes: fbThemes }
      })
    });
    toast('フィードバックを送信しました ✓');
    document.getElementById('feedback-input-area').style.display = 'none';
    appendFbMsg('ai', 'ありがとうございます！改善に活かします 🙏');
  } catch(e){
    toast('送信に失敗しました');
  }
}


// ════════ CHAT SEARCH ════════
let _homeSearchOn = false, _hubSearchOn = false;

function toggleHomeSearch() {
  _homeSearchOn = !_homeSearchOn;
  const bar = document.getElementById('home-search-bar');
  if (!bar) return;
  bar.style.display = _homeSearchOn ? 'block' : 'none';
  if (_homeSearchOn) setTimeout(() => document.getElementById('home-search-in')?.focus(), 50);
  else clearHomeSearch();
}
function clearHomeSearch() {
  _homeSearchOn = false;
  const bar = document.getElementById('home-search-bar');
  if (bar) bar.style.display = 'none';
  const inp = document.getElementById('home-search-in');
  if (inp) { inp.value = ''; searchHomeChat(''); }
}
function searchHomeChat(q) {
  const msgs = document.querySelectorAll('#home-chat-inner .msg');
  const cnt = document.getElementById('home-search-cnt');
  if (!q) {
    msgs.forEach(m => { m.style.display = ''; });
    if (cnt) cnt.textContent = ''; return;
  }
  let hits = 0;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  msgs.forEach(m => {
    const bub = m.querySelector('.bubble');
    if (!bub) { m.style.display = 'none'; return; }
    const text = bub.innerText || '';
    if (text.match(re)) { m.style.display = ''; hits++; }
    else m.style.display = 'none';
  });
  if (cnt) cnt.textContent = hits ? hits + '件' : '0件';
}

function toggleHubSearch() {
  _hubSearchOn = !_hubSearchOn;
  const bar = document.getElementById('hub-search-bar');
  if (!bar) return;
  bar.style.display = _hubSearchOn ? 'block' : 'none';
  if (_hubSearchOn) setTimeout(() => document.getElementById('hub-search-in')?.focus(), 50);
  else clearHubSearch();
}
function clearHubSearch() {
  _hubSearchOn = false;
  const bar = document.getElementById('hub-search-bar');
  if (bar) bar.style.display = 'none';
  const inp = document.getElementById('hub-search-in');
  if (inp) { inp.value = ''; searchHubChat(''); }
}
function searchHubChat(q) {
  const msgs = document.querySelectorAll('#hub-chat-inner .msg');
  const cnt = document.getElementById('hub-search-cnt');
  if (!q) {
    msgs.forEach(m => m.style.display = ''); if (cnt) cnt.textContent = ''; return;
  }
  let hits = 0;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  msgs.forEach(m => {
    const bub = m.querySelector('.bubble');
    if (bub && (bub.innerText || '').match(re)) { m.style.display = ''; hits++; }
    else m.style.display = 'none';
  });
  if (cnt) cnt.textContent = hits ? hits + '件' : '0件';
}

// ════════ NOTIFICATIONS ════════
let _notifPerm = (typeof Notification !== 'undefined') ? Notification.permission : 'denied';
async function requestNotifPermission() {
  if (typeof Notification === 'undefined') { toast('このブラウザは通知未対応です'); return; }
  const p = await Notification.requestPermission();
  _notifPerm = p;
  updateNotifSettingUI();
  if (p === 'granted') {
    toast('通知を許可しました ✓');
    new Notification('GOAL AI', { body: 'リマインダーが有効になりました！' });
  } else {
    toast('通知がブロックされています。ブラウザの設定から許可してください。');
  }
}
function updateNotifSettingUI() {
  const el = document.getElementById('notif-status-lbl');
  if (!el) return;
  el.textContent = _notifPerm === 'granted' ? '有効' : '未許可';
  el.style.color = _notifPerm === 'granted' ? 'var(--green)' : 'var(--muted2)';
}
function scheduleNotif(title, body, delayMs) {
  if (_notifPerm !== 'granted') return;
  setTimeout(() => { try { new Notification(title, { body, tag: 'goalai' }); } catch {} }, delayMs);
}


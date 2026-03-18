// ════════ SHARED ACTION BUTTONS HTML ════════
function _msgActionsHtml(){
  return `<span class="msg-actions"><button class="msg-action-btn" title="コピー" onclick="copyMessage(this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button><button class="msg-action-btn" title="引用" onclick="quoteMessage(this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H5c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-3c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/></svg></button></span>`;
}

// ════════ NANO FALLBACK BANNER ════════
function showNanoFallbackBanner(hours) {
  let b = document.getElementById('nano-fallback-banner');
  if(!b){ b=document.createElement('div'); b.id='nano-fallback-banner'; b.className='nano-fallback-banner'; const toolbar=document.getElementById('home-chat-toolbar'); if(toolbar) toolbar.after(b); }
  b.textContent = `上限に達したため、回答精度低下中（${hours||'数'}時間後に回復）`;
}
function hideNanoFallbackBanner(){ document.getElementById('nano-fallback-banner')?.remove(); }

// ════════ CHAT ════════
function getLogoSVG(size){return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><defs><linearGradient id="lg${size}" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8920a"/><stop offset="100%" stop-color="#f5d380"/></linearGradient></defs><path d="M26 70 L32 40 L42 55 L50 24 L58 55 L68 40 L74 70 Z" fill="url(#lg${size})"/></svg>`;}
function getUserAvatarText(){const n=USER_PROFILE.nickname||USER_PROFILE.name||'';return n?n.charAt(0):'';}
function renderUserAvatarInner(av){
  if(USER_PROFILE.avatar_base64){
    av.innerHTML=`<img src="${USER_PROFILE.avatar_base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    const ut=getUserAvatarText();
    if(ut) av.textContent=ut;
    else av.innerHTML='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';
  }
}
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
  if (typeof showTaskSetupPhase === 'function') showTaskSetupPhase(goalObj);

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
        if(!t||!t.trim()) return;
        hubChatMsgs[goalObj.id].push({role:'ai',content:t,time:now()});
        hubChatHistories[goalObj.id].push({role:'user',content:`「${v}」をゴールにしたい`});
        hubChatHistories[goalObj.id].push({role:'assistant',content:t});
        renderHubChat();
        if(goalObj.supabaseId) apiSaveMessages([{role:'assistant',content:t,goalId:goalObj.supabaseId,aiModel:'claude',messageType:'hub_chat'}]);
      }
    });
  }catch(e){}finally{
    hubChatLoading = false;
  }
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
let voiceWarningId = null;
let silenceFrames = 0;
let voiceSwipeStartY = null;

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
  if(voiceWarningId){ clearTimeout(voiceWarningId); voiceWarningId=null; }
  silenceFrames = 0;
  voiceSwipeStartY = null;
  btn.classList.remove('recording-warning');
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

      // F-4: 無音3秒検知で自動停止
      if(level < 0.05){
        silenceFrames++;
        // ~60fps × 3秒 = 180フレーム
        if(silenceFrames > 180 && homeRecording){
          homeSpeechRecognition?.stop();
          homeMediaRecorder?.stop();
          return;
        }
      } else {
        silenceFrames = 0;
      }

      voiceAnimFrame = requestAnimationFrame(tick);
    }
    silenceFrames = 0;
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

    // F-8: 60秒タイムアウトで自動停止
    voiceTimeoutId = setTimeout(()=>{
      if(homeRecording){
        homeSpeechRecognition?.stop();
        homeMediaRecorder?.stop();
      }
    }, 60000);
    // 50秒で警告表示
    voiceWarningId = setTimeout(()=>{
      const btn = document.getElementById('home-voice-btn');
      if(btn) btn.classList.add('recording-warning');
    }, 50000);

    // Web Speech APIも同時に開始
    if(hasWebSpeech){
      try{
        const recognition = new SR();
        recognition.lang = 'ja-JP';
        recognition.continuous = false;
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

// F-5: スワイプキャンセル（マイクボタンでタッチ上方向スワイプ→録音キャンセル）
(function(){
  const btn = document.getElementById('home-voice-btn');
  if(!btn) return;
  btn.addEventListener('touchstart', (e)=>{
    if(homeRecording) voiceSwipeStartY = e.touches[0].clientY;
  }, {passive:true});
  btn.addEventListener('touchmove', (e)=>{
    if(!homeRecording || voiceSwipeStartY===null) return;
    const dy = voiceSwipeStartY - e.touches[0].clientY;
    if(dy > 50){
      // 上方向50px以上スワイプでキャンセル
      voiceSwipeStartY = null;
      homeSpeechRecognition?.stop();
      homeMediaRecorder?.stop();
      // 録音結果を破棄
      homeAudioChunks = [];
      homeSpeechResult = '';
      homeSpeechGotResult = false;
      voiceUIStop();
      const inp = document.getElementById('home-msg-in');
      if(inp) inp.value = '';
      removeVoiceInterimBubble();
      toast('音声入力をキャンセルしました');
    }
  }, {passive:true});
})();

// F-9: キーボードショートカット Ctrl+Shift+V で音声入力トグル
document.addEventListener('keydown', (e)=>{
  if(e.ctrlKey && e.shiftKey && e.key === 'V'){
    e.preventDefault();
    toggleHomeVoice();
  }
});

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
let homeMsgTurnCount = 0;
let currentRouteAI = null; // 【2】会話中のAI固定用（'gemini'|'gpt'|'claude'|null）

const SYS_HOME = `あなたはGOAL AIのAIアシスタントです。

【最優先ルール】ユーザーの質問・依頼にまず答えること。質問を聞き返す前にまず回答する。
- 質問されたら答える。調べものには調べて答える。雑談には雑談で返す。
- 翻訳を頼まれたら翻訳する。おすすめを聞かれたらおすすめを教える。
- ChatGPT・Claude・Geminiと同等の応答品質を最低ラインとする。
- まず回答し、その上で必要なら追加質問してもよい。

【位置情報が必要な質問】
- 「近くの」「この辺の」等の質問には、まず一般的なおすすめを回答した上で「お住まいの地域やエリアを教えていただければ、もっと具体的におすすめできます！」と添える。
- エリアを教えてもらったら即座に具体的な回答をする。
- 聞き返しだけで回答しないのは禁止。必ずまず回答する。

【ゴール提案の条件】以下の全てを満たす場合のみ、自然にゴール化を提案してよい：
1. ユーザー自身が「〜したい」「〜になりたい」「〜を目指す」等の目標・夢・やりたいことを語っている
2. What（何を）とWhy（なぜ）の両方が会話の中で明確になっている
3. 提案は「一緒にゴールを設定して、タスクを作っていきますか？」のように軽く聞く形で

【禁止事項】
- ユーザーの質問を無視してゴール設定に誘導すること
- 「あなたの大切にしたいことから考えましょう」等の押し付けコーチング
- 回答の代わりに質問だけを返すこと
- 何でもかんでもゴールに結びつけようとすること

【応答スタイル】
- 2〜3文で簡潔に。長文禁止
- 質問は1回まで
- 同じ内容の繰り返し禁止
- まとめ後に「これで合ってますか？」確認（ゴール提案時のみ）

【チャットモード】
- 通常: 上記ルール通り
- メンケア: 寄り添い重視。解決策より共感
- スパルタ: 甘さゼロ。率直に指摘
- ソクラテス: 答え禁止。ソクラテス式問答で考えを引き出す

【パーソナライズ】
ユーザープロフィール（名前・職種・強み・弱み・価値観等）が設定されている場合は、
回答をその人に合わせて最適化する。`;

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
  updateTopicTags();
}

function _goldSVG(paths){return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#goldG)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;}
function buildEmptyHomeHTML(){
  const gDef='<defs><linearGradient id="goldG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8920a"/><stop offset="100%" stop-color="#f5d380"/></linearGradient></defs>';
  const presets=[
    {svg:_goldSVG('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),text:'今日あった出来事を聞いて'},
    {svg:_goldSVG('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),text:'最近のニュースを教えて'},
    {svg:_goldSVG('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>'),text:'文章を添削して'},
    {svg:_goldSVG('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 5 12 4.5 4.5 0 0 0-1 2H8a4.5 4.5 0 0 0-1-2A7 7 0 0 1 12 2z"/>'),text:'アイデアを一緒に考えて'},
    {svg:_goldSVG('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),text:'目標を設定したい'},
    {svg:_goldSVG('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/><path d="M16 3l1 1-1 1"/>'),text:'キャリアの相談がしたい'}
  ];
  const cards=presets.map(p=>'<div onclick="document.getElementById(\'home-msg-in\').value=\''+p.text+'\';sendHomeMsg();" style="padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:border-color .15s,background .15s;display:flex;align-items:center;gap:10px;" onmouseover="this.style.borderColor=\'var(--amber)\';this.style.background=\'var(--amber-g)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.background=\'var(--bg3)\'">'+p.svg+'<span style="font-size:12px;color:var(--cream);line-height:1.4;">'+p.text+'</span></div>').join('');
  const greeting = USER_PROFILE.nickname ? `こんにちは、${escapeHtml(USER_PROFILE.nickname)}さん` : 'こんにちは！';
  return '<svg style="position:absolute;width:0;height:0;"><defs><linearGradient id="goldG" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#c8920a"/><stop offset="100%" stop-color="#f5d380"/></linearGradient></defs></svg>'
    +'<div style="text-align:center;padding:60px 20px 10px;color:var(--muted);line-height:2;">'
    +'<div style="margin:0 auto 16px;opacity:.4;">'+getLogoSVG(56)+'</div>'
    +'<div style="font-size:18px;color:var(--cream);font-weight:500;margin-bottom:6px;">'+greeting+'</div>'
    +'<div style="font-size:14px;margin-bottom:20px;">雑談、相談、調べもの、何でもOK</div>'
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
    const el = mkHomeMsg(m);
    if(el) c.appendChild(el);
  });
  setTimeout(()=>{ document.getElementById('home-chat-wrap').scrollTop=99999; },50);
  updateHomePlaceholder();
  updateTopicTags();
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
  // Paragraphs: 連続改行(2+)を<p>タグに変換、単一改行は<br>
  const parts = html.split(/\n{2,}/);
  if(parts.length > 1){
    html = parts.map(p => `<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  } else {
    html = html.replace(/\n/g,'<br>');
  }
  return html;
}

function mkHomeMsg(m){
  // 【1】空メッセージはDOMに追加しない
  if(!m.content || (typeof m.content === 'string' && m.content.trim() === '')) return null;
  const wrap=document.createElement('div'); wrap.className=`msg ${m.role}`; wrap.style.marginBottom='16px';
  const av=document.createElement('div'); av.className=`msg-av ${m.role}`;
  if(m.role==='ai'){av.innerHTML=getLogoSVG(14);}else{renderUserAvatarInner(av);}
  const body=document.createElement('div'); body.className='msg-body';
  if(m.img){
    const imgEl=document.createElement('img');
    imgEl.src=`data:${m.imgType||'image/jpeg'};base64,${m.img}`;
    imgEl.className='msg-img'; body.appendChild(imgEl);
  }
  const bub=document.createElement('div'); bub.className='bubble';
  bub.innerHTML=renderMsgContent(m.content);
  // アクションボタン（SVGアイコン）
  const _svgCopy='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const _svgQuote='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H5c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-3c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/></svg>';
  const _svgEdit='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  let actionsHtml=`<span class="msg-actions"><button class="msg-action-btn" title="コピー" onclick="copyMessage(this)">${_svgCopy}</button><button class="msg-action-btn" title="引用" onclick="quoteMessage(this)">${_svgQuote}</button>`;
  if(m.role==='user') actionsHtml+=`<button class="msg-action-btn" title="編集して再送信" onclick="editAndResend(this)">${_svgEdit}</button>`;
  actionsHtml+='</span>';
  const t=document.createElement('div'); t.className='msg-footer';
  if(m.role === 'ai'){ t.innerHTML = `<span class="msg-time">${m.time||''}</span> · <span class="msg-model">${m.model||'Claude'}</span>${actionsHtml}`; }
  else { t.innerHTML = `<span class="msg-time">${m.time||''}</span>${actionsHtml}`; }
  body.appendChild(bub); body.appendChild(t); wrap.appendChild(av); wrap.appendChild(body);
  wrap.style.position='relative';
  return wrap;
}

// 【5】コピー・引用ハンドラ
function copyMessage(btn){
  const bub = btn.closest('.msg')?.querySelector('.bubble');
  if(!bub) return;
  const text = bub.innerText || bub.textContent || '';
  navigator.clipboard.writeText(text).then(()=>toast('コピーしました')).catch(()=>toast('コピーに失敗しました'));
}
function quoteMessage(btn){
  const bub = btn.closest('.msg')?.querySelector('.bubble');
  if(!bub) return;
  const text = bub.innerText || bub.textContent || '';
  const inp = document.getElementById('home-msg-in');
  if(!inp) return;
  inp.value = '> ' + text.split('\n').join('\n> ') + '\n';
  inp.focus();
  homeResize(inp);
}

// 【6】編集して再送信
function editAndResend(btn){
  const msgEl = btn.closest('.msg');
  if(!msgEl) return;
  const bub = msgEl.querySelector('.bubble');
  if(!bub) return;
  const origText = bub.innerText || bub.textContent || '';
  // バブルをテキストエリアに変換
  const ta = document.createElement('textarea');
  ta.className = 'edit-textarea';
  ta.value = origText;
  ta.style.cssText = 'width:100%;min-height:60px;padding:8px;border-radius:8px;background:var(--bg3);color:var(--cream);border:1px solid var(--amber);font-size:14px;font-family:var(--ff);resize:vertical;';
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
  btnRow.innerHTML = `<button class="edit-resend-btn" style="padding:6px 14px;background:var(--amber);color:#000;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">再送信</button><button class="edit-cancel-btn" style="padding:6px 14px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px;">キャンセル</button>`;
  bub.style.display = 'none';
  msgEl.querySelector('.msg-actions')?.remove();
  const body = msgEl.querySelector('.msg-body');
  body.insertBefore(ta, bub);
  body.insertBefore(btnRow, bub);
  ta.focus();

  btnRow.querySelector('.edit-cancel-btn').onclick = ()=>{
    ta.remove(); btnRow.remove(); bub.style.display='';
  };
  btnRow.querySelector('.edit-resend-btn').onclick = ()=>{
    const newText = ta.value.trim();
    if(!newText){ toast('テキストを入力してください'); return; }
    // このメッセージ以降のAI応答を削除して再送信
    const allMsgs = document.getElementById('home-chat-inner')?.children;
    if(allMsgs){
      let found = false;
      const toRemove = [];
      for(const child of allMsgs){
        if(child === msgEl){ found = true; toRemove.push(child); continue; }
        if(found) toRemove.push(child);
      }
      toRemove.forEach(el => el.remove());
    }
    // homeMsgs/homeHistoryから該当以降を削除
    const idx = homeMsgs.findIndex(m => m.role === 'user' && m.content === origText);
    if(idx >= 0){ homeMsgs.splice(idx); homeHistory.splice(idx); }
    // 新テキストで再送信
    document.getElementById('home-msg-in').value = newText;
    sendHomeMsg();
  };
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
  homeMsgTurnCount++;
  if (homeMsgTurnCount >= 2) showTaskChip();
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
  }finally{
    homeLoading = false; homeSendRestore();
  }
}

// ════════ GOAL DETECTION STATE ════════
let goalDetectLevel = 'none';
let pendingGoalProposal = false;
let pendingTaskSuggestion = false;

// ════════ AI SMART ROUTING (GPT-5 mini判定) ════════
const ROUTE_PROMPT = `ユーザーのメッセージを分類せよ。JSON形式で返せ。
{"route":"gemini|gpt|gpt-simple|claude","coaching":true|false}

route:
gemini: 天気、ニュース、検索、最新情報、長文の要約依頼（500文字超）
gpt: 翻訳、SNS投稿案、キャッチコピー、短い要約（500文字以下）、アイデア出し、ブレスト
gpt-simple: 相槌や短い返事（ありがとう、OK、うん、了解、いいね等）
claude: 上記以外（感情、悩み、ゴール、戦略、コーチング、雑談で深い対話が必要なもの）

coaching: ユーザーが目標・悩み・将来・キャリア・成長・自己改善について語っている場合はtrue

追加のルーティング判定項目:
- goal_intent: ユーザーの発言からゴール化の意図レベルを判定
  - "none": 雑談・質問・調べもの（例：「天気教えて」「翻訳して」）
  - "level1": 漠然とした願望（例：「英語できるようになりたいな」）
  - "level2": 具体的意図あり（例：「来年までにTOEIC800取りたい」）
  - "level3": 明示的要求（例：「ゴール設定したい」「目標作りたい」）

- task_potential: ユーザーの発言にタスク化できる行動・予定・やるべきことが含まれる場合はtrue

JSONで返してください: { "route": "...", "coaching": true|false, "goal_intent": "none|level1|level2|level3", "task_potential": true|false }`;

async function routeMessage(text){
  // 500文字超の要約依頼はgemini
  if(text.length > 500) return 'gemini';
  // 短い相槌パターンはgpt-simple（API呼び出し不要）
  const simplePatterns = /^(ありがとう|OK|うん|はい|いいえ|了解|わかった|なるほど|そうだね|いいね|おはよう|おやすみ|お疲れ)$/i;
  if(simplePatterns.test(text.trim())) return 'gpt-simple';
  // GPT-simpleでルーティング判定（チャット回数を消費しない）
  try{
    const res = await fetch(`${WORKER_URL}/api/chat/gpt-simple`, {
      method:'POST', headers:getAuthHeaders(),
      body:JSON.stringify({
        system: ROUTE_PROMPT,
        messages:[{role:'user',content:text}],
        maxTokens:300
      })
    });
    if(!res.ok) return 'claude';
    const data = await res.json();
    const answer = (data.choices?.[0]?.message?.content || '').trim();
    // Try JSON parse
    try {
      const parsed = JSON.parse(answer);
      const route = parsed.route || 'claude';
      if (parsed.coaching && !isCoachingMode) isCoachingMode = true;
      if (parsed.goal_intent) {
        window._lastGoalIntent = parsed.goal_intent;
        goalDetectLevel = parsed.goal_intent;
        if (parsed.goal_intent === 'level3') pendingGoalProposal = true;
      }
      if (parsed.task_potential) { window._pendingTaskSuggestion = true; highlightTaskChip(); }
      if (['gemini','gpt','gpt-simple','claude'].includes(route)) return route;
    } catch(e) {
      // Fallback: old single-word format
      const clean = answer.toLowerCase().replace(/[^a-z-]/g,'');
      if (['gemini','gpt','gpt-simple','claude'].includes(clean)) return clean;
    }
  }catch(e){}
  return 'claude';
}

async function homeSmartRoute(text, today, homeInner, homeWrap){
  const inner = typeof homeInner === 'string' ? document.getElementById(homeInner) : homeInner;
  const scroll = typeof homeWrap === 'string' ? document.getElementById(homeWrap) : homeWrap;

  try {
    // 【2】会話途中はルーティングしない。最初のメッセージでのみ判定
    let route;
    if(currentRouteAI){
      route = currentRouteAI; // 会話中はAI固定
    } else {
      route = await routeMessage(text);
      currentRouteAI = (route === 'gpt-simple') ? 'claude' : route; // gpt-simpleは次からclaude
    }

    // 【1】ルーティング判定後にバブルを作成（空バブル防止）
    if(route === 'gemini'){
      const { bub } = mkStreamBubble(inner, scroll);
      bub.innerHTML = '🔍 リサーチ中...';
      bub.style.cssText += 'color:var(--amber);font-size:13px;';
      try{
        const ctx = buildAIContextCached();
        const result = await callGemini(text, `【絶対ルール】ユーザーの質問にまず具体的に回答すること。聞き返し禁止。
- ニュースを聞かれたら→主要ニュースを3〜5件紹介する
- おすすめを聞かれたら→具体的な候補を3〜5件挙げる
- 天気を聞かれたら→天気情報を回答する
- 検索を頼まれたら→検索結果を要約して回答する
回答した後に「他に気になることはありますか？」と1回だけ聞いてよい。
「どんなジャンル？」「どの地域？」等の聞き返しは禁止。情報が足りなければ幅広く回答する。
日本語で回答。\n\nユーザー背景：${ctx}`);
        if(!result || !result.trim()){ bub.closest('.msg')?.remove(); return; }
        bub.innerHTML = renderMsgContent(result);
        bub.classList.remove('stream-bubble'); bub.style.cssText = '';
        const gemFooter = bub.parentElement?.querySelector('.msg-footer');
        if(gemFooter) gemFooter.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">Gemini</span>${_msgActionsHtml()}`;
        homeMsgs.push({role:'ai',content:result,time:now(),date:today,model:'Gemini'});
        homeHistory.push({role:'assistant',content:result});
        saveHomeMsgs();
        return;
      }catch(e){
        bub.innerHTML = ''; bub.style.cssText = '';
        bub.closest('.msg')?.remove();
        currentRouteAI = 'claude'; // フォールバック時はClaude固定
        await homeClaudeStream(today, inner, scroll);
      }

    } else if(route === 'gpt'){
      const { bub } = mkStreamBubble(inner, scroll);
      bub.innerHTML = '💡 アイデア生成中...';
      bub.style.cssText += 'color:var(--amber);font-size:13px;';
      try{
        const ctx = buildAIContextCached();
        const result = await callOpenAI(text, `【絶対ルール】ユーザーのリクエストにまず具体的に回答すること。聞き返し禁止。
- 翻訳を頼まれたら→即座に翻訳結果を返す
- アイデアを聞かれたら→具体的なアイデアを3〜5件挙げる
- 要約を頼まれたら→即座に要約する
回答した後に補足質問を1回だけしてよい。依頼されたことをそのまま実行する。日本語で回答。\n\nユーザー背景：${ctx}`, 800);
        if(!result || !result.trim()){ bub.closest('.msg')?.remove(); return; }
        bub.innerHTML = renderMsgContent(result);
        bub.classList.remove('stream-bubble'); bub.style.cssText = '';
        const gptFooter = bub.parentElement?.querySelector('.msg-footer');
        if(gptFooter) gptFooter.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">GPT</span>${_msgActionsHtml()}`;
        homeMsgs.push({role:'ai',content:result,time:now(),date:today,model:'GPT'});
        homeHistory.push({role:'assistant',content:result});
        saveHomeMsgs();
        return;
      }catch(e){
        bub.innerHTML = ''; bub.style.cssText = '';
        bub.closest('.msg')?.remove();
        currentRouteAI = 'claude';
        await homeClaudeStream(today, inner, scroll);
      }

    } else if(route === 'gpt-simple'){
      const { bub } = mkStreamBubble(inner, scroll);
      try{
        const res = await fetch(`${WORKER_URL}/api/chat/gpt-simple`, {
          method:'POST', headers:getAuthHeaders(),
          body:JSON.stringify({
            system:'日本語で端的に1文で返答してください。',
            messages:[{role:'user',content:text}],
            maxTokens:100
          })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if(reply && reply.trim()){
          bub.innerHTML = renderMsgContent(reply);
          bub.classList.remove('stream-bubble');
          const simFooter = bub.parentElement?.querySelector('.msg-footer');
          if(simFooter) simFooter.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">GPT</span>${_msgActionsHtml()}`;
          homeMsgs.push({role:'ai',content:reply,time:now(),date:today,model:'GPT'});
          homeHistory.push({role:'assistant',content:reply});
          saveHomeMsgs();
        } else {
          bub.closest('.msg')?.remove();
          await homeClaudeStream(today, inner, scroll);
        }
      }catch(e){
        bub.closest('.msg')?.remove();
        await homeClaudeStream(today, inner, scroll);
      }

    } else {
      // Claude直接応答（デフォルト）
      await homeClaudeStream(today, inner, scroll);
    }
  } catch(e) {
    const errEl = document.createElement('div');
    errEl.className = 'msg ai';
    errEl.innerHTML = `<div class="msg-body"><div class="bubble" style="color:var(--red)">エラーが発生しました。もう一度お試しください。</div></div>`;
    inner.appendChild(errEl);
  }
}

async function executeRoute(route, text, today, inner, scroll, indicatorBub){
  const ctx = buildAIContextCached();
  const query = route.query || text;
  try{
    let result;
    if(route.route === 'gemini'){
      result = await callGemini(query, `【絶対ルール】ユーザーの質問にまず具体的に回答すること。聞き返し禁止。情報が足りなければ幅広く回答する。日本語で回答。\n\nユーザー背景：${ctx}`);
    } else {
      result = await callOpenAI(query, `【絶対ルール】ユーザーのリクエストにまず具体的に回答すること。聞き返し禁止。依頼されたことをそのまま実行する。日本語で回答。\n\nユーザー背景：${ctx}`, 800);
    }
    // インジケーターバブルを結果で置換
    if(!result || !result.trim()){ indicatorBub.closest('.msg')?.remove(); return; }
    const routeModel = route.route === 'gemini' ? 'Gemini' : 'GPT';
    indicatorBub.innerHTML = renderMsgContent(result);
    indicatorBub.classList.remove('stream-bubble');
    indicatorBub.style.cssText = '';
    const routeFooter = indicatorBub.parentElement?.querySelector('.msg-footer');
    if(routeFooter) routeFooter.innerHTML = `<span class="msg-time">${now()}</span> · <span class="msg-model">${routeModel}</span>${_msgActionsHtml()}`;
    homeMsgs.push({role:'ai',content:result,time:now(),date:today,model:routeModel});
    homeHistory.push({role:'assistant',content:result});
    saveHomeMsgs();
    // ★ ルーティング後はreturnで終了。Claudeの補足コメントは呼ばない
    return;
  }catch(e){
    // フォールバック: Claudeで直接回答
    indicatorBub.closest('.msg')?.remove();
    await homeClaudeStream(today, inner, scroll);
  }
}

async function homeClaudeStream(today, homeInner, homeWrap){
  const sys = SYS_HOME + `\n\n${buildAIContextCached()}`;
  await chatStream({
    system: sys, messages: homeHistory.slice(-8), maxTokens: 350,
    innerEl: homeInner, scrollEl: homeWrap,
    onDone(t){
      if(!t || !t.trim()) return;
      homeMsgs.push({role:'ai',content:t,time:now(),date:today,model:'Claude'}); homeHistory.push({role:'assistant',content:t}); saveHomeMsgs();
      if(MEMBERSHIP.plan==='free'){ if(FREE_MODEL_USAGE.claude.remaining>0){FREE_MODEL_USAGE.claude.remaining--;FREE_MODEL_USAGE.claude.used++;} renderModelUsageBadge(); }
    }
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
      onDone(t){ if(!t||!t.trim())return; homeMsgs.push({role:'ai',content:t,time:now(),date:today,model:'Claude'}); homeHistory.push({role:'assistant',content:t}); saveHomeMsgs(); }
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
  currentRouteAI = null; // 【2】新しい会話でルーティングリセット
  homeMsgTurnCount = 0;
  hideTaskChip(); // タスク化チップをリセット

  // 3. ウェルカム表示
  renderWelcomeView();
  renderSidebarChatRecords();
}

function renderWelcomeView(){
  const chatInner = document.getElementById('home-chat-inner');
  if(!chatInner) return;
  chatInner.innerHTML = buildEmptyHomeHTML();
  updateHomePlaceholder();
  showProfileHint();
}

// STEP 11: プロフィール未設定案内
function showProfileHint() {
  if (getCookie('profile_hint_shown')) return;
  if (USER_PROFILE.nickname || USER_PROFILE.occupation) return;
  if (homeMsgs.length > 0) return;

  const inner = document.getElementById('home-chat-inner');
  if (!inner) return;

  const hint = document.createElement('div');
  hint.className = 'msg ai';
  hint.style.marginBottom = '16px';
  hint.innerHTML = `<div class="msg-av ai">${getLogoSVG(14)}</div><div class="msg-body"><div class="bubble" style="font-size:13px;">こんにちは！何でも聞いてください。<br>もしよかったら<a onclick="showPage('myself');closeSidebar();" style="color:var(--amber);cursor:pointer;text-decoration:underline;">「私をデザイン」</a>であなたのことを教えてもらえると、より的確なアドバイスができるようになります。</div></div>`;
  inner.appendChild(hint);

  setCookie('profile_hint_shown', 'true', 365);
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
  const recent = chatRecords.filter(r => {
    const t = (r.title || '').trim();
    if (!t || t === '会話' || t === '会話...') return false;
    if (t.startsWith('ビジョン：') || t.startsWith('【ユーザー情報】') || t.startsWith('【あなたの役割】') || t.startsWith('【共通ルール】')) return false;
    return true;
  }).slice(0,5);
  if(recent.length === 0){
    el.innerHTML = '';
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
  // チャット内容+ツールバーを非表示にして重畳防止
  document.querySelectorAll('#home-chat-wrap, #home-input-area, #home-chat-toolbar, #home-search-bar, #home-topic-tags').forEach(el => { if(el) el.style.display = 'none'; });
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
function closeChatHistory(){
  document.getElementById('chat-history-panel').style.display='none';
  // チャット内容+ツールバーを復元（inline styleのdisplay値を明示）
  const toolbar = document.getElementById('home-chat-toolbar');
  if(toolbar) toolbar.style.display = 'flex';
  const chatWrap = document.getElementById('home-chat-wrap');
  if(chatWrap) chatWrap.style.display = '';
  const inputArea = document.getElementById('home-input-area');
  if(inputArea) inputArea.style.display = '';
  const searchBar = document.getElementById('home-search-bar');
  if(searchBar) searchBar.style.display = 'none'; // 検索バーはデフォルト非表示
  const topicTags = document.getElementById('home-topic-tags');
  if(topicTags) topicTags.style.display = '';
}
async function deleteChatSession(sessionId){
  if(!confirm('この会話を削除しますか？')) return;
  try{ await fetch(`${WORKER_URL}/api/history?sessionId=${sessionId}`, {method:'DELETE',headers:getAuthHeaders()}); }catch(e){}
  chatSessions = chatSessions.filter(s=>s.sessionId!==sessionId);
  renderChatHistoryList(chatSessions);
  renderSidebarChatRecords();
  toast('会話を削除しました');
}
function isJunkSession(s) {
  const p = (s.firstMsg || s.title || '').trim();
  if (!p || p === '会話' || p === '会話...') return true;
  if (p.startsWith('ビジョン：') || p.startsWith('【ユーザー情報】') || p.startsWith('【あなたの役割】')) return true;
  if (p.startsWith('【共通ルール】') || p.startsWith('【最優先ルール】')) return true;
  if (s.count <= 1 && !s.hasUserMsg) return true;
  return false;
}

function renderChatHistoryList(sessions){
  const list = document.getElementById('chat-history-list');
  const filtered = sessions.filter(s => !isJunkSession(s));
  if(!filtered.length){ list.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);">会話履歴はまだありません</div>'; return; }
  sessions = filtered;
  list.innerHTML = sessions.map(s => {
    const d = new Date(s.date);
    const dateStr = d.toLocaleDateString('ja-JP',{month:'short',day:'numeric'});
    const preview = (s.firstMsg || '会話').substring(0, 30);
    const star = s.goal_candidate ? '<span class="goal-star" style="color:var(--amber);margin-right:4px;">★</span>' : '';
    const tagPill = s.session_tag ? `<span style="display:inline-block;background:rgba(200,146,10,0.15);color:var(--amber);font-size:0.6rem;padding:1px 5px;border-radius:6px;margin-left:4px;">${escapeHtml(s.session_tag)}</span>` : '';
    return `<div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .15s;" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
      <div onclick="loadChatSession('${s.sessionId}')" style="flex:1;min-width:0;cursor:pointer;">
        <div style="font-size:13px;color:var(--cream);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${star}${escapeHtml(preview)}…${tagPill}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px;">${Math.max(1, Math.floor(s.count/2))}往復 · ${dateStr}</div>
      </div>
      <button onclick="event.stopPropagation();deleteChatSession('${s.sessionId}')" title="削除" style="width:32px;height:32px;border-radius:8px;border:none;background:transparent;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--muted);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>`;
  }).join('');
}
function filterChatHistory(q){
  if(!q){ renderChatHistoryList(chatSessions); return; }
  const filtered = chatSessions.filter(s => (s.firstMsg||'').includes(q));
  renderChatHistoryList(filtered);
}
async function loadChatSession(sessionId){
  closeSidebar();
  closeChatHistory();
  showPage('home');
  // ローディング表示
  const inner = document.getElementById('home-chat-inner');
  if(inner) inner.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">読み込み中…</div>';
  try {
    const res = await fetch(`${WORKER_URL}/api/history?sessionId=${sessionId}&limit=200`, {headers: getAuthHeaders()});
    const data = await res.json();
    const messages = (data.messages || []).reverse();
    homeMsgs = [];
    homeHistory = [];
    messages.forEach(m => {
      if(!m.content || !m.content.trim()) return;
      const c = m.content.trim();
      if(c.startsWith('【ユーザー情報】') || c.startsWith('【あなたの役割】') || c.startsWith('【共通ルール】') || c.startsWith('【最優先ルール】') || c.startsWith('ビジョン：未設定')) return;
      const time = new Date(m.created_at).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
      const date = new Date(m.created_at).toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
      homeMsgs.push({role: m.role==='assistant'?'ai':m.role, content: m.content, time, date});
      homeHistory.push({role: m.role, content: m.content});
    });
    currentSessionId = sessionId;
    if(homeMsgs.length === 0){
      toast('この会話のメッセージを読み込めませんでした');
    }
    renderHomeMsgs();
  } catch(e) { toast('会話の読み込みに失敗しました'); renderHomeMsgs(); }
}

// ═══ BATCH DELETE CHAT HISTORY ═══
let historySelectMode = false;
let selectedSessions = new Set();

function toggleHistorySelectMode() {
  historySelectMode = !historySelectMode;
  selectedSessions.clear();
  renderChatHistoryList(chatSessions);
  const footer = document.getElementById('history-select-footer');
  if (footer) footer.style.display = historySelectMode ? 'flex' : 'none';
}

function toggleSessionSelect(sessionId) {
  if (selectedSessions.has(sessionId)) selectedSessions.delete(sessionId);
  else selectedSessions.add(sessionId);
  updateSelectFooter();
}

function updateSelectFooter() {
  const n = selectedSessions.size;
  const countEl = document.getElementById('history-select-count');
  if (countEl) countEl.textContent = `${n}件選択`;
  const delBtn = document.getElementById('delete-selected-btn');
  if (delBtn) delBtn.textContent = n > 0 ? `削除（${n}件）` : '削除';
  const allBtn = document.getElementById('select-all-btn');
  const totalVisible = chatSessions.filter(s => !isJunkSession(s)).length;
  if (allBtn) allBtn.textContent = n >= totalVisible ? 'すべて解除' : 'すべて選択';
}

function toggleSelectAll() {
  const visible = chatSessions.filter(s => !isJunkSession(s));
  if (selectedSessions.size >= visible.length) {
    selectedSessions.clear();
  } else {
    visible.forEach(s => selectedSessions.add(s.sessionId));
  }
  renderChatHistoryList(chatSessions);
  updateSelectFooter();
}

async function deleteSelectedSessions() {
  if (selectedSessions.size === 0) return;
  if (!confirm(`${selectedSessions.size}件の会話を削除しますか？`)) return;
  for (const sid of selectedSessions) {
    try { await apiCall(`/api/history/${sid}`, 'DELETE'); } catch(e) {}
  }
  selectedSessions.clear();
  historySelectMode = false;
  renderSidebarChatRecords();
  toast('会話を削除しました');
}

// ═══ FREE MODEL USAGE BADGE ═══
function renderModelUsageBadge(){
  if(!MEMBERSHIP || MEMBERSHIP.plan !== 'free') {
    const b = document.getElementById('model-usage-badge');
    if(b) b.style.display='none';
    return;
  }
  const badge = document.getElementById('model-usage-badge');
  if(!badge) return;
  badge.style.display='flex';
  const { claude, gemini, gpt } = FREE_MODEL_USAGE;
  const totalRemaining = claude.remaining + gemini.remaining + gpt.remaining;
  const color = totalRemaining > 5 ? 'var(--amber)' : 'var(--red)';
  badge.innerHTML = `<div onclick="showModelUsageDetail()" style="display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;background:var(--bg3);border:1px solid var(--border);font-size:11px;font-weight:500;color:${color};cursor:pointer;white-space:nowrap;" title="高品質AI残り回数">⚡${totalRemaining}回/24h</div>`;
}
function showModelUsageDetail(){
  const { claude, gemini, gpt } = FREE_MODEL_USAGE;
  toast(`Claude: ${claude.remaining}/${claude.limit}回  Gemini: ${gemini.remaining}/${gemini.limit}回  GPT: ${gpt.remaining}/${gpt.limit}回`);
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
  const modeNames={normal:'通常',spartan:'スパルタ',mencare:'メンケア',kabeuchi:'ソクラテス'};
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

  try{
    await streamAI(
      { system: htpSys, messages: htpHistory.slice(-8), maxTokens: 400 },
      (t) => { htpBub.innerHTML = renderMsgContent(t); chat.scrollTop = 99999; },
      (t) => { htpBub.classList.remove('stream-bubble'); htpHistory.push({role:'assistant',content:t}); },
      (e) => { htpBub.classList.remove('stream-bubble'); htpBub.textContent = 'エラーが発生しました。'; }
    );
  }catch(e){
    htpBub.classList.remove('stream-bubble'); htpBub.textContent = 'エラーが発生しました。';
  }finally{
    htpLoading = false;
  }
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

const FB_SYS = `あなたはGOAL AIの改善担当です。ユーザーが貴重な時間を使ってフィードバックをくれています。

【応答ルール（最優先）】
1. ユーザーの発言には必ず最初に感謝を示す（例：「教えてくれてありがとうございます」「貴重なご意見ですね」）
2. 共感を示してからフォローアップ質問する（例：「文字が見えにくいのは使いづらかったですね。どの画面で特に気になりましたか？」）
3. 否定・反論しない。改善の参考にする姿勢を見せる
4. 最後に「他に気になったことはありますか？」で締める

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
  if (!chat || !text) return;

  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'user' ? 'user' : 'ai'}`;
  wrap.style.marginBottom = '16px';
  wrap.style.position = 'relative';

  const av = document.createElement('div');
  av.className = `msg-av ${role === 'user' ? 'user' : 'ai'}`;
  if (role === 'ai') {
    av.innerHTML = getLogoSVG(14);
  } else {
    const ut = getUserAvatarText();
    if (ut) av.textContent = ut;
    else av.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';
  }

  const body = document.createElement('div');
  body.className = 'msg-body';

  const bub = document.createElement('div');
  bub.className = 'bubble';
  bub.innerHTML = renderMsgContent(text);

  const footer = document.createElement('div');
  footer.className = 'msg-footer';
  footer.innerHTML = `<span class="msg-time">${now()}</span>`;

  body.appendChild(bub);
  body.appendChild(footer);
  wrap.appendChild(av);
  wrap.appendChild(body);
  chat.appendChild(wrap);

  setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 50);
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
  }finally{
    fbLoading = false;
  }
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
        rawChat: { messages: fbMsgs, themes: fbThemes },
        ...getDeviceInfo(),
        app_version: APP_VERSION,
        tester_tier: MEMBERSHIP.tester_tier || null,
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

// ════════ E-1~E-4: GOAL PROPOSAL CARD ════════
function renderGoalProposalCard(title, why, deadline) {
  const safeTitle = escapeHtml(title || '');
  const safeWhy = escapeHtml(why || '');
  const safeDeadline = escapeHtml(deadline || '');
  return '<div class="goal-proposal-card" style="margin-top:12px;padding:16px;background:var(--card-bg,var(--bg3));border:1.5px solid var(--amber);border-radius:var(--r);">'
    + '<div style="font-size:14px;font-weight:600;color:var(--cream);margin-bottom:8px;">💡 ゴールにしませんか？</div>'
    + '<div style="color:var(--cream);margin-bottom:4px;">🎯 ' + safeTitle + '</div>'
    + (safeWhy ? '<div style="color:var(--muted);font-size:12px;margin-bottom:4px;">💡 ' + safeWhy + '</div>' : '')
    + (safeDeadline ? '<div style="color:var(--muted);font-size:12px;margin-bottom:12px;">📅 ' + safeDeadline + '</div>' : '<div style="margin-bottom:12px;"></div>')
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="startGoalAssist({title:\'' + safeTitle.replace(/'/g, "\\'") + '\',why:\'' + safeWhy.replace(/'/g, "\\'") + '\',deadline:\'' + safeDeadline.replace(/'/g, "\\'") + '\'})" style="flex:1;padding:8px;background:var(--amber);color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:12px;">ゴールアシストを始める</button>'
    + '<button onclick="declineGoalProposal(\'' + safeTitle.replace(/'/g, "\\'") + '\');this.closest(\'.goal-proposal-card\').style.display=\'none\'" style="flex:1;padding:8px;background:var(--bg3);color:var(--cream);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;">今はいい</button>'
    + '</div></div>';
}

function startGoalAssist(goalData) {
  const wlcIn = document.getElementById('wlc-in');
  if (wlcIn) wlcIn.value = goalData.title || '';
  showPage('welcome');
}

// ════════ E-5: Track declined goal proposals ════════
function declineGoalProposal(topic) {
  let declined = [];
  try {
    const raw = getCookie('declined_goals');
    if (raw) declined = JSON.parse(raw);
  } catch(e) {}
  const existing = declined.find(d => d.topic === topic);
  if (existing) {
    existing.count++;
    existing.date = new Date().toISOString().slice(0,10);
  } else {
    declined.push({ topic, date: new Date().toISOString().slice(0,10), count: 1 });
  }
  setCookie('declined_goals', JSON.stringify(declined), 365);
}

function shouldRemindGoal(topic) {
  try {
    const raw = getCookie('declined_goals');
    if (!raw) return true;
    const declined = JSON.parse(raw);
    const entry = declined.find(d => d.topic === topic);
    if (!entry) return true;
    if (entry.count >= 2) return false; // 2回断ったら二度とリマインドしない
    const daysSince = Math.floor((Date.now() - new Date(entry.date).getTime()) / 86400000);
    return daysSince >= 2; // 2日後からリマインド可能
  } catch(e) { return true; }
}

// ════════ E-7: Recent topic tags above input ════════
function updateTopicTags() {
  const container = document.getElementById('home-topic-tags');
  if (!container) return;
  const recentUserMsgs = homeMsgs.filter(m => m.role === 'user').slice(-5);
  if (recentUserMsgs.length === 0) { container.style.display = 'none'; return; }

  // Extract keywords (simple approach: look for goal-related terms)
  const keywords = new Set();
  const patterns = /(\S{2,}(?:学習|転職|資格|ダイエット|運動|英語|プログラミング|副業|読書|貯金|起業|独立))/g;
  recentUserMsgs.forEach(m => {
    const matches = (m.content || '').match(patterns);
    if (matches) matches.forEach(w => keywords.add(w));
  });

  if (keywords.size === 0) { container.style.display = 'none'; return; }

  container.style.display = 'flex';
  container.innerHTML = Array.from(keywords).slice(0, 5).map(k =>
    `<span class="topic-tag" onclick="suggestGoalFromTag('${escapeHtml(k).replace(/'/g,"\\'")}')">${escapeHtml(k)}</span>`
  ).join('');
}

function suggestGoalFromTag(topic) {
  if (!shouldRemindGoal(topic)) { toast('この話題は以前お断りされました'); return; }
  const inner = document.getElementById('home-chat-inner');
  const scroll = document.getElementById('home-chat-wrap');
  if (!inner) return;
  const card = document.createElement('div');
  card.className = 'msg ai';
  card.innerHTML = `<div class="msg-body">${renderGoalProposalCard(topic, '', '')}</div>`;
  inner.appendChild(card);
  if (scroll) scroll.scrollTop = scroll.scrollHeight;
}

// ════════ E-8: Goal assist banner ════════
function showGoalAssistBanner(title) {
  let banner = document.getElementById('goal-assist-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'goal-assist-banner';
    banner.className = 'goal-assist-banner';
    const chatWrap = document.getElementById('home-chat-wrap');
    if (chatWrap) chatWrap.parentElement.insertBefore(banner, chatWrap);
  }
  banner.innerHTML = `🎯 ゴールアシスト中：${escapeHtml(title)} <button class="close-btn" onclick="this.parentElement.remove()">×</button>`;
}

// ═══ CHAT_CONFIGS — 4画面共通設定 ═══
const CHAT_CONFIGS = {
  home: {
    containerId: 'home-chat-inner',
    scrollId: 'home-chat-wrap',
    inputId: 'home-msg-in',
    routing: true,
    fixedModel: null,
    freeNoCount: false,
    role: 'ユーザーの万能AIアシスタント。質問にはまず答え、必要に応じてコーチングする。',
    voiceInput: true,
    msgsKey: 'homeMsgs',
    profileInject: { initial: ['nickname', 'occupation', 'age', 'mbti'], onCoaching: ['strengths', 'weaknesses', 'values', 'vision', 'constraints'] },
    coachingDetect: true
  },
  goal: {
    containerId: 'hub-chat-inner',
    scrollId: 'hub-chat-wrap',
    inputId: 'hub-msg-in',
    routing: true,
    fixedModel: null,
    freeNoCount: false,
    role: null,
    voiceInput: true,
    msgsKey: 'goalMsgs',
    profileInject: { initial: ['nickname', 'occupation', 'age', 'mbti', 'strengths', 'weaknesses', 'values', 'vision', 'constraints'] },
    coachingDetect: false
  },
  design: {
    containerId: 'know-chat',
    scrollId: null,
    inputId: 'know-msg-in',
    routing: false,
    fixedModel: 'sonnet',
    freeNoCount: true,
    role: '優秀なライフデザイナー。質問を通じてユーザーの本質を引き出す。先入観を持たず、答えを誘導しない。',
    voiceInput: true,
    msgsKey: 'designMsgs',
    profileInject: { initial: ['nickname'] },
    coachingDetect: false
  },
  feedback: {
    containerId: 'feedback-chat',
    scrollId: null,
    inputId: 'feedback-msg-in',
    routing: false,
    fixedModel: 'sonnet',
    freeNoCount: true,
    role: '感謝と共感を最優先するプロダクト改善パートナー。必ず感謝から始め、否定・反論しない。',
    voiceInput: true,
    msgsKey: 'feedbackMsgs',
    profileInject: { initial: ['nickname'] },
    coachingDetect: false
  }
};

// ═══ HOME_ROLES — モード別ロール ═══
const HOME_ROLES = {
  normal: 'ユーザーの万能AIアシスタント。質問にはまず答え、必要に応じてコーチングする。',
  spartan: '丁寧だけど辛口。甘さゼロで言い訳の妥当性もチェック。無駄なフォローなしで率直に問題点と改善点だけを伝える。',
  mencare: '寄り添い型のメンタルケアパートナー。共感を第一に、ユーザーの気持ちを受け止める。',
  kabeuchi: 'ソクラテス式の対話相手。答えを教えず、質問で思考を深める。'
};

// ═══ コーチング検出フラグ ═══
let isCoachingMode = false;

// ═══ AIロールバッジ更新 ═══
function updateRoleBadge(roleText) {
  const badge = document.getElementById('chat-role-badge');
  if (!badge) return;
  if (!roleText) { badge.style.display = 'none'; return; }
  badge.style.display = 'flex';
  badge.querySelector('.role-text').textContent = roleText;
}

// ═══ 現在のチャット画面のconfig取得 ═══
function getCurrentChatConfig() {
  // ホームのモードに応じてロールを切り替え
  const mode = spartanMode ? 'spartan' : mencareMode ? 'mencare' : kabeuchiMode ? 'kabeuchi' : 'normal';
  return {
    ...CHAT_CONFIGS.home,
    role: HOME_ROLES[mode]
  };
}

// ════════ TASK PIN / TASK SUGGESTION ════════
function hideTaskChip(){ const w=document.getElementById('task-chip-wrap'); if(w) w.style.display='none'; }
function showTaskChip(){ const w=document.getElementById('task-chip-wrap'); if(w){ w.style.display='flex'; const b=document.getElementById('task-chip-btn'); if(b) b.classList.remove('highlight'); } }
function highlightTaskChip(){ const w=document.getElementById('task-chip-wrap'); if(w){ w.style.display='flex'; const b=document.getElementById('task-chip-btn'); if(b) b.classList.add('highlight'); } }

function openTaskFromChat() {
  const msgs = document.querySelectorAll('#home-chat-inner .msg.ai .bubble');
  const lastAI = msgs.length > 0 ? msgs[msgs.length - 1].textContent : '';
  if (!lastAI) { toast('タスク化する会話がありません'); return; }
  requestTaskBreakdown(lastAI);
}

function getLastAIMessage() {
  const msgs = document.querySelectorAll('#home-chat-inner .msg.ai .bubble');
  return msgs.length > 0 ? msgs[msgs.length - 1].textContent : '';
}

function appendTaskSuggestionButton(bubbleEl) {
  if (!bubbleEl) return;
  const btn = document.createElement('button');
  btn.className = 'inline-task-btn';
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"/><path d="M8 6h8l-2 8h-4z"/><path d="M12 14v8"/><path d="M9 22h6"/></svg> タスクにする';
  btn.onclick = () => requestTaskBreakdown(bubbleEl.textContent);
  bubbleEl.parentElement?.appendChild(btn);
}

async function requestTaskBreakdown(contextText) {
  toast('タスクを分析中...');
  try {
    const res = await fetch(`${WORKER_URL}/api/chat/gpt-simple`, {
      method:'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ system:'以下の会話内容からタスクを抽出してJSON配列で返してください。各タスクにはtitle（20文字以内）とdeadline（YYYY-MM-DD or null）を含めてください。3〜7個。JSONのみ返す。', messages:[{role:'user',content:contextText.slice(0,1000)}], maxTokens:400 })
    });
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').replace(/```json|```/g,'').trim();
    const tasks = JSON.parse(raw);
    if (Array.isArray(tasks)) showTaskCard(tasks);
    else toast('タスクの分析に失敗しました');
  } catch(e) { toast('タスクの分析に失敗しました'); }
}

function showTaskCard(tasks) {
  const goalOpts = ALL_GOALS.filter(g=>!g.archived).map(g=>`<option value="${g.id}">${escapeHtml(g.title)}</option>`).join('');
  const modal = document.createElement('div');
  modal.className = 'task-card-modal';
  modal.innerHTML = `<div class="task-card"><h3 class="task-card-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2"><path d="M12 2v10"/><path d="M8 6h8l-2 8h-4z"/><path d="M12 14v8"/><path d="M9 22h6"/></svg> タスク化</h3><div class="task-card-list">${tasks.map((t,i)=>`<label class="task-card-item"><input type="checkbox" checked data-idx="${i}"><span class="task-card-name">${escapeHtml(t.title)}</span>${t.deadline?`<span class="task-card-date">${t.deadline}</span>`:''}</label>`).join('')}</div><div class="task-card-options"><div style="display:flex;gap:8px;align-items:center;"><span style="font-size:0.8rem;color:var(--muted);">種類:</span><label style="font-size:0.8rem;"><input type="radio" name="task-type" value="life" checked> ライフ</label><label style="font-size:0.8rem;"><input type="radio" name="task-type" value="goal"> ゴール紐付</label></div><div id="task-goal-select" style="display:none;margin-top:4px;"><select id="task-goal-dropdown" class="field-select" style="font-size:0.8rem;"><option value="">ゴールを選択...</option>${goalOpts}</select></div><div style="display:flex;gap:8px;align-items:center;margin-top:6px;"><span style="font-size:0.8rem;color:var(--muted);">重み:</span><label style="font-size:0.8rem;"><input type="radio" name="task-priority" value="high"> 重要</label><label style="font-size:0.8rem;"><input type="radio" name="task-priority" value="normal" checked> 普通</label><label style="font-size:0.8rem;"><input type="radio" name="task-priority" value="low"> 軽い</label></div></div><div class="task-card-actions"><button onclick="this.closest('.task-card-modal').remove()" class="task-card-cancel">キャンセル</button><button onclick="confirmTaskCard()" class="task-card-confirm">追加する</button></div></div>`;
  modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
  modal.querySelectorAll('input[name="task-type"]').forEach(r => r.addEventListener('change', e => {
    document.getElementById('task-goal-select').style.display = e.target.value==='goal'?'block':'none';
  }));
  modal._tasks = tasks;
}

async function confirmTaskCard() {
  const modal = document.querySelector('.task-card-modal');
  if (!modal) return;
  const checked = modal.querySelectorAll('input[type="checkbox"]:checked');
  const taskType = modal.querySelector('input[name="task-type"]:checked')?.value || 'life';
  const priority = modal.querySelector('input[name="task-priority"]:checked')?.value || 'normal';
  const goalId = taskType === 'goal' ? document.getElementById('task-goal-dropdown')?.value : null;
  const tasks = modal._tasks;
  let count = 0;
  for (const cb of checked) {
    const idx = parseInt(cb.dataset.idx);
    const t = tasks[idx];
    if (!t) continue;
    // Save to goal's phases if goal-linked, otherwise standalone
    if (goalId) {
      const goal = ALL_GOALS.find(g => String(g.id) === String(goalId));
      if (goal) {
        if (!goal.phases || !goal.phases.length) goal.phases = [{title:'タスク',tasks:[]}];
        goal.phases[0].tasks.push({id:'task_'+Date.now()+'_'+idx, title:t.title, done:false, deadline:t.deadline, source:'chat', priority});
      }
    }
    count++;
  }
  modal.remove();
  toast(`${count}件のタスクを追加しました`);
}


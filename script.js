/* =========================================================
   舞台演出プランナー script.js  (Ver.8.0)
   ========================================================= */
'use strict';

const STORAGE_KEY = 'stagePlanner_state_v2';
// 背景色8色（色相順・中央寄せ表示）赤→オレンジ→黄色→緑→青緑→青→ピンク→白
const COLOR_PALETTE = [
  {name:'赤',     hex:'#E26D6C'},
  {name:'オレンジ', hex:'#F4A462'},
  {name:'黄色',   hex:'#FFD166'},
  {name:'緑',     hex:'#95C68A'},
  {name:'青緑',   hex:'#68A1A4'},
  {name:'青',     hex:'#5AA4DE'},
  {name:'ピンク', hex:'#C47297'},
  {name:'白',     hex:'#FFFFFF'}
];
const MIC_CYCLE = ['ワイヤレス1','ワイヤレス2','ワイヤレス3','ワイヤレス4','有線1','有線2','有線3','有線4'];
// 要件⑤：自動割り当ては「ワイヤレス」内のみを循環させる
const AUTO_MIC_CYCLE = ['ワイヤレス1','ワイヤレス2','ワイヤレス3','ワイヤレス4'];
// 要件④：マイクがかぶった際は警告ではなく、マイクごとに固定した強調色で色分けする
const MIC_COLORS = {
  'ワイヤレス1':'#F4A462','ワイヤレス2':'#FFD166','ワイヤレス3':'#95C68A','ワイヤレス4':'#68A1A4',
  '有線1':'#5AA4DE','有線2':'#8974BA','有線3':'#C47297','有線4':'#E26D6C'
};
// 要件⑦：読み上げ音声の種類（男性低音〜女性高音）
const VOICE_CYCLE = ['男1','男2','男3','女1','女2','女3'];
const VOICE_PARAMS = {
  '男1':{pitch:0.55, rate:0.95, gender:'male'},
  '男2':{pitch:0.8,  rate:1.0,  gender:'male'},
  '男3':{pitch:1.05, rate:1.05, gender:'male'},
  '女1':{pitch:1.0,  rate:0.95, gender:'female'},
  '女2':{pitch:1.3,  rate:1.0,  gender:'female'},
  '女3':{pitch:1.6,  rate:1.05, gender:'female'}
};
function textColorFor(hex){
  const h = hex.replace('#','');
  const r=parseInt(h.substring(0,2),16), g=parseInt(h.substring(2,4),16), b=parseInt(h.substring(4,6),16);
  const yiq = (r*299+g*587+b*114)/1000;
  return yiq>=140 ? '#222' : '#fff';
}

// 管理者ログイン：削除・一覧非表示の固定マスターアカウント（要件⑬）
const ROOT_ADMIN = {id:'syoumei', pass:'最高！'};

const STAGE_FOLDER = {anten:'暗転', zensyou:'全照', hansyou:'半照'};
// 要件⑭：「ストロボ独立」（chikachika）は選択肢として完全に削除
// Ver.8.0：「ストロボ独立」を復活（画像は img/[舞台]/ストロボ独立/[色].png を参照）。Cue一覧上の表記は Effect2
const STROBE_FOLDER = {none:'ストロボ✖', static:'ストロボ静止', kurukuru:'ストロボくるくる', independent:'ストロボ独立'};
const STROBE_LABEL_CUE = {static:'◯', kurukuru:'Effect1', independent:'Effect2', none:'なし'};
const STROBE_BTN_LABEL = {static:'ストロボ静止', kurukuru:'ストロボクルクル', independent:'ストロボ独立', none:'ストロボ✖️'};
const EXISTING_STROBE_CYCLE = ['static','kurukuru','independent','none'];
const ORIGINAL_STROBE_CYCLE = ['none','static','kurukuru','independent'];
// Ver.7.0 要件5：「ストロボ静止」は img/[舞台]/ストロボ静止/[色].png の色別ファイルを
// 直接参照する（単一ファイル＋色フィルターのオーバーレイ方式は使用しない）。
// 「ストロボくるくる」は引き続き単一ファイル＋色フィルターのオーバーレイ方式のまま。
const STROBE_SINGLE_FILE = {kurukuru:'くるくる.png'};
// Ver.6.0 要件7：黄色の画像参照ファイル名を「黄色.png」から「黄.png」に統一する
// （COLOR_PALETTE の表示名「黄色」自体は変更しない。ファイルパス生成時のみこのマップを使う）
const COLOR_FILE_NAME = {'黄色':'黄'};
function colorFileName(name){ return COLOR_FILE_NAME[name] || name; }
// 要件⑥：ラベル名称変更（内部キー既存/独自はそのまま、表示名のみ変更）
const EFFECT_SUBMODE_LABEL = {none:'Effect', existing:'ミラーボール', original:'照明職人用'};
const FADE_CYCLE = ['none','in','out'];
const FADE_LABEL = {none:'フェードなし', in:'フェードイン', out:'フェードアウト'};
// 要件⑦：Cue一覧のFader列に割り当てる循環（1→2→…→9→0→1…）
const DIGIT_CYCLE = ['1','2','3','4','5','6','7','8','9','0'];
// 要件⑩：ストロボくるくるの色変化クロスフェード時間（秒）
const KURUKURU_CROSSFADE_SEC = 1;

/* ============================================================
   Ver.8.0：データ管理の初期データ（テンプレ／フェーダー／Sub／Effect）
   ============================================================ */
const DEFAULT_TEMPLATE_ROWS = [
  ['司会','41'],
  ['全照','1〜8'],
  ['半照','1〜8(50%)'],
  ['ストロボ','49〜52'],
  ['赤','26、30、34、38'],
  ['黄','25(50%)、26、29(50%)、30、33(50%)、34、37(50%)、38'],
  ['青','24、28、32、36'],
  ['緑','25、29、33、37'],
  ['白','23、27、31、35'],
  ['オレンジ','25、26、29、30、33、34、37、38'],
  ['青緑','24、25、28、29、32、33、36、37'],
  ['ピンク','24、26、28、30、32、34、36、38']
];
function defaultTemplates(){
  return Array.from({length:20}, (_,i)=>({
    id:i+1,
    name: DEFAULT_TEMPLATE_ROWS[i] ? DEFAULT_TEMPLATE_ROWS[i][0] : '',
    faders: DEFAULT_TEMPLATE_ROWS[i] ? DEFAULT_TEMPLATE_ROWS[i][1] : ''
  }));
}
// F（1〜60）／patch名称／通称
const DEFAULT_FADER_ROWS = [
  ['BL上下-1','ボーダーW'],['BL上下-2','ボーダーG'],['BL上下-3','ボーダーB'],['BL上下-4','ボーダーR'],
  ['BL中-1','ボーダーW'],['BL中-2','ボーダーG'],['BL中-3','ボーダーB'],['BL中-4','ボーダーR'],
  ['１S-1','サス1'],['１S-2','サス2'],['１S-3','サス3'],['１S-4','サス4'],['１S-5','サス5'],['１S-6','サス6'],
  ['２S-1','サス7'],['２S-2','サス8'],['２S-3','サス9'],['２S-4','サス10'],['２S-5','サス11'],['２S-6','サス12'],['２S-7','サス13'],['２S-8','サス14'],
  ['UH上-1','URホリW'],['UH上-2','URホリB'],['UH上-3','URホリG'],['UH上-4','URホリR'],
  ['UH下-1','ULホリW'],['UH下-2','ULホリB'],['UH下-3','ULホリG'],['UH下-4','ULホリR'],
  ['LH上-1','LRホリW'],['LH上-2','LRホリB'],['LH上-3','LRホリG'],['LH上-4','LRホリR'],
  ['LH下-1','LLホリW'],['LH下-2','LLホリB'],['LH下-3','LLホリG'],['LH下-4','LLホリR'],
  ['CL-1','CL1'],['CL-2','CL2(司会)'],['CL-3','CL3(上手演題)'],['CL-4','CL4(中央演題)'],['CL-5','CL5'],
  ['CL-6','CL6(B12)'],['CL-7','CL7(B34)'],['CL-8','CL8(B56)'],['CL-9','CL9'],['CLF','CL10'],
  ['FC上下-1','ストロボ１'],['FC上下-2','ストロボ２'],['FC上下-3','ストロボ３'],['FC上下-4','ストロボ４'],
  ['F-1','F-1'],['F-2','F-2'],['F-3','F-3'],
  ['客席','客席調光'],
  ['予備','予備'],['予備','予備'],['予備','予備'],['予備','予備']
];
function defaultFaderTable(){
  return DEFAULT_FADER_ROWS.map((r,i)=>({f:i+1, patch:r[0], alias:r[1]}));
}
function newSubRows(){ return Array.from({length:20}, ()=>({name:'', faders:'', effect:''})); }
function defaultSubPages(){
  const rows = newSubRows();
  rows[0] = {name:'司会', faders:'41'};
  rows[1] = {name:'全照', faders:'1〜8'};
  return {'1': rows};
}
function defaultEffectData(){
  return {
    '1': {name:'', steps:[
      {sec:0.1, faders:'49、50'},
      {sec:0.1, faders:'49、51、52'},
      {sec:0.1, faders:'50、51、52'}
    ]},
    '2': {name:'', steps:[
      {sec:0.1, faders:''},
      {sec:0.1, faders:'49、51、52'}
    ]}
  };
}


let state = {
  initDone:false,
  bgColorMode:null,        // 'on' | 'off'
  effectOnOff:null,        // 'on' | 'off'（背景色あり時の設定2）
  effectKind:null,         // 'existing' | 'original'
  effectType:null,         // 'none' | 'existing' | 'original'（背景色あり時のみ使用）
  darkMode:false,
  locked:false,
  loggedIn:false,
  admins:[],                // {id,pass}（rootの syoumei は含まない）
  loggedInAdminId:null,     // ログイン中のID（'syoumei' または admins内のid）
  _adminsSeeded:false,      // admin.json からの初回読込済みフラグ
  _dataSeeded:false,        // Ver.8.0：data.json（設定データ）からの初回読込済みフラグ
  // Ver.8.0：データ管理（テンプレ／フェーダー／Sub／Effect）
  templates: defaultTemplates(),   // {id,name,faders} ×20
  faderTable: defaultFaderTable(), // {f,patch,alias} ×60
  subPages: defaultSubPages(),     // { No: [{name,faders}×20] }
  subNo: 1,                        // Sub：表示中／自動保存先のNo.
  subTitles: {},                   // { No: タイトル }
  effectData: defaultEffectData(), // { No: {name, steps:[{sec,faders}]} }
  effectNo: 1,                     // Effectタブで表示中のNo.
  cast:[],                 // {id,name,actor,mic,color,edit}
  scriptHTML:'',
  gdocUrl:'',
  cues:[],                  // {sec,line,audio,stage,bg,effect,strobe,fade,fader,source,stageItemsSnapshot}
  stageState:'zensyou',
  activeColorIndex:null,    // COLOR_PALETTE のインデックス
  strobeOn:false,           // effectType==='none' の場合の単純ON/OFF
  strobeMode:'none',        // effectType==='existing'|'original' の場合の状態
  effectOn:false,           // effectType==='existing' の場合のEffect ON/OFF
  effectSubMode:'none',     // effectType==='original' の場合のEffect状態(none/existing/original)
  fadeMode:'none',          // 'none' | 'in' | 'out'
  fadeDurationSec:1,
  stageItems:[],             // {id,src,x,y}
  stageVideoOverride:'',     // 手動指定したステージ動画（ローカルセッションのみ）
  customEffects:[],          // {id,no,step,sec,colorName,strobeLabel}
  versionMemos:[],           // {id,text,date,snapshot}
  stopwatch:{elapsed:0,running:false},
  adminAssets:{},            // { "img/xxx.png": "data:...", "mov/xxx.mov": "data:..." }
  currentAudioLabel:'-',
  audioSourceCount:0,
  // 要件④：音源を複数管理する（表示順=配列順、name は①②③…を自動採番）
  audioSources:[],           // {id,name,src,startOffset}
  currentAudioTrackId:null,  // 直近に再生／使用したトラック（Cue記録時の「音源」欄に反映）
  // 追加要望⑦：動画タブでアップロードした動画（従来は保存されず消えていた）
  rehearsalVideoSrc:'',
  // 追加要望④⑥⑪⑫：「照明職人用」の現在のNo.（台本/動画/Cueタブの📍Cue記録で自動+1、
  // 照明職人用タブでは手動編集・テスト対象として使用）
  cfxCurrentNo:1,
  // Ver.6.0 要件3：外部TTS（VOICEVOX/COEIROINKなど）連携設定
  // serverUrlが空、またはサーバーへの接続に失敗した場合は自動的にWeb Speech APIへフォールバックする
  ttsSettings:{ serverUrl:'', speaker:'1', speed:1.0, pitch:0.0, intonation:1.0 },
  // Ver.6.0 要件8：チュートリアルの完了/スキップ状態はLocalStorageで管理するため、
  // state（localStorage保存対象）には含めない
};

let swInterval=null, swStart=0;
let gdocIntervalHandle=null;
let isReading=false;

/* ---------------- ユーティリティ ---------------- */
function uid(){return 'id'+Math.random().toString(36).slice(2,9);}
// Ver.8.1 §5：秒数を0.1秒刻みに丸める共通ヘルパー（四捨五入）
function roundSec(v){
  const n = Number(v);
  if(isNaN(n)) return 0.1;
  return Math.round(Number((n*10).toPrecision(12)))/10;
}
function $(sel){return document.querySelector(sel);}
function $all(sel){return Array.from(document.querySelectorAll(sel));}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.warn('save failed',e); }
}
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ const loaded = JSON.parse(raw); state = Object.assign(state, loaded); }
  }catch(e){ console.warn('load failed', e); }
}
function resolveAsset(path){
  return (state.adminAssets && state.adminAssets[path]) ? state.adminAssets[path] : path;
}
function circledNum(n){
  if(n<1) return '-';
  if(n<=20) return String.fromCodePoint(0x2460+n-1);
  return '('+n+')';
}
function currentColorName(){
  if(state.activeColorIndex==null) return null;
  const c = COLOR_PALETTE[state.activeColorIndex];
  return c ? c.name : null;
}
function currentColorHex(){
  if(state.activeColorIndex==null) return null;
  const c = COLOR_PALETTE[state.activeColorIndex];
  return c ? c.hex : null;
}

/* ============================================================
   初期選択モーダル
   ============================================================ */
function applyModalAssets(){
  $all('[data-asset-path]').forEach(el=>{
    const path = el.dataset.assetPath;
    const resolved = resolveAsset(path);
    if(el.tagName==='IMG'){ el.src = resolved; }
    else if(el.tagName==='VIDEO'){ el.src = resolved; if(el.load) el.load(); }
  });
}

function initModalLogic(){
  $all('.choice-btn[data-group]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const group = btn.dataset.group;
      $all(`.choice-btn[data-group="${group}"]`).forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');

      if(group==='bgColor'){
        state.bgColorMode = btn.dataset.value;
        const showEffect = state.bgColorMode==='on';
        $('#section-effect-toggle').style.display = showEffect ? 'block' : 'none';
        if(!showEffect){
          state.effectOnOff=null; state.effectKind=null; state.effectType=null;
          $('#section-effect-kind').style.display='none';
          $all('.choice-btn[data-group="effectOnOff"],.choice-btn[data-group="effectKind"]').forEach(b=>b.classList.remove('selected'));
        }
      }
      if(group==='effectOnOff'){
        state.effectOnOff = btn.dataset.value;
        const showKind = state.effectOnOff==='on';
        $('#section-effect-kind').style.display = showKind ? 'block' : 'none';
        if(!showKind){
          state.effectKind=null;
          state.effectType='none';
          $all('.choice-btn[data-group="effectKind"]').forEach(b=>b.classList.remove('selected'));
        }
      }
      if(group==='effectKind'){
        state.effectKind = btn.dataset.value;
        state.effectType = btn.dataset.value; // 'existing' | 'original'
      }
      checkModalReady();
    });
  });

  $('#startAppBtn').addEventListener('click', ()=>{
    state.initDone = true;
    state.strobeOn=false; state.strobeMode='none'; state.effectOn=false; state.effectSubMode='none';
    $('#initModal').classList.add('hidden');
    saveState();
    applyAllSettingsToUI();
    // Ver.8.1 §8-5：チュートリアルの「初期設定」ステップ中に押された場合は、選ばれた設定で
    // ステップ配列を再構築したうえで自動的に次のステップ（ステージ画面の説明）へ進める
    if(document.body.classList.contains('tutorial-active') && tutorialStepIndex===1){
      tutorialStepIndex = 2;
      renderTutorialStep();
    }
  });

  function adjustLabelFontSize(){
    $all('.choice-img').forEach(media=>{
      const h = media.getBoundingClientRect().height || 110;
      const label = media.parentElement.querySelector('.choice-label');
      if(label) label.style.fontSize = Math.max(10, h/5) + 'px';
    });
  }
  window.addEventListener('resize', adjustLabelFontSize);
  window.addEventListener('load', adjustLabelFontSize);
  setTimeout(adjustLabelFontSize, 300);
}
function checkModalReady(){
  const bgSelected = !!$('.choice-btn.selected[data-group="bgColor"]');
  let ready = bgSelected;
  if(state.bgColorMode==='on'){
    const effectOnOffSelected = !!$('.choice-btn.selected[data-group="effectOnOff"]');
    ready = ready && effectOnOffSelected;
    if(state.effectOnOff==='on'){
      const kindSelected = !!$('.choice-btn.selected[data-group="effectKind"]');
      ready = ready && kindSelected;
    }
  }
  $('#startAppBtn').disabled = !ready;
}
function prefillModalSelections(){
  $all('.choice-btn').forEach(b=>b.classList.remove('selected'));
  if(state.bgColorMode){
    const b = $(`.choice-btn[data-group="bgColor"][data-value="${state.bgColorMode}"]`);
    if(b) b.classList.add('selected');
  }
  $('#section-effect-toggle').style.display = state.bgColorMode==='on' ? 'block' : 'none';
  if(state.effectOnOff){
    const b = $(`.choice-btn[data-group="effectOnOff"][data-value="${state.effectOnOff}"]`);
    if(b) b.classList.add('selected');
  }
  $('#section-effect-kind').style.display = (state.bgColorMode==='on' && state.effectOnOff==='on') ? 'block' : 'none';
  if(state.effectKind){
    const b = $(`.choice-btn[data-group="effectKind"][data-value="${state.effectKind}"]`);
    if(b) b.classList.add('selected');
  }
  checkModalReady();
}

/* ============================================================
   設定＞Googleログイン（要件②：学校でGoogle Cloud Consoleが使えないため、
   OAuthクライアントIDによる自動認可の代わりに、外部（OAuth 2.0 Playground等）で
   取得したアクセストークンをご自身で貼り付ける方式に変更）
   ============================================================ */
let googleAccessToken = null; // セキュリティのためlocalStorageには保存しない（セッション限り）

function updateGoogleLoginUI(){
  const loggedIn = !!googleAccessToken;
  $('#googleLoginInputArea').classList.toggle('hidden', loggedIn);
  $('#googleLoginStatusArea').classList.toggle('hidden', !loggedIn);
  $('#googleLoginStatus').textContent = loggedIn
    ? 'Googleアカウント：ログイン中（貼り付けられたアクセストークンを使用中）'
    : 'Googleアカウント：未ログイン';
}
function initGoogleLoginUI(){
  // トークン貼り付け方式のため、特別な初期化処理は不要。
  updateGoogleLoginUI();
}
$('#googleTokenApplyBtn').addEventListener('click', ()=>{
  const token = $('#googleTokenInput').value.trim();
  if(!token){ alert('アクセストークンを入力してください。'); return; }
  // 受け取った情報を反映し、ログイン済み表示画面へ遷移する
  googleAccessToken = token;
  updateGoogleLoginUI();
});
$('#googleLogoutBtn').addEventListener('click', ()=>{
  googleAccessToken = null;
  updateGoogleLoginUI();
});

/* ============================================================
   ログイン / 設定 / 管理者画面 / フェード秒数
   ============================================================ */
function updateLoginUI(){
  $('#loginBtn').classList.toggle('hidden', state.loggedIn);
  $('#settingsMenuBtn').classList.toggle('hidden', !state.loggedIn);
  // Ver.8.1 §7-1：ストップウォッチ関連はログイン時のみ表示する
  $('.header-center').classList.toggle('hidden', !state.loggedIn);
  if(!state.loggedIn){
    $('#settingsMenu').classList.add('hidden');
    $('#otherModal').classList.add('hidden');   // 「その他」はログイン必須
    // ログアウト時：実行中なら停止するが、経過時間は保持する
    if(state.stopwatch.running){
      state.stopwatch.running = false;
      clearInterval(swInterval);
    }
  }
}
$('#loginBtn').addEventListener('click', ()=>{
  $('#loginIdInput').value='';
  $('#loginPasswordInput').value='';
  $('#loginModal').classList.remove('hidden');
});
$('#loginCancelBtn').addEventListener('click', ()=>{ $('#loginModal').classList.add('hidden'); });
$('#loginSubmitBtn').addEventListener('click', ()=>{
  const id = $('#loginIdInput').value.trim();
  const pass = $('#loginPasswordInput').value;
  const matched = (id===ROOT_ADMIN.id && pass===ROOT_ADMIN.pass)
    ? ROOT_ADMIN
    : state.admins.find(a=>a.id===id && a.pass===pass);
  if(matched){
    state.loggedIn = true;
    state.loggedInAdminId = matched.id;
    updateLoginUI();
    renderCueTable(); // 追加要望③：ログイン状態でFader/順番列の表示・編集可否が変わるため再描画
    $('#loginModal').classList.add('hidden');
    saveState();
  }else{
    alert('IDまたはパスワードが違います。');
  }
});
$('#settingsMenuBtn').addEventListener('click', ()=>{
  $('#settingsMenu').classList.toggle('hidden');
});
$('#logoutBtn').addEventListener('click', ()=>{
  state.loggedIn = false;
  state.loggedInAdminId = null;
  // 追加要望②：ログアウトした場合、本番モードは強制解除する
  if(state.locked){
    state.locked = false;
  }
  updateLoginUI();
  applyAllSettingsToUI();
  saveState();
});
$('#reopenInitBtn').addEventListener('click', ()=>{
  prefillModalSelections();
  $('#initModal').classList.remove('hidden');
});
/* ---------- 管理者一覧画面（要件⑬／Ver.8.0：「その他」内のタブへ移動。保存は admin.json） ---------- */
$('#newAdminAddBtn').addEventListener('click', ()=>{
  const id = $('#newAdminIdInput').value.trim();
  const pass = $('#newAdminPassInput').value;
  if(!id || !pass){ alert('IDとパスワードを入力してください。'); return; }
  if(id===ROOT_ADMIN.id || state.admins.some(a=>a.id===id)){
    alert('そのIDは既に使用されています。'); return;
  }
  state.admins.push({id, pass});
  $('#newAdminIdInput').value=''; $('#newAdminPassInput').value='';
  renderAdminUsersTable();
  saveState();
});
function renderAdminUsersTable(){
  const body = $('#adminUsersTableBody');
  body.innerHTML='';
  const visible = state.admins.filter(a=>a.id!==ROOT_ADMIN.id);
  // 自分の行を最上部に表示
  visible.sort((a,b)=>{
    if(a.id===state.loggedInAdminId) return -1;
    if(b.id===state.loggedInAdminId) return 1;
    return 0;
  });
  visible.forEach(a=>{
    const isSelf = a.id===state.loggedInAdminId;
    const tr = document.createElement('tr');
    if(isSelf) tr.className='admin-user-self-row';

    const idTd = document.createElement('td');
    if(isSelf){
      const idInput = document.createElement('input');
      idInput.type='text'; idInput.value=a.id; idInput.className='admin-user-id-input';
      idInput.addEventListener('change', ()=>{
        const newId = idInput.value.trim();
        if(!newId){ idInput.value=a.id; return; }
        if(newId!==a.id && (newId===ROOT_ADMIN.id || state.admins.some(x=>x.id===newId))){
          alert('そのIDは既に使用されています。'); idInput.value=a.id; return;
        }
        if(state.loggedInAdminId===a.id) state.loggedInAdminId = newId;
        a.id = newId;
        saveState();
        renderAdminUsersTable();
      });
      idTd.appendChild(idInput);
    }else{
      idTd.textContent = a.id;
    }
    tr.appendChild(idTd);

    const passTd = document.createElement('td');
    if(isSelf){
      const passInput = document.createElement('input');
      passInput.type='text'; passInput.value=a.pass; passInput.className='admin-user-pass-input';
      passInput.addEventListener('change', ()=>{ a.pass = passInput.value; saveState(); });
      passTd.appendChild(passInput);
    }else{
      passTd.textContent = '••••••';
    }
    tr.appendChild(passTd);

    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent='削除'; delBtn.className='del-btn';
    delBtn.addEventListener('click', ()=>{
      if(!confirm(`ID「${a.id}」を削除しますか？`)) return;
      state.admins = state.admins.filter(x=>x.id!==a.id);
      if(state.loggedInAdminId===a.id){
        state.loggedIn=false; state.loggedInAdminId=null; updateLoginUI();
      }
      renderAdminUsersTable();
      saveState();
    });
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    body.appendChild(tr);
  });
}

/* ---------- admin.json（管理者データ）の保存/読込（要件⑬／Ver.8.0：data.json から admin.json へ改名） ---------- */
const jsonFileHandles = {};
async function saveJsonToFile(fileName, payload){
  try{
    if(!jsonFileHandles[fileName] && window.showSaveFilePicker){
      jsonFileHandles[fileName] = await window.showSaveFilePicker({
        suggestedName:fileName,
        types:[{description:'JSON', accept:{'application/json':['.json']}}]
      });
    }
    if(jsonFileHandles[fileName]){
      const writable = await jsonFileHandles[fileName].createWritable();
      await writable.write(payload);
      await writable.close();
      return;
    }
  }catch(e){
    console.warn(fileName+'への保存がキャンセルまたは失敗しました。ダウンロードに切り替えます。', e);
    jsonFileHandles[fileName] = null;
  }
  // File System Access API 非対応ブラウザ向けフォールバック：ダウンロード
  const blob = new Blob([payload], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}
async function loadAdminsFromAdminJson(){
  const tryFetch = async (name)=>{
    try{
      const res = await fetch(name, {cache:'no-store'});
      if(res.ok) return await res.json();
    }catch(e){ /* ファイルが無い／file://直開きの場合はlocalStorageの内容をそのまま使用する */ }
    return null;
  };
  let json = await tryFetch('admin.json');
  if(!json || !Array.isArray(json.admins)) json = await tryFetch('data.json');   // 旧形式（Ver.7.0以前）との互換
  if(json && Array.isArray(json.admins) && !state._adminsSeeded){
    state.admins = json.admins.filter(a=>a && a.id && a.pass && a.id!==ROOT_ADMIN.id);
    state._adminsSeeded = true;
    saveState();
  }
}
async function persistAdminsToAdminJson(){
  await saveJsonToFile('admin.json', JSON.stringify({admins: state.admins}, null, 2));
}

$all('.admin-asset-row').forEach(row=>{
  const path = row.dataset.path;
  const input = row.querySelector('input[type=file]');
  input.addEventListener('change', e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      state.adminAssets[path] = ev.target.result;
      saveState();
      applyModalAssets();
      updateStagePreviewMedia();
    };
    reader.readAsDataURL(file);
  });
});

// 個別アセット（舞台×ストロボ×色）のアップロード
function populateAdminColorSelect(){
  const sel = $('#adminAssetColor');
  sel.innerHTML='';
  COLOR_PALETTE.forEach(c=>{
    const opt=document.createElement('option'); opt.value=c.name; opt.textContent=c.name; sel.appendChild(opt);
  });
}
// 要件③：ストロボくるくるは色別ではなく単一ファイル（くるくる.png）
// Ver.8.0：ストロボ静止は色別ファイル（Ver.7.0から）なので単一ファイル扱いはくるくるのみ
const ADMIN_SINGLE_FILE_MAP = {'ストロボくるくる':'くるくる.png'};
function updateAdminAssetPathPreview(){
  const kind=$('#adminAssetKind').value, stage=$('#adminAssetStage').value, strobe=$('#adminAssetStrobe').value, color=$('#adminAssetColor').value;
  const ext = kind==='mov' ? 'mov' : 'png';
  const singleFile = kind!=='mov' && ADMIN_SINGLE_FILE_MAP[strobe];
  $('#adminAssetColor').disabled = !!singleFile;
  const fileName = singleFile || `${colorFileName(color)}.${ext}`;
  $('#adminAssetPathPreview').textContent = `保存先: stage/${stage}/${strobe}/${fileName}`;
}
['adminAssetKind','adminAssetStage','adminAssetStrobe','adminAssetColor'].forEach(id=>{
  document.getElementById(id).addEventListener('change', updateAdminAssetPathPreview);
});
$('#adminAssetFile').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const kind=$('#adminAssetKind').value, stage=$('#adminAssetStage').value, strobe=$('#adminAssetStrobe').value, color=$('#adminAssetColor').value;
  const ext = kind==='mov' ? 'mov' : 'png';
  const singleFile = kind!=='mov' && ADMIN_SINGLE_FILE_MAP[strobe];
  const fileName = singleFile || `${colorFileName(color)}.${ext}`;
  const path = `stage/${stage}/${strobe}/${fileName}`;
  const reader = new FileReader();
  reader.onload = ev=>{
    state.adminAssets[path] = ev.target.result;
    saveState();
    updateStagePreviewMedia();
    alert('保存しました: '+path);
  };
  reader.readAsDataURL(file);
});

// フェード秒数設定
$('#fadeSecBtn').addEventListener('click', ()=>{
  $('#settingsMenu').classList.add('hidden');
  $('#fadeSecInput').value = state.fadeDurationSec;
  $('#fadeSecModal').classList.remove('hidden');
});
$('#fadeSecCancelBtn').addEventListener('click', ()=>{ $('#fadeSecModal').classList.add('hidden'); });
$('#fadeSecSaveBtn').addEventListener('click', ()=>{
  const v = parseFloat($('#fadeSecInput').value);
  if(!isNaN(v) && v>=0){
    state.fadeDurationSec = v;
    document.documentElement.style.setProperty('--fade-sec', v+'s');
    saveState();
  }
  $('#fadeSecModal').classList.add('hidden');
});

// メニュー外クリックで閉じる
document.addEventListener('click', e=>{
  const area = $('.login-area');
  if(area && !area.contains(e.target)){
    $('#settingsMenu').classList.add('hidden');
  }
});

/* ============================================================
   Ver.6.0 要件3.1：音声調整（TTSサーバー・話速・音高・抑揚）
   ============================================================ */
function syncVoiceSettingsUI(){
  const t = state.ttsSettings || {};
  $('#ttsServerUrlInput').value = t.serverUrl || '';
  $('#ttsSpeakerInput').value = t.speaker || '1';
  $('#ttsSpeedInput').value = t.speed!=null ? t.speed : 1.0;
  $('#ttsPitchInput').value = t.pitch!=null ? t.pitch : 0.0;
  $('#ttsIntonationInput').value = t.intonation!=null ? t.intonation : 1.0;
  $('#ttsSpeedValue').textContent = (t.speed!=null ? t.speed : 1.0).toFixed(2);
  $('#ttsPitchValue').textContent = (t.pitch!=null ? t.pitch : 0.0).toFixed(2);
  $('#ttsIntonationValue').textContent = (t.intonation!=null ? t.intonation : 1.0).toFixed(2);
}
['ttsSpeedInput','ttsPitchInput','ttsIntonationInput'].forEach(id=>{
  $('#'+id).addEventListener('input', ()=>{
    const valSpan = {'ttsSpeedInput':'ttsSpeedValue','ttsPitchInput':'ttsPitchValue','ttsIntonationInput':'ttsIntonationValue'}[id];
    $('#'+valSpan).textContent = parseFloat($('#'+id).value).toFixed(2);
  });
});
$('#voiceSettingsSaveBtn').addEventListener('click', ()=>{
  state.ttsSettings = {
    serverUrl: $('#ttsServerUrlInput').value.trim(),
    speaker: $('#ttsSpeakerInput').value.trim() || '1',
    speed: parseFloat($('#ttsSpeedInput').value) || 1.0,
    pitch: parseFloat($('#ttsPitchInput').value) || 0.0,
    intonation: parseFloat($('#ttsIntonationInput').value) || 1.0
  };
  saveState();
  flashButton($('#voiceSettingsSaveBtn'), '保存しました');
});

/* ============================================================
   Ver.6.0 要件8：インタラクティブチュートリアル
   ・ステップごとのガイド用モーダルダイアログを順次表示する
   ・ダイアログ表示中も「ログイン」ボタンは常に押下可能
   ・チュートリアル中にログインボタンが押された場合は即座に中断する
   ・完了/スキップ状態はLocalStorageに保存し、いつでも再起動できる
   ============================================================ */
const TUTORIAL_DONE_KEY = 'stagePlanner_tutorial_done_v6';
// Ver.8.0：背景の暗転（ブラックアウト）は廃止。ハイライトは枠線のみで、ハイライトされた要素は
// 通常どおりクリックできる（画面遷移が起きても説明ダイアログは維持し、「次へ」でのみ次のステップへ進む）。
// Ver.8.1 §8-1：初期設定（背景色あり/なし・Effectの種類）に応じてステップを動的に組み立てる
function buildTutorialSteps(){
  const bgOn = state.bgColorMode==='on';
  const effType = bgOn ? state.effectType : null; // 'none' | 'existing' | 'original' | null

  const steps = [];
  steps.push({label:'1', title:'ようこそ！', body:'このチュートリアルでは「舞台演出プランナー」の基本的な使い方をご案内します。「次へ」で進み、「戻る」でひとつ前の説明に戻れます。黄色い枠の部分は、実際にクリックして操作を試すこともできます。', target:null});
  steps.push({label:'2', title:'初期設定', body:'右上の「初期設定」ボタンから、背景色の有無やEffect（高速切り替え演出）の種類を選び直せます。まずはここでお使いの舞台に合わせた設定を選びましょう。', target:'#reopenInitBtn'});

  // Ver.8.1 §8-3：ステージ画面の説明（3-1〜3-3）
  steps.push({label:'3-1', title:'ステージ画面の説明', body:'暗転・全照・半照、のボタンによる明るさの切り替え、フェードイン、フェードアウトの設定、「配置アイテム」により画像を画面上に表示することが可能です。', target:'#stageArea'});
  if(bgOn && effType==='none'){
    steps.push({label:'3-2', title:'ステージ画面の説明', body:'背景色の切り替えはステージ画面下の８色から選択が可能で、「ストロボ」を押すことでストロボを点灯させることが可能です。', target:'#stageColorSection'});
  }else if(bgOn && effType==='existing'){
    steps.push({label:'3-2', title:'ステージ画面の説明', body:'背景色の切り替えはステージ画面下の８色から選択が可能で、「Effect」を押すことで背景がミラーボールのようにくるくる回ります。また、「ストロボ」を押すことでストロボの点灯方法を切り替えることが可能です。', target:'#stageColorSection'});
  }else if(bgOn && effType==='original'){
    steps.push({label:'3-2', title:'ステージ画面の説明', body:'背景色の切り替えはステージ画面下の８色から選択が可能で、「Effect」を押し「ミラーボール」に切り替えることで背景がミラーボールのようにくるくる回ります。また、「ストロボ」を押すことでストロボの点灯方法を切り替えることが可能です。', target:'#stageColorSection'});
    steps.push({label:'3-3', title:'ステージ画面の説明', body:'「ミラーボール」を再度押し、「照明職人用」となった場合、背景の高速切り替えが可能になります。まず、これまでのステップ3-1・3-2に従って画面上に自分の求める舞台を表示した後、「保存」を押すと画面左部の「照明職人用」タブに表示され、一時保存されます。その後、「台本」「動画」「Cue」タブのいずれかの「Cue記録」を押すことで独自のEffectを作成し照明を高速切り替えできるようになります。また、「テスト」を押すことで指定されたNo.のEffectを確認することが可能です。', target:'#customfxTabBtn'});
  }

  steps.push({label:'4', title:'配役パネル', body:'画面左の「👥 配役」パネルを開くと、登場人物・役者名・マイク・読み上げ音声・配役カラーを登録できます。パネルは開閉でき、閉じているときは省スペース表示になります。', target:'#castPanelToggle'});
  steps.push({label:'5', title:'台本タブ', body:'「台本」タブに台本本文を貼り付け、「話者割り当て」で「話者名：セリフ」の形式から自動的に配役と紐づけます。「音源追加」で本番の音源のタイミングを細かく設定できます。', target:'.tab-btn[data-tab="script"]'});
  steps.push({label:'6', title:'動画タブ', body:'「動画」タブでリハーサル動画を読み込み、再生しながら「📍 Cue記録」を押すと、その時点の動画の秒数でCueを記録できます。', target:'.tab-btn[data-tab="video"]'});
  steps.push({label:'7', title:'Cue記録', body:'黄色い「📍 Cue記録」ボタンで、その時点の秒数・セリフ・舞台・背景・Effect・ストロボ・フェードなどをCue一覧に記録します。記録後は各Cueの「反映」ボタンでいつでも呼び出せます。', target:'#scriptCueBtn'});
  steps.push({label:'8', title:'Cueタブ', body:'「Cue」タブでは、記録したCueを一覧で確認・編集できます。「反映」でその時点の照明状態を呼び出し、「✕」で削除できます。', target:'.tab-btn[data-tab="cue"]'});
  steps.push({label:'9', title:'保存・出力', body:'「ZIP出力」でプロジェクト全体（音源・動画・画像を含む）を1つのZIPファイルとして保存し、「ZIP読込」でいつでも復元できます。また、放送班には完成した後に出力されたzipファイルを渡してください。期限が守られないと準備が間に合わずせっかく作成してもらった案が”実現できない”場合があるので、期限は絶対守ってください。お互いのために。', target:'#exportJsonBtn'});
  steps.push({label:'10', title:'準備完了です！', body:'以上で基本操作の説明は終わりです。「チュートリアル」ボタンからいつでもこの説明を再度呼び出せます。それでは本番に向けて準備を進めましょう！', target:null});
  return steps;
}
let tutorialStepIndex = 0;
let tutorialInterrupted = false;
function isElVisible(el){ return !!(el && el.getClientRects && el.getClientRects().length>0); }
function placeTutorialHighlight(targetEl){
  const hl = $('#tutorialHighlight');
  if(!isElVisible(targetEl)){ hl.classList.add('hidden'); return null; }
  const r = targetEl.getBoundingClientRect();
  hl.classList.remove('hidden');
  hl.style.left = (r.left-6)+'px';
  hl.style.top = (r.top-6)+'px';
  hl.style.width = (r.width+12)+'px';
  hl.style.height = (r.height+12)+'px';
  return r;
}
// 対象ボタンの位置に応じて、ダイアログを画面上部／下部へ自動配置し、対象ボタンを枠線でハイライトする
function positionTutorialHighlight(targetEl){
  const hl = $('#tutorialHighlight');
  const box = document.querySelector('#tutorialModal .modal-box');
  box.classList.remove('tutorial-pos-top','tutorial-pos-bottom','tutorial-pos-center');
  // Ver.8.1 §8-6：ステップ切替時はドラッグによる手動配置を解除し、自動配置を再適用する
  box.style.left = ''; box.style.top = ''; box.style.transform = '';
  if(!targetEl || !isElVisible(targetEl)){
    hl.classList.add('hidden');
    box.classList.add('tutorial-pos-center');
    return;
  }
  targetEl.scrollIntoView({block:'center', inline:'center', behavior:'auto'});
  requestAnimationFrame(()=>{
    const r = placeTutorialHighlight(targetEl);
    if(!r){ box.classList.add('tutorial-pos-center'); return; }
    const isUpperHalf = (r.top + r.height/2) < (window.innerHeight/2);
    box.classList.add(isUpperHalf ? 'tutorial-pos-bottom' : 'tutorial-pos-top');
  });
}
// クリックで画面が変化しても、説明ダイアログはそのまま維持し、枠線だけを対象要素に追従させる
function refreshTutorialHighlight(){
  if(!document.body.classList.contains('tutorial-active')) return;
  const steps = buildTutorialSteps();
  const step = steps[tutorialStepIndex];
  const el = (step && step.target) ? document.querySelector(step.target) : null;
  placeTutorialHighlight(el);
}
window.addEventListener('resize', refreshTutorialHighlight);
window.addEventListener('scroll', refreshTutorialHighlight, true);
document.addEventListener('click', ()=>{ setTimeout(refreshTutorialHighlight, 200); }, true);
function renderTutorialStep(){
  const steps = buildTutorialSteps();
  if(tutorialStepIndex>=steps.length) tutorialStepIndex = steps.length-1;
  if(tutorialStepIndex<0) tutorialStepIndex = 0;
  const step = steps[tutorialStepIndex];
  // Ver.8.1 §8-4：タイトルは「タイトル（ラベル/10）」。ラベルはStep3の子ページのみ「3-1」等になる
  $('#tutorialStepTitle').textContent = `${step.title}（${step.label}/10）`;
  $('#tutorialStepBody').textContent = step.body;
  $('#tutorialPrevBtn').disabled = tutorialStepIndex===0;
  $('#tutorialNextBtn').textContent = (tutorialStepIndex===steps.length-1) ? '完了' : '次へ';
  // Ver.8.1 §8-4：進捗ドットはページ単位（実際に表示されるステップ数）で表示する
  $('#tutorialProgress').textContent = steps.map((s,i)=> i===tutorialStepIndex ? '●' : '○').join(' ');
  const targetEl = step.target ? document.querySelector(step.target) : null;
  positionTutorialHighlight(targetEl);
}
function startTutorial(){
  tutorialStepIndex = 0;
  tutorialInterrupted = false;
  $('#tutorialSkipCheckbox').checked = false;
  renderTutorialStep();
  $('#tutorialModal').classList.remove('hidden');
  document.body.classList.add('tutorial-active');
}
function closeTutorial(finished){
  $('#tutorialModal').classList.add('hidden');
  $('#tutorialHighlight').classList.add('hidden');
  document.body.classList.remove('tutorial-active');
  // Ver.8.1 §8-6：閉じたらドラッグ位置をリセットする
  const box = document.querySelector('#tutorialModal .modal-box');
  if(box){
    box.style.left=''; box.style.top=''; box.style.transform='';
    box.classList.remove('tutorial-pos-top','tutorial-pos-bottom','tutorial-pos-center');
  }
  if(finished || $('#tutorialSkipCheckbox').checked){
    try{ localStorage.setItem(TUTORIAL_DONE_KEY, '1'); }catch(e){}
  }
}
$('#tutorialBtn').addEventListener('click', startTutorial);
// Ver.7.0 要件6：モーダル右上の✖️ボタンで、任意のタイミングで即座にチュートリアルを中断・終了できる
$('#tutorialCloseBtn').addEventListener('click', ()=>{ closeTutorial(false); });
$('#tutorialPrevBtn').addEventListener('click', ()=>{
  if(tutorialStepIndex>0){ tutorialStepIndex--; renderTutorialStep(); }
});
$('#tutorialNextBtn').addEventListener('click', ()=>{
  const steps = buildTutorialSteps();
  if(tutorialStepIndex<steps.length-1){
    tutorialStepIndex++;
    renderTutorialStep();
  }else{
    closeTutorial(true);
  }
});
// Ver.8.0：チュートリアル中もページ全体を通常どおり操作できるため、ログインボタンでの中断処理は廃止した。

/* ---------- Ver.8.1 §8-6：説明文モーダルのドラッグ&ドロップ移動 ---------- */
function initTutorialDrag(){
  const box = document.querySelector('#tutorialModal .modal-box');
  if(!box) return;
  box.style.touchAction = 'none';
  let dragging = false, startX=0, startY=0, boxStartLeft=0, boxStartTop=0;
  function shouldStartDrag(e){
    // ボタン、チェックボックス、✖ ではドラッグを開始しない
    if(e.target.closest('button,input,select,textarea,a,label')) return false;
    return true;
  }
  box.addEventListener('pointerdown', e=>{
    if(!shouldStartDrag(e)) return;
    const r = box.getBoundingClientRect();
    box.classList.remove('tutorial-pos-top','tutorial-pos-bottom','tutorial-pos-center');
    box.style.transform = 'none';
    box.style.left = r.left+'px';
    box.style.top = r.top+'px';
    boxStartLeft = r.left; boxStartTop = r.top;
    startX = e.clientX; startY = e.clientY;
    dragging = true;
    box.style.cursor = 'move';
    try{ box.setPointerCapture(e.pointerId); }catch(err){}
    e.preventDefault();
  });
  box.addEventListener('pointermove', e=>{
    if(!dragging) return;
    const w = box.offsetWidth, h = box.offsetHeight;
    let nl = boxStartLeft + (e.clientX-startX);
    let nt = boxStartTop + (e.clientY-startY);
    nl = Math.min(Math.max(0,nl), Math.max(0,window.innerWidth-w));
    nt = Math.min(Math.max(0,nt), Math.max(0,window.innerHeight-h));
    box.style.left = nl+'px';
    box.style.top = nt+'px';
  });
  function endDrag(e){
    if(!dragging) return;
    dragging = false;
    box.style.cursor = '';
    try{ box.releasePointerCapture(e.pointerId); }catch(err){}
  }
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);
  // ウィンドウのリサイズ時は画面外にはみ出さないよう補正する
  window.addEventListener('resize', ()=>{
    if(!box.style.left) return;
    const w = box.offsetWidth, h = box.offsetHeight;
    let nl = Math.min(Math.max(0,parseFloat(box.style.left)||0), Math.max(0,window.innerWidth-w));
    let nt = Math.min(Math.max(0,parseFloat(box.style.top)||0), Math.max(0,window.innerHeight-h));
    box.style.left = nl+'px';
    box.style.top = nt+'px';
  });
}

/* ============================================================
   ダーク/ライトモード & 本番ロックモード
   ============================================================ */
function applyAllSettingsToUI(){
  document.body.classList.toggle('dark-mode', state.darkMode);
  document.body.classList.toggle('light-mode', !state.darkMode);
  document.body.classList.toggle('locked', state.locked);
  $('#lockModeToggle').textContent = state.locked ? '🔒 本番モード' : '🔓 練習モード';
  $('#darkModeToggle').textContent = state.darkMode ? '☀' : '🌙';
  $('#scriptEditor').innerHTML = state.scriptHTML || '';
  $('#gdocUrlInput').value = state.gdocUrl || '';
  // 追加要望⑦：保存済みの動画タブの動画を復元する
  if(state.rehearsalVideoSrc && $('#rehearsalVideo').src !== state.rehearsalVideoSrc){
    $('#rehearsalVideo').src = state.rehearsalVideoSrc;
  }
  ensureDataShapes();
  state.cfxCurrentNo = nextBlankEffectNo(state.cfxCurrentNo || 1);   // Ver.8.0：Effectタブと重なるNo.は空き番号へ
  syncCfxNoInputs();
  document.documentElement.style.setProperty('--fade-sec', (state.fadeDurationSec||1)+'s');
  updateLoginUI();
  applyModalAssets();
  renderCastList();
  renderCueTable();
  renderCustomFxTable();
  renderColorToggles();
  renderStageItems();
  renderVersionMemos();
  updateStrobeUI();
  updateEffectUI();
  updateFadeUI();
  updateStagePreviewMedia();
  setupGdocAutoSync();
  updateCustomFxTabVisibility();
  $('#stageVideoDirectBtn').classList.toggle('active-highlight', !!state.stageVideoOverride);
  renderAudioTracks();
  updateGameHitButtonVisibility();
  syncVoiceSettingsUI();
}

function updateCustomFxTabVisibility(){
  const show = state.effectType==='original';
  const tabBtn = $('#customfxTabBtn');
  tabBtn.classList.toggle('hidden', !show);
  if(!show && tabBtn.classList.contains('active')){
    tabBtn.classList.remove('active');
    $('#tab-customfx').classList.remove('active');
    $('.tab-btn[data-tab="script"]').classList.add('active');
    $('#tab-script').classList.add('active');
  }
}

$('#darkModeToggle').addEventListener('click', ()=>{
  state.darkMode = !state.darkMode;
  applyAllSettingsToUI();
  saveState();
});
$('#lockModeToggle').addEventListener('click', ()=>{
  // 追加要望②：ログアウトしている場合は本番モードを利用不可にする
  if(!state.locked && !state.loggedIn){
    alert('本番モードの利用にはログインが必要です。');
    return;
  }
  state.locked = !state.locked;
  if(state.locked){
    resetGameReflection();
  }
  applyAllSettingsToUI();
  saveState();
});

/* ============================================================
   ストップウォッチ / タイマー
   ============================================================ */
function formatSW(ms){
  const totalSec = ms/1000;
  const m = Math.floor(totalSec/60);
  const s = (totalSec%60).toFixed(1);
  return `${String(m).padStart(2,'0')}:${s.padStart(4,'0')}`;
}
function updateSWDisplay(){
  $('#stopwatchDisplay').textContent = formatSW(state.stopwatch.elapsed);
}
$('#swStartBtn').addEventListener('click', ()=>{
  if(state.stopwatch.running) return;
  state.stopwatch.running = true;
  swStart = performance.now() - state.stopwatch.elapsed;
  swInterval = setInterval(()=>{
    state.stopwatch.elapsed = performance.now() - swStart;
    updateSWDisplay();
  }, 100);
  // 追加要望⑤：本番モードでゼロから開始する場合は反映済み（グレー）状態をリセットする
  if(state.locked && state.stopwatch.elapsed<50){
    resetGameReflection();
  }
});
$('#swStopBtn').addEventListener('click', ()=>{
  state.stopwatch.running = false;
  clearInterval(swInterval);
  saveState();
});
$('#swResetBtn').addEventListener('click', ()=>{
  state.stopwatch.running = false;
  clearInterval(swInterval);
  state.stopwatch.elapsed = 0;
  updateSWDisplay();
  resetGameReflection();
  saveState();
});

/* ============================================================
   バージョン管理メモ ＆ 復元
   ============================================================ */
function buildSnapshot(){
  return JSON.parse(JSON.stringify({
    cast:state.cast, scriptHTML:state.scriptHTML, cues:state.cues, customEffects:state.customEffects,
    stageState:state.stageState, activeColorIndex:state.activeColorIndex,
    bgColorMode:state.bgColorMode, effectOnOff:state.effectOnOff, effectKind:state.effectKind, effectType:state.effectType,
    strobeOn:state.strobeOn, strobeMode:state.strobeMode, effectOn:state.effectOn, effectSubMode:state.effectSubMode,
    fadeMode:state.fadeMode, fadeDurationSec:state.fadeDurationSec, stageItems:state.stageItems, gdocUrl:state.gdocUrl
  }));
}
$('#versionMemoAddBtn').addEventListener('click', ()=>{
  const val = $('#versionMemoInput').value.trim();
  if(!val) return;
  state.versionMemos.unshift({id:uid(), text:val, date:new Date().toLocaleString('ja-JP'), snapshot:buildSnapshot()});
  $('#versionMemoInput').value='';
  renderVersionMemos();
  saveState();
});
$('#versionMemoListToggleBtn').addEventListener('click', ()=>{
  $('#versionMemoList').classList.toggle('hidden');
});
function renderVersionMemos(){
  const list = $('#versionMemoList');
  list.innerHTML='';
  state.versionMemos.slice(0,20).forEach(m=>{
    const li=document.createElement('li');
    const titleBtn = document.createElement('button');
    titleBtn.className='memo-title-btn';
    titleBtn.textContent = m.text; // 要件⑦：一覧では時刻・日付は表示しない
    titleBtn.addEventListener('click', ()=>{
      if(!m.snapshot) return;
      // 要件⑦：復元前の確認画面でどの時点の履歴かを表示する
      if(confirm(`「${m.text}」（${m.date} 時点）の状態に復元しますか？現在の内容は上書きされます。`)){
        Object.assign(state, m.snapshot);
        applyAllSettingsToUI();
        saveState();
      }
    });
    li.appendChild(titleBtn);
    list.appendChild(li);
  });
  $('#versionMemoDisplay').textContent = state.versionMemos[0] ? state.versionMemos[0].text : '';
}

/* ============================================================
   配役パネル（閉時は非表示のみ。3文字強制切り出しは行わない）
   ============================================================ */
$('#castPanelToggle').addEventListener('click', ()=>{
  const panel = $('#castPanel');
  panel.classList.toggle('open');
  panel.classList.toggle('closed');
  $('#castPanelArrow').textContent = panel.classList.contains('open') ? '◀' : '▶';
  document.body.classList.toggle('cast-open', panel.classList.contains('open'));
  renderCastList();
});

function nextMic(){
  // 要件⑤：自動割り当ては「ワイヤレス1→2→3→4→1…」とワイヤレス内だけを循環する
  return AUTO_MIC_CYCLE[state.cast.length % AUTO_MIC_CYCLE.length];
}

// Ver.7.0 要件4.1：「音声」ボタンをクリックすると話者選択モーダルを表示し、
// 一覧から読み上げ音声（男1〜3／女1〜3）を選ぶ方式に変更する
let voiceSelectCallback = null;
function openVoiceSelectModal(current, onSelect){
  voiceSelectCallback = onSelect;
  const grid = $('#voiceSelectGrid');
  grid.innerHTML = '';
  VOICE_CYCLE.forEach(v=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = v;
    if(v===current) btn.classList.add('selected');
    btn.addEventListener('click', ()=>{
      if(voiceSelectCallback) voiceSelectCallback(v);
      closeVoiceSelectModal();
    });
    grid.appendChild(btn);
  });
  $('#voiceSelectModal').classList.remove('hidden');
}
function closeVoiceSelectModal(){
  $('#voiceSelectModal').classList.add('hidden');
  voiceSelectCallback = null;
}
$('#voiceSelectCloseBtn').addEventListener('click', closeVoiceSelectModal);

// Ver.6.0 要件4.2：追加フォームの「音声」ボタンで、次に追加する登場人物の読み上げ音声を先に選べる
let newCharVoice = VOICE_CYCLE[0];
$('#newCharVoiceBtn').textContent = newCharVoice;
$('#newCharVoiceBtn').addEventListener('click', ()=>{
  openVoiceSelectModal(newCharVoice, v=>{
    newCharVoice = v;
    $('#newCharVoiceBtn').textContent = newCharVoice;
  });
});
$('#castAddBtn').addEventListener('click', ()=>{
  const name = $('#newCharName').value.trim();
  const actor = $('#newActorName').value.trim();
  if(!name) return;
  state.cast.push({
    id:uid(), name, actor, mic:nextMic(), voice:newCharVoice,
    color: COLOR_PALETTE[state.cast.length % COLOR_PALETTE.length].hex, edit:false
  });
  $('#newCharName').value=''; $('#newActorName').value='';
  newCharVoice = VOICE_CYCLE[0];
  $('#newCharVoiceBtn').textContent = newCharVoice;
  renderCastList();
  saveState();
});

function renderCastList(){
  const wrap = $('#castList');
  wrap.innerHTML='';
  const micCount = {};
  state.cast.forEach(c=>{ micCount[c.mic] = (micCount[c.mic]||0)+1; });
  const closed = $('#castPanel').classList.contains('closed');
  if(closed) return; // 閉じた状態は表示しない（強制3文字切り出しは行わない）

  state.cast.forEach(c=>{
    const row = document.createElement('div');
    row.className='cast-row';
    row.style.borderLeft = `6px solid ${c.color}`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = c.name;
    nameSpan.title = c.name;
    row.appendChild(nameSpan);

    const actorInput = document.createElement('input');
    actorInput.type='text'; actorInput.value = c.actor||''; actorInput.placeholder='役者名';
    actorInput.className='actor-input';
    actorInput.disabled = !c.edit;
    actorInput.addEventListener('input', e=>{ c.actor = e.target.value; saveState(); });
    row.appendChild(actorInput);

    // 要件④：マイクがかぶった際は警告表示ではなく、マイクごとに固定した強調色で色分けする
    const micColor = MIC_COLORS[c.mic] || '#ccc';
    const micBtn = document.createElement('button');
    micBtn.className='mic-btn' + (micCount[c.mic]>1 ? ' mic-shared' : '');
    micBtn.textContent = c.mic;
    micBtn.style.background = micColor;
    micBtn.style.color = textColorFor(micColor);
    micBtn.addEventListener('click', ()=>{
      const idx = MIC_CYCLE.indexOf(c.mic);
      c.mic = MIC_CYCLE[(idx+1)%MIC_CYCLE.length];
      renderCastList(); saveState();
    });
    row.appendChild(micBtn);

    const editBtn = document.createElement('button');
    editBtn.className='del-btn editable-only';
    editBtn.textContent = c.edit ? '確定':'変更';
    editBtn.addEventListener('click', ()=>{
      c.edit = !c.edit;
      renderCastList(); saveState();
    });
    row.appendChild(editBtn);

    // 要件⑦：「変更」ボタンの右横に読み上げ音声切り替えボタンを追加
    // Ver.7.0 要件4.1：クリックで話者選択モーダルを開き、一覧から選ぶ方式に変更
    const voiceBtn = document.createElement('button');
    voiceBtn.className='voice-btn editable-only';
    if(!c.voice) c.voice = VOICE_CYCLE[0];
    voiceBtn.textContent = c.voice;
    voiceBtn.title='読み上げ音声の種類を選択';
    voiceBtn.addEventListener('click', ()=>{
      openVoiceSelectModal(c.voice, v=>{
        c.voice = v;
        renderCastList(); saveState();
      });
    });
    row.appendChild(voiceBtn);

    if(c.edit){
      const nameInput = document.createElement('input');
      nameInput.type='text'; nameInput.value=c.name; nameInput.style.width='70px';
      nameInput.addEventListener('input', e=>{ c.name = e.target.value; saveState(); });
      row.insertBefore(nameInput, row.firstChild);
      row.removeChild(nameSpan);
    }

    const colorBtn = document.createElement('button');
    colorBtn.className='color-swatch-btn';
    colorBtn.style.background = c.color;
    colorBtn.addEventListener('click', ()=>{
      const idx = COLOR_PALETTE.findIndex(p=>p.hex===c.color);
      c.color = COLOR_PALETTE[(idx+1)%COLOR_PALETTE.length].hex;
      renderCastList(); saveState();
    });
    row.appendChild(colorBtn);

    const delBtn = document.createElement('button');
    delBtn.className='del-btn editable-only';
    delBtn.textContent='✕';
    delBtn.addEventListener('click', ()=>{
      state.cast = state.cast.filter(x=>x.id!==c.id);
      renderCastList(); saveState();
    });
    row.appendChild(delBtn);

    wrap.appendChild(row);
  });
}

/* ============================================================
   タブ切替
   ============================================================ */
$all('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $all('.tab-btn').forEach(b=>b.classList.remove('active'));
    $all('.tab-pane').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    $('#tab-'+btn.dataset.tab).classList.add('active');
  });
});

/* ============================================================
   台本エディタ（リッチテキスト / ルビ / ト書き / 自動マッチング）
   ============================================================ */
const scriptEditor = $('#scriptEditor');
scriptEditor.addEventListener('input', ()=>{ state.scriptHTML = scriptEditor.innerHTML; saveState(); });
scriptEditor.addEventListener('paste', ()=>{
  setTimeout(()=>{ state.scriptHTML = scriptEditor.innerHTML; saveState(); }, 0);
});

$('#rubyBtn').addEventListener('click', ()=>{
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0 || sel.toString().length===0){ alert('ルビを振る文字を選択してください'); return; }
  const furigana = prompt('ふりがなを入力してください');
  if(furigana===null) return;
  const range = sel.getRangeAt(0);
  const ruby = document.createElement('ruby');
  ruby.textContent = range.toString();
  const rt = document.createElement('rt');
  rt.textContent = furigana;
  ruby.appendChild(rt);
  range.deleteContents();
  range.insertNode(ruby);
  state.scriptHTML = scriptEditor.innerHTML;
  saveState();
});

$('#tokakiBtn').addEventListener('click', ()=>{
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0){ return; }
  let node = sel.anchorNode;
  while(node && node.nodeType!==1) node = node.parentNode;
  if(node && node!==scriptEditor){
    node.classList.toggle('tokaki');
    node.dataset.tokaki = node.classList.contains('tokaki') ? '1':'';
    state.scriptHTML = scriptEditor.innerHTML;
    saveState();
  }
});

// 要件⑧：段落内に改行（<br>）が含まれる場合、その改行ごとに独立した「1行」として
// 扱えるよう、あらかじめ別々の段落要素へ分割しておく（話者割り当て・読み上げ共通で使用）
function normalizeScriptLines(){
  const children = Array.from(scriptEditor.children);
  children.forEach(el=>{
    if(el.nodeType!==1) return;
    if(!/<br\s*\/?>/i.test(el.innerHTML)) return;
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    if(parts.length<=1) return;
    const frag = document.createDocumentFragment();
    parts.forEach(part=>{
      const newEl = document.createElement(el.tagName);
      newEl.innerHTML = part;
      frag.appendChild(newEl);
    });
    el.replaceWith(frag);
  });
}

// Ver.7.0 要件2.1：台本テキストの解析前に、ルビ（<rt>）の読み文字列および
// 純粋な空白行・改行コードを除外・標準化したテキストを取得する（話者抽出・カッコ判定の共通処理）
function getCleanLineText(line){
  const clone = line.cloneNode(true);
  clone.querySelectorAll('rt, rp').forEach(n=>n.remove());
  return (clone.textContent || '').replace(/\u200b/g,'');
}

// Ver.7.0 要件2.2：カッコ（（）／()）で囲まれた文字列をすべてト書きとして分離する。
// 行全体が1つのカッコで完全に囲まれている場合はその行全体をト書き行として扱い、
// 発言の途中にカッコが含まれる場合はカッコ部分の前後に改行を自動挿入して
// 独立したト書き行として分解抽出する。
function processLineParens(line){
  if(line.dataset && line.dataset.tempBlank==='1') return;
  const text = getCleanLineText(line);
  if(!text.includes('（') && !text.includes('(')) return;

  const wholeMatch = text.trim().match(/^[（(][^（）()]*[）)]$/);
  if(wholeMatch){
    line.classList.add('tokaki');
    line.dataset.tokaki = '1';
    return;
  }

  const html = line.innerHTML;
  const segments = [];
  let buf = '', mode = 'normal', i = 0;
  const pushSeg = ()=>{ if(buf!=='') segments.push({type:mode, html:buf}); buf=''; };
  while(i<html.length){
    if(html[i]==='<'){
      const close = html.indexOf('>', i);
      if(close===-1){ buf += html.slice(i); break; }
      buf += html.slice(i, close+1);
      i = close+1;
      continue;
    }
    const ch = html[i];
    if((ch==='（' || ch==='(') && mode==='normal'){
      pushSeg();
      mode = 'tokaki';
      buf += ch;
      i++;
      continue;
    }
    if((ch==='）' || ch===')') && mode==='tokaki'){
      buf += ch;
      pushSeg();
      mode = 'normal';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  pushSeg();
  if(segments.length<=1) return;

  const speaker = line.dataset.speaker || '';
  const mic = line.dataset.mic || '';
  const tag = line.tagName;
  const frag = document.createDocumentFragment();
  segments.forEach(seg=>{
    const el = document.createElement(tag);
    el.innerHTML = seg.html;
    if(seg.type==='tokaki'){
      el.classList.add('tokaki');
      el.dataset.tokaki = '1';
    }else if(speaker){
      // ト書きで分断された後も、同じ話者のセリフの続きとして扱う
      el.dataset.speaker = speaker;
      if(mic) el.dataset.mic = mic;
    }
    frag.appendChild(el);
  });
  line.replaceWith(frag);
}
function splitTokakiParentheses(){
  const lines = Array.from(scriptEditor.children).filter(el=>el.nodeType===1);
  lines.forEach(processLineParens);
}

// 話者自動マッチング→話者割り当て：「話者名(、・/区切りで複数可)：セリフ」形式を検出
// 要件⑧：改行で話者が切り替わっている場合に誤って複数話者扱いにしないよう、
// マッチング対象は必ず「その行（1つの要素）」単位に正規化してから判定する
// Ver.6.0 要件5：選択範囲がある状態で話者割り当てを実行した場合、選択範囲の前後に
// 一時的な空行を1行ずつ挿入してから台本全体に対して自動割り当てを行い、
// 処理完了後にその一時空行を削除して元の文章構造へ戻す。
function withTempBlankLinesAroundSelection(fn){
  const sel = window.getSelection();
  const hasSelection = sel && sel.rangeCount>0 && !sel.isCollapsed && sel.toString().trim().length>0;
  if(!hasSelection){ fn(); return; }
  const range = sel.getRangeAt(0);
  const findLineEl = node=>{
    while(node && node.parentNode!==scriptEditor && node!==scriptEditor) node = node.parentNode;
    return (node && node!==scriptEditor) ? node : null;
  };
  const startLine = findLineEl(range.startContainer);
  const endLine = findLineEl(range.endContainer);
  const makeBlank = ()=>{
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    p.dataset.tempBlank = '1';
    return p;
  };
  if(startLine && startLine.parentNode===scriptEditor){
    scriptEditor.insertBefore(makeBlank(), startLine);
  }
  if(endLine && endLine.parentNode===scriptEditor){
    if(endLine.nextSibling) scriptEditor.insertBefore(makeBlank(), endLine.nextSibling);
    else scriptEditor.appendChild(makeBlank());
  }
  try{ fn(); }
  finally{
    scriptEditor.querySelectorAll('[data-temp-blank="1"]').forEach(el=>el.remove());
  }
}

$('#autoMatchBtn').addEventListener('click', ()=>{
  withTempBlankLinesAroundSelection(runAutoMatch);
});
function runAutoMatch(){
  normalizeScriptLines();
  splitTokakiParentheses();
  state.scriptHTML = scriptEditor.innerHTML;
  const lines = scriptEditor.querySelectorAll('p, div');
  const targets = lines.length ? Array.from(lines) : [scriptEditor];
  let matchedCount = 0;
  targets.forEach(line=>{
    line.querySelectorAll('.speaker-dot').forEach(d=>d.remove());
    // Ver.7.0 要件2.1：ト書き行・空白行にはアイコン／バーを付与せず、話者抽出の対象外とする
    if(line.classList.contains('tokaki')) return;
    const text = getCleanLineText(line);
    if(!text.trim()) return;
    // 要件⑨：「：」「:」に加え、全角・半角スペースの組み合わせ（2文字以上連続）でも話者名の区切りと判定する
    const m = text.match(/^\s*([^\s:：]{1,30})(?:[：:]|[ \u3000]{2,})/);
    if(m){
      const namesRaw = m[1];
      const names = namesRaw.split(/[、・\/]/).map(s=>s.trim()).filter(Boolean);
      const matchedChars = [];
      names.forEach(n=>{
        const char = state.cast.find(c=> c.name===n || (c.name && (c.name.startsWith(n) || n.startsWith(c.name))));
        if(char) matchedChars.push(char);
      });
      if(matchedChars.length){
        line.classList.add('speaker-highlight');
        line.style.borderLeft = `4px solid ${matchedChars[0].color}`;
        line.dataset.speaker = matchedChars.map(c=>c.name).join(',');
        line.dataset.mic = matchedChars[0].mic;
        matchedChars.forEach(c=>{
          const dot = document.createElement('span');
          dot.className='speaker-dot';
          dot.style.background = c.color;
          dot.title = c.name;
          line.insertBefore(dot, line.firstChild);
        });
        matchedCount++;
      }
    }
  });
  state.scriptHTML = scriptEditor.innerHTML;
  saveState();
  alert(`${matchedCount} 行を割り当てました。`);
}

/* ---------- 読み上げ ---------- */
function getScriptLines(){
  // 要件⑧：読み上げも改行ごとに独立した行として扱う
  normalizeScriptLines();
  // Ver.7.0 要件2.2：読み上げ時もカッコ内ト書きを独立した行として分離し、読み飛ばす
  splitTokakiParentheses();
  state.scriptHTML = scriptEditor.innerHTML;
  const children = Array.from(scriptEditor.children).filter(el=>el.nodeType===1);
  return children.length ? children : [scriptEditor];
}
const SPEAKER_PREFIX_RE = /^\s*[^\s:：]{1,30}(?:[：:]|[ \u3000]{2,})/;

// 要件⑬：ルビ（<ruby><rt>）が付与された箇所は、読み（<rt>）のみを読み上げ対象にし、
// 「漢字＋ふりがな」の二重読み上げを防ぐ
function extractReadableText(lineEl){
  const clone = lineEl.cloneNode(true);
  clone.querySelectorAll('rp').forEach(rp=>rp.remove());
  clone.querySelectorAll('ruby').forEach(ruby=>{
    const rt = ruby.querySelector('rt');
    const reading = rt ? (rt.textContent||'') : (ruby.textContent||'');
    ruby.replaceWith(document.createTextNode(reading));
  });
  return (clone.textContent || '').replace(/\u200b/g,'');
}

// 要件⑪：話者自動マッチングで判定された話者のみに紐づく声で、セリフ本文のみを読み上げる
function findJaVoice(gender){
  const voices = (speechSynthesis.getVoices && speechSynthesis.getVoices()) || [];
  const jaVoices = voices.filter(v=>/^ja/i.test(v.lang));
  if(!jaVoices.length) return null;
  const keyword = gender==='female' ? /female|女/i : /male|男/i;
  return jaVoices.find(v=>keyword.test(v.name)) || jaVoices[0];
}
function voiceParamsForLine(line){
  const speakerNames = (line.dataset.speaker||'').split(',').map(s=>s.trim()).filter(Boolean);
  const char = speakerNames.length ? state.cast.find(c=>c.name===speakerNames[0]) : null;
  const voiceKey = (char && char.voice) ? char.voice : VOICE_CYCLE[0];
  return VOICE_PARAMS[voiceKey] || VOICE_PARAMS[VOICE_CYCLE[0]];
}

// Ver.6.0 要件3.2：範囲選択がある場合は、その先頭セリフから読み上げを開始する
// （選択範囲の終端では止めず、そのまま台本の最後まで読み進める）
function getSelectionStartLineIndex(lines){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0 || sel.isCollapsed || sel.toString().trim().length===0) return null;
  const range = sel.getRangeAt(0);
  const findLineIndex = node=>{
    while(node && node.parentNode !== scriptEditor && node !== scriptEditor) node = node.parentNode;
    return lines.indexOf(node);
  };
  const startIdx = findLineIndex(range.startContainer);
  return startIdx>=0 ? startIdx : null;
}

/* ============================================================
   Ver.6.0 要件3：外部TTS（VOICEVOX / COEIROINK 等）エンジン連携
   ・「設定」内の「音声調整」で サーバーURL／話者／話速／音高／抑揚 を設定する
   ・サーバー未設定または通信エラー時は自動的にブラウザ標準の Web Speech API へ
     フォールバックして読み上げを継続する
   ============================================================ */
async function synthesizeExternalTTS(text, params){
  const base = (state.ttsSettings && state.ttsSettings.serverUrl || '').replace(/\/+$/,'');
  if(!base) throw new Error('TTSサーバー未設定');
  const speaker = encodeURIComponent((state.ttsSettings && state.ttsSettings.speaker) || '1');
  // VOICEVOX/COEIROINK互換の2段階API（audio_query → synthesis）を想定
  const queryRes = await fetch(`${base}/audio_query?speaker=${speaker}&text=${encodeURIComponent(text)}`, {method:'POST'});
  if(!queryRes.ok) throw new Error('audio_query失敗 status:'+queryRes.status);
  const query = await queryRes.json();
  query.speedScale = params.speed;
  query.pitchScale = params.pitch;
  query.intonationScale = params.intonation;
  const synthRes = await fetch(`${base}/synthesis?speaker=${speaker}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(query)
  });
  if(!synthRes.ok) throw new Error('synthesis失敗 status:'+synthRes.status);
  return await synthRes.blob();
}
// 話者（配役）ごとの話速/音高/抑揚。既存のVOICE_PARAMS（男女トーン）を土台に、
// 「音声調整」画面の全体設定（state.ttsSettings）を掛け合わせて最終値を決める
function ttsParamsForLine(line){
  const base = voiceParamsForLine(line); // {pitch, rate, gender}
  const t = state.ttsSettings || {};
  return {
    speed: (t.speed!=null ? t.speed : 1.0) * (base.rate||1.0),
    pitch: (t.pitch!=null ? t.pitch : 0.0) + ((base.pitch||1.0)-1.0)*0.1,
    intonation: (t.intonation!=null ? t.intonation : 1.0)
  };
}

let currentReadingLineFullText = '';
let ttsAudioEl = null;

$('#speakRowBtn').addEventListener('click', ()=>{
  if(isReading){
    speechSynthesis.cancel();
    if(ttsAudioEl){ ttsAudioEl.pause(); ttsAudioEl.src=''; }
    isReading = false;
    $('#speakRowBtn').textContent = '🔊 読み上げ';
    return;
  }
  const lines = getScriptLines();
  const selStartIdx = getSelectionStartLineIndex(lines);
  const startIndex = selStartIdx!=null ? selStartIdx : 0;
  const endIndex = lines.length-1;

  const queue = [];
  for(let i=startIndex;i<=endIndex;i++){
    const line = lines[i];
    if(line.classList && line.classList.contains('tokaki')) continue;
    if(lines.length>1 && !line.dataset.mic) continue;
    const fullText = extractReadableText(line).trim();
    const readable = fullText.replace(SPEAKER_PREFIX_RE,'').trim();
    if(readable) queue.push({text:readable, fullText, line});
  }
  if(queue.length===0){ alert('読み上げ可能な行がありません（マイク割当・ト書き設定・選択範囲をご確認ください）。'); return; }

  // 音声合成の準備中は「音声生成中」と表示する
  isReading = true;
  currentReadingLineFullText = '';
  $('#speakRowBtn').textContent = '音声生成中';
  let started = false;

  function buildWebSpeechUtterance(item){
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang='ja-JP';
    const params = voiceParamsForLine(item.line);
    u.pitch = params.pitch;
    u.rate = params.rate;
    const voice = findJaVoice(params.gender);
    if(voice) u.voice = voice;
    return u;
  }
  // 要件3.1：外部TTSサーバーで音声を用意する。失敗した場合は自動的にWeb Speech API用の
  // うたたね（フォールバック）データを返す。
  async function prepareItem(item){
    try{
      const params = ttsParamsForLine(item.line);
      const blob = await synthesizeExternalTTS(item.text, params);
      return {kind:'audio', blob, item};
    }catch(err){
      return {kind:'webspeech', utterance:buildWebSpeechUtterance(item), item};
    }
  }

  // 要件⑨・要件3.1：話者（行）ごとに1つずつ読み込んで再生する。現在の行の再生を
  // 開始したタイミングで次の行の先読み（プリロード）を開始することでストリーミング再生のように進行する。
  // 要件3.1：前のセリフの再生が完全に終了してから「0.3秒後」に次のセリフ再生を開始する。
  function playSequential(idx, preparedPromise){
    if(idx>=queue.length){
      isReading=false; $('#speakRowBtn').textContent='🔊 読み上げ';
      return;
    }
    const item = queue[idx];
    const readyPromise = preparedPromise || prepareItem(item);
    readyPromise.then(prepared=>{
      if(!isReading) return; // 途中で停止された
      let nextPreparedPromise = null;
      const onLineStart = ()=>{
        if(!started){ started = true; $('#speakRowBtn').textContent = '⏹ 停止'; }
        // 要件3.2：現在（および直前）読み上げ中の行のセリフをCue記録用に保持する
        currentReadingLineFullText = item.fullText;
        if(idx+1<queue.length){ nextPreparedPromise = prepareItem(queue[idx+1]); }
      };
      const advance = ()=>{
        setTimeout(()=>{ if(isReading) playSequential(idx+1, nextPreparedPromise); }, 300);
      };
      if(prepared.kind==='audio'){
        if(!ttsAudioEl){ ttsAudioEl = new Audio(); }
        ttsAudioEl.src = URL.createObjectURL(prepared.blob);
        ttsAudioEl.onplay = onLineStart;
        ttsAudioEl.onended = advance;
        ttsAudioEl.onerror = advance;
        ttsAudioEl.play().catch(advance);
      }else{
        const u = prepared.utterance;
        u.onstart = onLineStart;
        u.onend = advance;
        u.onerror = advance;
        speechSynthesis.speak(u);
      }
    });
  }
  playSequential(0, null);
});

/* ---------- Googleドキュメント自動同期（一方向：あちら→こちら） ---------- */
function extractGoogleDocId(url){
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
async function syncGoogleDoc(silent){
  const url = $('#gdocUrlInput').value.trim();
  state.gdocUrl = url;
  saveState();
  if(!url){ $('#gdocStatus').textContent=''; return; }
  const id = extractGoogleDocId(url);
  if(!id){ $('#gdocStatus').textContent='URLが正しくありません'; return; }

  // Googleアカウントにログイン済みの場合は Drive API 経由で取得（限定公開ドキュメントでも確実に同期可能）
  if(googleAccessToken){
    try{
      const apiUrl = `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=text/html`;
      const res = await fetch(apiUrl, {headers:{Authorization:'Bearer '+googleAccessToken}});
      if(!res.ok) throw new Error('Drive API 取得失敗 status:'+res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const body = doc.body ? doc.body.innerHTML : html;
      scriptEditor.innerHTML = body;
      state.scriptHTML = scriptEditor.innerHTML;
      saveState();
      $('#gdocStatus').textContent = 'Googleアカウント経由で同期しました（'+new Date().toLocaleTimeString('ja-JP')+'）';
      return;
    }catch(err){
      if(!silent) console.warn('Drive API同期に失敗。公開URL方式にフォールバックします。', err);
    }
  }

  const exportUrl = `https://docs.google.com/document/d/${id}/export?format=html`;
  try{
    const res = await fetch(exportUrl, {mode:'cors'});
    if(!res.ok) throw new Error('取得失敗 status:'+res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body ? doc.body.innerHTML : html;
    scriptEditor.innerHTML = body;
    state.scriptHTML = scriptEditor.innerHTML;
    saveState();
    $('#gdocStatus').textContent = '同期しました（'+new Date().toLocaleTimeString('ja-JP')+'）';
  }catch(err){
    $('#gdocStatus').textContent = googleAccessToken
      ? '同期に失敗しました'
      : '同期に失敗しました（ドキュメントを「ウェブに公開」設定にするか、Googleアカウントにログインしてください）';
    if(!silent) console.warn(err);
  }
}
$('#gdocSyncBtn').addEventListener('click', ()=>{ syncGoogleDoc(false); setupGdocAutoSync(); });
function setupGdocAutoSync(){
  if(gdocIntervalHandle) clearInterval(gdocIntervalHandle);
  if(state.gdocUrl){
    gdocIntervalHandle = setInterval(()=>syncGoogleDoc(true), 60000);
  }
}

/* ============================================================
   台本タブ内 音源プレーヤー（要件④：複数音源対応）
   上から順に ①〜 と名前をつけ、⇧⇩で並べ替え、▶/⏸・シーク・秒数表示を持つ
   ============================================================ */
const audioTrackEls = {}; // id -> {audioEl, row}

function circledIndex(i){ return circledNum(i+1); }

function currentTimeSourceFromTracks(){
  // 再生中のトラックがあればその時刻を優先的にCue記録の時間源候補として使う
  const playing = state.audioSources.find(a=>{
    const el = audioTrackEls[a.id] && audioTrackEls[a.id].audioEl;
    return el && !el.paused && !el.ended;
  });
  return playing || null;
}

function addAudioTrack(file){
  const id = uid();
  const url = URL.createObjectURL(file);
  state.audioSources.push({id, name:'', src:url, startOffset:0});
  state.currentAudioTrackId = id;
  state.audioSourceCount = (state.audioSourceCount||0)+1;
  renderAudioTracks();
  saveState();
}
$('#scriptAudioAddInput').addEventListener('change', e=>{
  const files = Array.from(e.target.files||[]);
  files.forEach(addAudioTrack);
  e.target.value='';
});

function renderAudioTracks(){
  const wrap = $('#audioTracksList');
  wrap.innerHTML='';
  state.audioSources.forEach((track, idx)=>{
    const row = document.createElement('div');
    row.className='audio-track-row' + (state.currentAudioTrackId===track.id ? ' audio-track-current':'');

    const nameSpan = document.createElement('span');
    nameSpan.className='audio-track-name';
    nameSpan.textContent = circledIndex(idx);
    nameSpan.title = 'クリックで名前を変更';
    nameSpan.style.cursor='pointer';
    nameSpan.addEventListener('click', ()=>{
      const val = prompt('この音源の名前（省略可）', track.name||'');
      if(val!==null){ track.name = val.trim(); saveState(); renderAudioTracks(); }
    });
    row.appendChild(nameSpan);

    const upBtn = document.createElement('button');
    upBtn.textContent='⇧'; upBtn.title='上へ';
    upBtn.disabled = idx===0;
    upBtn.addEventListener('click', ()=>{
      if(idx===0) return;
      [state.audioSources[idx-1], state.audioSources[idx]] = [state.audioSources[idx], state.audioSources[idx-1]];
      renderAudioTracks(); saveState();
    });
    row.appendChild(upBtn);

    const downBtn = document.createElement('button');
    downBtn.textContent='⇩'; downBtn.title='下へ';
    downBtn.disabled = idx===state.audioSources.length-1;
    downBtn.addEventListener('click', ()=>{
      if(idx===state.audioSources.length-1) return;
      [state.audioSources[idx+1], state.audioSources[idx]] = [state.audioSources[idx], state.audioSources[idx+1]];
      renderAudioTracks(); saveState();
    });
    row.appendChild(downBtn);

    const playBtn = document.createElement('button');
    playBtn.textContent='▶';
    row.appendChild(playBtn);

    const seek = document.createElement('input');
    seek.type='range'; seek.min='0'; seek.max='100'; seek.step='0.1'; seek.value = track.startOffset||0;
    row.appendChild(seek);

    const timeSpan = document.createElement('span');
    timeSpan.className='audio-track-time';
    timeSpan.textContent='0.0 / 0.0秒';
    row.appendChild(timeSpan);

    const delBtn = document.createElement('button');
    delBtn.textContent='✕'; delBtn.title='削除';
    delBtn.addEventListener('click', ()=>{
      const el = audioTrackEls[track.id] && audioTrackEls[track.id].audioEl;
      if(el){ el.pause(); }
      delete audioTrackEls[track.id];
      state.audioSources = state.audioSources.filter(a=>a.id!==track.id);
      if(state.currentAudioTrackId===track.id) state.currentAudioTrackId = null;
      renderAudioTracks(); saveState();
    });
    row.appendChild(delBtn);

    const audioEl = document.createElement('audio');
    audioEl.src = track.src;
    audioEl.preload = 'metadata';
    audioEl.hidden = true;
    row.appendChild(audioEl);

    playBtn.addEventListener('click', ()=>{
      if(audioEl.paused){
        // 追加要望⑨：複数音源が同時に流れてしまう不具合を防ぐため、
        // 再生開始時に他の音源トラックを停止してから再生する
        Object.values(audioTrackEls).forEach(t=>{
          if(t.audioEl && t.audioEl!==audioEl && !t.audioEl.paused){
            t.audioEl.pause();
          }
        });
        $all('.audio-track-row button').forEach(b=>{ if(b.textContent==='⏸️') b.textContent='▶'; });
        if(track.startOffset && audioEl.currentTime===0) audioEl.currentTime = track.startOffset;
        audioEl.play();
        playBtn.textContent='⏸️';
        state.currentAudioTrackId = track.id;
        state.currentAudioLabel = track.name ? track.name : circledIndex(idx);
        $all('.audio-track-row').forEach(r=>r.classList.remove('audio-track-current'));
        row.classList.add('audio-track-current');
        saveState();
      }else{
        audioEl.pause();
        playBtn.textContent='▶';
      }
    });
    audioEl.addEventListener('loadedmetadata', ()=>{
      seek.max = audioEl.duration || 0;
    });
    audioEl.addEventListener('timeupdate', ()=>{
      seek.value = audioEl.currentTime;
      timeSpan.textContent = `${audioEl.currentTime.toFixed(1)} / ${(audioEl.duration||0).toFixed(1)}秒`;
    });
    audioEl.addEventListener('ended', ()=>{ playBtn.textContent='▶'; });
    seek.addEventListener('input', e=>{
      audioEl.currentTime = parseFloat(e.target.value)||0;
      track.startOffset = audioEl.currentTime;
    });

    audioTrackEls[track.id] = {audioEl, row};
    wrap.appendChild(row);
  });
}

/* ============================================================
   配役色トグル（ステージ用8色・色相順・中央寄せ）
   ============================================================ */
function renderColorToggles(){
  const wrap = $('#stageColorToggles');
  wrap.innerHTML='';
  if(state.bgColorMode!=='on'){ wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  COLOR_PALETTE.forEach((col,idx)=>{
    const btn = document.createElement('button');
    btn.className='color-toggle-btn' + (state.activeColorIndex===idx ? ' active':'');
    btn.style.background = col.hex;
    btn.style.color = col.hex;
    btn.title = col.name;
    btn.addEventListener('click', ()=>{
      state.activeColorIndex = (state.activeColorIndex===idx) ? null : idx;
      renderColorToggles();
      updateStagePreviewMedia();
      saveState();
    });
    wrap.appendChild(btn);
  });
}
let lastAppliedFilterColorHex = undefined;
// 要件⑩：ストロボくるくるは単一画像を参照し、色は本関数のオーバーレイのみで表現する。
// 色が変化した瞬間はフェードモードに応じてクロスフェード（フェードイン／フェードアウト）させる。
function crossfadeColorFilter(newColorHex){
  const cur = $('#stageColorFilter');
  const inc = $('#stageColorFilter2');
  const dur = KURUKURU_CROSSFADE_SEC;
  const targetOpacity = newColorHex ? .5 : 0;

  if(state.fadeMode==='none'){
    inc.style.transition='none'; inc.style.opacity=0;
    cur.style.transition='none';
    cur.style.backgroundColor = newColorHex || 'transparent';
    cur.style.opacity = targetOpacity;
    return;
  }
  if(state.fadeMode==='in'){
    // 新規の画像（色）を読み込む際に1秒間かけてフェードイン
    inc.style.transition='none';
    inc.style.backgroundColor = newColorHex || 'transparent';
    inc.style.opacity = 0;
    void inc.offsetWidth; // reflow
    inc.style.transition = `opacity ${dur}s linear`;
    inc.style.opacity = targetOpacity;
    setTimeout(()=>{
      cur.style.transition='none';
      cur.style.backgroundColor = newColorHex || 'transparent';
      cur.style.opacity = targetOpacity;
      inc.style.transition='none';
      inc.style.opacity = 0;
    }, dur*1000);
    return;
  }
  // fadeMode==='out'：現在の色を100→0で1秒フェードアウトすると同時に、新しい色を0→100で1秒フェードインする
  inc.style.transition='none';
  inc.style.backgroundColor = newColorHex || 'transparent';
  inc.style.opacity = 0;
  void inc.offsetWidth;
  cur.style.transition = `opacity ${dur}s linear`;
  inc.style.transition = `opacity ${dur}s linear`;
  cur.style.opacity = 0;
  inc.style.opacity = targetOpacity;
  setTimeout(()=>{
    cur.style.transition='none';
    cur.style.backgroundColor = newColorHex || 'transparent';
    cur.style.opacity = targetOpacity;
    inc.style.transition='none';
    inc.style.opacity = 0;
  }, dur*1000);
}
function applyColorFilter(){
  const filter = $('#stageColorFilter');
  const filter2 = $('#stageColorFilter2');
  const hex = (state.bgColorMode==='on' && state.activeColorIndex!=null) ? currentColorHex() : null;

  if(currentStrobeKey()==='kurukuru'){
    if(hex!==lastAppliedFilterColorHex){
      crossfadeColorFilter(hex);
      lastAppliedFilterColorHex = hex;
    }
    return;
  }
  // ストロボくるくる以外は従来通りの単純な表示（画像自体に色が焼き込まれているため）
  filter2.style.transition='none'; filter2.style.opacity=0;
  if(!hex){
    filter.style.transition='';
    filter.style.opacity=0;
  }else{
    filter.style.transition='';
    filter.style.backgroundColor = hex;
    filter.style.opacity = .5;
  }
  lastAppliedFilterColorHex = hex;
}

/* ============================================================
   ストロボ / Effect / フェード（背景色ありモード時の演出制御）
   ============================================================ */
function currentStrobeKey(){
  if(state.bgColorMode!=='on') return 'none';
  if(state.effectType==='none') return state.strobeOn ? 'static' : 'none';
  return state.strobeMode || 'none';
}
function isEffectActive(){
  if(state.bgColorMode!=='on') return false;
  if(state.effectType==='none') return false;
  if(state.effectType==='existing') return !!state.effectOn;
  if(state.effectType==='original') return state.effectSubMode!=='none';
  return false;
}
function updateStrobeUI(){
  const btn = $('#strobeToggleBtn');
  if(state.bgColorMode!=='on'){ btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  if(state.effectType==='none'){
    btn.textContent = 'ストロボ';
    btn.classList.toggle('active-state', !!state.strobeOn);
  }else{
    btn.textContent = STROBE_BTN_LABEL[state.strobeMode] || 'ストロボ✖️';
    btn.classList.toggle('active-state', !!state.strobeMode && state.strobeMode!=='none');
  }
}
$('#strobeToggleBtn').addEventListener('click', ()=>{
  if(state.bgColorMode!=='on') return;
  if(state.effectType==='none'){
    state.strobeOn = !state.strobeOn;
  }else{
    const cycle = state.effectType==='existing' ? EXISTING_STROBE_CYCLE : ORIGINAL_STROBE_CYCLE;
    const idx = cycle.indexOf(state.strobeMode);
    state.strobeMode = cycle[(idx+1+cycle.length)%cycle.length];
  }
  updateStrobeUI();
  updateStagePreviewMedia();
  saveState();
});

function updateEffectUI(){
  const btn = $('#effectToggleBtn');
  if(state.bgColorMode!=='on' || !state.effectType || state.effectType==='none'){
    btn.classList.add('hidden');
    $('#customEffectAddRow').classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  if(state.effectType==='existing'){
    btn.textContent='Effect';
    btn.classList.toggle('active-state', !!state.effectOn);
  }else if(state.effectType==='original'){
    btn.textContent = EFFECT_SUBMODE_LABEL[state.effectSubMode] || 'Effect';
    btn.classList.toggle('active-state', state.effectSubMode!=='none');
  }
  const showCustomRow = state.effectType==='original' && state.effectSubMode==='original';
  $('#customEffectAddRow').classList.toggle('hidden', !showCustomRow);
  if(showCustomRow) prefillCfxDefaults();
}
$('#effectToggleBtn').addEventListener('click', ()=>{
  if(state.effectType==='existing'){
    state.effectOn = !state.effectOn;
  }else if(state.effectType==='original'){
    const cyc = ['none','existing','original'];
    const idx = cyc.indexOf(state.effectSubMode);
    state.effectSubMode = cyc[(idx+1)%cyc.length];
  }
  updateEffectUI();
  updateStagePreviewMedia();
  saveState();
});

function updateFadeUI(){
  $('#fadeModeBtn').textContent = FADE_LABEL[state.fadeMode] || 'フェードなし';
  $('#fadeModeBtn').classList.toggle('active-state', state.fadeMode!=='none');
}
$('#fadeModeBtn').addEventListener('click', ()=>{
  const idx = FADE_CYCLE.indexOf(state.fadeMode);
  state.fadeMode = FADE_CYCLE[(idx+1)%FADE_CYCLE.length];
  updateFadeUI();
  saveState();
});

/* ---------- 独自Effect 記録（要件④⑥⑪⑬） ---------- */
// 「照明職人用」の現在のNo.は、ステージ側の入力(#cfxNo)と照明職人用タブの入力(#cfxCurrentNoInput)の
// 2箇所に表示され、常にstate.cfxCurrentNoと同期する。
function syncCfxNoInputs(){
  const v = state.cfxCurrentNo || 1;
  $('#cfxNo').value = v;
  $('#cfxCurrentNoInput').value = v;
}
function setCfxCurrentNo(v){
  // Ver.8.0：Effectタブで使用中のNo.と重なる場合は、現状空欄のNo.に自動的に変える
  state.cfxCurrentNo = nextBlankEffectNo((!isNaN(v) && v>=1) ? v : 1);
  syncCfxNoInputs();
  saveState();
}
function prefillCfxDefaults(){
  // 追加要望④：No.は「照明職人用」タブでの手動編集・Cue記録時の自動加算でのみ変化させる
  // （保存のたびに次の空き番号へ自動で変える処理は行わない）
  syncCfxNoInputs();
  if(!$('#cfxStep').value) $('#cfxStep').value = 1;
  if(!$('#cfxSec').value) $('#cfxSec').value = 0.1;
}
$('#cfxNo').addEventListener('change', ()=> setCfxCurrentNo(parseInt($('#cfxNo').value,10)));
$('#cfxCurrentNoInput').addEventListener('change', ()=> setCfxCurrentNo(parseInt($('#cfxCurrentNoInput').value,10)));
// Ver.6.0 要件6.2：No.内のステップを昇順ソートし、番号が重複した場合は
// 既存の重複以降を連鎖的に+1ずつ押し出す（例：1,2,3 に2が割り込むと 2→3、3→4 にシフト）
function sortAndShiftCustomEffects(){
  const byNo = {};
  state.customEffects.forEach(e=>{ (byNo[e.no] = byNo[e.no]||[]).push(e); });
  Object.values(byNo).forEach(group=>{
    group.sort((a,b)=>a.step-b.step);
    for(let i=1;i<group.length;i++){
      if(group[i].step<=group[i-1].step){ group[i].step = group[i-1].step+1; }
    }
  });
  state.customEffects.sort((a,b)=> (a.no-b.no) || (a.step-b.step));
}
$('#cfxSaveBtn').addEventListener('click', ()=>{
  let no = parseInt($('#cfxNo').value,10) || state.cfxCurrentNo || 1;
  // Ver.8.1 §9-2：既存Effectと重なる場合は次の空き番号に自動的に変更する
  if(effectEntryOccupied(no)){
    no = nextBlankEffectNo(no);
  }
  state.cfxOwnedNo = no;
  const step = parseInt($('#cfxStep').value,10) || 1;
  const sec = roundSec($('#cfxSec').value) || 0.1;
  const colorName = currentColorName() || '-';
  const strobeLabel = STROBE_LABEL_CUE[state.strobeMode] || 'なし';
  state.customEffects.push({id:uid(), no, step, sec, colorName, strobeLabel});

  // Ver.8.1 §9-1：Effectタブ(state.effectData)へも自動保存する
  const faders = [];
  if(colorName && colorName!=='-'){
    const bgT = findTemplateByName(colorName);
    if(bgT && (bgT.faders||'').trim()) faders.push(bgT.faders.trim());
  }
  if(strobeLabel==='◯'){
    const stT = findTemplateByName('ストロボ');
    if(stT && (stT.faders||'').trim()) faders.push(stT.faders.trim());
  }
  writeEffectStep(no, step, {sec, faders:faders.join('、'), bg:colorName, strobe:strobeLabel});
  state.effectNo = no;

  // ステージ側／照明職人用タブのNo.表示を、実際の書き込み先No.に揃える
  $('#cfxNo').value = no;
  state.cfxCurrentNo = no;
  syncCfxNoInputs();

  // 追加要望④：保存時に増加するのは「ステップ」のみ。No.はここでは変えない。
  $('#cfxStep').value = step+1;
  // 要件6.2：保存のたびに自動ソート＆重複シフトを実行する
  sortAndShiftCustomEffects();
  renderCustomFxTable();
  refreshEffectTabIfVisible();
  saveState();
});
/* ---------- 独自Effect テスト再生（要件⑪⑫、Ver.6.0要件6.3：ループ再生対応） ---------- */
let cfxPlayTimer = null;
let cfxLoopActive = false;
function playCustomEffectSequence(no, opts){
  opts = opts || {};
  if(cfxPlayTimer){ clearTimeout(cfxPlayTimer); cfxPlayTimer = null; }
  const steps = state.customEffects.filter(e=>e.no===no).sort((a,b)=>a.step-b.step);
  if(!steps.length) return false;
  let i = 0;
  function playNext(){
    if(opts.loop && !cfxLoopActive){ cfxPlayTimer = null; return; }
    if(i>=steps.length){
      // 要件6.3：最後のステップまで終わっても停止せず、最初のステップへ戻ってループを継続する
      if(opts.loop){ i = 0; } else { cfxPlayTimer = null; return; }
    }
    const st = steps[i];
    applyCustomFxToStage(st);
    i++;
    const waitSec = opts.useStepSec ? (parseFloat(st.sec)||0.1) : (opts.intervalSec||0.2);
    cfxPlayTimer = setTimeout(playNext, waitSec*1000);
  }
  playNext();
  return true;
}
// Ver.7.0 要件3.3：Cue一覧の「反映」ボタンによる独自Effectのプレビュー再生は、
// この「照明職人用」タブのテスト再生と同じタイマー機構を共有し、常にどちらか1つだけが
// ループ再生される（排他制御）ようにする。
function stopAnyEffectLoop(){
  if(cfxPlayTimer){ clearTimeout(cfxPlayTimer); cfxPlayTimer = null; }
  cfxLoopActive = false;
  cueRowLoopActive = false;
  cueRowLoopNo = null;
  const testBtn = $('#cfxTestBtn');
  if(testBtn) testBtn.textContent = '▶ テスト';
}
let cueRowLoopActive = false;
let cueRowLoopNo = null;
function startCueRowEffectLoop(no, opts){
  stopAnyEffectLoop();
  cfxLoopActive = true;
  cueRowLoopActive = true;
  cueRowLoopNo = no;
  const ok = playCustomEffectSequence(no, Object.assign({loop:true}, opts||{}));
  if(!ok) stopAnyEffectLoop();
  return ok;
}
// Ver.7.0 要件3.3：反映ボタン以外の任意領域をクリック（フォーカス外）したタイミングで停止する
document.addEventListener('click', ev=>{
  if(!cueRowLoopActive) return;
  if(ev.target && ev.target.closest && ev.target.closest('.apply-btn')) return;
  stopAnyEffectLoop();
}, true);

$('#cfxTestBtn').addEventListener('click', ()=>{
  // 要件6.3：再度「テスト」ボタンが押されるとループを停止し、停止した瞬間の画像を表示したまま維持する
  if(cfxLoopActive){
    stopAnyEffectLoop();
    return;
  }
  const no = parseInt($('#cfxCurrentNoInput').value,10);
  const sec = parseFloat($('#cfxTestSecInput').value) || 0.2;
  if(isNaN(no)){ alert('No.を入力してください。'); return; }
  cfxLoopActive = true;
  $('#cfxTestBtn').textContent = '■ 停止';
  const ok = playCustomEffectSequence(no, {intervalSec:sec, useStepSec:false, loop:true});
  if(!ok){
    stopAnyEffectLoop();
    alert(`No.${no} に登録されたステップが見つかりません。`);
  }
});
function renderCustomFxTable(){
  const body = $('#customFxTableBody');
  body.innerHTML='';
  state.customEffects.forEach((e,idx)=>{
    const tr=document.createElement('tr');
    // 追加要望⑬：照明職人用の表を直接クリックして数値（no/step/sec）を手動編集できるようにする
    const NUMERIC_FIELDS = {no:'int', step:'int', sec:'float'};
    ['no','step','sec','colorName','strobeLabel'].forEach(f=>{
      const td=document.createElement('td');
      td.textContent = f==='sec' ? Number(e[f]).toFixed(1) : e[f];
      if(!state.locked && NUMERIC_FIELDS[f]){
        td.contentEditable = 'true';
        td.addEventListener('blur', ()=>{
          const raw = (td.textContent||'').trim();
          let v = NUMERIC_FIELDS[f]==='int' ? parseInt(raw,10) : parseFloat(raw);
          if(f==='sec'){ v = roundSec(raw) || 0.1; }
          if(!isNaN(v)){
            e[f] = v;
            // 要件6.2：no/step編集でフォーカスが外れたタイミングで自動ソート＆重複シフトを実行する
            if(f==='no' || f==='step'){
              sortAndShiftCustomEffects();
              saveState();
              renderCustomFxTable();
              return;
            }
            saveState();
          }
          td.textContent = f==='sec' ? Number(e[f]).toFixed(1) : e[f];
        });
      }
      tr.appendChild(td);
    });
    const applyTd=document.createElement('td');
    const applyBtn=document.createElement('button');
    applyBtn.textContent='反映'; applyBtn.className='apply-btn';
    applyBtn.addEventListener('click', ()=>{ stopAnyEffectLoop(); applyCustomFxToStage(e); });
    applyTd.appendChild(applyBtn);
    tr.appendChild(applyTd);
    const delTd=document.createElement('td');
    if(!state.locked){
      const delBtn=document.createElement('button');
      delBtn.textContent='✕'; delBtn.className='del-btn';
      delBtn.addEventListener('click', ()=>{ state.customEffects.splice(idx,1); renderCustomFxTable(); saveState(); });
      delTd.appendChild(delBtn);
    }
    tr.appendChild(delTd);
    body.appendChild(tr);
  });
}

/* ============================================================
   ステージ状態（暗転/全照/50%）＆ 背景メディア表示（画像 or 動画）
   ============================================================ */
$all('.stage-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    state.stageState = btn.dataset.stage;
    updateStagePreviewMedia();
    saveState();
  });
});

function applyStrobeClasses(){
  const preview = $('#stagePreview');
  const k = currentStrobeKey();
  preview.classList.toggle('strobe-kurukuru', k==='kurukuru');
}

function setMediaWithFade(el, newSrc, afterSet){
  const dur = state.fadeDurationSec || 1;
  if(state.fadeMode==='none'){
    el.style.transition='none';
    el.src = newSrc;
    el.style.opacity=1;
    if(afterSet) afterSet();
    return;
  }
  el.style.transition = `opacity ${dur}s ease`;
  if(state.fadeMode==='out'){
    el.style.opacity=0;
    setTimeout(()=>{
      el.src = newSrc;
      if(afterSet) afterSet();
      requestAnimationFrame(()=>{ el.style.opacity=1; });
    }, dur*1000);
  } else { // 'in'
    el.style.opacity=0;
    el.src = newSrc;
    if(afterSet) afterSet();
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ el.style.opacity=1; }); });
  }
}

function updateStagePreviewMedia(){
  const imgEl = $('#stageBgImg');
  const videoEl = $('#stageBgVideo');

  if(state.stageVideoOverride){
    videoEl.classList.remove('hidden');
    imgEl.classList.add('hidden');
    if(videoEl.src !== state.stageVideoOverride){
      videoEl.src = state.stageVideoOverride;
      videoEl.load && videoEl.load();
      videoEl.play && videoEl.play().catch(()=>{});
    }
    applyColorFilter();
    applyStrobeClasses();
    return;
  }

  // 追加要望⑩：Effectが「照明職人用」で、まだ色（ステップ）が選択されていない状態のときは
  // 「Effectなし」用のプレースホルダー画像を表示する
  if(state.bgColorMode==='on' && state.effectType==='original' && state.effectSubMode==='original' && !currentColorName()){
    const resolved = resolveAsset('stage/choice_backgroundX.jpg');
    videoEl.classList.add('hidden');
    imgEl.onerror = ()=>{ imgEl.classList.add('hidden'); };
    imgEl.onload = ()=>{ imgEl.classList.remove('hidden'); };
    setMediaWithFade(imgEl, resolved, ()=>{ videoEl.classList.add('hidden'); });
    applyColorFilter();
    applyStrobeClasses();
    return;
  }

  if(state.bgColorMode==='on' && currentColorName()){
    // Ver.6.0 要件6.3：Effectが「照明職人用」の場合は常に画像（imgフォルダ）を参照する。
    // 「照明職人用」のステップ切替は高速な静止画切り替えであり、動画（movフォルダ）は使用しない。
    const useVideo = isEffectActive() && !(state.effectType==='original' && state.effectSubMode==='original');
    const folder = 'stage';
    const stageFolder = STAGE_FOLDER[state.stageState];
    const strobeKey = currentStrobeKey();
    const strobeFolder = STROBE_FOLDER[strobeKey];
    const colorName = currentColorName();
    const ext = useVideo ? 'mov' : 'png';
    // 要件③：ストロボ静止／ストロボくるくるは色別ファイルを使わず単一ファイルを参照し、
    // 色は applyColorFilter() のオーバーレイで表現する
    const singleFile = !useVideo && STROBE_SINGLE_FILE[strobeKey];
    const path = singleFile
      ? `${folder}/${stageFolder}/${strobeFolder}/${singleFile}`
      : `${folder}/${stageFolder}/${strobeFolder}/${colorFileName(colorName)}.${ext}`;
    const resolved = resolveAsset(path);

    if(useVideo){
      videoEl.onerror = ()=>{ videoEl.classList.add('hidden'); };
      setMediaWithFade(videoEl, resolved, ()=>{
        videoEl.classList.remove('hidden');
        imgEl.classList.add('hidden');
        videoEl.load && videoEl.load();
        videoEl.play && videoEl.play().catch(()=>{});
      });
    }else{
      imgEl.onerror = ()=>{ imgEl.classList.add('hidden'); };
      imgEl.onload = ()=>{ imgEl.classList.remove('hidden'); };
      setMediaWithFade(imgEl, resolved, ()=>{ videoEl.classList.add('hidden'); });
    }
  }else{
    const map = {anten:'stage/anten.jpg', zensyou:'stage/zensyou.jpg', hansyou:'stage/hansyou.jpg'};
    const path = map[state.stageState];
    const resolved = resolveAsset(path);
    imgEl.onerror = ()=>{
      imgEl.classList.add('hidden');
      $('#stagePreview').style.background = state.stageState==='anten' ? '#000' : state.stageState==='hansyou' ? '#555' : '#ddd';
    };
    imgEl.onload = ()=>{ imgEl.classList.remove('hidden'); };
    setMediaWithFade(imgEl, resolved, ()=>{ videoEl.classList.add('hidden'); });
  }
  applyColorFilter();
  applyStrobeClasses();
}

$('#stageVideoDirectBtn').addEventListener('click', ()=>{
  if(state.stageVideoOverride){
    // 要件⑪：指定中に再度押すと指定を終了する
    state.stageVideoOverride = '';
    $('#stageVideoDirectBtn').classList.remove('active-highlight');
    updateStagePreviewMedia();
    saveState();
  }else{
    $('#stageVideoInput').click();
  }
});
$('#stageVideoInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  state.stageVideoOverride = URL.createObjectURL(file);
  $('#stageVideoDirectBtn').classList.add('active-highlight');
  updateStagePreviewMedia();
  saveState();
});

/* ============================================================
   ステージアイテム（ドラッグ&ドロップ配置）
   ============================================================ */
$('#stageItemInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    state.stageItems.push({id:uid(), src:ev.target.result, x:20, y:20});
    renderStageItems();
    saveState();
  };
  reader.readAsDataURL(file);
});

/* 要件⑭：ドラッグ&ドロップの代わりに「タップ（クリック）して選択→移動先をタップ」で配置する方式。
   スマホのスクロール操作と競合せず、PC・スマホのどちらでも同じ操作感で快適に動かせる。 */
let selectedStageItemId = null;
// Ver.6.0 要件4.4：既存のタップ配置に加えて、ドラッグ＆ドロップでも配置できるようにする
// （互換性を保つため、既存のクリック配置・選択機能はそのまま維持する）
let dragStageItemState = null;

function renderStageItems(){
  const layer = $('#stageItemsLayer');
  layer.innerHTML='';
  state.stageItems.forEach(item=>{
    const el = document.createElement('div');
    el.className='stage-item' + (item.id===selectedStageItemId ? ' selected' : '');
    el.style.left = item.x+'px';
    el.style.top = item.y+'px';
    el.dataset.itemId = item.id;
    const img = document.createElement('img');
    img.src = item.src;
    el.appendChild(img);
    if(item.id===selectedStageItemId && !state.locked){
      const removeBtn = document.createElement('button');
      removeBtn.className='stage-item-remove-btn';
      removeBtn.textContent='✖';
      removeBtn.title='このアイテムを削除';
      removeBtn.addEventListener('click', ev=>{
        ev.stopPropagation();
        state.stageItems = state.stageItems.filter(i=>i.id!==item.id);
        if(selectedStageItemId===item.id) selectedStageItemId=null;
        renderStageItems();
        saveState();
      });
      el.appendChild(removeBtn);
    }
    el.addEventListener('click', e=>{
      if(state.locked) return;
      e.stopPropagation();
      selectedStageItemId = (selectedStageItemId===item.id) ? null : item.id;
      renderStageItems();
      updateStagePreviewSelectingClass();
    });
    if(!state.locked){
      el.draggable = true;
      el.addEventListener('dragstart', ev=>{
        const rect = el.getBoundingClientRect();
        dragStageItemState = {
          id: item.id,
          offsetX: (ev.clientX!=null ? ev.clientX : rect.left) - rect.left,
          offsetY: (ev.clientY!=null ? ev.clientY : rect.top) - rect.top
        };
        el.classList.add('dragging');
        if(ev.dataTransfer){
          try{ ev.dataTransfer.setData('text/plain', item.id); }catch(err){}
          ev.dataTransfer.effectAllowed = 'move';
        }
      });
      el.addEventListener('dragend', ()=>{
        el.classList.remove('dragging');
        dragStageItemState = null;
        $('#stagePreview').classList.remove('dragover-active');
      });
    }
    layer.appendChild(el);
  });
  updateStagePreviewSelectingClass();
}
function updateStagePreviewSelectingClass(){
  $('#stagePreview').classList.toggle('item-selecting', !!selectedStageItemId);
}
$('#stagePreview').addEventListener('click', e=>{
  if(state.locked || !selectedStageItemId) return;
  if(e.target.closest('.stage-item')) return; // アイテム自体のタップは選択切替（上のハンドラ）に任せる
  const item = state.stageItems.find(i=>i.id===selectedStageItemId);
  if(!item) return;
  const rect = $('#stagePreview').getBoundingClientRect();
  const itemSize = 60; // .stage-item の width/height と合わせる
  item.x = e.clientX - rect.left - itemSize/2;
  item.y = e.clientY - rect.top - itemSize/2;
  renderStageItems();
  saveState();
});
// Ver.6.0 要件4.4：ドラッグ＆ドロップによる配置（既存のタップ配置と共存）
$('#stagePreview').addEventListener('dragover', e=>{
  if(state.locked || !dragStageItemState) return;
  e.preventDefault();
  if(e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  $('#stagePreview').classList.add('dragover-active');
});
$('#stagePreview').addEventListener('dragleave', e=>{
  if(e.target===$('#stagePreview')) $('#stagePreview').classList.remove('dragover-active');
});
$('#stagePreview').addEventListener('drop', e=>{
  $('#stagePreview').classList.remove('dragover-active');
  if(state.locked || !dragStageItemState) return;
  e.preventDefault();
  const item = state.stageItems.find(i=>i.id===dragStageItemState.id);
  if(!item){ dragStageItemState=null; return; }
  const rect = $('#stagePreview').getBoundingClientRect();
  item.x = e.clientX - rect.left - dragStageItemState.offsetX;
  item.y = e.clientY - rect.top - dragStageItemState.offsetY;
  dragStageItemState = null;
  renderStageItems();
  saveState();
});

/* ============================================================
   動画再生 & Cue記録
   ============================================================ */
const video = $('#rehearsalVideo');
$('#videoInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    // 追加要望⑦：動画タブの動画もdata URLとしてstateに保存し、ZIP出力/読込・再読込後も保持する
    state.rehearsalVideoSrc = ev.target.result;
    video.src = state.rehearsalVideoSrc;
    saveState();
  };
  reader.readAsDataURL(file);
});
video.addEventListener('timeupdate', ()=>{
  $('#currentVideoTime').textContent = video.currentTime.toFixed(1)+'秒';
});

function currentTimeSource(){
  const videoLoaded = !!state.rehearsalVideoSrc;
  // ①再生中の動画があれば動画の秒数
  if(videoLoaded && !video.paused && !video.ended) return video.currentTime;
  // ②再生中の音源トラック
  const playingTrack = Object.values(audioTrackEls).find(t=>t.audioEl && !t.audioEl.paused && !t.audioEl.ended);
  if(playingTrack) return playingTrack.audioEl.currentTime;
  // ③ state.currentAudioTrackId の音源トラック
  if(state.currentAudioTrackId && audioTrackEls[state.currentAudioTrackId] && audioTrackEls[state.currentAudioTrackId].audioEl){
    return audioTrackEls[state.currentAudioTrackId].audioEl.currentTime;
  }
  // ④音源が1つも無い場合：動画があれば動画の秒数、無ければ'-'
  if(!(state.audioSources && state.audioSources.length)) return videoLoaded ? video.currentTime : '-';
  // 音源はあるが再生中・選択中トラックが特定できない場合：動画があれば動画の秒数、無ければ'-'
  return videoLoaded ? video.currentTime : '-';
}
function currentLineText(){
  // Ver.6.0 要件3.2：読み上げ動作中は、現在（または直前）に読み上げている行を
  // Cue一覧の「セリフ」欄に自動反映する。読み上げ中でない場合は従来どおり選択範囲を使う。
  if(isReading && currentReadingLineFullText) return currentReadingLineFullText;
  const sel = window.getSelection();
  if(sel && sel.toString().trim().length>0) return sel.toString().trim();
  return '';
}
// 要件⑦：Cue一覧の並び順に沿って Fader 列へ 1→2→…→9→0 を再割当てする
function reassignFaderFrom(startIndex, startDigit){
  let cursor = startDigit ? DIGIT_CYCLE.indexOf(startDigit) : 0;
  if(cursor<0) cursor = 0;
  for(let i=startIndex;i<state.cues.length;i++){
    state.cues[i].fader = DIGIT_CYCLE[cursor % DIGIT_CYCLE.length];
    cursor++;
  }
}

function recordCue(sec, source){
  const strobeKey = currentStrobeKey();
  const strobeLabel = (state.effectType==='none' || !state.effectType)
    ? (strobeKey==='static' ? '◯' : 'なし')
    : (STROBE_LABEL_CUE[strobeKey] || 'なし');
  // 追加要望⑥：Effectが「照明職人用」の場合は◯ではなく、その時点の「No.」を保存する。
  // 保存後、次回の記録に備えてNo.を1つ増加させる（追加要望④）。
  let effectMark = '';
  if(state.effectType==='original'){
    if(state.effectSubMode==='original'){
      // Ver.8.0：Effectタブで使用中のNo.と重なる場合は空き番号を使い、Cue一覧のEffect列にもその番号を表示する。
      // 使用したNo.のEffectタブ項目（空欄）を用意し、Effectタブの表示もそのNo.へ切り替える。
      const usedNo = nextBlankEffectNo(state.cfxCurrentNo || 1);
      effectMark = String(usedNo);
      ensureEffectEntry(usedNo);
      state.effectNo = usedNo;
      // Ver.8.1 §9-2：Cue記録でNo.が確定したら、同一サイクル用の自己所有Noをリセットする
      state.cfxOwnedNo = null;
      state.cfxCurrentNo = nextBlankEffectNo(usedNo + 1);
      syncCfxNoInputs();
      // Ver.6.0 要件6.1：Cue記録時、No.は+1、ステップは1へリセットする。
      // それまでに編集中だった別ステップ・別パラメータのデータ（state.customEffects）は破棄せず保持する。
      $('#cfxStep').value = 1;
    }else if(state.effectSubMode==='existing'){
      effectMark = '◯';
    }
  }
  const stageLabelMap = {anten:'暗転', zensyou:'全照', hansyou:'半照'};
  const secStr = (sec==='-' || sec==null) ? '-' : (typeof sec==='number' ? sec.toFixed(1) : (isNaN(parseFloat(sec)) ? '-' : parseFloat(sec).toFixed(1)));
  const cue = {
    id: uid(),
    sec: secStr,
    line: currentLineText(),
    audio: state.currentAudioLabel || '-',
    stage: stageLabelMap[state.stageState] || state.stageState,
    bg: currentColorName() || '',
    effect: effectMark,
    strobe: strobeLabel,
    fade: FADE_LABEL[state.fadeMode] || 'フェードなし',
    fader: '1',
    source: source || 'cue',
    // 要件⑬：反映で画像配置も復元できるよう、記録時点の配置アイテムをスナップショットとして保持する
    // （一覧の表示項目には出さない隠しデータ）
    stageItemsSnapshot: JSON.parse(JSON.stringify(state.stageItems||[]))
  };
  // 追加実装：Cue記録ではSubへの自動保存を行わない（Sub反映は「データを保存」ボタンへ移動）
  state.cues.push(cue);
  // Ver.8.1 §7-2：数値の行は昇順、'-'（未確定）の行はその後ろに挿入順のまま並べる（NaN比較を避ける）
  state.cues.sort((a,b)=>{
    const av = parseFloat(a.sec), bv = parseFloat(b.sec);
    const aNan = isNaN(av), bNan = isNaN(bv);
    if(aNan && bNan) return 0;
    if(aNan) return 1;
    if(bNan) return -1;
    return av-bv;
  });
  reassignFaderFrom(0);
  renderCueTable();
  saveState();
}
$('#videoCueBtn').addEventListener('click', ()=> recordCue(state.rehearsalVideoSrc ? video.currentTime : '-', 'video'));
$('#scriptCueBtn').addEventListener('click', ()=> recordCue(currentTimeSource(), 'script'));
$('#cueTabAddBtn').addEventListener('click', ()=> recordCue(currentTimeSource(), 'cue'));

/* ---------- Cue/独自Effect一覧の内容をステージ画面へ上書き反映（要件⑤） ---------- */
function applyCueToStage(cue){
  const stageRevMap = {'暗転':'anten','全照':'zensyou','半照':'hansyou'};
  if(stageRevMap[cue.stage]) state.stageState = stageRevMap[cue.stage];

  if(state.bgColorMode==='on'){
    if(cue.bg){
      const idx = COLOR_PALETTE.findIndex(c=>c.name===cue.bg);
      state.activeColorIndex = idx>=0 ? idx : null;
    }else{
      state.activeColorIndex = null;
    }
    if(state.effectType==='none'){
      state.strobeOn = (normalizeStrobeLabel(cue.strobe)==='◯');
    }else{
      const revKey = Object.keys(STROBE_LABEL_CUE).find(k=>STROBE_LABEL_CUE[k]===normalizeStrobeLabel(cue.strobe));
      state.strobeMode = revKey || 'none';
    }
    if(state.effectType==='existing'){
      state.effectOn = !!cue.effect;
    }else if(state.effectType==='original'){
      state.effectSubMode = cue.effect ? 'original' : 'none';
      // 追加要望⑫：Effect欄にNo.（数字）が記録されている場合、そのNo.に登録済みの
      // ステップ列を、各ステップに記録された秒数どおりに高速で順送り再生する
      // Ver.7.0 要件3.3：単発再生ではなくループ再生とし、他行の反映が押されるまで
      // 排他的に再生し続ける
      const cueNo = parseInt(cue.effect, 10);
      if(cue.effect && !isNaN(cueNo)){
        startCueRowEffectLoop(cueNo, {useStepSec:true});
      }else{
        stopAnyEffectLoop();
      }
    }
  }
  const revFadeKey = Object.keys(FADE_LABEL).find(k=>FADE_LABEL[k]===cue.fade);
  state.fadeMode = revFadeKey || 'none';

  // 要件⑬：反映時に配置アイテム（画像配置）も一緒に復元する（一覧には表示しない隠しデータ）
  if(Array.isArray(cue.stageItemsSnapshot)){
    state.stageItems = JSON.parse(JSON.stringify(cue.stageItemsSnapshot));
    selectedStageItemId = null;
    renderStageItems();
  }

  renderColorToggles();
  updateStrobeUI();
  updateEffectUI();
  updateFadeUI();
  updateStagePreviewMedia();
  saveState();
}
function applyCustomFxToStage(fx){
  if(state.bgColorMode==='on'){
    const idx = COLOR_PALETTE.findIndex(c=>c.name===fx.colorName);
    state.activeColorIndex = idx>=0 ? idx : null;
    if(state.effectType!=='none'){
      const revKey = Object.keys(STROBE_LABEL_CUE).find(k=>STROBE_LABEL_CUE[k]===normalizeStrobeLabel(fx.strobeLabel));
      state.strobeMode = revKey || 'none';
    }
  }
  renderColorToggles();
  updateStrobeUI();
  updateStagePreviewMedia();
  saveState();
}

const CUE_TBODY_IDS = ['cueTableBody_script','cueTableBody_video','cueTableBody_cue'];
// Ver.7.0 要件3.2：列の並び順を「順番/秒数/音源/セリフ/舞台/背景/Effect/ストロボ/フェード/反映/✖️」に変更
const CUE_FIELDS = ['sec','audio','line','stage','bg','effect','strobe','fade'];
const FADER_HEADER_IDS = {cueTableBody_script:'faderHeader_script', cueTableBody_video:'faderHeader_video', cueTableBody_cue:'faderHeader_cue'};

// 追加要望③：ログインしていない場合、Fader列は「順番」列（並び替え用の通常の数字）になる
function ensureOrderNums(){
  let changed=false;
  state.cues.forEach((c,i)=>{ if(c.orderNum==null){ c.orderNum=i+1; changed=true; } });
  if(changed) saveState();
}
function applyOrderNumChange(cue, newVal){
  cue.orderNum = newVal;
  let safety=0, dup;
  while((dup = state.cues.find(o=>o!==cue && o.orderNum===cue.orderNum)) && safety<200){
    dup.orderNum = dup.orderNum + 1;
    safety++;
  }
  state.cues.sort((a,b)=>(a.orderNum||0)-(b.orderNum||0));
}

// 追加要望⑤：本番モードでのCue反映状況（グレー表示済みか）の管理
function ensureCueIds(){ state.cues.forEach(c=>{ if(!c.id) c.id = uid(); }); }
function resetGameReflection(){ gameReflectedIds = new Set(); renderCueTable(); }
function isReflected(cue){ return !!(cue.id && gameReflectedIds.has(cue.id)); }
function markReflected(cue){ if(cue.id) gameReflectedIds.add(cue.id); }
function findNextCueByDigit(key){
  ensureCueIds();
  return state.cues.find(c=> !isReflected(c) && c.fader===key);
}
function findNextCueAny(){
  ensureCueIds();
  return state.cues.find(c=> !isReflected(c));
}
function reflectCueForGame(cue){
  if(!cue) return;
  applyCueToStage(cue);
  markReflected(cue);
  renderCueTable();
}

function renderCueTable(){
  ensureCueIds();
  // 表示前に、fader未設定の行があれば連番を振っておく
  if(state.cues.some(c=>!c.fader)) reassignFaderFrom(0);
  if(!state.loggedIn) ensureOrderNums();

  CUE_TBODY_IDS.forEach(id=>{
    const body = document.getElementById(id);
    if(!body) return;

    // 追加要望③：ログイン状態に応じてヘッダー表示を「Fader」⇔「順番」に切り替える
    const headerEl = document.getElementById(FADER_HEADER_IDS[id]);
    if(headerEl) headerEl.textContent = state.loggedIn ? 'Fader' : '順番';

    body.innerHTML='';
    state.cues.forEach((c,idx)=>{
      const tr = document.createElement('tr');
      tr.className='cue-row';
      // 追加要望⑤：本番モードで反映済みの行はグレー表示にする
      if(state.locked && isReflected(c)) tr.classList.add('cue-row-reflected');

      // 追加要望②③：本番モード中は編集不可。ログインしていない場合は「順番」として
      // 編集可能な連番にし、編集後は自動で並び替え・重複時は既存側を+1する。
      const faderTd = document.createElement('td');
      faderTd.className = 'fader-cell';
      if(state.locked){
        faderTd.textContent = c.fader || '';
        faderTd.contentEditable = 'false';
      }else if(state.loggedIn){
        faderTd.textContent = c.fader || '';
        faderTd.contentEditable = 'true';
        faderTd.addEventListener('blur', ()=>{
          const v = (faderTd.textContent||'').trim();
          if(DIGIT_CYCLE.includes(v)){
            reassignFaderFrom(idx, v);
            renderCueTable();
            saveState();
          }else{
            faderTd.textContent = c.fader || '';
          }
        });
      }else{
        faderTd.textContent = c.orderNum!=null ? String(c.orderNum) : String(idx+1);
        faderTd.contentEditable = 'true';
        faderTd.addEventListener('blur', ()=>{
          const v = parseInt((faderTd.textContent||'').trim(),10);
          if(!isNaN(v) && v>0){
            applyOrderNumChange(c, v);
            renderCueTable();
            saveState();
          }else{
            faderTd.textContent = c.orderNum!=null ? String(c.orderNum) : String(idx+1);
          }
        });
      }
      tr.appendChild(faderTd);

      CUE_FIELDS.forEach(f=>{
        const td = document.createElement('td');
        // Ver.8.0：ログアウト時はストロボの「Effect1」を「くるくる」と表示（ログイン時はEffect1のまま）
        td.textContent = (f==='strobe') ? strobeDisplayLabel(c[f]) : c[f];
        // Ver.7.0 要件3.1：セリフ列は1行固定表示＋はみ出し部分を省略記号にし、
        // ホバー時にツールチップで全文を表示する
        if(f==='line'){
          td.classList.add('cue-line-cell');
          td.title = c[f] || '';
        }
        if(!state.locked){
          td.contentEditable = 'true';
          td.addEventListener('blur', ()=>{
            let v = td.textContent;
            if(f==='strobe'){ v = normalizeStrobeLabel(v); td.textContent = strobeDisplayLabel(v); }
            c[f] = v;
            if(f==='line') td.title = td.textContent || '';
            // Ver.8.0：舞台・背景・Effect・ストロボの編集は、Subの自動保存データにも反映する
            if(f==='stage' || f==='bg' || f==='effect' || f==='strobe') updateSubForCue(c);
            saveState();
          });
        }
        tr.appendChild(td);
      });
      const applyTd = document.createElement('td');
      const applyBtn = document.createElement('button');
      applyBtn.textContent='反映'; applyBtn.className='apply-btn';
      applyBtn.addEventListener('click', ev=>{
        ev.stopPropagation();
        if(state.locked){ reflectCueForGame(c); return; }
        // Ver.7.0 要件3.3：同じ行の「反映」を再度押した場合はループ再生を停止する（トグル）
        const cueNo = parseInt(c.effect, 10);
        const isEffectRow = state.effectType==='original' && c.effect && !isNaN(cueNo);
        if(isEffectRow && cueRowLoopActive && cueRowLoopNo===cueNo){
          stopAnyEffectLoop();
          return;
        }
        applyCueToStage(c);
      });
      applyTd.appendChild(applyBtn);
      tr.appendChild(applyTd);
      const delTd = document.createElement('td');
      if(!state.locked){
        const delBtn = document.createElement('button');
        delBtn.textContent='✕'; delBtn.className='del-btn';
        delBtn.addEventListener('click', ev=>{ ev.stopPropagation(); clearSubForCue(c); state.cues.splice(idx,1); reassignFaderFrom(0); renderCueTable(); saveState(); });
        delTd.appendChild(delBtn);
      }
      tr.appendChild(delTd);
      tr.addEventListener('click', ()=>{
        // 追加要望⑤：本番モード中は行クリックでそのCueを反映（グレー行も再反映可能）
        if(state.locked){ reflectCueForGame(c); }
        else if(c.sec!=='-' && !isNaN(parseFloat(c.sec))){ video.currentTime = parseFloat(c.sec); }
      });
      body.appendChild(tr);
    });
  });
  renderInputModeTable();   // Ver.8.0：「その他＞入力モード」の表も同期する
}

/* ============================================================
   CSV出力／入力（Ver.8.1 §1：方法選択に対応）
   ============================================================ */
const CSV_METHOD_HINTS = {
  sheet: 'Cue一覧をCSVファイル（UTF-8 BOM付き）として出力します。「CSV入力」でCue一覧をCSVの内容に置き換えられます（列の順番が違っても、ヘッダー名で自動的に対応付けます）。',
  sub: 'データ管理＞Subの内容を、照明卓書き込み用のCSV（UTF-8 BOM付き・60列固定）として出力します。入力（読込）はスプレッドシート用のみ対応しています。',
  effect: 'データ管理＞Effectの内容を、照明卓書き込み用のCSV（UTF-8 BOM付き・60列固定）として出力します。入力（読込）はスプレッドシート用のみ対応しています。'
};
function updateCsvMethodUI(){
  const method = $('#csvMethodSelect').value;
  $('#csvMethodHint').textContent = CSV_METHOD_HINTS[method] || '';
  const importBtn = $('#importCsvBtn');
  importBtn.disabled = (method!=='sheet');
  importBtn.title = (method!=='sheet') ? 'スプレッドシート用のみ対応しています' : '';
}
$('#csvMethodSelect').addEventListener('change', updateCsvMethodUI);
updateCsvMethodUI();

function csvEscapeField(v){
  const s = String(v==null ? '' : v);
  if(/[",\r\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
function rowsToCsv(rows){
  return rows.map(r=> r.map(csvEscapeField).join(',')).join('\r\n') + '\r\n';
}
function downloadCsvText(filename, csvText){
  const bom = new Uint8Array([0xEF,0xBB,0xBF]);
  const blob = new Blob([bom, csvText], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

/* ---------- スプレッドシート用 CSV 出力 ---------- */
function exportSheetCsv(){
  // Ver.7.0 要件3.2：CSV出力もCue一覧の列順（順番/秒数/音源/セリフ/…）に合わせる
  const headers = ['Fader','秒数','音源','セリフ','舞台','背景','Effect','ストロボ','フェード'];
  const rows = state.cues.map(c=>[c.fader,c.sec,c.audio,c.line,c.stage,c.bg,c.effect,c.strobe,c.fade]);
  let csv = headers.join(',') + '\n';
  rows.forEach(r=>{
    csv += r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',') + '\n';
  });
  const bom = new Uint8Array([0xEF,0xBB,0xBF]);
  const blob = new Blob([bom, csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stage_cue_sheet.csv';
  a.click();
}

/* ---------- スプレッドシート用 CSV 入力（RFC4180準拠パーサ） ---------- */
function parseCsvText(text){
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', i = 0;
  let inQuotes = false;
  const len = text.length;
  while(i<len){
    const ch = text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){ field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }else{
      if(ch === '"'){ inQuotes = true; i++; continue; }
      if(ch === ','){ row.push(field); field = ''; i++; continue; }
      if(ch === '\r'){
        if(text[i+1] === '\n') i++;
        row.push(field); field = ''; rows.push(row); row = []; i++; continue;
      }
      if(ch === '\n'){ row.push(field); field = ''; rows.push(row); row = []; i++; continue; }
      field += ch; i++; continue;
    }
  }
  if(field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length===1 && String(r[0]).trim()===''));
}
const CSV_HEADER_MAP = {'Fader':'fader','秒数':'sec','音源':'audio','セリフ':'line','舞台':'stage','背景':'bg','Effect':'effect','ストロボ':'strobe','フェード':'fade'};
function normalizeEffectImportValue(v){
  const s = String(v==null ? '' : v).trim();
  return s==='〇' ? '◯' : s;
}
function importSheetCsv(text){
  const rows = parseCsvText(text);
  if(!rows.length){ alert('CSVにデータがありません。'); return; }
  const header = rows[0].map(h=>String(h||'').trim());
  const colIdx = {};
  header.forEach((h,i)=>{ const f = CSV_HEADER_MAP[h]; if(f) colIdx[f] = i; });
  if(!Object.keys(colIdx).length){ alert('既知のヘッダーが見つかりませんでした。'); return; }
  const dataRows = rows.slice(1).filter(r => r.some(c => String(c||'').trim()!==''));
  if(!confirm(`Cue一覧をCSVの内容（${dataRows.length}件）で置き換えます。よろしいですか？`)) return;
  const get = (r,f)=> colIdx[f]!=null ? (r[colIdx[f]] || '') : '';
  state.cues = dataRows.map(r=>({
    id: uid(),
    fader: get(r,'fader') || '',
    sec: get(r,'sec') || '',
    audio: get(r,'audio') || '-',
    line: get(r,'line') || '',
    stage: get(r,'stage') || '',
    bg: get(r,'bg') || '',
    effect: get(r,'effect') ? normalizeEffectImportValue(get(r,'effect')) : '',
    strobe: normalizeStrobeLabel(get(r,'strobe')),
    fade: get(r,'fade') || 'フェードなし'
  }));
  reassignFaderFrom(0);
  state.cues.forEach((c,i)=>{ c.orderNum = i+1; });
  resetGameReflection();
  renderCueTable();
  saveState();
}
$('#importCsvBtn').addEventListener('click', ()=>{
  if($('#csvMethodSelect').value!=='sheet') return;
  $('#importCsvInput').click();
});
$('#importCsvInput').addEventListener('change', e=>{
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    try{ importSheetCsv(String(ev.target.result)); }
    catch(err){ alert('CSVの読み込みに失敗しました。'); }
  };
  reader.readAsText(file, 'utf-8');
});

/* ---------- 照明卓書き込み用 CSV（SUB／Effect）：60列固定・10行1ブロック ---------- */
function makeRow60(){ return new Array(60).fill(''); }
// 未指定=FLと指定あり=数値を区別できるフェーダートークン解析（§10-3）
function parseFaderTokens(text){
  const map = new Map(); // ch -> レベル(number)|null(FL)
  normalizeFaderText(text).split(/[、,，\s\/・]+/).filter(Boolean).forEach(tok=>{
    if(/^Effect\d+$/i.test(tok)) return; // EffectN トークンは変換行に反映しない
    const m = /^(\d+)(?:〜(\d+))?(?:\((\d+(?:\.\d+)?)%?\))?$/.exec(tok);
    if(!m) return;
    let a = parseInt(m[1],10), b = m[2] ? parseInt(m[2],10) : a;
    const lv = m[3]!=null ? Math.max(0, Math.min(100, Math.round(parseFloat(m[3])))) : null;
    if(a>b){ const t=a; a=b; b=t; }
    const cmp = v => (v==null ? 100 : v); // 重複時はレベルの大きい方を採用（FL=100として比較）
    for(let ch=a; ch<=b; ch++){
      if(ch>=1 && ch<=60){
        if(!map.has(ch) || cmp(lv) > cmp(map.get(ch))) map.set(ch, lv);
      }
    }
  });
  return map;
}
function buildFaderDisplayRow(fadersText){
  const row = makeRow60();
  parseFaderTokens(fadersText||'').forEach((lv,ch)=>{ row[ch-1] = (lv==null) ? 'FL' : String(lv); });
  return row;
}
function buildConsoleBlockRows(headerCells){
  // headerCells: [[col(1始まり), value], ...]
  const rows = [];
  const r1 = makeRow60();
  headerCells.forEach(([col,val])=>{ r1[col-1] = val; });
  rows.push(r1);
  const r2 = makeRow60();
  for(let c=1;c<=60;c++) r2[c-1] = String(c);
  rows.push(r2);
  rows.push(buildFaderDisplayRow(headerCells.fadersText||''));
  for(let i=0;i<6;i++) rows.push(makeRow60());
  rows.push(new Array(60).fill('ー'));
  return rows;
}
function subEffectiveNos(){
  return Object.keys(state.subPages).map(k=>parseInt(k,10)).filter(no=>!isNaN(no) && subPageHasData(no)).sort((a,b)=>a-b);
}
function exportSubConsoleCsv(){
  const nos = subEffectiveNos();
  if(!nos.length){ alert('データ管理＞Subにデータがありません。'); return; }
  const allRows = [];
  nos.forEach(no=>{
    const rows = ensureSubPage(no);
    for(let id=1; id<=20; id++){
      const r = rows[id-1] || {name:'',faders:'',effect:''};
      const headerCells = [
        [1,'NO.'],[2,String(no)],
        [4,'ID'],[5,String(id)],
        [7,'effect'],[8, r.effect||''],
        [10,'名称'],[11, r.name||''],
        [29,'フェーダー番号'],[30, r.faders||'']
      ];
      headerCells.fadersText = r.faders||'';
      buildConsoleBlockRows(headerCells).forEach(row=>allRows.push(row));
    }
  });
  downloadCsvText('stage_sub_console.csv', rowsToCsv(allRows));
}
function effectDataNos(){
  return Object.keys(state.effectData).map(k=>parseInt(k,10)).filter(no=>!isNaN(no) && effectEntryOccupied(no)).sort((a,b)=>a-b);
}
// Ver.8.1 §9-1：組み合わせ表示用にストロボ値を人が読みやすいラベルへ変換する（例: ◯→ストロボ）
function effectComboStrobeLabel(v){
  return {'◯':'ストロボ', 'Effect1':'くるくる', 'Effect2':'独立', 'なし':'なし'}[v] || (v||'なし');
}
function comboLabelForEffectStep(s){
  if(!s || !s.bg) return '';
  return `${s.bg}＋${effectComboStrobeLabel(s.strobe)}`;
}
function exportEffectConsoleCsv(){
  const nos = effectDataNos();
  if(!nos.length){ alert('データ管理＞Effectにデータがありません。'); return; }
  const allRows = [];
  nos.forEach(no=>{
    const e = state.effectData[String(no)] || {name:'',steps:[]};
    const stepCount = (e.steps||[]).length;
    const blockCount = stepCount<=20 ? 20 : Math.ceil(stepCount/20)*20;
    for(let step=1; step<=blockCount; step++){
      const s = (e.steps||[])[step-1] || null;
      const secVal = s ? Number(s.sec||0).toFixed(1) : '';
      const name = (e.name||'').trim() || comboLabelForEffectStep(s);
      const fadersText = s ? (s.faders||'') : '';
      const headerCells = [
        [1,'NO.'],[2,String(no)],
        [4,'ID'],[5,String(step)],
        [7,'秒数'],[8, secVal],
        [10,'名称'],[11, name],
        [27,'フェーダー番号'],[28, fadersText]
      ];
      headerCells.fadersText = fadersText;
      buildConsoleBlockRows(headerCells).forEach(row=>allRows.push(row));
    }
  });
  downloadCsvText('stage_effect_console.csv', rowsToCsv(allRows));
}

$('#exportCsvBtn').addEventListener('click', ()=>{
  const method = $('#csvMethodSelect').value;
  if(method==='sub') exportSubConsoleCsv();
  else if(method==='effect') exportEffectConsoleCsv();
  else exportSheetCsv();
  $('#settingsMenu').classList.add('hidden');
});

/* ============================================================
   要件⑤⑫：ZIP エクスポート / インポート
   （音源・動画・配置アイテム画像などのバイナリデータも、その時点のデータベース上の
   　情報としてまとめて1つのZIPファイルに出力／復元できるようにする）
   ============================================================ */
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
async function externalizeToZip(zip, counterRef, url, hintExt){
  if(!url || typeof url!=='string') return url;
  if(!(url.startsWith('data:') || url.startsWith('blob:'))) return url; // 既存の相対パス等はそのまま
  try{
    const blob = await (await fetch(url)).blob();
    counterRef.n++;
    let ext = hintExt;
    if(!ext){
      const m = /data:[^;]+\/([a-zA-Z0-9.+-]+)/.exec(url);
      ext = m ? m[1].split('+')[0] : 'bin';
    }
    const name = `asset_${counterRef.n}.${ext}`;
    zip.file('assets/'+name, blob);
    return 'zipasset:assets/'+name;
  }catch(e){
    console.warn('アセットの同梱に失敗しました', e);
    return url;
  }
}
async function exportStateAsZip(){
  if(!window.JSZip){ alert('ZIP機能の読み込みに失敗しました（lib/jszip.min.js）。'); return; }
  const zip = new JSZip();
  const cloned = JSON.parse(JSON.stringify(state));
  const counterRef = {n:0};

  // 管理者アセット（img/xxx.png 等）は本来のパスのままZIPへ同梱する
  const adminPaths = Object.keys(state.adminAssets||{});
  for(const path of adminPaths){
    try{
      const blob = await (await fetch(state.adminAssets[path])).blob();
      zip.file(path, blob);
    }catch(e){ console.warn('管理者アセットの同梱に失敗', path, e); }
  }
  cloned.adminAssets = {};
  cloned._adminAssetPaths = adminPaths;

  for(const item of (cloned.stageItems||[])){
    item.src = await externalizeToZip(zip, counterRef, item.src, 'png');
  }
  for(const cue of (cloned.cues||[])){
    if(Array.isArray(cue.stageItemsSnapshot)){
      for(const item of cue.stageItemsSnapshot){
        item.src = await externalizeToZip(zip, counterRef, item.src, 'png');
      }
    }
  }
  for(const track of (cloned.audioSources||[])){
    track.src = await externalizeToZip(zip, counterRef, track.src, 'mp3');
  }
  cloned.stageVideoOverride = await externalizeToZip(zip, counterRef, cloned.stageVideoOverride, 'mp4');
  // 追加要望⑦：動画タブの動画もZIPに同梱する
  cloned.rehearsalVideoSrc = await externalizeToZip(zip, counterRef, cloned.rehearsalVideoSrc, 'mp4');

  zip.file('data.json', JSON.stringify(cloned, null, 2));
  const blob = await zip.generateAsync({type:'blob'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'stage_planner_data.zip';
  a.click();
}
async function resolveZipAsset(zip, marker){
  if(typeof marker!=='string' || !marker.startsWith('zipasset:')) return marker;
  const path = marker.slice('zipasset:'.length);
  const f = zip.file(path);
  if(!f) return marker;
  const blob = await f.async('blob');
  return await blobToDataUrl(blob);
}
async function importStateFromZip(file){
  if(!window.JSZip){ alert('ZIP機能の読み込みに失敗しました（lib/jszip.min.js）。'); return; }
  const zip = await JSZip.loadAsync(file);
  const dataFile = zip.file('data.json');
  if(!dataFile){ alert('ZIP内にdata.jsonが見つかりません。'); return; }
  const json = JSON.parse(await dataFile.async('string'));

  for(const item of (json.stageItems||[])) item.src = await resolveZipAsset(zip, item.src);
  for(const cue of (json.cues||[])){
    if(Array.isArray(cue.stageItemsSnapshot)){
      for(const item of cue.stageItemsSnapshot) item.src = await resolveZipAsset(zip, item.src);
    }
  }
  for(const track of (json.audioSources||[])) track.src = await resolveZipAsset(zip, track.src);
  json.stageVideoOverride = await resolveZipAsset(zip, json.stageVideoOverride);
  // 追加要望⑦：動画タブの動画を復元する
  json.rehearsalVideoSrc = await resolveZipAsset(zip, json.rehearsalVideoSrc);

  json.adminAssets = json.adminAssets || {};
  const paths = json._adminAssetPaths || [];
  for(const path of paths){
    const f = zip.file(path);
    if(f){
      const blob = await f.async('blob');
      json.adminAssets[path] = await blobToDataUrl(blob);
    }
  }
  delete json._adminAssetPaths;

  state = Object.assign(state, json);
  state.cfxOwnedNo = null;   // Ver.8.1 §9-2：ZIP読込時も自己所有Noをリセット
  applyAllSettingsToUI();
  saveState();
  alert('読み込みが完了しました。');
}
$('#exportJsonBtn').addEventListener('click', ()=>{
  exportStateAsZip().catch(err=>alert('ZIP出力に失敗しました: '+err.message));
});
$('#importJsonInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  importStateFromZip(file).catch(err=>alert('ZIPの読み込みに失敗しました: '+err.message));
  e.target.value='';
});

/* ============================================================
   印刷 / PDF
   ============================================================ */
$('#printBtn').addEventListener('click', ()=>{
  const printArea = $('#printArea');
  printArea.innerHTML = `<h1>台本・キューシート</h1>` + scriptEditor.innerHTML +
    `<h2>キューシート一覧</h2>` +
    `<table border="1" style="width:100%;border-collapse:collapse;">
      <tr><th>Fader</th><th>秒数</th><th>音源</th><th>セリフ</th><th>舞台</th><th>背景</th><th>Effect</th><th>ストロボ</th><th>フェード</th></tr>
      ${state.cues.map(c=>`<tr><td>${c.fader||''}</td><td>${c.sec}</td><td>${c.audio}</td><td>${c.line}</td><td>${c.stage}</td><td>${c.bg}</td><td>${c.effect}</td><td>${c.strobe}</td><td>${c.fade}</td></tr>`).join('')}
    </table>`;
  window.print();
});

/* ============================================================
   追加要望①②⑤：本番モード
   Cue一覧で反映する順序は上から順（state.cues の並び順）。数字キーはFader列の
   数字と一致する、まだグレー表示になっていない最初のCueを反映する。縦画面用の
   大型ボタン（#gameHitBtn）はキーボード代わりとして、まだグレー表示になっていない
   最初のCueを反映する。一度反映した行はグレー表示になるが、グレーの行をクリック
   すれば再度反映でき、その次からは通常どおりグレーでない行から順に反映される。
   ============================================================ */
let gameReflectedIds = new Set();
function updateGameHitButtonVisibility(){
  const show = state.locked && state.cues.length>0;
  $('#gameHitBtn').classList.toggle('game-active', show);
}
document.addEventListener('keydown', e=>{
  if(!state.locked || e.repeat) return;
  const key = e.key;
  if(!DIGIT_CYCLE.includes(key)) return;
  const active = document.activeElement;
  if(active && (active.isContentEditable || active.tagName==='INPUT' || active.tagName==='TEXTAREA')) return;
  const cue = findNextCueByDigit(key);
  if(cue) reflectCueForGame(cue);
});
$('#gameHitBtn').addEventListener('click', e=>{
  e.preventDefault();
  if(!state.locked) return;
  const cue = findNextCueAny();
  if(cue) reflectCueForGame(cue);
});

/* ============================================================
   Ver.8.0 データ管理／「その他」画面／comos・JASCII出力／GitHub直接書き込み
   ============================================================ */

/* ---------- 共通ヘルパー ---------- */
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
function flashButton(btn, text){
  if(!btn) return;
  if(!btn.dataset.origText) btn.dataset.origText = btn.textContent;
  btn.textContent = text;
  setTimeout(()=>{ btn.textContent = btn.dataset.origText; }, 1200);
}
function ensureDataShapes(){
  if(!Array.isArray(state.templates)) state.templates = defaultTemplates();
  state.templates = state.templates.slice(0,20);
  while(state.templates.length<20) state.templates.push({id:state.templates.length+1, name:'', faders:''});
  state.templates.forEach((t,i)=>{ t.id=i+1; t.name = t.name==null ? '' : String(t.name); t.faders = t.faders==null ? '' : String(t.faders); });

  if(!Array.isArray(state.faderTable)) state.faderTable = defaultFaderTable();
  state.faderTable = state.faderTable.slice(0,60);
  while(state.faderTable.length<60) state.faderTable.push({f:state.faderTable.length+1, patch:'予備', alias:'予備'});
  state.faderTable.forEach((r,i)=>{ r.f=i+1; r.patch = r.patch==null ? '' : String(r.patch); r.alias = r.alias==null ? '' : String(r.alias); });

  if(!state.subPages || typeof state.subPages!=='object') state.subPages = defaultSubPages();
  Object.keys(state.subPages).forEach(k=>{
    let rows = state.subPages[k];
    if(!Array.isArray(rows)) rows = newSubRows();
    rows = rows.slice(0,20);
    while(rows.length<20) rows.push({name:'', faders:'', effect:''});
    // Ver.8.1 §10-1：Sub行に「Effect」列を追加（欠損は空欄で補う）
    rows.forEach(r=>{ r.name = r.name==null ? '' : String(r.name); r.faders = r.faders==null ? '' : String(r.faders); r.effect = r.effect==null ? '' : String(r.effect); });
    state.subPages[k] = rows;
  });
  if(!state.subTitles || typeof state.subTitles!=='object') state.subTitles = {};
  if(!(parseInt(state.subNo,10)>=1)) state.subNo = 1;
  state.subNo = parseInt(state.subNo,10);
  ensureSubPage(state.subNo);

  if(!state.effectData || typeof state.effectData!=='object') state.effectData = defaultEffectData();
  Object.keys(state.effectData).forEach(k=>{
    const e = state.effectData[k];
    if(!e || typeof e!=='object'){ delete state.effectData[k]; return; }
    e.name = e.name==null ? '' : String(e.name);
    if(!Array.isArray(e.steps)) e.steps = [];
    // Ver.8.1 §5：秒数は0.1秒刻みに丸める（Effectタブは0を許容）
    e.steps.forEach(s=>{
      const rounded = roundSec((parseFloat(s.sec)>=0) ? s.sec : 0.1);
      s.sec = (parseFloat(s.sec)>=0) ? rounded : 0.1;
      s.faders = s.faders==null ? '' : String(s.faders);
      // Ver.8.1 §9-1：自動保存された bg/strobe（組み合わせ表示用）
      if(s.bg!=null) s.bg = String(s.bg);
      if(s.strobe!=null) s.strobe = String(s.strobe);
    });
  });
  if(!(parseInt(state.effectNo,10)>=1)) state.effectNo = 1;
  state.effectNo = parseInt(state.effectNo,10);

  // Ver.8.1 §5：照明職人用の独自Effect一覧の秒数も0.1秒刻みに丸める
  if(Array.isArray(state.customEffects)){
    state.customEffects.forEach(e=>{ e.sec = roundSec((parseFloat(e.sec)>=0)?e.sec:0.1) || 0.1; });
  }

  // Ver.8.1 §9-2：同一サイクル内の自己衝突回避用の一時フィールド（値の初期化のみ、リセットはapplyDataJson等で行う）
  if(state.cfxOwnedNo===undefined) state.cfxOwnedNo = null;

  // Ver.8.1 §2：旧バージョンの管理者アセットキー（img/…・mov/…）を stage/… へ読み替える
  if(state.adminAssets && typeof state.adminAssets==='object'){
    const remapped = {};
    Object.keys(state.adminAssets).forEach(p=>{
      let np = p;
      if(np.startsWith('img/') || np.startsWith('mov/')) np = 'stage/' + np.slice(np.indexOf('/')+1);
      remapped[np] = state.adminAssets[p];
    });
    state.adminAssets = remapped;
  }
}


/* ---------- テンプレ検索・組み合わせ生成 ---------- */
const TEMPLATE_NAME_ALIAS = {'黄色':'黄'};
function findTemplateByName(name){
  if(name==null) return null;
  const n = String(name).trim();
  if(!n) return null;
  const alias = TEMPLATE_NAME_ALIAS[n];
  return state.templates.find(t=>{
    const tn = (t.name||'').trim();
    return tn && (tn===n || (alias && tn===alias));
  }) || null;
}
// Cue一覧のストロボ表記の正規化（保存値は「◯／Effect1／Effect2／なし」に統一）
function normalizeStrobeLabel(t){
  const v = String(t==null ? '' : t).trim();
  if(v==='くるくる') return 'Effect1';
  if(v==='独立') return 'Effect2';
  if(v==='〇') return '◯';
  if(v==='' || v==='✖' || v==='✖️') return 'なし';
  return v;
}
// ログアウト時は「Effect1」を「くるくる」、「Effect2」を「独立」と表示する。ログイン時は「Effect1／Effect2」のまま。
function strobeDisplayLabel(label){
  const v = normalizeStrobeLabel(label);
  if(state.loggedIn) return v;
  if(v==='Effect1') return 'くるくる';
  if(v==='Effect2') return '独立';
  return v;
}
// Ver.8.1 §10-2：名称・フェーダー番号の生成ルール
// 区切り：名称は「＋」、フェーダー番号は「、」。並び順：舞台→背景→ストロボ→Effect。
function comboForCue(cue){
  const stage = String(cue.stage||'').trim();
  const bg = String(cue.bg||'').trim();
  const strobe = normalizeStrobeLabel(cue.strobe);
  const effRaw = String(cue.effect||'').trim();
  const effNo = (effRaw && !isNaN(parseInt(effRaw,10)) && String(parseInt(effRaw,10))===effRaw) ? parseInt(effRaw,10) : null;
  const isMirrorBall = effRaw==='◯';
  const names = [], faders = [];

  // 舞台
  if(stage){
    names.push(stage);
    const t = findTemplateByName(stage);
    if(t && (t.faders||'').trim()) faders.push(t.faders.trim());
  }
  // 背景（独自Effect＝Cue一覧のEffectが数字Nのときは名称・フェーダーどちらにも出さない）
  if(effNo==null && bg){
    names.push(bg);
    if(isMirrorBall){
      // ミラーボール：背景色のテンプレのフェーダー番号の代わりに Effect+テンプレタブのID を出す
      const bgT = findTemplateByName(bg);
      if(bgT && bgT.id){ faders.push('Effect'+bgT.id); }
    }else{
      const bgT = findTemplateByName(bg);
      if(bgT && (bgT.faders||'').trim()) faders.push(bgT.faders.trim());
    }
  }
  // ストロボ
  if(strobe==='◯'){
    names.push('ストロボ');
    const t = findTemplateByName('ストロボ');
    if(t && (t.faders||'').trim()) faders.push(t.faders.trim());
  }else if(strobe==='Effect1'){
    names.push('くるくる');
  }else if(strobe==='Effect2'){
    names.push('独立');
  }
  // 独自Effect：名称末尾に「エフェクトN」、フェーダー番号末尾に「EffectN」を追加する
  if(effNo!=null){
    names.push('エフェクト'+effNo);
    faders.push('Effect'+effNo);
  }
  return {name:names.join('＋'), faders:faders.join('、')};
}

/* ---------- Sub：Cue記録時の自動保存 ---------- */
function ensureSubPage(no){
  const k = String(no);
  if(!state.subPages[k]) state.subPages[k] = newSubRows();
  return state.subPages[k];
}
function isSubRowEmpty(r){ return !(String(r.name||'').trim() || String(r.faders||'').trim() || String(r.effect||'').trim()); }
function subPageHasData(no){
  const rows = state.subPages[String(no)];
  return !!rows && rows.some(r=>!isSubRowEmpty(r));
}
function saveCueToSub(cue){
  const combo = comboForCue(cue);
  let no = state.subNo || 1;
  let guard = 0, idx = -1;
  while(guard<500){
    const rows = ensureSubPage(no);
    idx = rows.findIndex(isSubRowEmpty);
    if(idx>=0) break;
    no++; guard++;            // 20行を超えたら自動的にNo.を加算し、新しいNo.で書き出す
  }
  if(idx<0) return;
  state.subNo = no;
  const rows = ensureSubPage(no);
  rows[idx] = {name:combo.name, faders:combo.faders, effect: cue.effect||''};   // 同じ組み合わせも重複して追加する
  cue.subNo = no;
  cue.subRow = idx+1;
  if(!(no in state.subTitles)) state.subTitles[no] = state.subTitles[no] || '';
  refreshSubTabIfVisible();
}
function linkedSubRow(cue){
  if(!cue || !cue.subNo || !cue.subRow) return null;
  const rows = state.subPages[String(cue.subNo)];
  return rows ? (rows[cue.subRow-1] || null) : null;
}
function updateSubForCue(cue){
  const row = linkedSubRow(cue);
  if(!row) return;
  const combo = comboForCue(cue);
  row.name = combo.name;
  row.faders = combo.faders;
  row.effect = cue.effect||'';
  refreshSubTabIfVisible();
}
function clearSubForCue(cue){
  const row = linkedSubRow(cue);
  if(!row) return;
  row.name = ''; row.faders = ''; row.effect = '';
  refreshSubTabIfVisible();
}
function refreshSubTabIfVisible(){
  const pane = $('#dmPane_sub');
  if(pane && !pane.classList.contains('hidden') && !$('#otherModal').classList.contains('hidden')) renderSubTab();
}

/* ---------- Effect：No.の空き番号管理 ---------- */
function effectEntryOccupied(no){
  // Ver.8.1 §9-2：同一保存サイクル中に自分が確保したNo.は「空き」として扱う（連鎖的な繰り上げを防ぐ）
  if(state.cfxOwnedNo!=null && Number(no)===Number(state.cfxOwnedNo)) return false;
  const e = state.effectData[String(no)];
  if(!e) return false;
  return !!((e.name||'').trim() || (e.steps||[]).some(s=>String(s.faders||'').trim()));
}
// 既存Effectと番号が重なる場合は、現状空欄となっているNo.へ自動的に変える
function nextBlankEffectNo(n){
  n = Math.max(1, parseInt(n,10) || 1);
  let g = 0;
  while(effectEntryOccupied(n) && g<2000){ n++; g++; }
  return n;
}
function ensureEffectEntry(no){
  const k = String(no);
  if(!state.effectData[k]) state.effectData[k] = {name:'', steps:[]};
  return state.effectData[k];
}
// Ver.8.1 §9-1：Effectタブのsteps[step-1]へ書き込む。既に同じステップ番号があれば挿入して以降を+1ずらす
function writeEffectStep(no, step, entry){
  const e = ensureEffectEntry(no);
  while(e.steps.length < step-1) e.steps.push({sec:0.1, faders:''});
  if(e.steps.length >= step){
    e.steps.splice(step-1, 0, entry);
  }else{
    e.steps.push(entry);
  }
}
function refreshEffectTabIfVisible(){
  const pane = $('#dmPane_effect');
  if(pane && !pane.classList.contains('hidden') && !$('#otherModal').classList.contains('hidden')) renderEffectTab();
}
function afterEffectDataChanged(){
  state.cfxCurrentNo = nextBlankEffectNo(state.cfxCurrentNo || 1);
  syncCfxNoInputs();
  saveState();
}

/* ---------- 画面描画：テンプレ／フェーダー ---------- */
function makeInputCell(value, onChange, opts){
  opts = opts || {};
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  if(opts.placeholder) input.placeholder = opts.placeholder;
  input.addEventListener('change', ()=> onChange(input.value));
  td.appendChild(input);
  return td;
}
function renderTemplateTab(){
  const body = $('#templateTableBody');
  body.innerHTML = '';
  state.templates.forEach(t=>{
    const tr = document.createElement('tr');
    const idTd = document.createElement('td'); idTd.textContent = t.id; tr.appendChild(idTd);
    tr.appendChild(makeInputCell(t.name, v=>{ t.name = v; saveState(); renderInputModeTable(); }));
    tr.appendChild(makeInputCell(t.faders, v=>{ t.faders = v; saveState(); renderInputModeTable(); }, {placeholder:'例）1〜8、25(50%)'}));
    body.appendChild(tr);
  });
}
function renderFaderTab(){
  const body = $('#faderTableBody');
  body.innerHTML = '';
  state.faderTable.forEach(r=>{
    const tr = document.createElement('tr');
    const fTd = document.createElement('td'); fTd.textContent = r.f; tr.appendChild(fTd);
    tr.appendChild(makeInputCell(r.patch, v=>{ r.patch = v; saveState(); }));
    tr.appendChild(makeInputCell(r.alias, v=>{ r.alias = v; saveState(); }));
    body.appendChild(tr);
  });
}

/* ---------- 画面描画：Sub ---------- */
function renderSubTab(){
  const no = state.subNo || 1;
  const rows = ensureSubPage(no);
  $('#subNoInput').value = no;
  $('#subTitleInput').value = state.subTitles[no] || '';
  const body = $('#subTableBody');
  body.innerHTML = '';
  rows.forEach((r,i)=>{
    const tr = document.createElement('tr');
    const idTd = document.createElement('td'); idTd.textContent = i+1; tr.appendChild(idTd);
    // Ver.8.1 §10-1：Effect列（値・表示はCue一覧のEffect欄と同じ。独自Effectは数字、ミラーボールは「◯」、Effectなしは空欄）
    tr.appendChild(makeInputCell(r.effect, v=>{ r.effect = v; saveState(); }, {placeholder:'例）3 / ◯'}));
    tr.appendChild(makeInputCell(r.name, v=>{ r.name = v; saveState(); }));
    tr.appendChild(makeInputCell(r.faders, v=>{ r.faders = v; saveState(); }, {placeholder:'例）1〜8、24、28'}));
    body.appendChild(tr);
  });
}
function gotoSubNo(no){
  state.subNo = Math.max(1, parseInt(no,10) || 1);
  ensureSubPage(state.subNo);
  renderSubTab();
  saveState();
}
$('#subPrevBtn').addEventListener('click', ()=> gotoSubNo((state.subNo||1)-1));
$('#subNextBtn').addEventListener('click', ()=> gotoSubNo((state.subNo||1)+1));
$('#subTitleInput').addEventListener('change', ()=>{
  state.subTitles[state.subNo||1] = $('#subTitleInput').value;
  saveState();
});
// 「No.」の数字を書き換えると、表示中のNo.の内容が新しいNo.に保存される。
// 書き換え先に既にデータがある場合は、各行の名称を「現データ→新データ」で20行分比較して確認する。
function copySubPage(fromNo, toNo){
  state.subPages[String(toNo)] = deepClone(ensureSubPage(fromNo));
  state.subTitles[toNo] = state.subTitles[fromNo] || '';
  // 置き換えられた書き換え先のNo.を参照していたCueは、Subとの紐づけを解除する（出力時はテンプレから再計算される）
  state.cues.forEach(c=>{ if(c.subNo!=null && String(c.subNo)===String(toNo)){ delete c.subNo; delete c.subRow; } });
  state.cues.forEach(c=>{ if(c.subNo!=null && String(c.subNo)===String(fromNo)) c.subNo = toNo; });
  state.subNo = toNo;
  renderSubTab();
  saveState();
}
let subConfirmOnOk = null, subConfirmOnCancel = null;
function openSubConfirm(fromNo, toNo, onOk, onCancel){
  const cur = ensureSubPage(fromNo), dest = ensureSubPage(toNo);
  $('#subConfirmTitle').textContent = `No.${toNo} を置き換えますか？`;
  $('#subConfirmDesc').textContent = `No.${toNo} には既にデータがあります。No.${fromNo} の内容で置き換えます（各行：現データ → 新データ）。`;
  const list = $('#subConfirmList');
  list.innerHTML = '';
  for(let i=0;i<20;i++){
    const a = (dest[i].name||'').trim() || '（空）';
    const b = (cur[i].name||'').trim() || '（空）';
    const row = document.createElement('div');
    row.className = 'sub-confirm-row' + (a!==b ? ' diff' : '');
    row.textContent = `${i+1}．${a} → ${b}`;
    list.appendChild(row);
  }
  subConfirmOnOk = onOk; subConfirmOnCancel = onCancel;
  $('#subConfirmModal').classList.remove('hidden');
}
$('#subConfirmCancelBtn').addEventListener('click', ()=>{
  $('#subConfirmModal').classList.add('hidden');
  const cb = subConfirmOnCancel; subConfirmOnOk = null; subConfirmOnCancel = null;
  if(cb) cb();
});
$('#subConfirmOkBtn').addEventListener('click', ()=>{
  $('#subConfirmModal').classList.add('hidden');
  const cb = subConfirmOnOk; subConfirmOnOk = null; subConfirmOnCancel = null;
  if(cb) cb();
});
$('#subNoInput').addEventListener('change', ()=>{
  const newNo = parseInt($('#subNoInput').value,10);
  const oldNo = state.subNo || 1;
  if(isNaN(newNo) || newNo<1 || newNo===oldNo){ $('#subNoInput').value = oldNo; return; }
  if(!subPageHasData(oldNo)){ gotoSubNo(newNo); return; }   // 表示中のNo.が空なら単に切り替える
  if(subPageHasData(newNo)){
    openSubConfirm(oldNo, newNo,
      ()=> copySubPage(oldNo, newNo),
      ()=>{ $('#subNoInput').value = oldNo; });
  }else{
    copySubPage(oldNo, newNo);
  }
});

/* ---------- 画面描画：Effect ---------- */
function makeEffectRow(no, i, st, isNew){
  const row = document.createElement('div');
  row.className = 'effect-grid effect-row' + (isNew ? ' effect-row-new' : '');
  const mk = (tag)=> document.createElement(tag);
  row.appendChild(mk('span'));                       // 左余白
  const stepSpan = mk('span'); stepSpan.className = 'effect-step-no'; stepSpan.textContent = i+1; row.appendChild(stepSpan);
  const secInput = mk('input'); secInput.type = 'number'; secInput.min = '0'; secInput.step = '0.1';
  secInput.value = Number(st.sec||0).toFixed(1); secInput.className = 'effect-sec-input'; row.appendChild(secInput);
  const fInput = mk('input'); fInput.type = 'text'; fInput.value = st.faders; fInput.className = 'effect-faders-input';
  fInput.placeholder = isNew ? '（新規：フェーダー番号を入力）' : ''; row.appendChild(fInput);
  // Ver.8.1 §9-1：照明職人用「保存」による自動保存行には bg/strobe の組み合わせを読み取り専用表示する
  const comboSpan = mk('span'); comboSpan.className = 'effect-combo-text';
  comboSpan.textContent = st.bg ? `${st.bg}＋${effectComboStrobeLabel(st.strobe)}` : '';
  row.appendChild(comboSpan);
  const delWrap = mk('span'); delWrap.className = 'effect-del-wrap';
  if(!isNew){
    const del = mk('button'); del.textContent = '削除'; del.className = 'del-btn effect-del-btn';
    del.addEventListener('click', ()=>{
      const e = ensureEffectEntry(no);
      e.steps.splice(i,1);                            // 削除した行より下のstep番号は自動的に繰り上がる
      renderEffectTab(); afterEffectDataChanged();
    });
    delWrap.appendChild(del);
  }
  row.appendChild(delWrap);
  row.appendChild(mk('span'));                       // 右余白

  if(!isNew){
    secInput.addEventListener('change', ()=>{
      const e = ensureEffectEntry(no);
      const v = roundSec(secInput.value);
      e.steps[i].sec = (!isNaN(v) && v>=0) ? v : 0.1;   // Ver.8.1 §5：0.1秒刻みに丸める（Effectタブは0を許容）
      secInput.value = e.steps[i].sec.toFixed(1);
      saveState();
    });
    fInput.addEventListener('change', ()=>{
      const e = ensureEffectEntry(no);
      e.steps[i].faders = fInput.value;
      afterEffectDataChanged();
    });
  }else{
    fInput.addEventListener('change', ()=>{
      if(!fInput.value.trim()) return;
      const e = ensureEffectEntry(no);
      const v = roundSec(secInput.value);
      e.steps.push({sec: (!isNaN(v) && v>=0) ? v : 0.1, faders: fInput.value});
      renderEffectTab(true);
      afterEffectDataChanged();
    });
  }
  return row;
}
function renderEffectTab(focusNew){
  const no = state.effectNo || 1;
  $('#effectNoInput').value = no;
  const e = state.effectData[String(no)] || {name:'', steps:[]};
  $('#effectNameInput').value = e.name || '';
  const list = $('#effectStepList');
  list.innerHTML = '';
  e.steps.forEach((st,i)=> list.appendChild(makeEffectRow(no, i, st, false)));
  const last = e.steps.length ? e.steps[e.steps.length-1] : null;
  const newRow = makeEffectRow(no, e.steps.length, {sec: last ? last.sec : 0.1, faders:''}, true);
  list.appendChild(newRow);
  if(focusNew){ const inp = newRow.querySelector('.effect-faders-input'); if(inp) inp.focus(); }
}
$('#effectNoInput').addEventListener('change', ()=>{
  const v = parseInt($('#effectNoInput').value,10);
  if(isNaN(v) || v<1){ $('#effectNoInput').value = state.effectNo || 1; return; }
  state.effectNo = v;
  renderEffectTab();
  saveState();
});
$('#effectNameInput').addEventListener('change', ()=>{
  const e = ensureEffectEntry(state.effectNo || 1);
  e.name = $('#effectNameInput').value;
  afterEffectDataChanged();
});

/* ---------- 入力モード（Cue一覧の自動変換表示） ---------- */
function isNoneStrobe(label){ return normalizeStrobeLabel(label)==='なし'; }
function renderInputModeTable(){
  const body = $('#inputModeTableBody');
  if(!body) return;
  body.innerHTML = '';
  state.cues.forEach(c=>{
    const stage = String(c.stage||'').trim();
    const bg = String(c.bg||'').trim();
    const strobe = normalizeStrobeLabel(c.strobe);
    const stageT = (stage && stage!=='暗転') ? findTemplateByName(stage) : null;
    const bgT = bg ? findTemplateByName(bg) : null;
    const strobeT = strobe==='◯' ? findTemplateByName('ストロボ') : null;

    const ids = [];
    if(stageT) ids.push(stageT.id);
    if(strobeT) ids.push(strobeT.id);
    if(bgT) ids.push(bgT.id);

    let strobeText;
    if(strobe==='◯') strobeText = strobeT ? strobeT.faders : '◯';
    else if(strobe==='Effect1' || strobe==='Effect2') strobeText = strobe;       // ログイン時はEffect1表記を維持
    else strobeText = '✖';

    const cells = [
      c.fader || '',
      ids.join(','),
      stageT ? stageT.faders : '',
      strobeText,
      bgT ? bgT.faders : '',
      c.effect || ''
    ];
    const tr = document.createElement('tr');
    cells.forEach(v=>{ const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    body.appendChild(tr);
  });
}

/* ---------- 「その他」画面（タブ切替） ---------- */
let currentOtherTab = 'input';
function switchOtherTab(tab){
  currentOtherTab = tab;
  $all('.other-tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.otherTab===tab));
  $all('.other-pane').forEach(p=> p.classList.toggle('hidden', p.id!=='otherPane_'+tab));
  if(tab==='input') renderInputModeTable();
  else if(tab==='voice') syncVoiceSettingsUI();
  else if(tab==='google'){ $('#googleTokenInput').value=''; updateGoogleLoginUI(); }
  else if(tab==='data') renderDataManager();
  else if(tab==='admin') renderAdminUsersTable();
  else if(tab==='github') fillGithubInputs();
}
function openOtherModal(tab){
  if(!state.loggedIn){ alert('ログインしてください。'); return; }
  $('#settingsMenu').classList.add('hidden');
  $('#otherModal').classList.remove('hidden');
  switchOtherTab(tab || currentOtherTab || 'input');
}
function closeOtherModal(){ $('#otherModal').classList.add('hidden'); }
$('#openOtherBtn').addEventListener('click', ()=> openOtherModal());
$('#otherCloseBtn').addEventListener('click', closeOtherModal);
$all('.other-tab-btn').forEach(b=> b.addEventListener('click', ()=> switchOtherTab(b.dataset.otherTab)));

let currentDmTab = 'template';
function switchDmTab(tab){
  currentDmTab = tab;
  $all('.dm-tab-btn').forEach(b=> b.classList.toggle('active', b.dataset.dmTab===tab));
  $all('.dm-pane').forEach(p=> p.classList.toggle('hidden', p.id!=='dmPane_'+tab));
  if(tab==='template') renderTemplateTab();
  else if(tab==='fader') renderFaderTab();
  else if(tab==='sub') renderSubTab();
  else if(tab==='effect') renderEffectTab();
}
function renderDataManager(){ switchDmTab(currentDmTab || 'template'); }
$all('.dm-tab-btn').forEach(b=> b.addEventListener('click', ()=> switchDmTab(b.dataset.dmTab)));

/* ---------- data.json（設定データ）の入出力 ---------- */
function buildDataJsonPayload(){
  return {
    version: '8.0',
    templates: state.templates,
    faderTable: state.faderTable,
    subPages: state.subPages,
    subNo: state.subNo,
    subTitles: state.subTitles,
    effectData: state.effectData,
    effectNo: state.effectNo,
    customEffects: state.customEffects,
    fadeDurationSec: state.fadeDurationSec
  };
}
function applyDataJson(json){
  if(!json || typeof json!=='object') return false;
  const keys = ['templates','faderTable','subPages','subNo','subTitles','effectData','effectNo','customEffects','fadeDurationSec'];
  let any = false;
  keys.forEach(k=>{ if(json[k]!==undefined){ state[k] = deepClone(json[k]); any = true; } });
  if(any){
    state.cfxOwnedNo = null;   // Ver.8.1 §9-2：data.json再読込時は自己所有Noをリセット
    ensureDataShapes();
    state.cfxCurrentNo = nextBlankEffectNo(state.cfxCurrentNo || 1);
  }
  return any;
}
async function loadSettingsFromDataJson(force){
  if(state._dataSeeded && !force) return false;
  try{
    const res = await fetch('data.json', {cache:'no-store'});
    if(!res.ok) return false;
    const json = await res.json();
    if(applyDataJson(json)){
      state._dataSeeded = true;
      saveState();
      return true;
    }
  }catch(e){
    // data.json が存在しない／file:// 直開きでfetch不可な環境では、初期データまたはlocalStorageの内容をそのまま使用する
  }
  return false;
}
$('#dataJsonSaveBtn').addEventListener('click', async ()=>{
  await saveJsonToFile('data.json', JSON.stringify(buildDataJsonPayload(), null, 2));
});
$('#dataJsonReloadBtn').addEventListener('click', async ()=>{
  if(!confirm('data.json の内容で、テンプレ・フェーダー・Sub・Effect の設定を上書きします。よろしいですか？')) return;
  const ok = await loadSettingsFromDataJson(true);
  if(ok){
    renderDataManager(); renderCueTable(); syncCfxNoInputs(); renderCustomFxTable();
    alert('data.json を読み込みました。');
  }else{
    alert('data.json を読み込めませんでした（ファイルが無い、またはfile://で開いている可能性があります）。');
  }
});
$('#adminJsonSaveBtn').addEventListener('click', async ()=>{
  await persistAdminsToAdminJson();
});

/* ---------- GitHub 直接書き込み ---------- */
const GITHUB_CFG_KEY = 'stagePlanner_github_v8';
function loadGithubCfg(){
  try{ return JSON.parse(localStorage.getItem(GITHUB_CFG_KEY)||'{}') || {}; }catch(e){ return {}; }
}
function saveGithubCfg(cfg){
  try{ localStorage.setItem(GITHUB_CFG_KEY, JSON.stringify(cfg)); }catch(e){ console.warn('GitHub設定の保存に失敗', e); }
}
function fillGithubInputs(){
  const cfg = loadGithubCfg();
  $('#ghRepoInput').value = cfg.repo || '';
  $('#ghBranchInput').value = cfg.branch || 'main';
  $('#ghTokenInput').value = cfg.token || '';
}
function readGithubInputs(){
  return {
    repo: $('#ghRepoInput').value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/+$/,''),
    branch: $('#ghBranchInput').value.trim() || 'main',
    token: $('#ghTokenInput').value.trim()
  };
}
['ghRepoInput','ghBranchInput','ghTokenInput'].forEach(id=>{
  $('#'+id).addEventListener('change', ()=> saveGithubCfg(readGithubInputs()));
});
function utf8ToBase64(text){
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for(let i=0;i<bytes.length;i+=0x8000){ bin += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000)); }
  return btoa(bin);
}
async function githubPutFile(cfg, path, text){
  const api = `https://api.github.com/repos/${cfg.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const headers = {'Authorization':'Bearer '+cfg.token, 'Accept':'application/vnd.github+json'};
  let sha;
  const g = await fetch(`${api}?ref=${encodeURIComponent(cfg.branch)}`, {headers, cache:'no-store'});
  if(g.ok){ sha = (await g.json()).sha; }
  else if(g.status!==404){ throw new Error(`${path} の取得に失敗しました（HTTP ${g.status}）`); }
  const body = {message:`${path} を更新（舞台演出プランナー Ver.8.0）`, content: utf8ToBase64(text), branch: cfg.branch};
  if(sha) body.sha = sha;
  const p = await fetch(api, {method:'PUT', headers:Object.assign({'Content-Type':'application/json'}, headers), body:JSON.stringify(body)});
  if(!p.ok){
    let detail = '';
    try{ detail = (await p.json()).message || ''; }catch(e){}
    throw new Error(`${path} の書き込みに失敗しました（HTTP ${p.status}${detail ? '：'+detail : ''}）`);
  }
}
$('#ghWriteBtn').addEventListener('click', async ()=>{
  const cfg = readGithubInputs();
  saveGithubCfg(cfg);   // 一度入力した内容はlocalStorageに保存する
  const status = $('#ghStatus');
  if(!/^[^\/\s]+\/[^\/\s]+$/.test(cfg.repo)){ status.textContent = 'リポジトリ名は「owner/repository」の形式で入力してください。'; return; }
  if(!cfg.token){ status.textContent = 'トークンを入力してください。'; return; }
  const btn = $('#ghWriteBtn');
  btn.disabled = true;
  status.textContent = '書き込み中…';
  try{
    await githubPutFile(cfg, 'data.json', JSON.stringify(buildDataJsonPayload(), null, 2));
    await githubPutFile(cfg, 'admin.json', JSON.stringify({admins: state.admins}, null, 2));
    status.textContent = `書き込みが完了しました（${cfg.repo} @ ${cfg.branch}：data.json／admin.json）。`;
  }catch(e){
    status.textContent = '書き込みに失敗しました：' + e.message;
  }finally{
    btn.disabled = false;
  }
});

/* ============================================================
   旧comos出力 / JASCII出力（現在はUIから外され、調光卓出力(.dat)に置き換え済み。
   buildOutputCues等は内部で使用しないため未使用だが、ロジックは削除せず保持する）
   （Cue一覧の各Cueを、Subデータ＋Effectタブのデータから照明卓用テキストに変換する）
   入力マトリクス：Cue, Time, Up, Down, Ch1〜Ch60（0〜100）→ 0のチャンネルは出力しない
   ============================================================ */
function normalizeFaderText(t){
  return String(t==null ? '' : t)
    .replace(/[０-９]/g, c=>String.fromCharCode(c.charCodeAt(0)-0xFEE0))
    .replace(/（/g,'(').replace(/）/g,')').replace(/％/g,'%')
    .replace(/[〜～~－ー—–\-]/g,'〜');
}
// 「1〜8」「25(50%)」「49、51、52」形式のフェーダー番号を {ch → レベル} に展開する（レベル指定なしは100）
function parseFaderLevels(text){
  const map = new Map();
  normalizeFaderText(text).split(/[、,，\s\/・]+/).filter(Boolean).forEach(tok=>{
    const m = /^(\d+)(?:〜(\d+))?(?:\((\d+(?:\.\d+)?)%?\))?$/.exec(tok);
    if(!m) return;
    let a = parseInt(m[1],10), b = m[2] ? parseInt(m[2],10) : a;
    const lv = m[3]!=null ? Math.max(0, Math.min(100, Math.round(parseFloat(m[3])))) : 100;
    if(a>b){ const t=a; a=b; b=t; }
    for(let ch=a; ch<=b; ch++){
      if(ch>=1 && ch<=60) map.set(ch, Math.max(map.get(ch)||0, lv));
    }
  });
  return map;
}
function fmtNum(n){ return String(Math.round(n*100)/100); }
function baseFaderTextForCue(cue){
  const row = linkedSubRow(cue);
  if(row && String(row.faders||'').trim()) return row.faders;
  return comboForCue(cue).faders;
}
function buildOutputCues(){
  const out = [];
  state.cues.forEach((cue, idx)=>{
    const no = idx+1;
    const base = parseFaderLevels(baseFaderTextForCue(cue));
    const fadeSec = (cue.fade==='フェードイン' || cue.fade==='フェードアウト') ? (state.fadeDurationSec||0) : 0;
    out.push({no:String(no), time:fmtNum(fadeSec), levels:base});

    // Effect列にNo.がある場合は、Effectタブの各stepを「No.1, No.2…」の小数Cueとして続けて出力する
    const effNo = parseInt(cue.effect,10);
    const e = !isNaN(effNo) ? state.effectData[String(effNo)] : null;
    if(e){
      const steps = (e.steps||[]).filter(s=>String(s.faders||'').trim());
      steps.forEach((s, k)=>{
        const levels = new Map(base);
        parseFaderLevels(s.faders).forEach((lv,ch)=> levels.set(ch, Math.max(levels.get(ch)||0, lv)));
        const sub = steps.length<=9 ? String(k+1) : String(k+1).padStart(2,'0');
        out.push({no:`${no}.${sub}`, time:fmtNum(s.sec), levels});
      });
    }
  });
  return out;
}
function levelsToSortedList(levels){
  return Array.from(levels.entries()).filter(([,lv])=>lv>0).sort((a,b)=>a[0]-b[0]);
}
function buildComosText(cues){
  const lines = [];
  cues.forEach(c=>{
    lines.push(`Q ${c.no}`);
    lines.push(`T ${c.time}`);
    const list = levelsToSortedList(c.levels);
    if(list.length) lines.push(list.map(([ch,lv])=>`C ${ch} L ${lv}`).join(' '));
  });
  return lines.join('\r\n') + '\r\n';
}
function buildJasciiText(cues){
  const lines = [];
  cues.forEach(c=>{
    lines.push(`Cue ${c.no}`);
    lines.push(`Fade ${c.time}`);
    const list = levelsToSortedList(c.levels);
    lines.push((list.length ? list.map(([ch,lv])=>`${ch}@${lv}`).join(' ')+' ' : '') + ';');
  });
  return lines.join('\r\n') + '\r\n';
}
function downloadTextFile(fileName, text){
  const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
/* ============================================================
   データを保存（旧comos出力）
   3-1: Cue一覧の全データをSUBへ一括反映
   3-2: 「照明職人用」の全データをEffectの未設定No.へ一括反映
   ============================================================ */
// 3-1：Cue一覧の各Cueを、Subへ反映する（既にSubへ紐付いているCueは上書き更新、未紐付けは新規保存）
function bulkSyncCuesToSub(){
  state.cues.forEach(cue=>{
    if(cue.subNo!=null && cue.subRow!=null && linkedSubRow(cue)){
      updateSubForCue(cue);
    }else{
      saveCueToSub(cue);
    }
  });
  refreshSubTabIfVisible();
}
// 3-2：「照明職人用」(state.customEffects)の全データを、Effect(state.effectData)へ反映する。
// 各エントリのNo.は照明職人用「保存」時点で既にnextBlankEffectNoにより確定済みのため、
// ここではNo.の再割当は行わず、そのNo.のEffectへ内容を書き戻す（未設定No.のみ・既存データは上書きしない）。
function bulkSyncCfxToEffect(){
  const byNo = {};
  state.customEffects.forEach(e=>{ (byNo[e.no] = byNo[e.no]||[]).push(e); });
  Object.keys(byNo).forEach(noKey=>{
    const no = parseInt(noKey,10);
    if(isNaN(no)) return;
    const existing = state.effectData[String(no)];
    const alreadyHasData = !!(existing && ((existing.name||'').trim() || (existing.steps||[]).some(s=>String(s.faders||'').trim())));
    // 既にデータが入っているNo.は上書きしない（照明職人用自身が保存したNo.への再反映は許容する）
    const ownedByThisGroup = byNo[noKey].every(e=>e.no===no);
    if(alreadyHasData && !ownedByThisGroup) return;
    byNo[noKey].sort((a,b)=>a.step-b.step).forEach(e=>{
      const faders = [];
      if(e.colorName && e.colorName!=='-'){
        const bgT = findTemplateByName(e.colorName);
        if(bgT && (bgT.faders||'').trim()) faders.push(bgT.faders.trim());
      }
      if(e.strobeLabel==='◯'){
        const stT = findTemplateByName('ストロボ');
        if(stT && (stT.faders||'').trim()) faders.push(stT.faders.trim());
      }
      writeEffectStep(no, e.step, {sec:e.sec, faders:faders.join('、'), bg:e.colorName, strobe:e.strobeLabel});
    });
  });
  refreshEffectTabIfVisible();
}
$('#saveDataBtn').addEventListener('click', ()=>{
  $('#settingsMenu').classList.add('hidden');
  bulkSyncCuesToSub();
  bulkSyncCfxToEffect();
  saveState();
  alert('Cue一覧の内容をSUBへ、照明職人用の内容をEffectへ反映しました。');
});

/* ============================================================
   調光卓出力（旧JASCII出力）
   SUB/Effectデータを、照明調光卓の独自テキスト形式（拡張子.dat）に変換して
   ブラウザから直接ダウンロードする。ヘッダーは添付サンプル（effect.dat/sub.dat）を踏襲する。
   ============================================================ */
// 添付サンプルのヘッダー（バージョン・Place情報等、Shift_JIS/cp932バイト列）をそのまま踏襲するためのBase64データ
const CONSOLE_DAT_HEADER_SUB_B64 = 'IwojCVN1YiBmaWxlCiMKIyAgVmVyc2lvbiA6IEYxNTMgVjMuMzFBCiMgIFBsYWNlICAgOiC02MC+wc+ywcPms9i5u6GmueLF+bPYubsKIwo=';
const CONSOLE_DAT_HEADER_EFFECT_B64 = 'IwojCUVmZmVjdCBmaWxlCiMKIyAgVmVyc2lvbiA6IEYxNTMgVjMuMzFBCiMgIFBsYWNlICAgOiC02MC+wc+ywcPms9i5u6GmueLF+bPYubsKIwpkZWZhdWx0OiAxNjYK';
function base64ToBytes(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// 0〜100(%)のレベルを、調光卓の0〜255階調へ変換する
function levelPctTo255(pct){ return Math.max(0, Math.min(255, Math.round(pct*255/100))); }
// SUBの1フェーダー分（{name,faders,effect}）を、fader行のModeParamsとチャンネル出力リストへ変換する。
// 「独自Effect」（エフェクトN）にリンクしている場合は、実機のmode=2（Effect Noへのリンク）形式に変換し、
// チャンネル出力行は持たない（添付サンプルのfader4:, 2, 0, 1, 0, 0 等と同じ扱い）。
function subFaderToDat(row){
  const effNo = parseInt(row.effect, 10);
  if(!isNaN(effNo) && effNo>=1){
    return {modeParams: ` , 2, 0, ${effNo}, 0, 0`, channels: null};
  }
  const list = levelsToSortedList(parseFaderLevels(row.faders)).map(([ch,pct])=>[ch, levelPctTo255(pct)]);
  return {modeParams: ' , 0, 0, 0, 0, 0', channels: list.length ? list : null};
}
function buildSubDatText(){
  const lines = [];
  Object.keys(state.subPages).map(n=>parseInt(n,10)).filter(n=>!isNaN(n)).sort((a,b)=>a-b).forEach(pageNo=>{
    const rows = state.subPages[String(pageNo)] || [];
    const activeIdx = [];
    rows.forEach((row,idx)=>{ if(!isSubRowEmpty(row)) activeIdx.push(idx); });
    if(!activeIdx.length) return;
    lines.push(`page${pageNo}: `);
    activeIdx.forEach(idx=>{
      const {modeParams, channels} = subFaderToDat(rows[idx]);
      lines.push(`fader${idx+1}:${modeParams}`);
      if(channels) lines.push('  '+channels.map(([ch,v])=>`${ch}@${v}`).join(', '));
    });
  });
  return lines.join('\n') + '\n';
}
function buildEffectDatText(){
  const lines = [];
  Object.keys(state.effectData).map(n=>parseInt(n,10)).filter(n=>!isNaN(n)).sort((a,b)=>a-b).forEach(no=>{
    const e = state.effectData[String(no)] || {steps:[]};
    const activeSteps = [];
    (e.steps||[]).forEach((s,idx)=>{ if(String(s.faders||'').trim()) activeSteps.push({step:idx+1, s}); });
    if(!activeSteps.length) return;
    lines.push(`pattern${no}: 2, 0, 0, 0, 100`);
    activeSteps.forEach(({step,s})=>{
      const list = levelsToSortedList(parseFaderLevels(s.faders)).map(([ch,pct])=>[ch, levelPctTo255(pct)]);
      lines.push(`step${step}: 0, 1`);
      if(list.length) lines.push('  '+list.map(([ch,v])=>`${ch}@${v}`).join(', '));
    });
  });
  return lines.join('\n') + '\n';
}
// 逆変換：.dat形式のテキストを、SUB/Effectの内部データ構造へ読み込む
// （ヘッダー行・page/pattern行・fader/step行・インデントされたチャンネル行を判定して読み込む）
function parseConsoleDatText(text){
  const lines = String(text||'').replace(/\r\n?/g,'\n').split('\n');
  const pages = {}; // {pageNo: {faderNo: {modeParams, channels:[[ch,v]]}}}
  let curPage = null, curFader = null;
  lines.forEach(raw=>{
    if(/^#/.test(raw) || /^default:/.test(raw) || raw==='') return;
    let m;
    if((m = /^(page|pattern)(\d+):\s*$/.exec(raw))){
      curPage = m[2]; pages[curPage] = pages[curPage] || {}; curFader = null; return;
    }
    if((m = /^(fader|step)(\d+):(.*)$/.exec(raw))){
      curFader = m[2];
      if(curPage!=null) pages[curPage][curFader] = {modeParams: m[3], channels: []};
      return;
    }
    if(/^\s{2}/.test(raw) && curPage!=null && curFader!=null){
      const list = raw.trim().split(',').map(t=>t.trim()).filter(Boolean).map(tok=>{
        const mm = /^(\d+)@(\d+)$/.exec(tok);
        return mm ? [parseInt(mm[1],10), parseInt(mm[2],10)] : null;
      }).filter(Boolean);
      pages[curPage][curFader].channels = pages[curPage][curFader].channels.concat(list);
    }
  });
  return pages;
}
function downloadConsoleDatFile(fileName, headerB64, bodyText){
  const headerBytes = base64ToBytes(headerB64);
  const bodyBytes = new TextEncoder().encode(bodyText);
  const combined = new Uint8Array(headerBytes.length + bodyBytes.length);
  combined.set(headerBytes, 0);
  combined.set(bodyBytes, headerBytes.length);
  const blob = new Blob([combined], {type:'application/octet-stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}
$('#consoleExportBtn').addEventListener('click', ()=>{
  $('#settingsMenu').classList.add('hidden');
  downloadConsoleDatFile('sub.dat', CONSOLE_DAT_HEADER_SUB_B64, buildSubDatText());
  downloadConsoleDatFile('effect.dat', CONSOLE_DAT_HEADER_EFFECT_B64, buildEffectDatText());
});

/* ============================================================
   自動保存
   ============================================================ */
setInterval(saveState, 30000);
window.addEventListener('beforeunload', saveState);

/* ============================================================
   初期化
   ============================================================ */
document.addEventListener('DOMContentLoaded', async ()=>{
  loadState();
  await loadAdminsFromAdminJson();
  await loadSettingsFromDataJson();   // Ver.8.0：data.json（設定データ）の初回読込
  ensureDataShapes();
  populateAdminColorSelect();
  updateAdminAssetPathPreview();
  applyModalAssets();
  initModalLogic();
  initTutorialDrag();
  initGoogleLoginUI();
  updateGoogleLoginUI();
  initTutorialDrag();
  if(state.initDone){
    $('#initModal').classList.add('hidden');
    applyAllSettingsToUI();
  }else{
    prefillModalSelections();
  }
  updateLoginUI();
  updateSWDisplay();
  // Ver.6.0 要件8：初回訪問時（未完了/未スキップ時）は自動的にチュートリアルを開始する
  try{
    if(!localStorage.getItem(TUTORIAL_DONE_KEY)) startTutorial();
  }catch(e){}
});


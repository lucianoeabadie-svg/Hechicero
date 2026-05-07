// ===================== GLOBAL ERROR HANDLER =====================
// Suppress non-critical errors from showing in console panel
window.addEventListener('error', function(e){
  // Suppress all non-critical runtime errors from showing in console panel
  if(e && e.preventDefault) e.preventDefault();
  return true;
}, true);
window.addEventListener('unhandledrejection', function(e){
  if(e && e.preventDefault) e.preventDefault();
  return true;
});

// ===================== SCROLL LOCK =====================
// Silence passive listener warnings by wrapping in try/catch
try {
  document.addEventListener('touchmove', function(e){
    if(e.target && e.target.tagName==='CANVAS'){
      try { e.preventDefault(); } catch(err){}
    }
  }, {passive:false});
} catch(err){}
document.addEventListener('contextmenu', function(e){ 
  try { e.preventDefault(); } catch(err){} 
});

// ===================== STARS =====================
(function(){
  const s=document.getElementById('stars');
  for(let i=0;i<60;i++){
    const d=document.createElement('div'); d.className='star';
    const sz=Math.random()*2+1;
    d.style.cssText=`width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${(Math.random()*3+2).toFixed(1)}s;animation-delay:${(Math.random()*3).toFixed(1)}s`;
    s.appendChild(d);
  }
})();

// ===================== GLOBAL INVENTORY =====================
// Pociones persisten entre batallas y farmeo
let INV = { red:10, blue:10, green:10 };
let PLAYER_HP = { hp:300, maxHp:300 };

// ===================== INVENTORY & RECIPE SYSTEM =====================
// Inventory: 10 slots, stores item objects
// Sawblade recipe: needs 4 parts or 1 complete drop (30% chance on boss kill)
const MAX_INV_SLOTS = 10;
let INVENTORY = []; // array of item objects, max 10

const RECIPE_ITEMS = {
  sawblade_part: {
    id:'sawblade_part', name:'Fragmento Serrucho',
    emoji:'🔧', desc:'Parte de la receta del Ataque Serrucho. Reuniendo 4 fragmentos se completa la receta.',
    stackable: true
  },
  sawblade_recipe: {
    id:'sawblade_recipe', name:'Receta: Ataque Serrucho',
    emoji:'📜', desc:'La receta completa del Ataque Serrucho. ¡Hechizo desbloqueado!',
    stackable: false
  }
};

// Persistent data via localStorage
function saveProfile(){
  try {
    localStorage.setItem('sb_inventory', JSON.stringify(INVENTORY));
  } catch(e){}
}
function loadProfile(){
  try {
    const d = localStorage.getItem('sb_inventory');
    if(d) INVENTORY = JSON.parse(d);
  } catch(e){ INVENTORY = []; }
}

// ===================== PROGRESION DE JEFES =====================
// Orden acumulativo: cada imagen incluye todas las victorias anteriores
const BOSS_PROGRESSION = [
  { boss: 'troll',  video: 'menu_troll.mp4'  },
  { boss: 'medusa', video: 'menu_medusa.mp4' },
];

let defeatedBosses = [];

function saveDefeatedBosses(){
  try { localStorage.setItem('sb_defeated_bosses', JSON.stringify(defeatedBosses)); } catch(e){}
}
function loadDefeatedBosses(){
  try {
    const d = localStorage.getItem('sb_defeated_bosses');
    if(d) defeatedBosses = JSON.parse(d);
  } catch(e){ defeatedBosses = []; }
}
function markBossDefeated(bossType){
  if(!defeatedBosses.includes(bossType)){
    defeatedBosses.push(bossType);
    saveDefeatedBosses();
  }
}
function updateMenuBackground(){
  const video = document.getElementById('menu-video');
  if(!video) return;
  // Buscar el último video de progresión desbloqueado
  let activeVideo = 'menu_video.mp4'; // default
  for(const step of BOSS_PROGRESSION){
    if(defeatedBosses.includes(step.boss)) activeVideo = step.video;
  }
  const source = video.querySelector('source');
  if(source && source.src !== activeVideo){
    source.src = activeVideo;
    video.load();
    video.play().catch(()=>{});
  }
}

function getSawbladeParts(){
  const item = INVENTORY.find(i => i.id === 'sawblade_part');
  return item ? (item.qty || 1) : 0;
}
function hasSawbladeRecipe(){
  return INVENTORY.some(i => i.id === 'sawblade_recipe');
}
function sawbladeUnlocked(){
  return hasSawbladeRecipe() || getSawbladeParts() >= 4;
}

function addToInventory(itemId, qty){
  qty = qty || 1;
  const def = RECIPE_ITEMS[itemId];
  if(!def) return false;

  // If stackable, merge with existing
  if(def.stackable){
    const existing = INVENTORY.find(i => i.id === itemId);
    if(existing){ existing.qty = (existing.qty||1) + qty; saveProfile(); return true; }
  }

  // Check if already have non-stackable
  if(!def.stackable && INVENTORY.some(i => i.id === itemId)) return false;

  // Check slots
  if(INVENTORY.filter(i => i.stackable ? false : true).length >= MAX_INV_SLOTS &&
     !def.stackable) return false;

  INVENTORY.push({ id:itemId, qty:def.stackable?qty:1 });
  saveProfile();
  return true;
}

// Render inventory screen
function renderInventory(){
  const grid = document.getElementById('inv-grid');
  if(!grid) return;
  grid.innerHTML = '';
  for(let i=0; i<MAX_INV_SLOTS; i++){
    const item = INVENTORY[i];
    const slot = document.createElement('div');
    if(item){
      const def = RECIPE_ITEMS[item.id] || {};
      slot.className = 'inv-slot filled';
      slot.innerHTML =
        '<div class="slot-emoji">'+def.emoji+'</div>'+
        '<div class="slot-label">'+(def.stackable && item.qty>1 ? '×'+item.qty : def.name.split(' ')[0])+'</div>';
      slot.onclick = () => showInvDetail(item);
    } else {
      slot.className = 'inv-slot empty';
      slot.innerHTML = '<div class="slot-emoji">📦</div>';
    }
    grid.appendChild(slot);
  }
  document.getElementById('inv-detail').classList.remove('show');
}

function showInvDetail(item){
  const def = RECIPE_ITEMS[item.id] || {};
  const detail = document.getElementById('inv-detail');
  detail.classList.add('show');
  document.getElementById('inv-detail-name').textContent = def.emoji + ' ' + def.name;
  document.getElementById('inv-detail-desc').textContent = def.desc;

  if(item.id === 'sawblade_part'){
    const parts = getSawbladeParts();
    const pipsHtml = [0,1,2,3].map(i =>
      '<div class="parts-pip'+(i<parts?' filled':'')+'"></div>'
    ).join('');
    document.getElementById('inv-detail-status').innerHTML =
      parts>=4 ? '<span style="color:#60ff80">✅ Receta completa — desbloqueada!</span>'
               : '<span style="color:var(--gold)">'+parts+'/4 partes recolectadas</span>';
    document.getElementById('inv-detail-progress').innerHTML =
      '<div class="parts-bar">'+pipsHtml+'</div>';
  } else if(item.id === 'sawblade_recipe'){
    document.getElementById('inv-detail-status').innerHTML =
      '<span style="color:#60ff80">✅ Receta completa — hechizo desbloqueado!</span>';
    document.getElementById('inv-detail-progress').innerHTML = '';
  }
}

// Update sawblade recipe card in libro
function updateSawbladeRecipeCard(){
  const parts = getSawbladeParts();
  const unlocked = sawbladeUnlocked();
  const card = document.getElementById('rc-card-sawblade');
  if(card) card.classList.toggle('locked', !unlocked);

  const label = document.getElementById('sawblade-parts-label');
  if(label) label.textContent = (unlocked ? '4' : parts) + '/4 partes';

  for(let i=0;i<4;i++){
    const pip = document.getElementById('sawblade-pip-'+i);
    if(pip) pip.classList.toggle('filled', i < parts || unlocked);
  }
  const badge = document.getElementById('sawblade-unlocked-badge');
  const bar   = document.getElementById('sawblade-unlock-bar');
  if(badge){ badge.style.display = unlocked ? 'inline-block' : 'none'; }
  if(bar)  { bar.style.display   = unlocked ? 'none'        : 'block';  }

  // Draw sawblade recipe canvas
  drawRecipe('rc-sawblade','sawblade');
}

// Show sawblade uses in battle
function updateSawbladeUsesDisplay(){
  const el = document.getElementById('sawblade-uses');
  if(!el) return;
  if(sawbladeUnlocked() && G.sawbladeUsesLeft > 0){
    el.style.display = 'block';
    document.getElementById('sawblade-uses-count').textContent = G.sawbladeUsesLeft+'/2';
  } else if(sawbladeUnlocked() && G.sawbladeUsesLeft === 0){
    el.style.display = 'block';
    el.style.color = '#606060';
    document.getElementById('sawblade-uses-count').textContent = '0/2 (agotado)';
  } else {
    el.style.display = 'none';
  }
}

// Drop notification
function showRecipeDrop(isComplete){
  const el = document.createElement('div');
  el.className = 'drop-recipe-float';
  if(isComplete){
    el.innerHTML = '<div style="font-size:22px">📜</div><div style="color:var(--gold);font-size:13px;font-weight:bold">¡RECETA COMPLETA!</div><div style="font-size:10px;color:var(--cyan)">Ataque Serrucho desbloqueado</div>';
  } else {
    const parts = getSawbladeParts();
    el.innerHTML = '<div style="font-size:22px">🔧</div><div style="color:var(--gold);font-size:13px;font-weight:bold">¡Fragmento de Receta!</div><div style="font-size:10px;color:var(--muted)">'+parts+'/4 partes</div>';
  }
  document.getElementById('game').appendChild(el);
  setTimeout(()=>el.remove(), 2600);
}

// ===================== SCREENS =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}

function goToMenu() {
  gameActive = false;
  farmActive = false;
  clearTimerInterval();
  stopTurnTimer();
  stopFarmTimer();
  closeMenuConfirm();
  document.getElementById('end-overlay').style.display='none';
  if(canvasCtx){ const c=document.getElementById('draw-canvas'); canvasCtx.clearRect(0,0,c.width,c.height); }
  if(farmCtx){ const c=document.getElementById('farm-draw-canvas'); farmCtx.clearRect(0,0,c.width,c.height); }
  G.currentDrawings=[];
  FG.drawings=[];
  updateMenuPreview();
  updateMenuBackground();
  showScreen('menu');
}

function updateMenuPreview() {
  document.getElementById('mp-red').textContent=INV.red;
  document.getElementById('mp-blue').textContent=INV.blue;
  document.getElementById('mp-green').textContent=INV.green;
  const hpText=document.getElementById('menu-hp-text');
  const hpFill=document.getElementById('menu-hp-bar-fill');
  if(hpText) hpText.textContent=PLAYER_HP.hp+' / '+PLAYER_HP.maxHp;
  if(hpFill) hpFill.style.width=(PLAYER_HP.hp/PLAYER_HP.maxHp*100)+'%';
}

function dismissIntro() {
  document.getElementById('intro-overlay').style.display='none';
}

// ===================== BATTLE STATE =====================
const SPELLS = {
  basic_attack:{ name:'Golpe Arcano',    potions:{red:1},           damage:[25,50]         },
  attack:      { name:'Bola de Fuego',   potions:{red:2},           damage:[50,100]        },
  heal:        { name:'Curación Élfica', potions:{green:1},         heal:[40,80]           },
  shield:      { name:'Escudo Arcano',   potions:{blue:1},          shield:50              },
  lightning:   { name:'Rayo Arcano',     potions:{red:1,blue:1},    damage:[40,70]         },
  poison:      { name:'Veneno Oscuro',   potions:{green:1,red:1},   poisonDmg:20, poisonTurns:3 },
  sawblade:    { name:'Ataque Serrucho', potions:{red:2,blue:1},    special:true           },
};
const ENEMY_CONFIGS = {
  troll: {
    name: 'TROLL OSCURO',
    emoji: '👹',
    hp: 500,
    actions: [
      {type:'attack',label:'¡ATACA!',   dmg:[30,60]},
      {type:'attack',label:'¡EMBISTE!', dmg:[40,80]},
      {type:'attack',label:'¡GOLPE!',   dmg:[20,50]},
      {type:'attack',label:'¡ZARPAZO!', dmg:[35,70]},
    ],
    hasMedusaGaze: false,
  },
  medusa: {
    name: 'MEDUSA',
    emoji: '🐍',
    hp: 1000,
    actions: [
      {type:'attack',label:'¡GOLPE DOBLE!', dmg:[60,120]},
      {type:'attack',label:'¡VENENO!',       dmg:[80,160]},
      {type:'heal',  label:'SE REGENERA...', heal:[100,160]},
      {type:'attack',label:'¡ZARPAZO!',      dmg:[40,100]},
      {type:'heal',  label:'¡CURA OSCURA!',  heal:[60,120]},
    ],
    hasMedusaGaze: true,
  }
};
let selectedEnemyType = 'troll';
const ENEMY_ACTIONS = ENEMY_CONFIGS.troll.actions; // fallback

function selectEnemy(type, btn){
  selectedEnemyType = type;
  if(btn){
    document.querySelectorAll('.enemy-select-btn').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
  }
}

let G = {};
let timerInterval=null, timerLeft=0;
let turnTimerInterval=null, turnTimeLeft=10;
let isDrawing=false, drawPath=[];
let selectedPotion='red';
let canvasCtx;
let gameActive=false;

function initBattleState() {
  const ec = ENEMY_CONFIGS[selectedEnemyType];
  G = {
    playerHp:PLAYER_HP.hp, playerMaxHp:PLAYER_HP.maxHp,
    enemyHp:ec.hp,  enemyMaxHp:ec.hp,
    enemyType:selectedEnemyType,
    shieldHp:0,
    potions:{ red:INV.red, blue:INV.blue, green:INV.green },
    currentDrawings:[],
    phase:'player',
    turnCount:0,
    nextEnemyAction:null,
    sawbladeUsesLeft:2,
    poisonTurns:0
  };
}

function goToBattle() {
  showScreen('battle');
  initBattleState();
  const ec = ENEMY_CONFIGS[selectedEnemyType];
  // Update enemy name label
  const nameEl = document.getElementById('enemy-name-label');
  if(nameEl) nameEl.textContent = ec.emoji+' '+ec.name;
  document.getElementById('enemy-hp-text').textContent = ec.hp+' / '+ec.hp;
  // Show correct sprite
  const trollImg = document.getElementById('troll-img');
  const mClosed  = document.querySelector('.medusa-closed');
  const mOpen    = document.querySelector('.medusa-open');
  if(selectedEnemyType==='medusa'){
    if(trollImg) trollImg.style.display='none';
    if(mClosed)  mClosed.style.display='block';
    if(mOpen)    mOpen.style.display='none';
  } else {
    if(trollImg) trollImg.style.display='block';
    if(mClosed)  mClosed.style.display='none';
    if(mOpen)    mOpen.style.display='none';
  }
  // Start medusa gaze if needed
  if(ec.hasMedusaGaze) startMedusaGaze();
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ setupCanvas(); setTimeout(drawSpellGuide,100); }); });
  updateSawbladeUsesDisplay();
  announceEnemyNext();
  updateBattleUI();
  addLog('¡La batalla comienza!','system');
  gameActive=true;
  startTurnTimer();
}

function restartGame() {
  document.getElementById('end-overlay').style.display='none';
  PLAYER_HP.hp = 300; PLAYER_HP.maxHp = 300;
  TEMPLE_COINS = COINS_START;
  clearTimerInterval(); stopTurnTimer();
  goToBattle();
}

// ===================== BATTLE CANVAS =====================
function setupCanvas() {
  const cont=document.getElementById('canvas-container');
  const canvas=document.getElementById('draw-canvas');
  // Use actual rendered size; fallback to computed if 0
  const w=cont.offsetWidth||cont.clientWidth||300;
  const h=cont.offsetHeight||cont.clientHeight||120;
  canvas.width=w; canvas.height=h;
  canvas.style.width=w+'px'; canvas.style.height=h+'px';
  canvasCtx=canvas.getContext('2d');
  // Remove old listeners before re-adding
  const fresh=canvas.cloneNode(false);
  cont.replaceChild(fresh,canvas);
  canvasCtx=fresh.getContext('2d');
  fresh.addEventListener('pointerdown',onPointerDown,{passive:false});
  fresh.addEventListener('pointermove',onPointerMove,{passive:false});
  fresh.addEventListener('pointerup',onPointerUp,{passive:false});
  fresh.addEventListener('pointercancel',onPointerUp,{passive:false});
  // Touch fallback for iOS Safari
  try {
    fresh.addEventListener('touchstart', function(e){ try{e.preventDefault();}catch(err){} onPointerDown(e.touches[0]); },{passive:false});
    fresh.addEventListener('touchmove',  function(e){ try{e.preventDefault();}catch(err){} onPointerMove(e.touches[0]); },{passive:false});
    fresh.addEventListener('touchend',   function(e){ try{e.preventDefault();}catch(err){} onPointerUp(e.changedTouches[0]); },{passive:false});
  } catch(err){}
}

function getPos(e){
  // Works for both PointerEvent and Touch
  const target = e.target || e.srcElement;
  const r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : {left:0,top:0};
  const clientX = e.clientX !== undefined ? e.clientX : (e.pageX||0);
  const clientY = e.clientY !== undefined ? e.clientY : (e.pageY||0);
  return {x: clientX - r.left, y: clientY - r.top};
}

function onPointerDown(e) {
  if(!gameActive||G.phase!=='player') return;
  try{ if(e&&e.preventDefault) e.preventDefault(); }catch(err){}
  isDrawing=true; drawPath=[getPos(e)];
  document.getElementById('canvas-hint').classList.add('hidden');
  startTimer();
  const col = potionColor(selectedPotion);
  canvasCtx.beginPath();
  canvasCtx.strokeStyle = col;
  canvasCtx.lineWidth = 7;
  canvasCtx.lineCap = 'round'; canvasCtx.lineJoin = 'round';
  canvasCtx.shadowColor = col; canvasCtx.shadowBlur = 18;
  canvasCtx.globalAlpha = 0.95;
  canvasCtx.moveTo(drawPath[0].x, drawPath[0].y);
  document.getElementById('canvas-container').classList.add('casting');
}
function onPointerMove(e) {
  if(!isDrawing) return;
  try{ if(e&&e.preventDefault) e.preventDefault(); }catch(err){}
  const pos=getPos(e); drawPath.push(pos);
  canvasCtx.lineTo(pos.x,pos.y); canvasCtx.stroke();
  canvasCtx.beginPath(); canvasCtx.moveTo(pos.x,pos.y);
}
function onPointerUp(e) {
  if(!isDrawing) return; isDrawing=false;
  G.currentDrawings.push({potion:selectedPotion,path:[...drawPath]}); drawPath=[];
}

function clearCanvas() {
  if(!canvasCtx) return;
  const c=document.getElementById('draw-canvas');
  canvasCtx.clearRect(0,0,c.width,c.height);
  canvasCtx.globalAlpha=1;
  G.currentDrawings=[];
  document.getElementById('canvas-hint').classList.remove('hidden');
  document.getElementById('canvas-container').classList.remove('casting','success','fail');
  clearTimerInterval();
  document.getElementById('timer-display').textContent='—';
  document.getElementById('timer-display').classList.remove('urgent');
  document.getElementById('action-result').textContent='';
  requestAnimationFrame(drawSpellGuide);
}

function potionColor(p){ return {red:'#ff4040',blue:'#4080ff',green:'#40d060'}[p]||'#fff'; }

// ===================== DRAW TIMER (3s) =====================
function startTimer() {
  if(timerInterval) return;
  timerLeft=3;
  updateTimerDisplay();
  timerInterval=setInterval(()=>{
    timerLeft-=0.1; updateTimerDisplay();
    if(timerLeft<=1) document.getElementById('timer-display').classList.add('urgent');
    if(timerLeft<=0){
      clearTimerInterval();
      document.getElementById('action-result').textContent='Tiempo de dibujo agotado';
      document.getElementById('canvas-container').classList.add('fail');
      setTimeout(clearCanvas,600);
    }
  },100);
}
function clearTimerInterval(){ if(timerInterval){clearInterval(timerInterval);timerInterval=null;} document.getElementById('timer-display').classList.remove('urgent'); }
function updateTimerDisplay(){ document.getElementById('timer-display').textContent=timerLeft>0?timerLeft.toFixed(1):'0.0'; }

// ===================== TURN TIMER (10s) =====================
function startTurnTimer() {
  stopTurnTimer(); turnTimeLeft=10; updateTurnTimerBar();
  turnTimerInterval=setInterval(()=>{
    turnTimeLeft-=0.1; updateTurnTimerBar();
    if(turnTimeLeft<=0){
      stopTurnTimer();
      if(gameActive&&G.phase==='player'){
        addLog('Turno perdido por inaccion','system');
        setResult('Tiempo de turno agotado!');
        clearCanvas();
        G.phase='enemy'; G.turnCount++;
        setTimeout(doEnemyTurn,600);
      }
    }
  },100);
}
function stopTurnTimer(){ if(turnTimerInterval){clearInterval(turnTimerInterval);turnTimerInterval=null;} const f=document.getElementById('turn-timer-fill'); if(f){f.style.width='100%';f.classList.remove('low');} }
function updateTurnTimerBar(){
  const f=document.getElementById('turn-timer-fill'), l=document.getElementById('turn-timer-label');
  if(!f) return;
  f.style.width=Math.max(0,(turnTimeLeft/10)*100)+'%';
  l.textContent='TURNO '+Math.ceil(Math.max(0,turnTimeLeft))+'s';
  if(turnTimeLeft<=3) f.classList.add('low'); else f.classList.remove('low');
}

// ===================== SPELL RECOGNITION — GEOMETRY =====================

// ── Utilidades geométricas ──
function pathBBox(path){
  const xs=path.map(p=>p.x), ys=path.map(p=>p.y);
  return { minX:Math.min(...xs), maxX:Math.max(...xs),
           minY:Math.min(...ys), maxY:Math.max(...ys),
           w:Math.max(...xs)-Math.min(...xs),
           h:Math.max(...ys)-Math.min(...ys) };
}
function pathLength(path){
  let len=0;
  for(let i=1;i<path.length;i++)
    len+=Math.hypot(path[i].x-path[i-1].x, path[i].y-path[i-1].y);
  return len;
}
function closureRatio(path){
  // Qué tan cerrado está el trazo (0=abierto, 1=cerrado)
  if(path.length<4) return 0;
  const d=Math.hypot(path[0].x-path[path.length-1].x, path[0].y-path[path.length-1].y);
  const bb=pathBBox(path);
  const diag=Math.hypot(bb.w,bb.h)||1;
  return 1 - Math.min(1, d/diag);
}
function aspectRatio(path){
  const bb=pathBBox(path);
  if(!bb.h) return 999;
  return bb.w/bb.h;
}
function isCircle(path){
  if(path.length<12) return false;
  const bb=pathBBox(path);
  const diag=Math.hypot(bb.w,bb.h);
  if(diag<20) return false;
  // 1. Closure: inicio y fin cerca
  const closure=closureRatio(path);
  if(closure<0.55) return false;
  // 2. Aspect ratio cercano a 1 (no muy alargado)
  const ar=aspectRatio(path);
  if(ar>3.5 || ar<0.25) return false;
  // 3. Perímetro vs bounding box: un círculo tiene perímetro ~π*d
  const cx=(bb.minX+bb.maxX)/2, cy=(bb.minY+bb.maxY)/2;
  const r=Math.max(bb.w,bb.h)/2;
  const expectedPerim=2*Math.PI*r;
  const actualLen=pathLength(path);
  const perimRatio=actualLen/expectedPerim;
  return perimRatio>0.55 && perimRatio<2.2;
}
function isSquare(path){
  if(path.length<8) return false;
  const bb=pathBBox(path);
  if(bb.w<25||bb.h<25) return false;
  // Aspect ratio cuadrado
  const ar=aspectRatio(path);
  if(ar<0.4||ar>2.8) return false;
  // Closure: cuadrado debe cerrarse
  const cl=closureRatio(path);
  if(cl<0.45) return false;
  // Ángulos rectos: contar cambios de dirección bruscos
  let corners=0;
  const step=Math.max(1,Math.floor(path.length/20));
  for(let i=step;i<path.length-step;i+=step){
    const dx1=path[i].x-path[i-step].x, dy1=path[i].y-path[i-step].y;
    const dx2=path[i+step].x-path[i].x, dy2=path[i+step].y-path[i].y;
    const len1=Math.hypot(dx1,dy1)||1, len2=Math.hypot(dx2,dy2)||1;
    const dot=(dx1*dx2+dy1*dy2)/(len1*len2);
    if(dot>-0.5&&dot<0.4) corners++; // cambio de dirección ~90°
  }
  return corners>=2;
}
function isZigzag(path){
  // Detecta zig-zag: mínimo 2 cambios de dirección horizontal pronunciados (picos)
  if(path.length<10) return false;
  const bb=pathBBox(path);
  if(bb.w<40||bb.h<15) return false;
  // Debe ser más ancho que alto (horizontal)
  if(bb.w < bb.h*0.8) return false;
  // Contar picos: puntos donde la dirección Y se invierte
  let peaks=0;
  const step=Math.max(1,Math.floor(path.length/12));
  for(let i=step;i<path.length-step;i+=step){
    const dy1=path[i].y-path[i-step].y;
    const dy2=path[i+step].y-path[i].y;
    // Inversión de Y = pico
    if(dy1*dy2 < -30) peaks++;
  }
  return peaks>=2; // al menos 2 picos = 3 dientes
}

function isHorizontalLine(path){
  if(path.length<4) return false;
  const bb=pathBBox(path);
  if(bb.w<40) return false;
  return bb.w > bb.h*2.5 && closureRatio(path)<0.5;
}
function isVerticalLine(path){
  if(path.length<4) return false;
  const bb=pathBBox(path);
  if(bb.h<40) return false;
  return bb.h > bb.w*2.5 && closureRatio(path)<0.5;
}
function isX(paths){
  // X = 2 trazos diagonales que se superponen en el espacio
  if(!paths || paths.length===0) return false;
  if(paths.length>=2){
    const bb1=pathBBox(paths[0]), bb2=pathBBox(paths[1]);
    if(Math.hypot(bb1.w,bb1.h)<20 || Math.hypot(bb2.w,bb2.h)<20) return false;
    const overlapX=Math.min(bb1.maxX,bb2.maxX)-Math.max(bb1.minX,bb2.minX);
    const overlapY=Math.min(bb1.maxY,bb2.maxY)-Math.max(bb1.minY,bb2.minY);
    return overlapX>10 && overlapY>10;
  }
  // Trazo único: detectar cambio de dirección diagonal (forma de V diagonal)
  const path=paths[0];
  if(path.length<8) return false;
  const bb=pathBBox(path);
  if(bb.w<25||bb.h<25) return false;
  let reversals=0;
  const step=Math.max(1,Math.floor(path.length/10));
  for(let i=step;i<path.length-step;i+=step){
    const dx1=path[i].x-path[i-step].x, dy1=path[i].y-path[i-step].y;
    const dx2=path[i+step].x-path[i].x, dy2=path[i+step].y-path[i].y;
    if(dx1*dx2<-80 || dy1*dy2<-80) reversals++;
  }
  return reversals>=1;
}
function isTriangle(path){
  if(path.length<8) return false;
  const bb=pathBBox(path);
  if(bb.w<25||bb.h<25) return false;
  // Triangulo puede estar abierto o cerrado
  // Buscar exactamente 2-3 cambios de dirección bruscos
  let corners=0;
  const step=Math.max(1,Math.floor(path.length/15));
  for(let i=step;i<path.length-step;i+=step){
    const dx1=path[i].x-path[i-step].x, dy1=path[i].y-path[i-step].y;
    const dx2=path[i+step].x-path[i].x, dy2=path[i+step].y-path[i].y;
    const len1=Math.hypot(dx1,dy1)||1, len2=Math.hypot(dx2,dy2)||1;
    const dot=(dx1*dx2+dy1*dy2)/(len1*len2);
    if(dot>-0.6&&dot<0.35) corners++;
  }
  return corners>=2 && corners<=5;
}

// ── Motor principal de reconocimiento ──
function analyzeDrawings(drawings){
  if(!drawings.length) return null;
  const byPotion={};
  drawings.forEach(d=>{
    if(!byPotion[d.potion]) byPotion[d.potion]=[];
    byPotion[d.potion].push(d.path);
  });
  const hasRed=!!byPotion.red, hasBlue=!!byPotion.blue, hasGreen=!!byPotion.green;

  // ── SERRUCHO: zigzag ROJO solo (desbloqueado y con usos) ──
  if(hasRed && !hasBlue && !hasGreen && sawbladeUnlocked() && G.sawbladeUsesLeft>0){
    if(byPotion.red.some(p=>isZigzag(p))) return 'sawblade';
  }

  // ── ROJO solo ──
  if(hasRed && !hasBlue && !hasGreen){
    if(byPotion.red.some(p=>isCircle(p))) return 'attack';      // Bola de Fuego
    if(isX(byPotion.red)) return 'basic_attack';                 // Golpe Arcano
    return 'basic_attack';                                       // fallback rojo
  }

  // ── AZUL solo → Escudo ──
  if(hasBlue && !hasRed && !hasGreen) return 'shield';

  // ── VERDE solo → Curación ──
  if(hasGreen && !hasRed && !hasBlue) return 'heal';

  // ── ROJO + AZUL → Rayo Arcano ──
  if(hasRed && hasBlue && !hasGreen) return 'lightning';

  // ── VERDE + ROJO → Veneno Oscuro ──
  if(hasGreen && hasRed) return 'poison';

  return null;
}

// ── Dibuja la guía fantasma en el canvas de guía ──
function drawSpellGuide(){
  const guide=document.getElementById('draw-guide-canvas');
  if(!guide) return;
  const cont=document.getElementById('canvas-container');
  guide.width=cont.offsetWidth||300;
  guide.height=cont.offsetHeight||160;
  guide.style.width=guide.width+'px';
  guide.style.height=guide.height+'px';
  const ctx=guide.getContext('2d');
  ctx.clearRect(0,0,guide.width,guide.height);
  const w=guide.width, h=guide.height;
  const cx=w/2, cy=h/2;

  ctx.save();
  ctx.setLineDash([6,5]);
  ctx.lineWidth=9; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.font='9px Cinzel,serif'; ctx.textAlign='center';

  if(selectedPotion==='red'){
    // Show circle (bola de fuego) top, X (golpe) bottom, zigzag if unlocked
    if(sawbladeUnlocked()){
      // Three options: circle, X, zigzag
      // Circle top-left
      ctx.strokeStyle='rgba(255,80,80,0.55)';
      const r=Math.min(w,h)*0.15;
      ctx.beginPath(); ctx.arc(w*0.28, h*0.28, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(255,130,80,0.65)';
      ctx.fillText('Círculo=🔥fuego',w*0.28,h*0.28+r+11);
      // X top-right
      ctx.strokeStyle='rgba(255,80,80,0.55)';
      const xs=w*0.65, ys=h*0.18, xr=w*0.12;
      ctx.beginPath(); ctx.moveTo(xs-xr,ys-xr); ctx.lineTo(xs+xr,ys+xr); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xs+xr,ys-xr); ctx.lineTo(xs-xr,ys+xr); ctx.stroke();
      ctx.fillStyle='rgba(255,130,80,0.65)';
      ctx.fillText('X=⚡golpe',xs,ys+xr+14);
      // Zigzag bottom
      ctx.strokeStyle='rgba(255,160,60,0.55)';
      const peaks=3, amp=h*0.1, sx=w*0.1, ex=w*0.9, zy=h*0.72;
      const segW=(ex-sx)/peaks;
      ctx.beginPath(); ctx.moveTo(sx,zy);
      for(let i=0;i<peaks;i++){
        ctx.lineTo(sx+segW*(i+0.5),zy-amp);
        ctx.lineTo(sx+segW*(i+1),zy+amp);
      }
      ctx.stroke();
      ctx.fillStyle='rgba(255,160,60,0.65)';
      ctx.fillText('Zigzag=🔱serrucho',cx,zy+amp+13);
    } else {
      // Two options: circle (top) and X (bottom)
      ctx.strokeStyle='rgba(255,80,80,0.6)';
      const r=Math.min(w,h)*0.2;
      ctx.beginPath(); ctx.arc(cx, h*0.32, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle='rgba(255,130,80,0.7)';
      ctx.fillText('Círculo = 🔥 Bola de Fuego (🔴×2)',cx,h*0.32+r+12);
      // X
      const xs=cx, ys=h*0.72, xr=w*0.15;
      ctx.strokeStyle='rgba(255,80,80,0.6)';
      ctx.beginPath(); ctx.moveTo(xs-xr,ys-xr); ctx.lineTo(xs+xr,ys+xr); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xs+xr,ys-xr); ctx.lineTo(xs-xr,ys+xr); ctx.stroke();
      ctx.fillStyle='rgba(255,130,80,0.7)';
      ctx.fillText('X = ⚡ Golpe Arcano (🔴×1)',cx,ys+xr+12);
    }
  } else if(selectedPotion==='blue'){
    // Horizontal line → Escudo
    ctx.strokeStyle='rgba(80,130,255,0.65)';
    const ly=h*0.38;
    ctx.beginPath(); ctx.moveTo(w*0.15,ly); ctx.lineTo(w*0.85,ly); ctx.stroke();
    ctx.fillStyle='rgba(120,160,255,0.8)';
    ctx.fillText('Línea horizontal = 🛡️ Escudo (🔵×1)',cx,ly+16);
    // Small hint for lightning
    ctx.strokeStyle='rgba(80,130,255,0.3)';
    ctx.fillStyle='rgba(120,160,255,0.45)';
    ctx.fillText('+ Poción 🔴 roja = 🌩️ Rayo',cx,h*0.72);
  } else if(selectedPotion==='green'){
    // Vertical line → Curación
    ctx.strokeStyle='rgba(60,200,100,0.65)';
    const lx=cx;
    ctx.beginPath(); ctx.moveTo(lx,h*0.18); ctx.lineTo(lx,h*0.72); ctx.stroke();
    ctx.fillStyle='rgba(100,230,130,0.8)';
    ctx.fillText('Línea vertical = 💚 Curación (🟢×1)',cx,h*0.8);
    // Small hint for poison
    ctx.fillStyle='rgba(100,230,130,0.4)';
    ctx.fillText('+ Poción 🔴 roja = 🔺 Veneno',cx,h*0.9);
  }

  ctx.restore();
}

// ── Recetas ──
function openRecipes(){
  document.getElementById('recipes-overlay').classList.add('show');
  requestAnimationFrame(()=>{ drawRecipeCanvases(); updateSawbladeRecipeCard(); });
}
function closeRecipes(){
  document.getElementById('recipes-overlay').classList.remove('show');
}
function drawRecipeCanvases(){
  drawRecipe('rc-basic',     'basic');
  drawRecipe('rc-attack',    'attack');
  drawRecipe('rc-heal',      'heal');
  drawRecipe('rc-shield',    'shield');
  drawRecipe('rc-lightning', 'lightning');
  drawRecipe('rc-poison',    'poison');
  drawRecipe('rc-sawblade',  'sawblade');
}
function drawRecipe(canvasId, type){
  const canvas=document.getElementById(canvasId);
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle='rgba(20,10,35,0.8)';
  ctx.beginPath(); ctx.roundRect(0,0,w,h,8); ctx.fill();
  const cx=w/2, cy=h/2;
  ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.setLineDash([]);
  ctx.shadowBlur=0;

  if(type==='basic'){
    // X roja
    ctx.strokeStyle='#ff5050'; ctx.shadowColor='#ff5050'; ctx.shadowBlur=8;
    const r=22;
    ctx.beginPath(); ctx.moveTo(cx-r,cy-r); ctx.lineTo(cx+r,cy+r); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+r,cy-r); ctx.lineTo(cx-r,cy+r); ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#ff8080'; ctx.fillText('🔴×1',cx,cy+r+13);
  }
  else if(type==='attack'){
    // Círculo rojo (sin punto)
    ctx.strokeStyle='#ff5050'; ctx.shadowColor='#ff5050'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(cx,cy-4,22,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#ff8080'; ctx.fillText('🔴×2',cx,cy+26);
  }
  else if(type==='heal'){
    // Línea vertical verde
    ctx.strokeStyle='#50d080'; ctx.shadowColor='#50d080'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(cx,cy-26); ctx.lineTo(cx,cy+22); ctx.stroke();
    // Flecha arriba
    ctx.beginPath(); ctx.moveTo(cx-10,cy-16); ctx.lineTo(cx,cy-28); ctx.lineTo(cx+10,cy-16); ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#80e080'; ctx.fillText('🟢×1',cx,cy+34);
  }
  else if(type==='shield'){
    // Línea horizontal azul
    ctx.strokeStyle='#5080ff'; ctx.shadowColor='#5080ff'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.moveTo(cx-28,cy); ctx.lineTo(cx+28,cy); ctx.stroke();
    // Flechitas en extremos
    ctx.beginPath(); ctx.moveTo(cx-18,cy-8); ctx.lineTo(cx-28,cy); ctx.lineTo(cx-18,cy+8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+18,cy-8); ctx.lineTo(cx+28,cy); ctx.lineTo(cx+18,cy+8); ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#8080ff'; ctx.fillText('🔵×1',cx,cy+20);
  }
  else if(type==='lightning'){
    // Zigzag rojo + azul
    ctx.strokeStyle='#ff5050'; ctx.shadowColor='#ff5050'; ctx.shadowBlur=8;
    const peaks=2, amp=16, sx=10, ex=w*0.55, zy=cy;
    const segW=(ex-sx)/peaks;
    ctx.beginPath(); ctx.moveTo(sx,zy);
    for(let i=0;i<peaks;i++){
      ctx.lineTo(sx+segW*(i+0.5),zy-amp);
      ctx.lineTo(sx+segW*(i+1),zy+amp);
    }
    ctx.stroke();
    ctx.strokeStyle='#6090ff'; ctx.shadowColor='#6090ff';
    const sx2=w*0.58, ex2=w-10;
    const segW2=(ex2-sx2)/peaks;
    ctx.beginPath(); ctx.moveTo(sx2,zy);
    for(let i=0;i<peaks;i++){
      ctx.lineTo(sx2+segW2*(i+0.5),zy-amp);
      ctx.lineTo(sx2+segW2*(i+1),zy+amp);
    }
    ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#ff8080'; ctx.fillText('🔴×1',cx-18,cy+amp+14);
    ctx.fillStyle='#8080ff'; ctx.fillText('🔵×1',cx+18,cy+amp+14);
  }
  else if(type==='poison'){
    // Triángulo verde+rojo
    ctx.strokeStyle='#50d080'; ctx.shadowColor='#50d080'; ctx.shadowBlur=8;
    const s=22;
    ctx.beginPath();
    ctx.moveTo(cx,cy-s+2); ctx.lineTo(cx+s,cy+s*0.5); ctx.lineTo(cx-s,cy+s*0.5); ctx.closePath();
    ctx.stroke();
    // Punto rojo en centro
    ctx.fillStyle='#ff5050'; ctx.shadowColor='#ff5050'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(cx,cy+4,5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#80e080'; ctx.fillText('🟢×1',cx-16,cy+s*0.5+14);
    ctx.fillStyle='#ff8080'; ctx.fillText('🔴×1',cx+16,cy+s*0.5+14);
  }
  else if(type==='sawblade'){
    // Zig-zag serrucho rojo
    ctx.strokeStyle='#ff9040'; ctx.shadowColor='#ff9040'; ctx.shadowBlur=10;
    const peaks=3, amplitude=18, startX=10, endX=w-10, midY=cy-4;
    const segW=(endX-startX)/peaks;
    ctx.beginPath(); ctx.moveTo(startX,midY);
    for(let i=0;i<peaks;i++){
      ctx.lineTo(startX+segW*(i+0.5), midY-amplitude);
      ctx.lineTo(startX+segW*(i+1),   midY+amplitude);
    }
    ctx.stroke();
    ctx.shadowBlur=0; ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
    ctx.fillStyle='#ff9040'; ctx.fillText('🔴×2 + 🔵×1',cx,midY+amplitude+14);
  }
}

// ===================== CAST SPELL (BATTLE) =====================
function castSpell() {
  if(!gameActive||G.phase!=='player') return;
  clearTimerInterval();
  const drawings=G.currentDrawings;
  if(!drawings.length){ setResult('Dibuja un hechizo primero!'); return; }
  const spellKey=analyzeDrawings(drawings);
  if(!spellKey){
    setResult('No reconoci ese hechizo...');
    document.getElementById('canvas-container').classList.add('fail');
    flash('red'); setTimeout(clearCanvas,600); return;
  }
  const spell=SPELLS[spellKey];
  for(const [pot,amt] of Object.entries(spell.potions)){
    if(G.potions[pot]<amt){ setResult('Sin pociones de '+potionEmoji(pot)+'!'); setTimeout(clearCanvas,500); return; }
  }
  for(const [pot,amt] of Object.entries(spell.potions)) G.potions[pot]-=amt;

  let txt='';
  if(spellKey==='basic_attack'){
    const dmg=rng(spell.damage[0],spell.damage[1]);
    G.enemyHp=Math.max(0,G.enemyHp-dmg);
    showFloat('-'+dmg,'enemy','dmg'); shakeEnemy(); flash('red');
    txt='Golpe Arcano: '+dmg+' dmg!'; addLog('Golpe Arcano por '+dmg,'player');
  } else if(spellKey==='attack'){
    const dmg=rng(spell.damage[0],spell.damage[1]);
    G.enemyHp=Math.max(0,G.enemyHp-dmg);
    showFloat('-'+dmg,'enemy','dmg'); shakeEnemy(); flash('red');
    txt='Bola de Fuego: '+dmg+' dmg!'; addLog('Bola de Fuego por '+dmg,'player');
  } else if(spellKey==='heal'){
    const h=rng(spell.heal[0],spell.heal[1]);
    G.playerHp=Math.min(G.playerMaxHp,G.playerHp+h);
    showFloat('+'+h,'player','heal'); flash('green');
    txt='Curacion: +'+h+' vida!'; addLog('Te curaste '+h,'player');
  } else if(spellKey==='shield'){
    G.shieldHp=spell.shield;
    showFloat('🛡+'+spell.shield,'player','shield'); flash('blue');
    txt='Escudo: '+spell.shield+' absorcion!'; addLog('Escudo activado','player');
    document.getElementById('shield-indicator').style.display='block';
  } else if(spellKey==='sawblade'){
    // Quita 50% vida enemiga + regenera 20% propia
    const dmg=Math.ceil(G.enemyHp*0.50);
    const healAmt=Math.ceil(G.playerMaxHp*0.20);
    G.enemyHp=Math.max(0,G.enemyHp-dmg);
    G.playerHp=Math.min(G.playerMaxHp,G.playerHp+healAmt);
    G.sawbladeUsesLeft--;
    showFloat('-'+dmg,'enemy','dmg'); shakeEnemy(); flash('red');
    showFloat('+'+healAmt,'player','heal');
    txt='🔱 Serrucho! -'+dmg+' enemigo / +'+healAmt+' vida';
    addLog('Serrucho: -'+dmg+' / +'+healAmt,'player');
    updateSawbladeUsesDisplay();
  } else if(spellKey==='lightning'){
    const dmg=rng(spell.damage[0],spell.damage[1]);
    G.enemyHp=Math.max(0,G.enemyHp-dmg);
    showFloat('-'+dmg,'enemy','dmg'); shakeEnemy(); flash('blue');
    txt='🌩️ Rayo: '+dmg+' dmg!'; addLog('Rayo Arcano por '+dmg,'player');
  } else if(spellKey==='poison'){
    G.poisonTurns=(G.poisonTurns||0)+SPELLS.poison.poisonTurns;
    showFloat('☠️','enemy','dmg'); flash('green');
    txt='🔺 ¡Veneno! '+SPELLS.poison.poisonDmg+' daño/turno ×'+SPELLS.poison.poisonTurns;
    addLog('Veneno oscuro aplicado','player');
  }
  setResult(txt);
  document.getElementById('canvas-container').classList.add('success');
  COINS.spellsCast++;
  earnCoins(10, 'hechizo');
  updateBattleUI();
  if(checkWin()) return;
  setTimeout(clearCanvas,500);
}

function announceEnemyNext(){
  const cfg=ENEMY_CONFIGS[G.enemyType||'troll']; const a=cfg.actions[Math.floor(Math.random()*cfg.actions.length)];
  G.nextEnemyAction=a;
  const b=document.getElementById('enemy-action-bubble');
  b.textContent=a.label; b.classList.add('show');
}

function doEnemyTurn(){
  if(!gameActive) return;
  // ── Aplicar veneno si está activo ──
  if(G.poisonTurns>0){
    const poisonDmg=SPELLS.poison.poisonDmg;
    G.enemyHp=Math.max(0,G.enemyHp-poisonDmg);
    G.poisonTurns--;
    showFloat('☠️-'+poisonDmg,'enemy','dmg');
    addLog('☠️ Veneno: -'+poisonDmg+' al enemigo ('+G.poisonTurns+' turnos restantes)','player');
    updateBattleUI();
    if(checkWin()) return;
  }
  const cfg = ENEMY_CONFIGS[G.enemyType||'troll'];
  showTurn('⚔️ ATAQUE DE ' + cfg.name, 'enemy');
  setTimeout(()=>{
    if(!gameActive) return;
    const a = G.nextEnemyAction || (cfg.actions[0]);
    if(a.type==='attack'){
      let dmg=rng(a.dmg[0],a.dmg[1]);
      if(G.shieldHp>0){
        const abs=Math.min(G.shieldHp,dmg); G.shieldHp-=abs; dmg-=abs;
        if(G.shieldHp<=0){ G.shieldHp=0; document.getElementById('shield-indicator').style.display='none'; }
        addLog('Escudo absorb. '+abs,'system');
      }
      G.playerHp=Math.max(0,G.playerHp-dmg);
      showFloat('-'+dmg,'player','dmg'); flashDamage();
      addLog(cfg.name+' te golpeó por '+dmg,'enemy');
    } else {
      const h=rng(a.heal[0],a.heal[1]);
      G.enemyHp=Math.min(G.enemyMaxHp,G.enemyHp+h);
      healEnemy(); showFloat('+'+h,'enemy','heal');
      addLog(cfg.name+' se curó '+h,'enemy');
    }
    updateBattleUI();
    if(checkLose()) return;
    setTimeout(()=>{
      if(!gameActive) return;
      G.phase='player'; announceEnemyNext();
      showTurn('🧙 TU TURNO', 'player');
      updateBattleUI(); startTurnTimer();
    }, 4200);
  }, 2200);
}

function calcScore(){
  const base       = 10000;
  const hpLost     = G.playerMaxHp - G.playerHp;           // vida perdida
  const hpPenalty  = Math.round(hpLost);                   // -1 pt por HP perdido
  const turnPenalty= G.turnCount * 1000;                   // -1000 por turno
  const total      = Math.max(0, base - hpPenalty - turnPenalty);
  return { base, hpLost, hpPenalty, turnPenalty, total };
}

function getRank(score){
  if(score>=9000) return { label:'⭐ LEGENDARIO',  color:'#ffd700' };
  if(score>=7000) return { label:'💜 MAESTRO',      color:'#c080ff' };
  if(score>=5000) return { label:'🔵 EXPERTO',      color:'#6090ff' };
  if(score>=3000) return { label:'🟢 APRENDIZ',     color:'#60d080' };
  return               { label:'⚪ NOVATO',          color:'#aaaaaa' };
}

function saveRecord(score, turns, hpLeft){
  const records = loadRecords();
  records.push({
    score, turns, hpLeft,
    date: new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'2-digit'}),
    time: new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})
  });
  records.sort((a,b)=>b.score-a.score);
  const top10 = records.slice(0,10);
  try{ localStorage.setItem('spellbound_records', JSON.stringify(top10)); }catch(e){}
  return top10;
}

function loadRecords(){
  try{
    const d = localStorage.getItem('spellbound_records');
    return d ? JSON.parse(d) : [];
  }catch(e){ return []; }
}

function clearRecords(){
  if(confirm('¿Borrar todos los records?')){
    try{ localStorage.removeItem('spellbound_records'); }catch(e){}
    renderRecords();
  }
}

function renderRecords(){
  const list = document.getElementById('records-list');
  if(!list) return;
  const records = loadRecords();
  if(!records.length){
    list.innerHTML = '<div id="records-empty">Todavía no hay records.<br>¡Derrotá al Troll para aparecer acá!</div>';
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  const maxScore = records[0].score || 1;
  list.innerHTML = records.map(function(r,i){
    const rank = getRank(r.score);
    const barW = Math.round((r.score/maxScore)*100);
    const medal = medals[i] || ('#'+(i+1));
    const rankClass = i < 3 ? 'rank-'+(i+1) : '';
    return '<div class="record-row '+rankClass+'">' +
      '<div class="record-rank">'+medal+'</div>' +
      '<div class="record-info">' +
        '<div class="record-score">'+r.score.toLocaleString()+' pts</div>' +
        '<div class="record-detail">' +
          '<span style="color:'+rank.color+'">'+rank.label+'</span>' +
          ' &nbsp;·&nbsp; '+r.turns+' turno'+(r.turns!==1?'s':'')+
          ' &nbsp;·&nbsp; ❤️ '+r.hpLeft+' HP'+
          ' &nbsp;·&nbsp; '+r.date+
        '</div>' +
      '</div>' +
      '<div class="record-bar" style="width:'+barW+'%"></div>' +
    '</div>';
  }).join('');
}

function checkWin(){
  if(G.enemyHp<=0){
    gameActive=false; stopTurnTimer(); stopMedusaGaze();
    INV.red=G.potions.red; INV.blue=G.potions.blue; INV.green=G.potions.green;
    PLAYER_HP.hp=G.playerHp; PLAYER_HP.maxHp=G.playerMaxHp;
    // Boss drop: siempre dropea hasta completar la receta
    if(!sawbladeUnlocked()){
      if(Math.random()<0.30){
        addToInventory('sawblade_recipe');
        setTimeout(()=>showRecipeDrop(true),1000);
      } else {
        addToInventory('sawblade_part');
        if(getSawbladeParts()>=4){
          setTimeout(()=>showRecipeDrop(true),1000);
        } else {
          setTimeout(()=>showRecipeDrop(false),1000);
        }
      }
    }
    markBossDefeated(selectedEnemyType);
    const sc = calcScore();
    saveRecord(sc.total, G.turnCount, G.playerHp);
    const rank = getRank(sc.total);
    setTimeout(()=>{
      document.getElementById('end-emoji').textContent='🏆';
      document.getElementById('end-title').textContent='¡Victoria!';
      const enemyName = selectedEnemyType==='medusa'?'la Medusa':'el Troll';
      document.getElementById('end-msg').textContent='Derrotaste a '+enemyName+' en '+G.turnCount+' turno'+(G.turnCount!==1?'s':'')+'!';
      document.getElementById('score-display').style.display='block';
      document.getElementById('score-total').textContent=sc.total.toLocaleString()+' pts';
      document.getElementById('score-total').style.color=rank.color;
      document.getElementById('score-breakdown').innerHTML=
        '⭐ Base: 10.000'+'<br>'+
        '❤️ Vida perdida: -'+sc.hpPenalty+' pts'+'<br>'+
        '⏱️ Turnos ('+G.turnCount+'): -'+sc.turnPenalty+' pts';
      document.getElementById('score-rank').textContent=rank.label;
      document.getElementById('score-rank').style.color=rank.color;
      document.getElementById('end-overlay').style.display='flex';
    },800); return true;
  } return false;
}
function checkLose(){
  if(G.playerHp<=0){
    gameActive=false; stopTurnTimer(); stopMedusaGaze();
    INV.red=G.potions.red; INV.blue=G.potions.blue; INV.green=G.potions.green;
    PLAYER_HP.hp=G.playerHp; PLAYER_HP.maxHp=G.playerMaxHp;
    COINS.gamesPlayed++; COINS.losses++;
    COINS.history.push({ enemy: selectedEnemyType==='medusa'?'🐍 Medusa':'👹 Troll',
      result:'Derrota', turns:G.turnCount,
      date:new Date().toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'}),
      coins:0 });
    if(COINS.history.length>20) COINS.history.shift();
    saveCoins();
    setTimeout(()=>{
      document.getElementById('end-emoji').textContent='💀';
      document.getElementById('end-title').textContent='Derrotado...';
      document.getElementById('end-msg').textContent='El Troll fue demasiado poderoso. Farmea pociones y volvé!';
      document.getElementById('score-display').style.display='none';
      document.getElementById('end-overlay').style.display='flex';
    },600); return true;
  } return false;
}

function updateBattleUI(){
  pct(document.getElementById('enemy-hp-fill'),G.enemyHp,G.enemyMaxHp);
  pct(document.getElementById('player-hp-fill'),G.playerHp,G.playerMaxHp);
  document.getElementById('enemy-hp-text').textContent=Math.max(0,G.enemyHp)+' / '+G.enemyMaxHp;
  document.getElementById('player-hp-text').textContent=Math.max(0,G.playerHp)+' / '+G.playerMaxHp;
  if(G.shieldHp>0){
    document.getElementById('shield-bar-row').style.display='block';
    pct(document.getElementById('shield-hp-fill'),G.shieldHp,50);
    document.getElementById('shield-hp-text').textContent=G.shieldHp+' / 50';
  } else document.getElementById('shield-bar-row').style.display='none';
  ['red','blue','green'].forEach(p=>{
    const cnt=G.potions[p]||0;
    const el=document.getElementById('count-'+p); if(el) el.textContent=cnt;
    const pb=document.getElementById('pb-'+p); if(pb) pb.textContent=cnt;
  });
  document.querySelectorAll('#potion-selector .potion-btn').forEach(btn=>{
    const p=btn.dataset.potion;
    if((G.potions[p]||0)<=0) btn.classList.add('empty'); else btn.classList.remove('empty');
  });
  // update sprite
  const pctHp=G.enemyHp/G.enemyMaxHp;
  const spr=document.getElementById('enemy-sprite');
  if(pctHp>0.6) spr.classList.remove('damaged');
  else spr.classList.add('damaged');
}

function selectPotion(p){
  selectedPotion=p;
  document.querySelectorAll('#potion-selector .potion-btn').forEach(b=>b.classList.remove('selected'));
  document.querySelector('#potion-selector [data-potion="'+p+'"]').classList.add('selected');
  requestAnimationFrame(drawSpellGuide);
}

// ===================== MENU LOGIC =====================
function askMenu(){
  if(!gameActive){ goToMenu(); return; }
  document.getElementById('menu-confirm').classList.add('show');
}
function closeMenuConfirm(){ document.getElementById('menu-confirm').classList.remove('show'); }
function confirmGoMenu(){
  INV.red=G.potions.red; INV.blue=G.potions.blue; INV.green=G.potions.green;
  PLAYER_HP.hp=G.playerHp; PLAYER_HP.maxHp=G.playerMaxHp;
  goToMenu();
}

// ===================== FARM STATE =====================
let FG = {};
let farmActive=false;
let farmTimerInterval=null, farmTimeLeft=20;
let spiderAttackInterval=null;
let farmDrawing=false, farmPath=[];
let farmSelectedPotion='red';
let farmCtx;
let farmSpellTimer=null, farmSpellLeft=0;

// ===================== FARM ZONES =====================
const FARM_ZONES = {
  spider: {
    name:       'Arañas',
    emoji:      '🕷️',
    title:      '🕷️ PASILLO DE LAS ARAÑAS',
    killLabel:  'Arañas eliminadas',
    mobEmoji:   '🕷️',
    mobName:    'ARAÑA',
    mobHp:      40,
    hpColor:    'linear-gradient(90deg,#500080,#c040e0)',
    dropPotions: ['red'],                     // solo rojas
    dropTiers: [
      { pct:0,  label:'Sin suerte',      emoji:'😶', chance:0.20 },
      { pct:5,  label:'DROP COMÚN',      emoji:'🟤', chance:0.35 },
      { pct:15, label:'DROP RARO',       emoji:'🔵', chance:0.25 },
      { pct:25, label:'DROP ÉPICO',      emoji:'🟣', chance:0.12 },
      { pct:70, label:'DROP LEGENDARIO', emoji:'🌟', chance:0.08 },
    ],
    spentKey: 'redSpentInFarm',
    biteMsg:  'La araña te mordió!'
  },
  beetle: {
    name:       'Escarabajos',
    emoji:      '🪲',
    title:      '🪲 PASILLO DE LOS ESCARABAJOS',
    killLabel:  'Escarabajos eliminados',
    mobEmoji:   '🪲',
    mobName:    'ESCARABAJO',
    mobHp:      80,
    hpColor:    'linear-gradient(90deg,#103010,#30a030)',
    dropPotions: ['blue','red'],              // azules + rojas
    dropTiers: [                              // rojas: mitad que arañas
      { pct:0,    label:'Sin suerte',      emoji:'😶', chance:0.20 },
      { pct:2.5,  label:'DROP COMÚN',      emoji:'🟤', chance:0.35 },
      { pct:7.5,  label:'DROP RARO',       emoji:'🔵', chance:0.25 },
      { pct:12.5, label:'DROP ÉPICO',      emoji:'🟣', chance:0.12 },
      { pct:35,   label:'DROP LEGENDARIO', emoji:'🌟', chance:0.08 },
    ],
    dropTiersBlue: [                          // azules: MUY generoso (exclusivo escarabajo)
      { pct:0,    label:'Sin suerte',      emoji:'😶', chance:0.10 },
      { pct:30,   label:'DROP COMÚN',      emoji:'🟤', chance:0.30 },
      { pct:60,   label:'DROP RARO',       emoji:'🔵', chance:0.30 },
      { pct:100,  label:'DROP ÉPICO',      emoji:'🟣', chance:0.20 },
      { pct:150,  label:'DROP LEGENDARIO', emoji:'🌟', chance:0.10 },
    ],
    spentKey: 'allSpentInFarm',
    biteMsg:  'El escarabajo te aplastó!'
  }
};
let currentFarmZone = 'spider';

function initFarmState(){
  const zone = FARM_ZONES[currentFarmZone];
  FG = {
    spiderHp: zone.mobHp, spiderMaxHp: zone.mobHp,
    playerHp: PLAYER_HP.hp, playerMaxHp: PLAYER_HP.maxHp,
    potions:{ red:INV.red, blue:INV.blue, green:INV.green },
    kills:0,
    spiderCount:0,
    droppedRed:0, droppedBlue:0,
    redSpentInFarm:0, blueSpentInFarm:0,
    allSpentInFarm:0,
    punchKills:0,
    punchDropRed:0, punchDropBlue:0,
    drawings:[]
  };
}

function goToFarm(zoneType){
  currentFarmZone = zoneType || 'spider';
  const zone = FARM_ZONES[currentFarmZone];
  showScreen('farm');
  initFarmState();
  // Update UI to match zone
  try{
    const ft=document.getElementById('farm-title-text'); if(ft) ft.textContent=zone.title;
    const fk=document.getElementById('farm-kill-count'); if(fk) fk.textContent=zone.killLabel+': 0';
    const ss=document.getElementById('spider-sprite');   if(ss) ss.textContent=zone.mobEmoji;
    const sa=document.querySelector('#farm-spider-area .farm-mob-label'); 
    if(sa) sa.textContent=zone.mobEmoji+' '+zone.mobName;
    const hf=document.getElementById('spider-hp-fill');  if(hf) hf.style.background=zone.hpColor;
  }catch(err){}
  requestAnimationFrame(()=>{ requestAnimationFrame(setupFarmCanvas); });
  updateFarmUI();
  farmActive=true;
  startFarmTimer();
  startSpiderAttack();
  addFarmLog('Entraste al pasillo de '+zone.name+'... cuidado!');
}

function setupFarmCanvas(){
  const cont=document.getElementById('farm-canvas-container');
  const canvas=document.getElementById('farm-draw-canvas');
  const w=cont.offsetWidth||cont.clientWidth||300;
  const h=cont.offsetHeight||cont.clientHeight||100;
  canvas.width=w; canvas.height=h;
  canvas.style.width=w+'px'; canvas.style.height=h+'px';
  farmCtx=canvas.getContext('2d');
  const fresh=canvas.cloneNode(false);
  cont.replaceChild(fresh,canvas);
  farmCtx=fresh.getContext('2d');
  fresh.addEventListener('pointerdown',onFarmPointerDown,{passive:false});
  fresh.addEventListener('pointermove',onFarmPointerMove,{passive:false});
  fresh.addEventListener('pointerup',onFarmPointerUp,{passive:false});
  fresh.addEventListener('pointercancel',onFarmPointerUp,{passive:false});
  try {
    fresh.addEventListener('touchstart', function(e){ try{e.preventDefault();}catch(err){} onFarmPointerDown(e.touches[0]); },{passive:false});
    fresh.addEventListener('touchmove',  function(e){ try{e.preventDefault();}catch(err){} onFarmPointerMove(e.touches[0]); },{passive:false});
    fresh.addEventListener('touchend',   function(e){ try{e.preventDefault();}catch(err){} onFarmPointerUp(e.changedTouches[0]); },{passive:false});
  } catch(err){}
}

function onFarmPointerDown(e){
  if(!farmActive) return;
  try{ if(e&&e.preventDefault) e.preventDefault(); }catch(err){}
  farmDrawing=true; farmPath=[getPos(e)];
  try{
    document.getElementById('farm-canvas-hint').classList.add('hidden');
    if(!farmCtx) return;
    farmCtx.beginPath();
    farmCtx.strokeStyle=potionColor(farmSelectedPotion);
    farmCtx.lineWidth=4; farmCtx.lineCap='round'; farmCtx.lineJoin='round';
    farmCtx.shadowColor=potionColor(farmSelectedPotion); farmCtx.shadowBlur=8;
    farmCtx.moveTo(farmPath[0].x,farmPath[0].y);
    document.getElementById('farm-canvas-container').classList.add('casting');
  }catch(err){}
}
function onFarmPointerMove(e){
  if(!farmDrawing) return;
  try{ if(e&&e.preventDefault) e.preventDefault(); }catch(err){}
  try{
    const pos=getPos(e); farmPath.push(pos);
    if(!farmCtx) return;
    farmCtx.lineTo(pos.x,pos.y); farmCtx.stroke();
    farmCtx.beginPath(); farmCtx.moveTo(pos.x,pos.y);
  }catch(err){}
}
function onFarmPointerUp(e){
  if(!farmDrawing) return; farmDrawing=false;
  try{ FG.drawings.push({potion:farmSelectedPotion,path:[...farmPath]}); }catch(err){}
  farmPath=[];
}

function farmClearCanvas(){
  if(!farmCtx) return;
  const c=document.getElementById('farm-draw-canvas');
  farmCtx.clearRect(0,0,c.width,c.height);
  FG.drawings=[];
  document.getElementById('farm-canvas-hint').classList.remove('hidden');
  document.getElementById('farm-canvas-container').classList.remove('casting','success','fail');
  document.getElementById('farm-result').textContent='';
}

function farmSelectPotion(p){
  farmSelectedPotion=p;
  document.querySelectorAll('#farm-potion-selector .potion-btn').forEach(b=>b.classList.remove('selected'));
  document.querySelector('#farm-potion-selector [data-potion="'+p+'"]').classList.add('selected');
}

function farmPunch(){
  if(!farmActive) return;
  // Daño mínimo: araña 10-15 clicks (HP=40) → rng(3,4); escarabajo 20-30 clicks (HP=80) → mismo rng
  const dmg = rng(3,4);
  FG.spiderHp = Math.max(0, FG.spiderHp - dmg);
  shakeFarmSpider();
  const res = document.getElementById('farm-result');
  res.textContent = '👊 Puñetazo! -'+dmg+' HP';
  res.style.color = '#e08040';
  document.getElementById('farm-canvas-container').classList.add('casting');
  setTimeout(()=>{
    document.getElementById('farm-canvas-container').classList.remove('casting');
    res.style.color = '';
  }, 300);
  updateFarmUI();
  if(FG.spiderHp<=0) killSpiderWithDrop(true);
}

function farmCastSpell(){
  if(!farmActive) return;
  const drawings=FG.drawings;
  if(!drawings.length){ document.getElementById('farm-result').textContent='Dibuja un hechizo!'; return; }

  // In farm, any spell with red+blue = attack
  const pu={};
  drawings.forEach(d=>{ pu[d.potion]=(pu[d.potion]||0)+1; });

  // Any attack attempt (red+blue, or any drawing)
  let dmg=0;
  if(pu.red&&pu.blue&&FG.potions.red>=1&&FG.potions.blue>=1){
    FG.potions.red--; FG.potions.blue--; FG.redSpentInFarm++; FG.allSpentInFarm++;
    dmg=rng(35,55);
  } else if((pu.red&&FG.potions.red>=1)||(pu.blue&&FG.potions.blue>=1)){
    // single potion weak attack
    if(pu.red&&FG.potions.red>=1){ FG.potions.red--; FG.redSpentInFarm++; FG.allSpentInFarm++; dmg=rng(30,45); }
    else if(pu.blue&&FG.potions.blue>=1){ FG.potions.blue--; FG.blueSpentInFarm++; FG.allSpentInFarm++; dmg=rng(25,40); }
  } else {
    document.getElementById('farm-result').textContent='Sin pociones de ataque!';
    setTimeout(farmClearCanvas,500); return;
  }

  // Green only = heal player
  if(!dmg && pu.green && FG.potions.green>=1){
    FG.potions.green--;
    const healAmt=rng(40,80);
    FG.playerHp=Math.min(FG.playerMaxHp, FG.playerHp+healAmt);
    document.getElementById('farm-canvas-container').classList.add('success');
    document.getElementById('farm-result').textContent='Curacion: +'+healAmt+' vida!';
    updateFarmUI(); updateFarmPlayerHp();
    setTimeout(farmClearCanvas,400);
    return;
  }

  FG.spiderHp=Math.max(0,FG.spiderHp-dmg);
  shakeFarmSpider();
  document.getElementById('farm-canvas-container').classList.add('success');
  document.getElementById('farm-result').textContent='Golpe: -'+dmg+' HP!';

  updateFarmUI(); updateFarmPlayerHp();

  if(FG.spiderHp<=0) killSpider();
  setTimeout(farmClearCanvas,400);
}

function killSpider(){ killSpiderWithDrop(false); }

function killSpiderWithDrop(byPunch){
  FG.kills++;
  FG.spiderCount++;
  const spr=document.getElementById('spider-sprite');
  spr.classList.add('dead');
  const zoneK = FARM_ZONES[currentFarmZone];
  document.getElementById('farm-kill-count').textContent = zoneK.killLabel+': '+FG.kills;
  addFarmLog(zoneK.mobName+' #'+FG.kills+' eliminado!'+(byPunch?' 👊':''));
  if(byPunch){ COINS.farmPunchKills++; earnCoins(2,'punch-kill'); }
  else { earnCoins(5,'spell-kill'); }
  COINS.farmKills++;

  // Drop instantáneo por kill (tanto con puño como con hechizo)
  // Con puño: drop fijo de 1 poción (sin tiers, es el premio por el esfuerzo)
  if(byPunch && Math.random()<0.30){
    // 30% chance — siempre menos conveniente que hechizo (que garantiza lo gastado + tier bonus)
    if(currentFarmZone==='spider'){
      FG.potions.red++;
      FG.punchDropRed++;
      earnCoins(8,'drop-pocion');
      showPunchDrop('🔴');
      addFarmLog('Drop puño (30%): 🔴 +1');
    } else {
      if(Math.random()<0.5){
        FG.potions.red++;
        FG.punchDropRed++;
        earnCoins(8,'drop-pocion');
        showPunchDrop('🔴');
        addFarmLog('Drop puño (30%): 🔴 +1');
      } else {
        FG.potions.blue++;
        FG.punchDropBlue++;
        earnCoins(8,'drop-pocion');
        showPunchDrop('🔵');
        addFarmLog('Drop puño (30%): 🔵 +1');
      }
    }
    updateFarmUI();
  }

  setTimeout(()=>{
    const zoneR = FARM_ZONES[currentFarmZone];
    spr.classList.remove('dead');
    spr.textContent = zoneR.mobEmoji;
    FG.spiderHp = zoneR.mobHp;
    updateFarmUI();
  },500);
}

function showPunchDrop(emoji){
  const container=document.getElementById('game');
  const el=document.createElement('div');
  el.className='float-num drop';
  el.textContent=emoji+' +1';
  el.style.cssText='left:45%;top:45%;position:absolute;font-size:18px';
  container.appendChild(el);
  setTimeout(()=>el.remove(),1300);
}

function showFarmDrop(){
  const container=document.getElementById('game');
  const el=document.createElement('div');
  el.className='float-num drop';
  el.textContent='🔴 +1 POCION!';
  el.style.left='30%'; el.style.top='50%'; el.style.position='absolute'; el.style.fontSize='20px';
  container.appendChild(el);
  setTimeout(()=>el.remove(),1400);
}

// ===================== FARM TIMER =====================
function startFarmTimer(){
  stopFarmTimer(); farmTimeLeft=20; updateFarmTimerBar();
  farmTimerInterval=setInterval(()=>{
    farmTimeLeft-=0.1; updateFarmTimerBar();
    if(farmTimeLeft<=0){ stopFarmTimer(); endFarmSession(); }
  },100);
}
function stopFarmTimer(){ if(farmTimerInterval){clearInterval(farmTimerInterval);farmTimerInterval=null;} stopSpiderAttack(); }
function stopSpiderAttack(){ if(spiderAttackInterval){clearTimeout(spiderAttackInterval);spiderAttackInterval=null;} }
function startSpiderAttack(){
  stopSpiderAttack();
  // Intervalo aleatorio: 3s, 6s u 8s
  const biteIntervals = [3000, 6000, 8000];
  function scheduleNextBite(){
    if(!farmActive) return;
    const delay = biteIntervals[Math.floor(Math.random()*biteIntervals.length)];
    spiderAttackInterval = setTimeout(()=>{
      if(!farmActive) return;
      const dmg = Math.ceil(FG.playerMaxHp * 0.05); // 5% de vida maxima
      FG.playerHp = Math.max(0, FG.playerHp - dmg);
      const zoneB=FARM_ZONES[currentFarmZone]; addFarmLog(zoneB.biteMsg+' -'+dmg+' vida ('+Math.round(delay/1000)+'s)');
      updateFarmPlayerHp();
      if(FG.playerHp <= 0){
        stopFarmTimer();
        farmActive = false;
        addFarmLog('Te quedaste sin vida! Saliste de los pasillos.');
        PLAYER_HP.hp = 1;
        PLAYER_HP.maxHp = FG.playerMaxHp;
        INV.red=FG.potions.red; INV.blue=FG.potions.blue; INV.green=FG.potions.green;
        setTimeout(endFarmSession, 400);
        return;
      }
      scheduleNextBite(); // programa la siguiente mordida
    }, delay);
  }
  scheduleNextBite();
}
function updateFarmTimerBar(){
  const f=document.getElementById('farm-timer-bar-fill');
  const d=document.getElementById('farm-timer-display');
  if(!f) return;
  const secs=Math.ceil(Math.max(0,farmTimeLeft));
  f.style.width=Math.max(0,(farmTimeLeft/20)*100)+'%';
  d.textContent=secs;
  if(farmTimeLeft<=5){ f.classList.add('low'); d.classList.add('urgent'); }
  else { f.classList.remove('low'); d.classList.remove('urgent'); }
}

function endFarmSession(){
  farmActive=false;
  earnCoins(20, 'sesion-farmeo');
  const zone = FARM_ZONES[currentFarmZone];

  // Roll drop tier
  const roll = Math.random();
  let acc = 0, tier = zone.dropTiers[0];
  for(const t of zone.dropTiers){ acc += t.chance; if(roll < acc){ tier = t; break; } }

  // Calculate recovered potions based on zone
  let redBonus=0, blueBonus=0, redTotal=0, blueTotal=0;
  if(currentFarmZone === 'spider'){
    redBonus = Math.ceil(FG.redSpentInFarm * (tier.pct / 100));
    redTotal = FG.redSpentInFarm + redBonus;
    FG.droppedRed = redTotal;
  } else {
    redBonus  = Math.ceil(FG.redSpentInFarm  * (tier.pct / 100));
    // Blue uses its own generous tier
    const blueTiers = zone.dropTiersBlue || zone.dropTiers;
    const blueRoll = Math.random();
    let blueAcc = 0, blueTier = blueTiers[0];
    for(const t of blueTiers){ blueAcc += t.chance; if(blueRoll < blueAcc){ blueTier = t; break; } }
    blueBonus = Math.ceil(FG.blueSpentInFarm * (blueTier.pct / 100));
    redTotal  = FG.redSpentInFarm  + redBonus;
    blueTotal = FG.blueSpentInFarm + blueBonus;
    FG.droppedRed  = redTotal;
    FG.droppedBlue = blueTotal;
  }

  // FG.potions ya tiene: inicio - gastado_hechizos + drops_puño
  // Solo sumamos la recuperación por hechizos (lo gastado + bonus tier)
  INV.red   = FG.potions.red   + redTotal;
  INV.blue  = FG.potions.blue  + blueTotal;
  INV.green = FG.potions.green;
  PLAYER_HP.hp=FG.playerHp;
  PLAYER_HP.maxHp=FG.playerMaxHp;

  // Show summary overlay
  document.getElementById('farm-end-summary').textContent =
    'Eliminaste '+FG.kills+' '+zone.name.toLowerCase()+' en los pasillos.';

  const lootList=document.getElementById('farm-loot-list');
  lootList.innerHTML='';

  // Drop tier banner
  const tierEl=document.createElement('div');
  tierEl.className='loot-item'+(tier.pct>0?' gained':'');
  tierEl.style.cssText='font-size:15px;font-weight:bold';
  tierEl.innerHTML='<span>'+tier.emoji+'</span> '+tier.label+(tier.pct>0?' (+'+tier.pct+'%)':'');
  lootList.appendChild(tierEl);

  // Loot lines
  if(currentFarmZone === 'spider'){
    const li=document.createElement('div');
    li.className='loot-item'+(tier.pct>0?' gained':'');
    if(FG.redSpentInFarm>0){
      li.innerHTML = tier.pct>0
        ? '<span>🔴</span> '+FG.redSpentInFarm+' recuperadas + <b>'+redBonus+' DROP</b> = <b>+'+redTotal+'</b>'
        : '<span>🔴</span> '+FG.redSpentInFarm+' recuperadas (sin drop extra)';
    } else {
      li.innerHTML = '<span>💡</span> No gastaste pociones rojas';
    }
    lootList.appendChild(li);
  } else {
    // Escarabajos: mostrar ambas
    if(FG.redSpentInFarm>0 || FG.blueSpentInFarm>0){
      if(FG.redSpentInFarm>0){
        const lr=document.createElement('div');
        lr.className='loot-item'+(tier.pct>0?' gained':'');
        lr.innerHTML = tier.pct>0
          ? '<span>🔴</span> '+FG.redSpentInFarm+' recuperadas + <b>'+redBonus+' DROP</b> = <b>+'+redTotal+'</b>'
          : '<span>🔴</span> '+FG.redSpentInFarm+' recuperadas';
        lootList.appendChild(lr);
      }
      if(FG.blueSpentInFarm>0){
        const lb=document.createElement('div');
        lb.className='loot-item'+(blueBonus>0?' gained':'');
        lb.innerHTML = blueBonus>0
          ? '<span>🔵</span> '+FG.blueSpentInFarm+' recuperadas + <b>'+blueBonus+' DROP '+blueTier.emoji+'</b> = <b>+'+blueTotal+'</b>'
          : '<span>🔵</span> '+FG.blueSpentInFarm+' recuperadas (sin drop extra)';
        lootList.appendChild(lb);
      }
    } else {
      const li=document.createElement('div'); li.className='loot-item';
      li.innerHTML='<span>💡</span> No gastaste pociones de ataque';
      lootList.appendChild(li);
    }
  }

  // Drops de puño
  if(FG.punchDropRed>0 || FG.punchDropBlue>0){
    const pd=document.createElement('div');
    pd.className='loot-item gained';
    let pdTxt='<span>👊</span> Drops de puño:';
    if(FG.punchDropRed>0)  pdTxt+=' <b>🔴×'+FG.punchDropRed+'</b>';
    if(FG.punchDropBlue>0) pdTxt+=' <b>🔵×'+FG.punchDropBlue+'</b>';
    pd.innerHTML=pdTxt;
    lootList.appendChild(pd);
  }

  // Inventory final
  const stock=document.createElement('div');
  stock.className='loot-item';
  stock.innerHTML='<span>🎒</span> Inventario: 🔴'+INV.red+' 🔵'+INV.blue+' 🟢'+INV.green;
  lootList.appendChild(stock);

  document.getElementById('farm-end-overlay').style.display='flex';
}

function closeFarmEnd(){
  document.getElementById('farm-end-overlay').style.display='none';
  updateMenuPreview();
  showScreen('pasillo');
}

function updateFarmUI(){
  updateFarmPlayerHp();
  pct(document.getElementById('spider-hp-fill'),FG.spiderHp,FG.spiderMaxHp);
  document.getElementById('spider-hp-text').textContent=FG.spiderHp+'/'+(FARM_ZONES[currentFarmZone]?FARM_ZONES[currentFarmZone].mobHp:40);
  document.getElementById('farm-kill-count').textContent='Aranas eliminadas: '+FG.kills;
  ['red','blue','green'].forEach(p=>{
    const cnt=FG.potions[p]||0;
    const el=document.getElementById('fmp-'+p); if(el) el.textContent=cnt;
    const pb=document.getElementById('fpb-'+p); if(pb) pb.textContent=cnt;
  });
  document.querySelectorAll('#farm-potion-selector .potion-btn').forEach(btn=>{
    const p=btn.dataset.potion;
    if((FG.potions[p]||0)<=0) btn.classList.add('empty'); else btn.classList.remove('empty');
  });
}

function updateFarmPlayerHp(){
  const maxHp=FG.playerMaxHp||300;
  pct(document.getElementById('farm-player-hp-fill'),FG.playerHp,maxHp);
  document.getElementById('farm-player-hp-text').textContent=Math.max(0,FG.playerHp)+'/'+maxHp;
}

function shakeFarmSpider(){
  const el=document.getElementById('spider-sprite');
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'),300);
}

function addFarmLog(msg){
  const el=document.getElementById('farm-drop-feed');
  const d=document.createElement('div'); d.className='farm-drop-entry';
  d.textContent='• '+msg;
  el.insertBefore(d,el.firstChild);
  while(el.children.length>6) el.removeChild(el.lastChild);
}


// ===================== TEMPLE — TRIVIA CURACIÓN =====================
const COINS_START = 50;
const WRONG_COST  = 5;   // monedas que cuesta una respuesta incorrecta
const HEAL_PCT    = 0.10; // 10% de vida máxima por respuesta correcta

let TEMPLE_COINS = COINS_START;
let templeCategory = 'historia';
let templeCurrentQ  = null;
let templeAnswered  = false;

// ── BANCO DE PREGUNTAS ──
const TRIVIA = {
  historia:[
    {q:"¿En qué año llegó Colón a América?",a:["1492","1502","1485"],c:0},
    {q:"¿Quién fue el primer presidente de EE.UU.?",a:["George Washington","Lincoln","Jefferson"],c:0},
    {q:"¿Qué civilización construyó Machu Picchu?",a:["Inca","Maya","Azteca"],c:0},
    {q:"¿En qué año cayó el Muro de Berlín?",a:["1989","1991","1975"],c:0},
    {q:"¿Qué imperio fue el más grande de la historia?",a:["Mongol","Romano","Británico"],c:0},
    {q:"¿Quién fue Cleopatra?",a:["Reina de Egipto","Diosa griega","Emperatriz romana"],c:0},
    {q:"¿En qué guerra se usó la bomba atómica?",a:["2ª Guerra Mundial","Guerra de Corea","Vietnam"],c:0},
    {q:"¿Dónde nació Napoleón Bonaparte?",a:["Córcega","Francia","Italia"],c:0},
    {q:"¿Quién descubrió América para Europa?",a:["Cristóbal Colón","Américo Vespucio","Magallanes"],c:0},
    {q:"¿En qué año comenzó la 1ª Guerra Mundial?",a:["1914","1918","1939"],c:0},
    {q:"¿Quién fue el último faraón de Egipto?",a:["Cleopatra VII","Ramsés II","Tutankamón"],c:0},
    {q:"¿Qué país ganó la 2ª Guerra Mundial junto a los Aliados?",a:["URSS, EE.UU. y Reino Unido","Alemania y Japón","Francia e Italia"],c:0},
    {q:"¿Dónde ocurrió la Revolución Francesa?",a:["Francia","Inglaterra","España"],c:0},
    {q:"¿Quién fue el líder de la Revolución Cubana?",a:["Fidel Castro","Che Guevara","Batista"],c:0},
    {q:"¿En qué año se independizó Argentina?",a:["1816","1810","1820"],c:0},
    {q:"¿Qué ciudad fue bombardeada con bomba atómica en 1945?",a:["Hiroshima","Tokio","Nagasaki (primera fue Hiroshima)"],c:0},
    {q:"¿Quién construyó la Gran Muralla China?",a:["Varios emperadores","Genghis Khan","Marco Polo"],c:0},
    {q:"¿En qué año fue la Revolución Rusa?",a:["1917","1905","1923"],c:0},
    {q:"¿Quién fue Simón Bolívar?",a:["Libertador de América del Sur","Rey de España","General napoleónico"],c:0},
    {q:"¿En qué año se firmó la Carta Magna?",a:["1215","1066","1453"],c:0},
    {q:"¿Quién conquistó el Imperio Azteca?",a:["Hernán Cortés","Francisco Pizarro","Pedro de Alvarado"],c:0},
    {q:"¿En qué ciudad murió Alejandro Magno?",a:["Babilonia","Alejandría","Persépolis"],c:0},
    {q:"¿Cuánto duró la Guerra de los Cien Años?",a:["116 años","100 años","87 años"],c:0},
    {q:"¿Qué civilización inventó el alfabeto?",a:["Fenicios","Griegos","Egipcios"],c:0},
    {q:"¿En qué año cayó el Imperio Romano de Occidente?",a:["476 d.C.","395 d.C.","529 d.C."],c:0},
    {q:"¿Quién fue el primer hombre en la Luna?",a:["Neil Armstrong","Buzz Aldrin","Yuri Gagarin"],c:0},
    {q:"¿En qué año llegó el hombre a la Luna?",a:["1969","1972","1965"],c:0},
    {q:"¿Quién fue Gandhi?",a:["Líder de independencia india","Presidente de Pakistán","Rey de Nepal"],c:0},
    {q:"¿Qué evento marcó el inicio de la Guerra Fría?",a:["Fin de la 2ª Guerra Mundial","Revolución China","Crisis de los misiles"],c:0},
    {q:"¿En qué año se fundó Roma?",a:["753 a.C.","509 a.C.","264 a.C."],c:0},
    {q:"¿Quién fue el primer emperador romano?",a:["Augusto","Julio César","Nerón"],c:0},
    {q:"¿Dónde comenzó la Revolución Industrial?",a:["Inglaterra","Francia","Alemania"],c:0},
    {q:"¿Qué tratado terminó la 1ª Guerra Mundial?",a:["Tratado de Versalles","Tratado de París","Tratado de Berlín"],c:0},
    {q:"¿Quién fue Nelson Mandela?",a:["Presidente anti-apartheid de Sudáfrica","Rey de Etiopía","Líder keniano"],c:0},
    {q:"¿En qué año murió Julio César?",a:["44 a.C.","55 a.C.","30 a.C."],c:0},
    {q:"¿Qué imperio dominó la India antes de su independencia?",a:["Británico","Francés","Portugués"],c:0},
    {q:"¿Cuándo fue la Revolución Americana?",a:["1776","1789","1812"],c:0},
    {q:"¿Quién fue el líder nazi?",a:["Adolf Hitler","Heinrich Himmler","Hermann Göring"],c:0},
    {q:"¿En qué año se creó la ONU?",a:["1945","1919","1948"],c:0},
    {q:"¿Qué país lanzó el primer satélite artificial?",a:["URSS","EE.UU.","China"],c:0},
    {q:"¿Quién fue Mao Zedong?",a:["Fundador de la Rep. Popular China","Emperador chino","General japonés"],c:0},
    {q:"¿En qué año cayó Constantinopla?",a:["1453","1204","1071"],c:0},
    {q:"¿Qué cultura construyó Stonehenge?",a:["Cultura neolítica británica","Celtas","Romanos"],c:0},
    {q:"¿Cuándo fue la batalla de Waterloo?",a:["1815","1804","1821"],c:0},
    {q:"¿Quién fue el primer secretario general de la ONU?",a:["Trygve Lie","Dag Hammarskjöld","U Thant"],c:0},
    {q:"¿En qué año se dividió Alemania en dos?",a:["1949","1945","1961"],c:0},
    {q:"¿Qué país colonizó Brasil?",a:["Portugal","España","Francia"],c:0},
    {q:"¿Cuándo fue la batalla de Maratón?",a:["490 a.C.","480 a.C.","431 a.C."],c:0},
    {q:"¿Quién fue el último zar de Rusia?",a:["Nicolás II","Alejandro III","Alejandro II"],c:0},
    {q:"¿En qué ciudad se firmó la Declaración de Independencia de EE.UU.?",a:["Filadelfia","Nueva York","Boston"],c:0},
    {q:"¿Qué enfermedad causó la Peste Negra?",a:["Bacteria Yersinia pestis","Virus influenza","Parásito malaria"],c:0},
    {q:"¿En qué continente está Cartago?",a:["África","Europa","Asia"],c:0},
    {q:"¿Quién escribió 'El Príncipe'?",a:["Maquiavelo","Dante","Petrarca"],c:0},
  ],
  ciencia:[
    {q:"¿Cuál es el elemento más abundante en el universo?",a:["Hidrógeno","Oxígeno","Helio"],c:0},
    {q:"¿Qué planeta es el más grande del sistema solar?",a:["Júpiter","Saturno","Urano"],c:0},
    {q:"¿A qué velocidad viaja la luz?",a:["300.000 km/s","150.000 km/s","450.000 km/s"],c:0},
    {q:"¿Cuántos huesos tiene el cuerpo humano adulto?",a:["206","180","250"],c:0},
    {q:"¿Quién descubrió la penicilina?",a:["Alexander Fleming","Pasteur","Darwin"],c:0},
    {q:"¿Cuántos planetas tiene el sistema solar?",a:["8","9","7"],c:0},
    {q:"¿Qué gas respiramos principalmente?",a:["Nitrógeno","Oxígeno","CO₂"],c:0},
    {q:"¿Cuál es la partícula de carga negativa?",a:["Electrón","Protón","Neutrón"],c:0},
    {q:"¿Qué es la fotosíntesis?",a:["Proceso de producción de energía en plantas","Digestión animal","Respiración celular"],c:0},
    {q:"¿Cuánto tarda la Tierra en orbitar el Sol?",a:["365.25 días","300 días","400 días"],c:0},
    {q:"¿Qué es el ADN?",a:["Ácido desoxirribonucleico","Proteína celular","Tipo de célula"],c:0},
    {q:"¿Cuál es el planeta más cercano al Sol?",a:["Mercurio","Venus","Marte"],c:0},
    {q:"¿Qué es un agujero negro?",a:["Región con gravedad infinita que atrapa luz","Una nebulosa","Un planeta muerto"],c:0},
    {q:"¿Cuántos cromosomas tiene el humano?",a:["46","44","48"],c:0},
    {q:"¿Qué órgano produce la insulina?",a:["Páncreas","Hígado","Riñón"],c:0},
    {q:"¿Cuál es la fórmula del agua?",a:["H₂O","CO₂","NaCl"],c:0},
    {q:"¿Qué científico formuló la teoría de la relatividad?",a:["Einstein","Newton","Bohr"],c:0},
    {q:"¿Cuál es el metal más abundante en la corteza terrestre?",a:["Aluminio","Hierro","Cobre"],c:0},
    {q:"¿Qué es la mitosis?",a:["División celular que produce células idénticas","Fusión de células","Muerte celular"],c:0},
    {q:"¿Cuántas capas tiene la Tierra?",a:["4 (corteza, manto, núcleo ext., núcleo int.)","3","5"],c:0},
    {q:"¿Qué es la entropía?",a:["Medida del desorden de un sistema","Energía cinética","Fuerza gravitacional"],c:0},
    {q:"¿Cuál es el ácido del estómago?",a:["Ácido clorhídrico","Ácido sulfúrico","Ácido nítrico"],c:0},
    {q:"¿Qué estudia la sismología?",a:["Terremotos y movimientos sísmicos","El mar","El clima"],c:0},
    {q:"¿Cuál es la unidad de medida de la corriente eléctrica?",a:["Amperio","Voltio","Watt"],c:0},
    {q:"¿Qué planeta tiene los anillos más visibles?",a:["Saturno","Júpiter","Urano"],c:0},
    {q:"¿Qué es la fisión nuclear?",a:["División de núcleo atómico","Fusión de átomos","Explosión química"],c:0},
    {q:"¿Cuántas neuronas tiene el cerebro humano aproximadamente?",a:["86 mil millones","1 millón","10 mil millones"],c:0},
    {q:"¿Qué elemento es el diamante?",a:["Carbono","Silicio","Nitrógeno"],c:0},
    {q:"¿Cuál es la velocidad del sonido en el aire?",a:["340 m/s","300 m/s","1000 m/s"],c:0},
    {q:"¿Qué es la osmosis?",a:["Paso de agua por membrana semipermeable","Reacción química","Proceso de fotosíntesis"],c:0},
    {q:"¿Quién formuló las leyes del movimiento?",a:["Newton","Galileo","Kepler"],c:0},
    {q:"¿Qué es el efecto invernadero?",a:["Retención de calor en la atmósfera","Tipo de lluvia","Fenómeno oceánico"],c:0},
    {q:"¿Cuál es el número atómico del oxígeno?",a:["8","6","16"],c:0},
    {q:"¿Qué es la bioluminiscencia?",a:["Luz producida por organismos vivos","Reacción al sol","Tipo de fotosíntesis"],c:0},
    {q:"¿Qué estudia la genética?",a:["Herencia y genes","Células","Músculos"],c:0},
    {q:"¿Cuál es el planeta más caliente del sistema solar?",a:["Venus","Mercurio","Júpiter"],c:0},
    {q:"¿Qué es un ecosistema?",a:["Comunidad de organismos y su entorno","Solo los animales de una zona","El clima de una región"],c:0},
    {q:"¿Cuántos tipos de sangre existen en el sistema ABO?",a:["4 (A, B, AB, O)","3","6"],c:0},
    {q:"¿Qué es la tabla periódica?",a:["Clasificación de elementos químicos","Lista de compuestos","Tabla de reacciones"],c:0},
    {q:"¿Qué vitamin produce el sol en la piel?",a:["Vitamina D","Vitamina C","Vitamina A"],c:0},
    {q:"¿Cuál es la estrella más cercana a la Tierra después del Sol?",a:["Próxima Centauri","Sirio","Betelgeuse"],c:0},
    {q:"¿Qué es la cadena alimentaria?",a:["Relación de quién come a quién","Red de distribución de agua","Ciclo del carbono"],c:0},
    {q:"¿Cuántos litros de sangre tiene el cuerpo humano?",a:["5-6 litros","2-3 litros","8-10 litros"],c:0},
    {q:"¿Qué es la presión atmosférica?",a:["Peso del aire sobre la superficie","Temperatura del aire","Humedad del aire"],c:0},
    {q:"¿Qué organelo produce energía en la célula?",a:["Mitocondria","Núcleo","Ribosoma"],c:0},
    {q:"¿Cuál es el gas más abundante en la atmósfera terrestre?",a:["Nitrógeno (78%)","Oxígeno","Argón"],c:0},
    {q:"¿Qué es la evolución según Darwin?",a:["Cambio de especies por selección natural","Creación divina","Mutación espontánea"],c:0},
    {q:"¿Cuántos sentidos tiene el ser humano (clásicos)?",a:["5","6","4"],c:0},
    {q:"¿Qué es un virus?",a:["Agente infeccioso que requiere huésped","Bacteria microscópica","Hongo parásito"],c:0},
    {q:"¿Cuál es el hueso más largo del cuerpo?",a:["Fémur","Tibia","Húmero"],c:0},
    {q:"¿Qué es la energía cinética?",a:["Energía del movimiento","Energía almacenada","Energía eléctrica"],c:0},
    {q:"¿Cuántos dientes tiene un adulto?",a:["32","28","36"],c:0},
  ],
  geografia:[
    {q:"¿Cuál es el río más largo del mundo?",a:["Nilo","Amazonas","Yangtsé"],c:0},
    {q:"¿Cuál es el país más grande del mundo?",a:["Rusia","Canadá","China"],c:0},
    {q:"¿Cuál es la montaña más alta del mundo?",a:["Everest","K2","Aconcagua"],c:0},
    {q:"¿En qué continente está el desierto del Sahara?",a:["África","Asia","Australia"],c:0},
    {q:"¿Cuál es la capital de Australia?",a:["Canberra","Sídney","Melbourne"],c:0},
    {q:"¿Qué océano es el más grande?",a:["Pacífico","Atlántico","Índico"],c:0},
    {q:"¿Cuántos países tiene América del Sur?",a:["12","10","14"],c:0},
    {q:"¿Dónde están las Cataratas del Iguazú?",a:["Argentina/Brasil","Venezuela","Colombia"],c:0},
    {q:"¿Cuál es el país más pequeño del mundo?",a:["Vaticano","Mónaco","San Marino"],c:0},
    {q:"¿Cuál es la capital de Japón?",a:["Tokio","Osaka","Kioto"],c:0},
    {q:"¿Qué país tiene más habitantes?",a:["India","China","EE.UU."],c:0},
    {q:"¿Cuál es el desierto más frío del mundo?",a:["Antártida","Gobi","Sahara"],c:0},
    {q:"¿Dónde está el Monte Olimpo?",a:["Grecia","Italia","Turquía"],c:0},
    {q:"¿Cuál es la capital de Brasil?",a:["Brasilia","Río de Janeiro","São Paulo"],c:0},
    {q:"¿Qué continente tiene más países?",a:["África","Asia","Europa"],c:0},
    {q:"¿Por cuántos países pasa el Río Amazonas principalmente?",a:["Brasil (90%)","Colombia","Perú"],c:0},
    {q:"¿Cuál es el lago más grande del mundo?",a:["Mar Caspio","Lago Superior","Victoria"],c:0},
    {q:"¿Qué cordillera es la más larga del mundo?",a:["Los Andes","Himalayas","Rocosas"],c:0},
    {q:"¿Cuál es la ciudad más poblada del mundo?",a:["Tokio","Shanghai","Ciudad de México"],c:0},
    {q:"¿En qué país está el Machu Picchu?",a:["Perú","Bolivia","Ecuador"],c:0},
    {q:"¿Cuál es el río más largo de Europa?",a:["Volga","Danubio","Rin"],c:0},
    {q:"¿Qué país tiene la costa más larga?",a:["Canadá","Rusia","Indonesia"],c:0},
    {q:"¿Cuál es la capital de Canadá?",a:["Ottawa","Toronto","Montreal"],c:0},
    {q:"¿En qué océano está Madagascar?",a:["Índico","Atlántico","Pacífico"],c:0},
    {q:"¿Cuál es el volcán activo más alto del mundo?",a:["Ojos del Salado / Llullaillaco","Etna","Kilauea"],c:0},
    {q:"¿Qué país tiene más islas?",a:["Suecia","Noruega","Filipinas"],c:0},
    {q:"¿Cuál es la capital de Turquía?",a:["Ankara","Estambul","Izmir"],c:0},
    {q:"¿Dónde está el Kilimanjaro?",a:["Tanzania","Kenia","Etiopía"],c:0},
    {q:"¿Cuál es el punto más bajo de la Tierra?",a:["Mar Muerto","Lago Assal","Valle de la Muerte"],c:0},
    {q:"¿Qué país tiene la mayor cantidad de pirámides?",a:["Sudán","Egipto","México"],c:0},
    {q:"¿Cuál es la capital de India?",a:["Nueva Delhi","Bombay","Calcuta"],c:0},
    {q:"¿Cuántos países tiene la Unión Europea?",a:["27","28","25"],c:0},
    {q:"¿En qué país está el Río Nilo principalmente?",a:["Egipto y Sudán","Solo Egipto","Etiopía"],c:0},
    {q:"¿Cuál es el mar más pequeño del mundo?",a:["Mar de Mármara","Mar Rojo","Mar Negro"],c:0},
    {q:"¿Qué país tiene la Patagonia?",a:["Argentina y Chile","Solo Argentina","Bolivia"],c:0},
    {q:"¿Cuál es la capital de Egipto?",a:["El Cairo","Alejandría","Luxor"],c:0},
    {q:"¿En qué país está la Amazonia principalmente?",a:["Brasil","Perú","Venezuela"],c:0},
    {q:"¿Cuál es el estrecho que une el Mediterráneo con el Atlántico?",a:["Gibraltar","Bósforo","Malaca"],c:0},
    {q:"¿Qué país tiene más territorio en Europa?",a:["Rusia","Ucrania","Francia"],c:0},
    {q:"¿Cuál es la capital de México?",a:["Ciudad de México","Guadalajara","Monterrey"],c:0},
    {q:"¿Dónde está el Gran Cañón?",a:["EE.UU.","Canadá","México"],c:0},
    {q:"¿Cuál es el río más importante de Argentina?",a:["Río Paraná","Río de la Plata","Río Uruguay"],c:0},
    {q:"¿En qué continente está Nueva Zelanda?",a:["Oceanía","Asia","América"],c:0},
    {q:"¿Cuál es la capital de Alemania?",a:["Berlín","Munich","Hamburgo"],c:0},
    {q:"¿Qué cordillera está en Asia central?",a:["Himalayas","Andes","Alpes"],c:0},
    {q:"¿Cuál es la capital de Sudáfrica?",a:["Pretoria (administrativa)","Ciudad del Cabo","Johannesburgo"],c:0},
    {q:"¿En qué país está Tokio?",a:["Japón","China","Corea del Sur"],c:0},
    {q:"¿Cuál es el canal que une el Mediterráneo con el Mar Rojo?",a:["Canal de Suez","Canal de Panamá","Canal de Kiel"],c:0},
    {q:"¿Qué país tiene la mayor reserva de agua dulce?",a:["Brasil","Canadá","Rusia"],c:0},
    {q:"¿Cuál es la capital de España?",a:["Madrid","Barcelona","Sevilla"],c:0},
    {q:"¿En qué país está el desierto de Atacama?",a:["Chile","Perú","Bolivia"],c:0},
    {q:"¿Cuál es el continente más seco del mundo?",a:["Antártida","Australia","África"],c:0},
  ],
  arte:[
    {q:"¿Quién pintó la Mona Lisa?",a:["Leonardo da Vinci","Michelangelo","Rafael"],c:0},
    {q:"¿Qué artista cortó su propia oreja?",a:["Van Gogh","Gauguin","Picasso"],c:0},
    {q:"¿Dónde está el museo del Louvre?",a:["París","Roma","Madrid"],c:0},
    {q:"¿Quién esculpió 'El Pensador'?",a:["Rodin","Bernini","Donatello"],c:0},
    {q:"¿Qué movimiento artístico lideró Picasso?",a:["Cubismo","Surrealismo","Dadaísmo"],c:0},
    {q:"¿Qué pintor es famoso por sus relojes derretidos?",a:["Dalí","Magritte","Ernst"],c:0},
    {q:"¿Quién pintó la Capilla Sixtina?",a:["Michelangelo","Rafael","Botticelli"],c:0},
    {q:"¿Qué es el fresco?",a:["Pintura sobre yeso húmedo","Escultura en mármol","Grabado en metal"],c:0},
    {q:"¿Quién pintó 'La Noche Estrellada'?",a:["Van Gogh","Monet","Cézanne"],c:0},
    {q:"¿Qué estilo arquitectónico tiene Notre Dame de París?",a:["Gótico","Románico","Barroco"],c:0},
    {q:"¿Quién pintó 'Las Meninas'?",a:["Velázquez","Goya","El Greco"],c:0},
    {q:"¿Qué es el impresionismo?",a:["Movimiento que captura luz y momento","Arte abstracto geométrico","Arte político"],c:0},
    {q:"¿Quién diseñó el Coliseo de Roma?",a:["Arquitectos del Imperio Romano","Leonardo da Vinci","Miguel Ángel"],c:0},
    {q:"¿Qué corriente artística promovió Warhol?",a:["Pop Art","Surrealismo","Expresionismo"],c:0},
    {q:"¿Quién pintó 'El Grito'?",a:["Edvard Munch","Klimt","Schiele"],c:0},
    {q:"¿Qué técnica usa el puntillismo?",a:["Puntos de color para formar imágenes","Trazos gruesos","Acuarela diluida"],c:0},
    {q:"¿Quién fue Frida Kahlo?",a:["Pintora mexicana surrealista","Escultora argentina","Fotógrafa española"],c:0},
    {q:"¿Qué es el Renacimiento?",a:["Movimiento cultural europeo s.XIV-XVI","Período medieval","Arte moderno"],c:0},
    {q:"¿Quién pintó 'La Última Cena'?",a:["Leonardo da Vinci","Rafael","Caravaggio"],c:0},
    {q:"¿Qué es el dadaísmo?",a:["Movimiento artístico antirracional y provocador","Arte geométrico","Pintura naturalista"],c:0},
    {q:"¿Quién esculpió el David de mármol?",a:["Michelangelo","Bernini","Rodin"],c:0},
    {q:"¿Qué museo tiene el Guernica de Picasso?",a:["Reina Sofía, Madrid","Prado, Madrid","Louvre, París"],c:0},
    {q:"¿Qué es la acuarela?",a:["Pintura con pigmentos diluidos en agua","Óleo sobre lienzo","Pastel sobre papel"],c:0},
    {q:"¿Quién diseñó la Torre Eiffel?",a:["Gustave Eiffel","Le Corbusier","Haussmann"],c:0},
    {q:"¿Qué corriente pictórica usó manchas y dripping?",a:["Expresionismo abstracto / Action Painting","Hiperrealismo","Constructivismo"],c:0},
    {q:"¿Quién pintó 'El beso'?",a:["Gustav Klimt","Egon Schiele","Oskar Kokoschka"],c:0},
    {q:"¿Qué material usaba principalmente Bernini?",a:["Mármol","Bronce","Madera"],c:0},
    {q:"¿Qué es el barroco?",a:["Estilo artístico del s.XVII con dramatismo y ornamento","Arte simple y geométrico","Movimiento moderno"],c:0},
    {q:"¿Quién pintó los 'Girasoles' más famosos?",a:["Van Gogh","Monet","Renoir"],c:0},
    {q:"¿Qué artista japonés pintó 'La Gran Ola'?",a:["Hokusai","Hiroshige","Utamaro"],c:0},
    {q:"¿Qué es la litografía?",a:["Impresión desde superficie plana","Grabado en madera","Escultura en piedra"],c:0},
    {q:"¿Quién diseñó el Guggenheim de Bilbao?",a:["Frank Gehry","Zaha Hadid","Norman Foster"],c:0},
    {q:"¿Qué país tiene más museos por habitante?",a:["Finlandia","Francia","Italia"],c:0},
    {q:"¿Quién pintó 'Saturno devorando a su hijo'?",a:["Goya","Velázquez","El Greco"],c:0},
    {q:"¿Qué es el neoclasicismo?",a:["Regreso a la estética grecolatina en s.XVIII","Arte medieval","Movimiento romántico"],c:0},
    {q:"¿Quién fue Caravaggio?",a:["Pintor italiano del barroco con uso dramático de luz","Escultor renacentista","Arquitecto romano"],c:0},
    {q:"¿Qué es la serigrafía?",a:["Técnica de impresión con malla","Pintura al óleo","Escultura en yeso"],c:0},
    {q:"¿Quién pintó 'Composición VIII'?",a:["Kandinsky","Mondrian","Malevich"],c:0},
    {q:"¿Qué movimiento artístico rechazó la belleza tradicional en el s.XX?",a:["Dadaísmo","Impresionismo","Realismo"],c:0},
    {q:"¿Quién fue el arquitecto de la Sagrada Familia?",a:["Gaudí","Le Corbusier","Mies van der Rohe"],c:0},
    {q:"¿Qué es el grabado?",a:["Impresión de imagen tallada en superficie","Pintura mural","Dibujo a lápiz"],c:0},
    {q:"¿Quién pintó 'Olympia'?",a:["Édouard Manet","Renoir","Degas"],c:0},
    {q:"¿Qué es la escultura cinética?",a:["Escultura que se mueve o tiene partes móviles","Escultura abstracta","Escultura en bronce"],c:0},
    {q:"¿Quién es el autor de 'El origen del mundo'?",a:["Gustave Courbet","Delacroix","Ingres"],c:0},
    {q:"¿Qué movimiento fundó Mondrian?",a:["De Stijl / Neoplasticismo","Bauhaus","Futurismo"],c:0},
    {q:"¿Quién fue Jean-Michel Basquiat?",a:["Artista neoexpresionista neoyorquino","Muralista mexicano","Fotógrafo francés"],c:0},
    {q:"¿Qué es el trompe l'oeil?",a:["Ilusión óptica pictórica de tridimensionalidad","Técnica de acuarela","Tipo de escultura"],c:0},
    {q:"¿Quién pintó 'La libertad guiando al pueblo'?",a:["Delacroix","David","Géricault"],c:0},
    {q:"¿Qué es el videoarte?",a:["Arte que usa video como medio expresivo","Arte digital 3D","Fotografía artística"],c:0},
    {q:"¿Quién diseñó el Centre Pompidou?",a:["Renzo Piano y Richard Rogers","I.M. Pei","Tadao Ando"],c:0},
    {q:"¿Qué estilo tiene la arquitectura de la Alhambra?",a:["Árabe-andaluz (nazarí)","Gótico","Románico"],c:0},
  ],
  deportes:[
    {q:"¿Cuántos jugadores tiene un equipo de fútbol?",a:["11","10","12"],c:0},
    {q:"¿En qué país nació el fútbol moderno?",a:["Inglaterra","Brasil","España"],c:0},
    {q:"¿Cuánto dura un partido de fútbol?",a:["90 minutos","80 minutos","100 minutos"],c:0},
    {q:"¿Qué país ganó más Mundiales de fútbol?",a:["Brasil (5)","Alemania (4)","Italia (4)"],c:0},
    {q:"¿En qué deporte se usa un 'birdie'?",a:["Golf","Tenis","Bádminton"],c:0},
    {q:"¿Cada cuántos años son los Juegos Olímpicos?",a:["4 años","2 años","5 años"],c:0},
    {q:"¿Cuántos sets son en tenis al mejor de 5?",a:["5","3","7"],c:0},
    {q:"¿Qué deporte practica LeBron James?",a:["Básquetbol","Fútbol","Béisbol"],c:0},
    {q:"¿Cuántos jugadores hay en un equipo de básquet?",a:["5","6","7"],c:0},
    {q:"¿En qué país se originó el rugby?",a:["Inglaterra","Australia","Nueva Zelanda"],c:0},
    {q:"¿Cuántos puntos vale un try en rugby?",a:["5","4","6"],c:0},
    {q:"¿Qué deporte juega Roger Federer?",a:["Tenis","Golf","Squash"],c:0},
    {q:"¿Cuántas vueltas tiene el Tour de Francia?",a:["21 etapas aproximadamente","30 etapas","15 etapas"],c:0},
    {q:"¿En qué año fueron los primeros JJ.OO. modernos?",a:["1896","1900","1904"],c:0},
    {q:"¿Cuántos metros tiene una piscina olímpica?",a:["50 m","25 m","100 m"],c:0},
    {q:"¿Qué deporte tiene el Grand Slam de Wimbledon?",a:["Tenis","Golf","Polo"],c:0},
    {q:"¿Cuántos jugadores tiene el béisbol por equipo en campo?",a:["9","10","11"],c:0},
    {q:"¿Qué país ganó el Mundial 2018?",a:["Francia","Croacia","Bélgica"],c:0},
    {q:"¿Qué país ganó el Mundial 2022?",a:["Argentina","Francia","Marruecos"],c:0},
    {q:"¿Cuántos pines hay en los bolos?",a:["10","9","12"],c:0},
    {q:"¿Qué deporte tiene el 'espalda libre'?",a:["Natación","Atletismo","Remo"],c:0},
    {q:"¿Cuántos km tiene un maratón?",a:["42,195 km","40 km","45 km"],c:0},
    {q:"¿Qué deporte juega Michael Jordan?",a:["Básquetbol","Béisbol","Fútbol americano"],c:0},
    {q:"¿Cuántos jugadores tiene el voleibol por equipo?",a:["6","5","7"],c:0},
    {q:"¿En qué país nació el baloncesto?",a:["EE.UU.","Canadá (James Naismith)","Brasil"],c:0},
    {q:"¿Cuántos cuartos tiene un partido de básquet NBA?",a:["4","2","3"],c:0},
    {q:"¿Qué deporte practica Usain Bolt?",a:["Atletismo (velocidad)","Fútbol","Rugby"],c:0},
    {q:"¿Cuántos jugadores tiene el hockey sobre hielo?",a:["6","5","7"],c:0},
    {q:"¿Qué deporte tiene el 'slam dunk'?",a:["Básquetbol","Voleibol","Balonmano"],c:0},
    {q:"¿Cuántos sets gana un partido de tenis (mejor de 3)?",a:["2 sets","3 sets","1 set"],c:0},
    {q:"¿Qué país tiene más medallas olímpicas en la historia?",a:["EE.UU.","URSS/Rusia","China"],c:0},
    {q:"¿En qué deporte se compite en el Dakar?",a:["Rally todo terreno","Ciclismo","Motocross"],c:0},
    {q:"¿Cuántos jugadores tiene el handball?",a:["7","6","8"],c:0},
    {q:"¿Qué es el 'offside' en fútbol?",a:["Posición adelantada irregular","Falta técnica","Cambio de jugador"],c:0},
    {q:"¿Cuánto dura cada período en hockey sobre hielo?",a:["20 minutos","15 minutos","25 minutos"],c:0},
    {q:"¿Qué deporte juega Lionel Messi?",a:["Fútbol","Fútbol americano","Rugby"],c:0},
    {q:"¿Cuántos hoyos tiene un campo de golf estándar?",a:["18","9","27"],c:0},
    {q:"¿Qué deporte tiene 'smash' y 'volée'?",a:["Tenis","Bádminton","Squash"],c:0},
    {q:"¿En qué deporte se nada con aletas y máscara en competencia?",a:["Natación con aletas","Triatlón","Waterpolo"],c:0},
    {q:"¿Cuánto dura un partido de waterpolo?",a:["4 períodos de 8 min","2 tiempos de 20 min","3 períodos de 10 min"],c:0},
    {q:"¿Qué deporte practica Valentino Rossi?",a:["Motociclismo (MotoGP)","Fórmula 1","Rally"],c:0},
    {q:"¿Cuántos jugadores tiene el polo?",a:["4 por equipo","3 por equipo","5 por equipo"],c:0},
    {q:"¿Qué deporte tiene la 'finta' y el 'regate'?",a:["Fútbol","Básquetbol","Rugby"],c:0},
    {q:"¿Cuántos metros tiene la valla más alta en atletismo?",a:["110 m (hombres)","100 m","120 m"],c:0},
    {q:"¿Qué deporte tiene el 'penal' o 'penalti'?",a:["Fútbol","Hockey","Waterpolo"],c:0},
    {q:"¿Cuánto pesa una pelota de fútbol oficial?",a:["410-450 gramos","300-350 gramos","500-550 gramos"],c:0},
    {q:"¿Qué deporte practica Novak Djokovic?",a:["Tenis","Squash","Bádminton"],c:0},
    {q:"¿Cuántas ruedas tiene un auto de Fórmula 1?",a:["4","6","8"],c:0},
    {q:"¿En qué deporte existe el 'fly' o mariposa?",a:["Natación","Atletismo","Remo"],c:0},
    {q:"¿Qué país organiza el torneo de Wimbledon?",a:["Inglaterra","EE.UU.","Francia"],c:0},
    {q:"¿Cuántos metros tiene una cancha de básquet NBA?",a:["28,65 × 15,24 m","30 × 15 m","26 × 14 m"],c:0},
  ],
  naturaleza:[
    {q:"¿Cuántos años puede vivir una tortuga gigante?",a:["100+ años","50 años","30 años"],c:0},
    {q:"¿Cuál es el animal terrestre más rápido?",a:["Guepardo","León","Caballo"],c:0},
    {q:"¿Qué proceso usan las plantas para alimentarse?",a:["Fotosíntesis","Respiración","Osmosis"],c:0},
    {q:"¿Cuál es el mamífero más grande del mundo?",a:["Ballena azul","Elefante","Tiburón ballena"],c:0},
    {q:"¿Cuánto dura la gestación de un elefante?",a:["22 meses","12 meses","9 meses"],c:0},
    {q:"¿Qué insecto produce la miel?",a:["Abeja","Avispa","Hormiga"],c:0},
    {q:"¿Cuántos tentáculos tiene un pulpo?",a:["8","6","10"],c:0},
    {q:"¿Cuál es el árbol más alto del mundo?",a:["Secuoya","Baobab","Eucalipto"],c:0},
    {q:"¿Cuál es el animal más venenoso del mundo?",a:["Medusa caja","Cobra","Araña viuda negra"],c:0},
    {q:"¿Cuánto tiempo vive una mosca?",a:["28 días","7 días","6 meses"],c:0},
    {q:"¿Qué es la clorofila?",a:["Pigmento verde de las plantas","Célula animal","Gas de la fotosíntesis"],c:0},
    {q:"¿Cuál es el pez más grande del mundo?",a:["Tiburón ballena","Ballena azul","Manta raya"],c:0},
    {q:"¿Cuántos ojos tiene una araña?",a:["8 (la mayoría)","6","4"],c:0},
    {q:"¿Qué mamífero puede volar?",a:["Murciélago","Ardilla voladora","Mono"],c:0},
    {q:"¿Cuál es el ave más grande que no puede volar?",a:["Avestruz","Emú","Pingüino emperor"],c:0},
    {q:"¿Qué animal tiene el cuello más largo?",a:["Jirafa","Camello","Llama"],c:0},
    {q:"¿Cuántos corazones tiene un pulpo?",a:["3","1","2"],c:0},
    {q:"¿Qué planta carnívora es la más conocida?",a:["Venus atrapamoscas","Nepentes","Drosera"],c:0},
    {q:"¿Cuánto tiempo duerme un koala por día?",a:["18-22 horas","8 horas","12 horas"],c:0},
    {q:"¿Qué es la hibernación?",a:["Estado de letargo invernal","Migración de aves","Muda de piel"],c:0},
    {q:"¿Cuál es el animal más inteligente después del humano?",a:["Chimpancé","Delfín","Elefante"],c:0},
    {q:"¿Cuántos años vive un cuervo?",a:["10-15 años","5 años","25 años"],c:0},
    {q:"¿Qué árbol produce el corcho?",a:["Alcornoque","Roble","Pino"],c:0},
    {q:"¿Cuántas patas tiene un ciempiés?",a:["30 a 354 (varía)","100 exactas","50 exactas"],c:0},
    {q:"¿Qué animal es el símbolo de la paz?",a:["Paloma","Águila","Cisne"],c:0},
    {q:"¿Cuánto pesa un elefante africano adulto?",a:["5.000-7.000 kg","2.000 kg","10.000 kg"],c:0},
    {q:"¿Qué es la mimetización?",a:["Camuflaje para parecerse al entorno","Comportamiento de caza","Tipo de migración"],c:0},
    {q:"¿Cuál es el animal que tiene mayor esperanza de vida?",a:["Almeja de Groenlandia (500+ años)","Tortuga gigante","Ballena"],c:0},
    {q:"¿Qué tipo de animal es el delfín?",a:["Mamífero","Pez","Reptil"],c:0},
    {q:"¿Cuántas especies de pingüinos existen?",a:["18","8","25"],c:0},
    {q:"¿Qué es un marsupial?",a:["Mamífero que cría en bolsa (canguro, koala)","Reptil de sangre fría","Ave sin vuelo"],c:0},
    {q:"¿Cuántos km puede volar una mariposa monarca?",a:["Hasta 4.500 km","500 km","1.000 km"],c:0},
    {q:"¿Qué animal tiene más dientes?",a:["Caracol (25.000)","Tiburón","Cocodrilo"],c:0},
    {q:"¿Cuál es el árbol más antiguo del mundo?",a:["Pino Matusalén (~5.000 años)","Baobab","Olivo"],c:0},
    {q:"¿Qué tipo de reproducción tiene la estrella de mar?",a:["Sexual y asexual","Solo sexual","Solo asexual"],c:0},
    {q:"¿Cuánto tiempo puede sobrevivir una cucaracha sin cabeza?",a:["Varias semanas","Unos días","Unas horas"],c:0},
    {q:"¿Qué es el plancton?",a:["Organismos microscópicos flotantes del mar","Tipo de alga","Pez pequeño"],c:0},
    {q:"¿Cuál es el mamífero más pequeño del mundo?",a:["Musaraña etrusca","Ratón pigmeo","Murciélago abejorro"],c:0},
    {q:"¿Qué produce el silkworm (gusano de seda)?",a:["Seda","Lana","Algodón"],c:0},
    {q:"¿Cuántas cámaras tiene el estómago de una vaca?",a:["4","3","2"],c:0},
    {q:"¿Qué es la eclosión?",a:["Salida de la cría del huevo","Proceso de muda","Fase de crecimiento"],c:0},
    {q:"¿Cuál es el océano más profundo?",a:["Pacífico (Fosa de las Marianas)","Atlántico","Índico"],c:0},
    {q:"¿Qué animal produce el veneno tetrodotoxina?",a:["Pez globo","Cobra","Escorpión"],c:0},
    {q:"¿Cuántos km/h puede correr un guepardo?",a:["110-120 km/h","80 km/h","150 km/h"],c:0},
    {q:"¿Qué es la polinización?",a:["Transferencia de polen para reproducción vegetal","Proceso de nutrición","Tipo de fotosíntesis"],c:0},
    {q:"¿Cuál es el coral más grande del mundo?",a:["Gran Barrera de Coral, Australia","Arrecife Mesoamericano","Coral Triangle"],c:0},
    {q:"¿Qué animal tiene la lengua más larga?",a:["Camaleón (más del 100% de su cuerpo)","Hormiguero","Rana"],c:0},
    {q:"¿Cuántos músculos usa una abeja para volar?",a:["No usa músculos de vuelo directos, usa resonancia","100 músculos","50 músculos"],c:0},
    {q:"¿Qué es el bioma?",a:["Gran región ecológica con clima y vida característicos","Solo el clima de una zona","El suelo de una región"],c:0},
    {q:"¿Cuál es el insecto más fuerte en proporción?",a:["Escarabajo rinoceronte","Hormiga","Abeja"],c:0},
    {q:"¿Qué árbol pierde sus hojas en otoño?",a:["Árbol caducifolio","Árbol de hoja perenne","Conífera"],c:0},
  ],
  musica:[
    {q:"¿Cuántas cuerdas tiene una guitarra estándar?",a:["6","4","8"],c:0},
    {q:"¿Quién compuso la Quinta Sinfonía?",a:["Beethoven","Mozart","Bach"],c:0},
    {q:"¿Cuántas notas tiene la escala musical?",a:["7 (do re mi fa sol la si)","8","12 (con semitonos)"],c:0},
    {q:"¿Qué instrumento toca Yo-Yo Ma?",a:["Cello","Violín","Viola"],c:0},
    {q:"¿Quién es conocido como el Rey del Pop?",a:["Michael Jackson","Elvis","Prince"],c:0},
    {q:"¿Qué banda grabó 'Bohemian Rhapsody'?",a:["Queen","The Beatles","Led Zeppelin"],c:0},
    {q:"¿En qué país nació Mozart?",a:["Austria","Alemania","Italia"],c:0},
    {q:"¿Cuántas cuerdas tiene un violín?",a:["4","5","6"],c:0},
    {q:"¿Qué es el contrapunto en música?",a:["Técnica de combinar melodías independientes","Tipo de ritmo","Escala musical"],c:0},
    {q:"¿Quién compuso 'Las Cuatro Estaciones'?",a:["Vivaldi","Bach","Handel"],c:0},
    {q:"¿Qué es el jazz?",a:["Género musical afroamericano con improvisación","Música clásica europea","Género de danza caribeña"],c:0},
    {q:"¿Cuántos teclas tiene un piano estándar?",a:["88","72","96"],c:0},
    {q:"¿Quién compuso 'El lago de los cisnes'?",a:["Tchaikovsky","Strauss","Brahms"],c:0},
    {q:"¿Qué es el tempo en música?",a:["Velocidad de la pieza musical","Volumen","Tono"],c:0},
    {q:"¿Quién cantó 'Purple Rain'?",a:["Prince","Michael Jackson","David Bowie"],c:0},
    {q:"¿Qué instrumento es la trompeta?",a:["Viento metal","Viento madera","Percusión"],c:0},
    {q:"¿Quién compuso 'El Réquiem' inacabado?",a:["Mozart","Verdi","Brahms"],c:0},
    {q:"¿Qué es la ópera?",a:["Drama musical con cantos y orquesta","Ballet con música","Concierto sinfónico"],c:0},
    {q:"¿Quién es conocido como 'The King' del rock?",a:["Elvis Presley","Chuck Berry","Little Richard"],c:0},
    {q:"¿Qué banda formó John Lennon?",a:["The Beatles","The Rolling Stones","The Who"],c:0},
    {q:"¿Cuántas cuerdas tiene un contrabajo?",a:["4 (a veces 5)","6","3"],c:0},
    {q:"¿Qué es el blues?",a:["Género afroamericano melancólico y expresivo","Música de baile latina","Género electrónico"],c:0},
    {q:"¿Quién compuso 'La Traviata'?",a:["Verdi","Puccini","Donizetti"],c:0},
    {q:"¿Qué nota musical es 'Do' en inglés?",a:["C","D","A"],c:0},
    {q:"¿Qué es una octava musical?",a:["Intervalo de 8 notas que duplica la frecuencia","Conjunto de 8 instrumentos","Tipo de escala"],c:0},
    {q:"¿Quién cantó 'Like a Prayer'?",a:["Madonna","Whitney Houston","Janet Jackson"],c:0},
    {q:"¿Qué es el flamenco?",a:["Arte musical y danza del sur de España","Danza argentina","Música cubana"],c:0},
    {q:"¿Quién compuso 'El Mesías'?",a:["Handel","Bach","Haydn"],c:0},
    {q:"¿Qué es el reggae?",a:["Género jamaicano popularizado por Bob Marley","Música de Trinidad","Género brasileño"],c:0},
    {q:"¿Cuántos movimientos tiene una sinfonía clásica típica?",a:["4","3","5"],c:0},
    {q:"¿Quién compuso 'Clair de lune'?",a:["Debussy","Ravel","Satie"],c:0},
    {q:"¿Qué es el rap?",a:["Estilo vocal rítmico sobre música urbana","Canto operístico","Música electrónica"],c:0},
    {q:"¿Quién fue Freddie Mercury?",a:["Vocalista de Queen","Guitarrista de Led Zeppelin","Bajista de The Beatles"],c:0},
    {q:"¿Qué instrumento es el oboe?",a:["Viento madera de lengüeta doble","Viento metal","Percusión"],c:0},
    {q:"¿Quién cantó 'Imagine'?",a:["John Lennon","Paul McCartney","George Harrison"],c:0},
    {q:"¿Qué es el compás en música?",a:["Unidad de tiempo que organiza el ritmo","Tipo de melodía","Instrumento de dirección"],c:0},
    {q:"¿Quién compuso 'La Flauta Mágica'?",a:["Mozart","Beethoven","Schubert"],c:0},
    {q:"¿Qué es el bossa nova?",a:["Género brasileño fusión de samba y jazz","Música rioplatense","Ritmo caribeño"],c:0},
    {q:"¿Quién inventó la guitarra eléctrica moderna?",a:["Leo Fender y Les Paul","Chuck Berry","Jimi Hendrix"],c:0},
    {q:"¿Qué es una partitura?",a:["Notación escrita de música","Instrumento de percusión","Tipo de composición"],c:0},
    {q:"¿Quién cantó 'No Woman No Cry'?",a:["Bob Marley","Jimmy Cliff","Burning Spear"],c:0},
    {q:"¿Qué es el timbre en música?",a:["Cualidad que distingue un sonido (color del sonido)","Volumen","Velocidad"],c:0},
    {q:"¿Quién compuso 'Carmina Burana'?",a:["Carl Orff","Wagner","Mahler"],c:0},
    {q:"¿Qué es el solfeo?",a:["Sistema de lectura musical con nombres de notas","Tipo de canto coral","Técnica de piano"],c:0},
    {q:"¿Quién fue Billie Holiday?",a:["Icónica cantante de jazz y blues","Compositora de ópera","Pianista clásica"],c:0},
    {q:"¿Qué es el heavy metal?",a:["Género de rock distorsionado y pesado","Música electrónica","Género de jazz"],c:0},
    {q:"¿Quién compuso 'El anillo del nibelungo'?",a:["Wagner","Liszt","Bruckner"],c:0},
    {q:"¿Qué instrumento es la balalaika?",a:["Instrumento de cuerda ruso triangular","Flauta andina","Tambor africano"],c:0},
    {q:"¿Quién es conocido como el 'Dios de la Guitarra'?",a:["Jimi Hendrix","Eric Clapton","Carlos Santana"],c:0},
    {q:"¿Qué es el pentagrama?",a:["5 líneas donde se escribe la música","Tipo de escala","Instrumento"],c:0},
    {q:"¿Quién compuso 'El bolero'?",a:["Ravel","Debussy","Bizet"],c:0},
  ],
  mitologia:[
    {q:"¿Quién es el dios del mar en la mitología griega?",a:["Poseidón","Zeus","Ares"],c:0},
    {q:"¿Qué héroe mató al Minotauro?",a:["Teseo","Hércules","Perseo"],c:0},
    {q:"¿Quién robó el fuego a los dioses?",a:["Prometeo","Ícaro","Atlas"],c:0},
    {q:"¿Cuántos trabajos realizó Hércules?",a:["12","10","7"],c:0},
    {q:"¿Quién es Thor en la mitología nórdica?",a:["Dios del trueno","Dios del mar","Dios del sol"],c:0},
    {q:"¿Qué ave renace de sus propias cenizas?",a:["Fénix","Grifo","Harpy"],c:0},
    {q:"¿Quién abrió la caja de Pandora?",a:["Pandora","Prometeo","Epimeteo"],c:0},
    {q:"¿Qué es el Olimpo?",a:["Morada de los dioses griegos","Un laberinto","Un río sagrado"],c:0},
    {q:"¿Quién es Odín en la mitología nórdica?",a:["Padre de los dioses","Dios del trueno","Dios de la guerra"],c:0},
    {q:"¿Qué bestia guardaba el vellón de oro?",a:["Dragón insomne","Minotauro","Hidra"],c:0},
    {q:"¿Quién es Anubis?",a:["Dios egipcio de la muerte","Dios griego del sol","Héroe troyano"],c:0},
    {q:"¿Qué es el Tártaro?",a:["El inframundo más profundo griego","Montaña sagrada","Mar de los muertos"],c:0},
    {q:"¿Quién era Aquiles?",a:["Héroe griego casi invulnerable","Rey de Troya","Dios de la guerra"],c:0},
    {q:"¿Qué criatura tiene cuerpo de hombre y cabeza de toro?",a:["Minotauro","Centauro","Fauno"],c:0},
    {q:"¿Quién es Ra en la mitología egipcia?",a:["Dios del sol","Dios del Nilo","Dios de los muertos"],c:0},
    {q:"¿Qué héroe mató a la Medusa?",a:["Perseo","Teseo","Jasón"],c:0},
    {q:"¿Quién es Loki en la mitología nórdica?",a:["Dios del engaño y travesuras","Dios del fuego","Dios de la sabiduría"],c:0},
    {q:"¿Qué es el Minotauro?",a:["Criatura con cuerpo humano y cabeza de toro","Dragón griego","Gigante cíclope"],c:0},
    {q:"¿Quién es Ares?",a:["Dios griego de la guerra","Dios del mar","Dios del cielo"],c:0},
    {q:"¿Qué es el Valhalla?",a:["Paraíso nórdico para guerreros caídos","Infierno nórdico","Montaña de los dioses"],c:0},
    {q:"¿Quién fue Osiris?",a:["Dios egipcio de la resurrección","Dios del caos","Faraón divino"],c:0},
    {q:"¿Qué es la Estige?",a:["Río del inframundo griego","Montaña sagrada","Ciudad de los muertos"],c:0},
    {q:"¿Quién es Afrodita?",a:["Diosa griega del amor","Diosa de la guerra","Diosa de la sabiduría"],c:0},
    {q:"¿Qué es la Hidra de Lerna?",a:["Serpiente acuática de múltiples cabezas","Dragón alado","Criatura marina"],c:0},
    {q:"¿Quién es Hades?",a:["Dios del inframundo griego","Dios del mar","Dios del cielo"],c:0},
    {q:"¿Qué es Asgard?",a:["Reino de los dioses nórdicos","Inframundo nórdico","Tierra de los humanos"],c:0},
    {q:"¿Quién fue Eneas?",a:["Héroe troyano, fundador mítico de Roma","Rey de Grecia","Dios menor griego"],c:0},
    {q:"¿Qué es un centauro?",a:["Ser mitad hombre mitad caballo","Ser mitad hombre mitad pez","Gigante de un ojo"],c:0},
    {q:"¿Quién es Hermes?",a:["Mensajero de los dioses griegos","Dios de la guerra","Dios del mar"],c:0},
    {q:"¿Qué es el laberinto de Creta?",a:["Construcción donde vivía el Minotauro","Templo de Zeus","Tumba de Minos"],c:0},
    {q:"¿Quién es Set en la mitología egipcia?",a:["Dios del caos y las tormentas","Dios del sol","Dios de la sabiduría"],c:0},
    {q:"¿Qué es Yggdrasil?",a:["Árbol del mundo nórdico","Espada sagrada","Runa de poder"],c:0},
    {q:"¿Quién fue Ulises?",a:["Héroe griego famoso por su astucia y el viaje a Ítaca","Rey de Troya","Dios menor"],c:0},
    {q:"¿Qué es la Amazonia mítica?",a:["Reino de guerreras femeninas","Ciudad submarina","Bosque encantado"],c:0},
    {q:"¿Quién es Atenea?",a:["Diosa griega de la sabiduría","Diosa del amor","Diosa de la luna"],c:0},
    {q:"¿Qué es Fenrir?",a:["Lobo gigante nórdico que devorará a Odín","Dragón de fuego","Gigante de hielo"],c:0},
    {q:"¿Quién mató a Aquiles?",a:["Paris, con una flecha en el talón","Héctor","Agamenón"],c:0},
    {q:"¿Qué es el Eliseo?",a:["Paraíso griego para héroes y virtuosos","Inframundo oscuro","Isla de los dioses"],c:0},
    {q:"¿Quién es Quetzalcóatl?",a:["Dios serpiente emplumada azteca","Dios inca del sol","Héroe maya"],c:0},
    {q:"¿Qué es la Odisea?",a:["Viaje de regreso de Ulises a Ítaca","Guerra de Troya","Fundación de Roma"],c:0},
    {q:"¿Quién construyó el laberinto de Creta?",a:["Dédalo","Minos","Ícaro"],c:0},
    {q:"¿Qué es Niflheim?",a:["Mundo de niebla y hielo nórdico","Paraíso nórdico","Tierra de gigantes"],c:0},
    {q:"¿Quién es Bast?",a:["Diosa egipcia con cabeza de gato","Diosa griega de la caza","Diosa nórdica del amor"],c:0},
    {q:"¿Qué es el caduceo de Hermes?",a:["Bastón con dos serpientes entrelazadas","Espada sagrada","Escudo dorado"],c:0},
    {q:"¿Quién fue Rómulo?",a:["Fundador mítico de Roma, criado por una loba","Rey de Cartago","Héroe troyano"],c:0},
    {q:"¿Qué es la Quimera?",a:["Bestia con partes de león, cabra y serpiente","Dragón de dos cabezas","Gigante marino"],c:0},
    {q:"¿Quién es Vulcano?",a:["Dios romano del fuego y la forja","Dios del mar","Dios del viento"],c:0},
    {q:"¿Qué es el Ragnarök?",a:["Fin del mundo en la mitología nórdica","Batalla primordial griega","Apocalipsis egipcio"],c:0},
    {q:"¿Quién es Shiva en el hinduismo?",a:["Dios de la destrucción y transformación","Dios creador","Dios conservador"],c:0},
    {q:"¿Qué es la Esfinge egipcia?",a:["Estatua con cuerpo de león y cabeza humana","Diosa de la muerte","Guardia del inframundo"],c:0},
    {q:"¿Quién fue Jasón en la mitología griega?",a:["Héroe que buscó el Vellón de Oro","Rey de Troya","Fundador de Atenas"],c:0},
  ],
  cocina:[
    {q:"¿De qué país es la pizza?",a:["Italia","Grecia","España"],c:0},
    {q:"¿Qué especia da color amarillo al curry?",a:["Cúrcuma","Azafrán","Comino"],c:0},
    {q:"¿A qué temperatura hierve el agua?",a:["100°C","90°C","120°C"],c:0},
    {q:"¿Qué fruta es el guacamole?",a:["Palta/Aguacate","Mango","Papaya"],c:0},
    {q:"¿Qué ingrediente fermenta el pan?",a:["Levadura","Sal","Azúcar"],c:0},
    {q:"¿De dónde es el sushi?",a:["Japón","China","Corea"],c:0},
    {q:"¿Qué es el umami?",a:["El quinto sabor básico","Un tipo de pasta","Una especia"],c:0},
    {q:"¿De qué animal viene el jamón serrano?",a:["Cerdo","Ternera","Cordero"],c:0},
    {q:"¿Qué es el sofrito?",a:["Base de cocción con cebolla, ajo y tomate","Tipo de pasta","Salsa fría"],c:0},
    {q:"¿Qué es el miso?",a:["Pasta fermentada japonesa de soja","Salsa china de ostras","Condimento tailandés"],c:0},
    {q:"¿De dónde viene la paella?",a:["Valencia, España","Toda España","Cataluña"],c:0},
    {q:"¿Qué es el kéfir?",a:["Bebida láctea fermentada","Tipo de queso","Yogur griego"],c:0},
    {q:"¿Cuál es la base del pesto genovés?",a:["Albahaca, piñones, ajo, queso","Tomate y aceite","Aceitunas y anchoas"],c:0},
    {q:"¿Qué es la tempura?",a:["Fritura japonesa en masa ligera","Sopa japonesa","Marinado japonés"],c:0},
    {q:"¿De qué país es el croissant?",a:["Francia (origen Austria)","Italia","Bélgica"],c:0},
    {q:"¿Qué es el tahini?",a:["Pasta de sésamo","Salsa de pimiento","Crema de garbanzo"],c:0},
    {q:"¿Qué es el risotto?",a:["Arroz cremoso italiano","Pasta rellena","Sopa de arroz"],c:0},
    {q:"¿De dónde viene el kimchi?",a:["Corea","China","Japón"],c:0},
    {q:"¿Qué es la beurre blanc?",a:["Salsa francesa de mantequilla y vino blanco","Tipo de queso","Crema batida"],c:0},
    {q:"¿Qué es el ceviche?",a:["Plato de pescado crudo marinado en cítricos","Sopa de mariscos","Pescado frito"],c:0},
    {q:"¿De dónde proviene el ceviche?",a:["Perú","México","Ecuador"],c:0},
    {q:"¿Qué es el foie gras?",a:["Hígado graso de pato o ganso","Carne de ternera","Embutido de cerdo"],c:0},
    {q:"¿Qué es el tandoor?",a:["Horno de barro cilíndrico indio","Tipo de curry","Especia india"],c:0},
    {q:"¿Qué es el prosciutto?",a:["Jamón curado italiano","Salami italiano","Tipo de queso"],c:0},
    {q:"¿De qué se hace el tofu?",a:["Soja","Leche de vaca","Arroz"],c:0},
    {q:"¿Qué es el ghee?",a:["Mantequilla clarificada india","Aceite de coco","Grasa de cerdo"],c:0},
    {q:"¿Qué es el chimichurri?",a:["Salsa argentina de hierbas y vinagre","Marinado peruano","Salsa picante mexicana"],c:0},
    {q:"¿Qué es el tzatziki?",a:["Salsa griega de yogur, pepino y ajo","Hummus griego","Ensalada de berenjenas"],c:0},
    {q:"¿Qué es la fondue?",a:["Plato suizo de queso o chocolate derretido","Caldo francés","Guiso belga"],c:0},
    {q:"¿De qué país viene el sauerkraut?",a:["Alemania","Austria","Suiza"],c:0},
    {q:"¿Qué es la harissa?",a:["Pasta picante norteafricana de chiles","Salsa turca","Condimento indio"],c:0},
    {q:"¿Qué tipo de pasta es el fettuccine?",a:["Pasta plana y larga","Pasta tubular corta","Pasta rellena"],c:0},
    {q:"¿De qué país es el shawarma?",a:["Oriente Medio (Levante)","Grecia","Turquía (döner kebab similar)"],c:0},
    {q:"¿Qué es el sake?",a:["Vino de arroz japonés","Cerveza coreana","Destilado chino"],c:0},
    {q:"¿Qué es la ratatouille?",a:["Guiso provenzal de verduras","Sopa de cebolla francesa","Quiche lorraine"],c:0},
    {q:"¿Qué es el panko?",a:["Pan rallado japonés grueso","Tipo de pasta","Harina de arroz"],c:0},
    {q:"¿De qué país es el pierogi?",a:["Polonia","Rusia","Ucrania"],c:0},
    {q:"¿Qué es la salsa béchamel?",a:["Salsa blanca de leche, harina y mantequilla","Salsa de tomate francesa","Crema agria"],c:0},
    {q:"¿Qué es el crème brûlée?",a:["Postre francés de crema con azúcar caramelizado","Mousse de chocolate","Flan español"],c:0},
    {q:"¿De qué planta se extrae la vainilla?",a:["Orquídea (Vanilla planifolia)","Canela","Cardamomo"],c:0},
    {q:"¿Qué es el pad thai?",a:["Salteado tailandés de fideos de arroz","Sopa vietnamita","Curry malayo"],c:0},
    {q:"¿Qué es el manchego?",a:["Queso español de oveja de La Mancha","Queso italiano","Embutido manchego"],c:0},
    {q:"¿Qué es el ketchup?",a:["Salsa de tomate condimentada","Salsa de pimiento","Mostaza dulce"],c:0},
    {q:"¿De qué país es el baklava?",a:["Turquía y Medio Oriente","Grecia (también)","Solo de Turquía"],c:0},
    {q:"¿Qué es el carpaccio?",a:["Láminas finas de carne o pescado crudos","Pasta italiana rellena","Risotto negro"],c:0},
    {q:"¿Qué es el tamarindo?",a:["Fruto ácido usado en cocina asiática y latinoamericana","Especia india","Tipo de chile"],c:0},
    {q:"¿De qué país es el goulash?",a:["Hungría","Austria","República Checa"],c:0},
    {q:"¿Qué es el mole?",a:["Salsa mexicana compleja con chile y chocolate","Guiso argentino","Salsa peruana"],c:0},
    {q:"¿Qué es la paella de mariscos?",a:["Arroz español con mariscos y azafrán","Sopa de mariscos","Fideos con mariscos"],c:0},
    {q:"¿Qué es el wasabi?",a:["Pasta picante japonesa de rábano","Jengibre japonés","Mostaza japonesa"],c:0},
    {q:"¿De qué país es el stroganoff?",a:["Rusia","Francia","Polonia"],c:0},
  ],
};

// Mezclar opciones de respuesta manteniendo el índice correcto
function shuffleAnswers(q){
  const paired = q.a.map((txt,i)=>({txt, correct: i===q.c}));
  for(let i=paired.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [paired[i],paired[j]]=[paired[j],paired[i]];
  }
  return paired; // [{txt, correct}, ...]
}

// Pools de preguntas por categoría
// seen: índices ya mostrados (no repetir hasta agotar)
// wrong: índices respondidos mal (vuelven al final)
const SEEN = {};
const WRONG = {};

function getRandomQuestion(cat){
  const pool = TRIVIA[cat] || TRIVIA.historia;
  if(!SEEN[cat]) SEEN[cat] = [];
  if(!WRONG[cat]) WRONG[cat] = [];

  // Índices disponibles: no vistos aún
  let available = pool.map((_,i)=>i).filter(i => !SEEN[cat].includes(i));

  // Si ya se vieron todas, reiniciar (pero mantener las incorrectas para primero)
  if(available.length === 0){
    // Priorizar las incorrectas si las hay
    if(WRONG[cat].length > 0){
      SEEN[cat] = pool.map((_,i)=>i).filter(i => !WRONG[cat].includes(i));
      available = [...WRONG[cat]];
    } else {
      // Reiniciar todo
      SEEN[cat] = [];
      available = pool.map((_,i)=>i);
    }
  }

  // Priorizar incorrectas si hay y están disponibles
  const wrongAvailable = available.filter(i => WRONG[cat].includes(i));
  const idx = wrongAvailable.length > 0
    ? wrongAvailable[Math.floor(Math.random()*wrongAvailable.length)]
    : available[Math.floor(Math.random()*available.length)];

  SEEN[cat].push(idx);
  return { ...pool[idx], _idx: idx, _cat: cat };
}

function markQuestionWrong(q){
  if(q._idx === undefined) return;
  const cat = q._cat;
  if(!WRONG[cat]) WRONG[cat] = [];
  if(!WRONG[cat].includes(q._idx)) WRONG[cat].push(q._idx);
}
function markQuestionCorrect(q){
  if(q._idx === undefined) return;
  const cat = q._cat;
  if(!WRONG[cat]) return;
  WRONG[cat] = WRONG[cat].filter(i => i !== q._idx);
}

function goToTemple(){
  showScreen('temple');
  templeCategory = 'historia';
  templeAnswered  = false;
  updateTempleUI();
  showTempleIdle();
}

function templeBack(){
  updateMenuPreview();
  updateMenuBackground();
  showScreen('menu');
}

function selectCategory(el){
  document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('selected'));
  el.classList.add('selected');
  templeCategory = el.dataset.cat;
  templeAnswered  = false;
  showTempleIdle();
}

function showTempleIdle(){
  document.getElementById('temple-healer').textContent = '🧝';
  document.getElementById('temple-question-text').textContent =
    'El curandero aguarda... Presioná una pregunta para comenzar.';
  const ans = document.getElementById('temple-answers');
  ans.innerHTML = '<button class="answer-btn" style="text-align:center;border-color:var(--gold);color:var(--gold)" onclick="templeAskQuestion()">🙏 PEDIR CURACIÓN</button>';
  document.getElementById('temple-feedback').textContent = '';
  document.getElementById('temple-next-btn').style.display = 'none';
}

function templeAskQuestion(){
  if(PLAYER_HP.hp >= PLAYER_HP.maxHp){
    document.getElementById('temple-question-text').textContent = '¡Tu vida ya está al máximo, viajero!';
    document.getElementById('temple-answers').innerHTML = '';
    document.getElementById('temple-healer').textContent = '😇';
    return;
  }
  templeCurrentQ = getRandomQuestion(templeCategory);
  templeAnswered  = false;
  document.getElementById('temple-healer').textContent = '🧝';
  document.getElementById('temple-question-text').textContent = templeCurrentQ.q;
  document.getElementById('temple-feedback').textContent = '';
  document.getElementById('temple-next-btn').style.display = 'none';

  const shuffled = shuffleAnswers(templeCurrentQ);
  const ans = document.getElementById('temple-answers');
  ans.innerHTML = '';
  shuffled.forEach((opt,i)=>{
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt.txt;
    btn.onclick = ()=> templeAnswer(opt.correct, btn, ans);
    ans.appendChild(btn);
  });
}

function templeAnswer(isCorrect, btn, container){
  if(templeAnswered) return;
  templeAnswered = true;

  // Disable all buttons
  container.querySelectorAll('.answer-btn').forEach(b=>b.disabled=true);

  if(isCorrect){
    btn.classList.add('correct');
    document.getElementById('temple-healer').textContent = '✨';
    const healAmt = Math.ceil(PLAYER_HP.maxHp * HEAL_PCT);
    PLAYER_HP.hp = Math.min(PLAYER_HP.maxHp, PLAYER_HP.hp + healAmt);
    document.getElementById('temple-feedback').textContent = '✅ ¡Correcto! +'+healAmt+' vida recuperada';
    document.getElementById('temple-feedback').style.color = '#60ff80';
  } else {
    btn.classList.add('wrong');
    // Mark correct answer green
    container.querySelectorAll('.answer-btn').forEach(b=>{
      // We don't know which is correct by index anymore (shuffled), skip highlighting
    });
    document.getElementById('temple-healer').textContent = '😔';
    const cost = Math.min(WRONG_COST, COINS.balance);
    TEMPLE_COINS = Math.max(0, TEMPLE_COINS - cost);
    document.getElementById('temple-feedback').textContent = '❌ Incorrecto — perdiste '+cost+' 🪙';
    document.getElementById('temple-feedback').style.color = '#ff6060';
  }

  updateTempleUI();
  document.getElementById('temple-next-btn').style.display = 'block';
}

function templeNextQuestion(){
  if(COINS.balance <= 0 && PLAYER_HP.hp < PLAYER_HP.maxHp){
    document.getElementById('temple-question-text').textContent = 'Sin monedas... volvé a farmear y regresá.';
    document.getElementById('temple-answers').innerHTML = '';
    document.getElementById('temple-next-btn').style.display = 'none';
    document.getElementById('temple-healer').textContent = '😞';
    return;
  }
  if(PLAYER_HP.hp >= PLAYER_HP.maxHp){
    document.getElementById('temple-question-text').textContent = '¡Estás curado al máximo! Que los dioses te acompañen.';
    document.getElementById('temple-answers').innerHTML = '';
    document.getElementById('temple-next-btn').style.display = 'none';
    document.getElementById('temple-healer').textContent = '🌟';
    return;
  }
  templeAskQuestion();
}

function updateTempleUI(){
  const hp = PLAYER_HP.hp, maxHp = PLAYER_HP.maxHp;
  pct(document.getElementById('temple-player-hp-fill'), hp, maxHp);
  document.getElementById('temple-hp-text').textContent = hp+'/'+maxHp;
  document.getElementById('temple-coins-display').textContent = '🪙 '+COINS.balance;
  updateMenuPreview();
}


// ===================== TUTORIAL =====================
function showTutTab(tab, btn){
  document.querySelectorAll('.tut-section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tut-tab').forEach(b=>b.classList.remove('active'));
  document.getElementById('tut-'+tab).classList.add('active');
  btn.classList.add('active');
  document.getElementById('tut-content').scrollTop=0;
}



// ===================== MEDUSA GAZE =====================
let medusaGazeInterval = null;

function startMedusaGaze(){
  stopMedusaGaze();
  medusaGazeInterval = setInterval(()=>{
    if(!gameActive) return;
    triggerMedusaGaze();
  }, 10000);
}

function stopMedusaGaze(){
  if(medusaGazeInterval){ clearInterval(medusaGazeInterval); medusaGazeInterval = null; }
  // Clean up flash
  const flash = document.getElementById('medusa-flash');
  const warn  = document.getElementById('medusa-warning');
  if(flash){ flash.classList.remove('active','fading'); }
  if(warn)  { warn.style.display='none'; }
}

function triggerMedusaGaze(){
  const flash  = document.getElementById('medusa-flash');
  const warn   = document.getElementById('medusa-warning');
  const spr    = document.getElementById('enemy-sprite');
  if(!flash) return;

  // Step 1: Open medusa eyes (1s warning)
  if(spr) spr.classList.add('gaze-warning');

  // Protected with glasses → cosmetic only
  if(dimActive){
    setTimeout(()=>{
      if(spr) spr.classList.remove('gaze-warning');
      // Light purple flash
      flash.style.background = 'rgba(120,0,200,0.25)';
      flash.classList.add('active');
      setTimeout(()=>{
        flash.style.background = '';
        flash.classList.remove('active');
        flash.classList.add('fading');
        setTimeout(()=>flash.classList.remove('fading'),700);
      }, 400);
    }, 1000);
    addLog('🐍 Medusa abre los ojos... ¡lentes te protegieron!','system');
    return;
  }

  // Step 2: After 1s → full white flash + damage
  setTimeout(()=>{
    if(spr) spr.classList.remove('gaze-warning');
    flash.style.background = '';
    flash.classList.add('active');
    warn.style.display = 'block';

    setTimeout(()=>{
      const dmg = 100;
      G.playerHp = Math.max(0, G.playerHp - dmg);
      showFloat('-'+dmg,'player','dmg');
      flashDamage();
      addLog('🐍 ¡Mirada de Medusa! -'+dmg+' HP (poné los lentes 😎)','enemy');
      updateBattleUI();
      if(checkLose()) return;
      flash.classList.remove('active');
      flash.classList.add('fading');
      warn.style.display='none';
      setTimeout(()=>flash.classList.remove('fading'),700);
    }, 1000);
  }, 1000);
}

// ===================== DIM MODE =====================
let dimActive = false;
function toggleDim(){
  dimActive = !dimActive;
  const dimmer = document.getElementById('screen-dimmer');
  if(dimmer) dimmer.classList.toggle('active', dimActive);
  // Update all dim buttons
  document.querySelectorAll('#btn-dim, #btn-dim-farm').forEach(b=>{
    b.classList.toggle('active', dimActive);
  });
}


// ===================== COINS ENGINE =====================
let COINS = {
  balance: 0,       // saldo disponible (se gasta en templo)
  totalEarned: 0,   // total histórico ganado (nunca baja — es el score del ranking)
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  spellsCast: 0,
  farmKills: 0,
  farmPunchKills: 0,
  triviaCorrect: 0,
  triviaWrong: 0,
  history: []       // últimas 20 partidas
};

function loadCoins(){
  try {
    const d = localStorage.getItem('sb_coins');
    if(d) COINS = Object.assign(COINS, JSON.parse(d));
  } catch(e){}
  updateCoinDisplay();
}

function saveCoins(){
  try { localStorage.setItem('sb_coins', JSON.stringify(COINS)); } catch(e){}
}

function earnCoins(amount, reason){
  if(amount <= 0) return;
  COINS.balance     += amount;
  COINS.totalEarned += amount;
  saveCoins();
  updateCoinDisplay();
  showCoinFloat('+'+amount+' 🪙');
}

function spendCoins(amount){
  COINS.balance = Math.max(0, COINS.balance - amount);
  saveCoins();
  updateCoinDisplay();
}

function updateCoinDisplay(){
  const el = document.getElementById('gc-amount');
  if(el) el.textContent = COINS.balance.toLocaleString();
  // Also update temple display
  const te = document.getElementById('temple-coins-display');
  if(te) te.textContent = '🪙 '+COINS.balance;
}

function showCoinFloat(text){
  const container = document.getElementById('game');
  const el = document.createElement('div');
  el.className = 'coin-float';
  el.textContent = text;
  el.style.left = (35 + Math.random()*30)+'%';
  el.style.top  = '20%';
  el.style.position = 'absolute';
  container.appendChild(el);
  setTimeout(()=>{ try{el.remove();}catch(e){} }, 1300);
}

// ── RANKING ──
function renderRanking(){
  const stats = document.getElementById('ranking-stats');
  const hist  = document.getElementById('ranking-history');
  if(!stats || !hist) return;

  const wr = COINS.gamesPlayed > 0
    ? Math.round((COINS.wins/COINS.gamesPlayed)*100)+'%'
    : '—';

  stats.innerHTML =
    '<div class="stat-card full"><div class="stat-val">🪙 '+COINS.totalEarned.toLocaleString()+'</div><div class="stat-label">MONEDAS TOTALES GANADAS</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.balance.toLocaleString()+'</div><div class="stat-label">SALDO ACTUAL</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.gamesPlayed+'</div><div class="stat-label">PARTIDAS</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.wins+'</div><div class="stat-label">VICTORIAS</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+wr+'</div><div class="stat-label">WIN RATE</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.spellsCast+'</div><div class="stat-label">HECHIZOS</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.farmKills+'</div><div class="stat-label">KILLS FARMEO</div></div>'+
    '<div class="stat-card"><div class="stat-val">'+COINS.triviaCorrect+'</div><div class="stat-label">TRIVIA OK</div></div>';

  if(!COINS.history || !COINS.history.length){
    hist.innerHTML = '<div style="color:var(--muted);font-size:11px;text-align:center;margin-top:20px">Todavía no hay partidas registradas.</div>';
    return;
  }
  hist.innerHTML = [...COINS.history].reverse().slice(0,15).map(h=>
    '<div class="history-entry">'+
      '<div class="he-detail">'+h.enemy+' &nbsp;|&nbsp; '+h.result+' &nbsp;|&nbsp; '+h.turns+' turnos &nbsp;|&nbsp; '+h.date+'</div>'+
      '<div class="he-coins">+'+h.coins+'🪙</div>'+
    '</div>'
  ).join('');
}

function resetRanking(){
  if(confirm('¿Resetear todas las estadísticas y monedas?')){
    COINS = { balance:0, totalEarned:0, gamesPlayed:0, wins:0, losses:0,
              spellsCast:0, farmKills:0, farmPunchKills:0, triviaCorrect:0, triviaWrong:0, history:[] };
    saveCoins();
    updateCoinDisplay();
    renderRanking();
  }
}


// ===================== SNEAKER SHOP =====================
// Catálogo — se amplía con imágenes reales cuando las suba el usuario
const SNEAKERS = [
  { id:'sn_01', name:'Air Dungeon', brand:'Nike',   price:500,  emoji:'👟', img:'data:image/png;base64,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', rarity:'comun',    desc:'Las clásicas del pasillo.' },
  { id:'sn_02', name:'Boost Spell', brand:'Adidas', price:800,  emoji:'👟', img:null, rarity:'comun',    desc:'Amortiguación mágica.' },
  { id:'sn_03', name:'Force Troll', brand:'Nike',   price:1200, emoji:'👟', img:null, rarity:'raro',     desc:'Inspiradas en el Troll Oscuro.' },
  { id:'sn_04', name:'Medusa Gaze', brand:'Puma',   price:2000, emoji:'👟', img:'data:image/png;base64,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', rarity:'epico',    desc:'Las más peligrosas del mercado.' },
  { id:'sn_05', name:'Dungeon Low', brand:'Jordan', price:1500, emoji:'👟', img:null, rarity:'raro',     desc:'Bajo perfil, alto estilo.' },
  { id:'sn_06', name:'Specter Run', brand:'Reebok', price:600,  emoji:'👟', img:null, rarity:'comun',    desc:'Velocidad de fantasma.' },
  { id:'sn_07', name:'Hex Walker',  brand:'New Balance', price:900, emoji:'👟', img:null, rarity:'comun', desc:'Para los pasillos largos.' },
  { id:'sn_08', name:'Arcane Max',  brand:'Nike',   price:2500, emoji:'👟', img:null, rarity:'legendario', desc:'Poder arcano en cada paso.' },
  { id:'sn_09', name:'Venom Step',  brand:'Vans',   price:700,  emoji:'👟', img:null, rarity:'comun',    desc:'Suela de serpiente.' },
  { id:'sn_10', name:'Crystal Air', brand:'Adidas', price:3000, emoji:'👟', img:null, rarity:'legendario', desc:'Las más raras de la colección.' },
];

const RARITY_COLORS = {
  comun:      '#a0a0a0',
  raro:       '#4080ff',
  epico:      '#c040d0',
  legendario: '#f0c040',
};

let SNEAKER_OWNED    = []; // array of sneaker ids owned
let SNEAKER_EQUIPPED = null; // id of equipped sneaker
let pendingBuyId     = null;

function loadSneakers(){
  try {
    const d = localStorage.getItem('sb_sneakers');
    if(d){
      const parsed = JSON.parse(d);
      SNEAKER_OWNED    = parsed.owned    || [];
      SNEAKER_EQUIPPED = parsed.equipped || null;
    }
  } catch(e){}
}
function saveSneakers(){
  try {
    localStorage.setItem('sb_sneakers', JSON.stringify({
      owned: SNEAKER_OWNED, equipped: SNEAKER_EQUIPPED
    }));
  } catch(e){}
}

// ── Sneaker image registry — call this after uploading images ──
function setSneakerImage(id, base64DataUrl){
  const sn = SNEAKERS.find(s=>s.id===id);
  if(sn) sn.img = base64DataUrl;
}

function renderShop(){
  const grid = document.getElementById('shop-grid');
  const coinEl = document.getElementById('shop-coins');
  if(!grid) return;
  if(coinEl) coinEl.textContent = '🪙 '+COINS.balance.toLocaleString();

  grid.innerHTML = SNEAKERS.map(function(sn){
    const owned    = SNEAKER_OWNED.includes(sn.id);
    const rarColor = RARITY_COLORS[sn.rarity] || '#fff';
    const imgHtml  = sn.img
      ? '<img class="shop-item-img" src="'+sn.img+'" alt="">'
      : '<div class="shop-item-img-placeholder">'+sn.emoji+'</div>';
    const cls = 'shop-item'+(owned?' owned':'')+(sn.rarity==='legendario'?' featured':'');
    return '<div class="'+cls+'" data-snid="'+sn.id+'">'
      +(owned?'<div class="shop-item-owned-badge">TUYO</div>':'')
      +imgHtml
      +'<div class="shop-item-name" style="color:'+rarColor+'">'+sn.name+'</div>'
      +'<div class="shop-item-brand">'+sn.brand+' · <span style="color:'+rarColor+';font-size:8px;text-transform:uppercase">'+sn.rarity+'</span></div>'
      +'<button class="shop-item-buy">'+(owned?'✓ COMPRADO':'🪙 '+sn.price.toLocaleString())+'</button>'
      +'</div>';
  }).join('');
  // Event delegation — no inline onclick with dynamic IDs
  grid.onclick = function(e){
    const card = e.target.closest('[data-snid]');
    if(!card) return;
    const id = card.getAttribute('data-snid');
    if(!SNEAKER_OWNED.includes(id)) openBuyModal(id);
  };
}

function openBuyModal(id){
  const sn = SNEAKERS.find(s=>s.id===id);
  if(!sn || SNEAKER_OWNED.includes(id)) return;
  pendingBuyId = id;
  document.getElementById('buy-modal-name').textContent  = sn.name+' — '+sn.brand;
  document.getElementById('buy-modal-price').textContent = '🪙 '+sn.price.toLocaleString();
  document.getElementById('buy-modal-balance').textContent = 'Saldo: 🪙 '+COINS.balance.toLocaleString();
  // Image or emoji
  const wrap = document.getElementById('buy-modal-img');
  if(sn.img){
    wrap.style.fontSize='0';
    wrap.style.backgroundImage='url('+sn.img+')';
    wrap.style.backgroundSize='contain';
    wrap.style.backgroundRepeat='no-repeat';
    wrap.style.backgroundPosition='center';
  } else {
    wrap.style.fontSize='50px';
    wrap.style.backgroundImage='none';
    wrap.textContent = sn.emoji;
  }
  document.getElementById('buy-modal').classList.add('show');
}
function closeBuyModal(){
  document.getElementById('buy-modal').classList.remove('show');
  pendingBuyId = null;
}
function confirmBuy(){
  if(!pendingBuyId) return;
  const sn = SNEAKERS.find(s=>s.id===pendingBuyId);
  if(!sn) return;
  if(COINS.balance < sn.price){
    document.getElementById('buy-modal-balance').textContent = '❌ Sin monedas suficientes (necesitás 🪙'+sn.price.toLocaleString()+')';
    return;
  }
  spendCoins(sn.price);
  SNEAKER_OWNED.push(sn.id);
  if(!SNEAKER_EQUIPPED) SNEAKER_EQUIPPED = sn.id; // auto equip first
  saveSneakers();
  closeBuyModal();
  renderShop();
  showCoinFloat('👟 '+sn.name+'!');
}

let vcIndex = 0; // current carousel index

function renderVestidor(){
  var cont = document.getElementById('vestidor-carousel');
  var nameEl = document.getElementById('vestidor-equipped-name');
  if(!cont) return;
  var eq = SNEAKERS.find(function(s){ return s.id===SNEAKER_EQUIPPED; });
  if(nameEl) nameEl.textContent = eq ? eq.name : 'ninguno';

  if(!SNEAKER_OWNED.length){
    cont.innerHTML = '<div id="vc-empty">Sin zapatillas aun. Visita la Tienda.</div>';
    return;
  }

  vcIndex = Math.max(0, Math.min(vcIndex, SNEAKER_OWNED.length - 1));
  var id = SNEAKER_OWNED[vcIndex];
  var sn = SNEAKERS.find(function(s){ return s.id===id; }) || {};
  var isEq = SNEAKER_EQUIPPED === id;
  var rc = RARITY_COLORS[sn.rarity] || '#aaa';

  var imgHtml = sn.img
    ? '<img id="vc-img" src="'+sn.img+'" alt="">'
    : '<div id="vc-emoji">'+(sn.emoji||'👟')+'</div>';

  var rarityColor = isEq ? '#e0a030' : 'var(--muted)';
  var equipLabel  = isEq ? '✓ EQUIPADO' : 'EQUIPAR';
  var equipClass  = isEq ? 'is-equipped' : 'not-equipped';
  var wrapClass   = isEq ? 'equipped-glow' : '';
  var prevDis     = vcIndex === 0 ? 'disabled' : '';
  var nextDis     = vcIndex === SNEAKER_OWNED.length-1 ? 'disabled' : '';

  cont.innerHTML =
    '<div id="vc-counter">'+(vcIndex+1)+' / '+SNEAKER_OWNED.length+'</div>'+
    '<div id="vc-img-wrap" class="'+wrapClass+'">'+imgHtml+'</div>'+
    '<div id="vc-info">'+
      '<div id="vc-name">'+(sn.name||'')+'</div>'+
      '<div id="vc-brand">'+(sn.brand||'')+
        ' <span style="color:'+rc+'">'+(sn.rarity||'').toUpperCase()+'</span></div>'+
      '<div id="vc-price">🪙 '+(sn.price||0).toLocaleString()+'</div>'+
      '<div id="vc-rarity" style="color:'+rarityColor+'">'+
        (isEq ? '✓ EQUIPADO' : 'sin equipar')+
      '</div>'+
    '</div>'+
    '<div id="vc-arrows">'+
      '<button class="vc-arrow" '+prevDis+' id="vc-prev">‹</button>'+
      '<button class="'+equipClass+'" id="vc-equip-btn">'+equipLabel+'</button>'+
      '<button class="vc-arrow" '+nextDis+' id="vc-next">›</button>'+
    '</div>';

  var prevBtn  = document.getElementById('vc-prev');
  var nextBtn  = document.getElementById('vc-next');
  var equipBtn = document.getElementById('vc-equip-btn');
  if(prevBtn)  prevBtn.onclick  = function(){ vcMove(-1); };
  if(nextBtn)  nextBtn.onclick  = function(){ vcMove(1);  };
  if(equipBtn) equipBtn.onclick = function(){ equipSneaker(id); };
}

function vcMove(dir){
  vcIndex = Math.max(0, Math.min(vcIndex + dir, SNEAKER_OWNED.length - 1));
  renderVestidor();
}


function equipSneaker(id){
  if(!SNEAKER_OWNED.includes(id)) return;
  SNEAKER_EQUIPPED = SNEAKER_EQUIPPED === id ? null : id;
  saveSneakers();
  renderVestidor();
  const sn = SNEAKERS.find(s=>s.id===id);
  if(sn && SNEAKER_EQUIPPED) showCoinFloat('👟 Equipado!');
}

// ===================== SHARED UTILS =====================
function pct(el,val,max){ if(el) el.style.width=Math.max(0,Math.min(100,(val/max)*100))+'%'; }
function rng(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function potionEmoji(p){ return {red:'🔴',blue:'🔵',green:'🟢'}[p]||p; }

function setResult(txt){ document.getElementById('action-result').textContent=txt; }

function addLog(msg,type){
  const el=document.getElementById('log-area');
  const d=document.createElement('div'); d.className='log-entry '+type;
  d.textContent='• '+msg;
  el.insertBefore(d,el.firstChild);
  while(el.children.length>8) el.removeChild(el.lastChild);
}

function shakeEnemy(){
  const el=document.getElementById('enemy-sprite');
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  setTimeout(()=>el.classList.remove('shake'),500);
}
function healEnemy(){
  const el=document.getElementById('enemy-sprite');
  el.classList.remove('heal-anim'); void el.offsetWidth; el.classList.add('heal-anim');
  setTimeout(()=>el.classList.remove('heal-anim'),600);
}
function flash(color){
  const el=document.getElementById('spell-flash');
  el.className='flash-'+color; setTimeout(()=>el.className='',500);
}
function flashDamage(){
  const el=document.getElementById('damage-overlay');
  el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),600);
}
function showTurn(text, type){
  const overlay = document.getElementById('turn-overlay');
  const iconEl  = document.getElementById('turn-overlay-icon');
  const textEl  = document.getElementById('turn-overlay-text');
  if(!overlay) return;
  overlay.classList.remove('show','enemy-turn','player-turn');
  void overlay.offsetWidth;
  iconEl.textContent = (type==='enemy')
    ? (ENEMY_CONFIGS[G.enemyType||'troll'].emoji || '👹')
    : '🧙';
  textEl.textContent = text;
  overlay.classList.add(type==='enemy' ? 'enemy-turn' : 'player-turn', 'show');
  if(type==='enemy'){
    const game=document.getElementById('game');
    game.classList.remove('shake'); void game.offsetWidth; game.classList.add('shake');
    setTimeout(()=>game.classList.remove('shake'),700);
  }
  setTimeout(()=>overlay.classList.remove('show'), 1800);
  // mantener el indicador viejo también
  const el=document.getElementById('turn-indicator');
  if(el){ el.textContent=text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
}
function showFloat(text,target,type){
  const container=document.getElementById('game');
  const el=document.createElement('div'); el.className='float-num '+type;
  el.textContent=text;
  el.style.left=(30+Math.random()*40)+'%';
  el.style.top=(target==='player')?'75%':'30%';
  el.style.position='absolute';
  container.appendChild(el);
  setTimeout(()=>el.remove(),1300);
}

// Load saved profile
loadProfile();
loadCoins();
loadSneakers();
loadDefeatedBosses();
updateMenuPreview();
updateMenuBackground();

window.addEventListener('resize',()=>{
  if(gameActive) setTimeout(setupCanvas,100);
  if(farmActive) setTimeout(setupFarmCanvas,100);
});

// Autoplay video en móvil: al primer toque/clic se inicia el video
(function(){
  function tryPlayVideo(){
    const v = document.getElementById('menu-video');
    if(v && v.paused){
      v.play().catch(()=>{});
    }
    document.removeEventListener('touchstart', tryPlayVideo);
    document.removeEventListener('click', tryPlayVideo);
  }
  document.addEventListener('touchstart', tryPlayVideo, { once: true });
  document.addEventListener('click', tryPlayVideo, { once: true });
})();

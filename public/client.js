const socket=io();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={home:$('#home'),lobby:$('#lobby'),game:$('#game')};

const ACCESSORIES={
  changeling:{image:'/assets/accessories/changeling-wings.png',name:'Changeling-Flügel',desc:'Leuchtende Changeling-Flügel hinter deinem Namen.'},
  balloon:{image:'/assets/accessories/balloon.png',name:'Ballons',desc:'Drei Herzballons schweben an deinem Namensschild.'},
  candy:{image:'/assets/accessories/sweets.png',name:'Süßigkeiten',desc:'Zwei süße Lollis schmücken deinen Namen.'},
  crystalhorn:{image:'/assets/accessories/04_crystal-horn.png',name:'Kristallhorn',desc:'Ein funkelndes Kristallhorn über deinem Namen.'},
  crown:{image:'/assets/accessories/05_crown.png',name:'Kristallkrone',desc:'Eine große dunkle Kristallkrone.'},
  halo:{image:'/assets/accessories/06_halo.png',name:'Kristall-Halo',desc:'Ein schwebender Halo mit Kristallanhängern.'},
  angelwings:{image:'/assets/accessories/07_angel-wings.png',name:'Engelsflügel',desc:'Helle gefiederte Flügel hinter deinem Namen.'},
  batwings:{image:'/assets/accessories/08_bat-wings.png',name:'Fledermausflügel',desc:'Dunkle violette Flügel hinter deinem Namen.'},
  magicflames:{image:'/assets/accessories/09_magic-flames.png',name:'Magische Flammen',desc:'Blaue und violette Magieflammen.'},
  orbitcrystals:{image:'/assets/accessories/10_orbit-crystals.png',name:'Kristall-Orbit',desc:'Schwebende Kristalle kreisen um deinen Namen.'},
  bow:{image:'/assets/accessories/11_bow.png',name:'Schleife',desc:'Eine große funkelnde Schleife.'},
  scarf:{image:'/assets/accessories/12_scarf.png',name:'Sternenschal',desc:'Ein dunkler Sternenschal am Namensschild.'},
  goggles:{image:'/assets/accessories/13_goggles.png',name:'Kristallbrille',desc:'Steampunk-Brille mit Kristallgläsern.'},
  gears:{image:'/assets/accessories/14_gears.png',name:'Zahnräder',desc:'Mechanische Zahnräder und Kristalle.'},
  flowercrown:{image:'/assets/accessories/15_flower-crown.png',name:'Blumenkrone',desc:'Leuchtende Blumen und Kristalle.'},
  butterflies:{image:'/assets/accessories/16_butterflies.png',name:'Schmetterlinge',desc:'Bunte magische Schmetterlinge.'},
  bandages:{image:'/assets/accessories/17_bandages.png',name:'Pflaster',desc:'Bunte Herz- und Kristallpflaster.'},
  potions:{image:'/assets/accessories/18_potions.png',name:'Zaubertränke',desc:'Glitzernde Fläschchen voller Magie.'},
  collar:{image:'/assets/accessories/19_collar.png',name:'Nietenhalsband',desc:'Dunkles Halsband mit Kristallanhänger.'},
  bell:{image:'/assets/accessories/20_bell.png',name:'Glöckchen',desc:'Eine Schleife mit goldenem Glöckchen.'},
  cape:{image:'/assets/accessories/21_cape.png',name:'Sternencape',desc:'Ein dunkles Cape mit Galaxieglanz.'},
  cards:{image:'/assets/accessories/22_cards.png',name:'Magische Karten',desc:'Leuchtende Spielkarten um deinen Namen.'},
  techwings:{image:'/assets/accessories/23_tech-wings.png',name:'Tech-Flügel',desc:'Mechanische Kristallflügel.'},
  moon:{image:'/assets/accessories/24_moon.png',name:'Mond',desc:'Ein schwebender Mond mit Kristallanhängern.'}
};
const ACCESSORY_KEYS=Object.keys(ACCESSORIES);
const STARTER_KEYS=['changeling','balloon','candy'];

let state=null, hand=[], myId=null;

/* Die drei Start-Accessoires sind IMMER sofort verfügbar.
   Das repariert auch alte Browser-Spielstände, in denen nur eins freigeschaltet war. */
let selectedAccessory=localStorage.getItem('cc_accessory')||'changeling';
let unlocks=JSON.parse(localStorage.getItem('cc_unlocks')||'[]').filter(x=>ACCESSORIES[x]);

for(const starter of STARTER_KEYS){
  if(!unlocks.includes(starter)) unlocks.push(starter);
}
if(!STARTER_KEYS.includes(selectedAccessory) && !unlocks.includes(selectedAccessory)){
  selectedAccessory='changeling';
}

localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));
localStorage.setItem('cc_accessory',selectedAccessory);

let pendingGift=false, lastReveal=[];
let musicEnabled=localStorage.getItem('mlp_music')!=='off', musicMode='home';
let musicVolume=Math.max(0,Math.min(100,Number(localStorage.getItem('mlp_music_volume')||30)));
const lobbyMusic=new Audio('/assets/music/lobby_waiting_theme.mp3');
const battleMusic=new Audio('/assets/music/epic_battle_theme.mp3');
[lobbyMusic,battleMusic].forEach(a=>{a.loop=true;a.preload='auto';a.volume=musicVolume/100;});
const diceAnimations=new Map();
const playerName=$('#playerName'); playerName.value=localStorage.getItem('cc_name')||'';

function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');setMusicMode(name)}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function remember(){const n=playerName.value.trim();if(n)localStorage.setItem('cc_name',n)}
function ensureStarter(){ return true; }
function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

function accessoryDecor(key){
  const a=ACCESSORIES[key]||ACCESSORIES.changeling;
  return `<span class="decor decor-${key}" aria-hidden="true"><img src="${a.image}" alt=""></span>`;
}
function nameplateHTML(name,key,small=false){
  const safe=escapeHtml(name||'Spieler');
  const k=ACCESSORIES[key]?key:'changeling';
  return `<div class="nameplate ${small?'nameplate-small':''} ${k}">${accessoryDecor(k)}<span class="nameplate-text">${safe}</span></div>`;
}
function updateHomePreview(){ $('#homeNamePreview').innerHTML=selectedAccessory?nameplateHTML(playerName.value.trim()||'Little Gem',selectedAccessory):''; }
playerName.addEventListener('input',updateHomePreview);

$$('.starter-grid button').forEach(b=>b.addEventListener('click',()=>{
  selectedAccessory=b.value;
  unlocks=[...new Set([...unlocks,...STARTER_KEYS])];
  localStorage.setItem('cc_accessory',b.value);
  localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));
  $('#starterDialog').close();
  renderAccessoryGrid(); updateHomePreview();
}));

function renderAccessoryGrid(){
  const g=$('#accessoryGrid'); g.innerHTML='';
  $('#collectionCount').textContent=`${unlocks.length} / ${ACCESSORY_KEYS.length}`;
  $('#accessoryPreview').innerHTML=nameplateHTML(playerName.value.trim()||'Little Gem',selectedAccessory||unlocks[0]||'changeling');
  for(const key of ACCESSORY_KEYS){
    const a=ACCESSORIES[key], unlocked=unlocks.includes(key);
    const b=document.createElement('button'); b.type='button'; b.className=`accessory-card ${unlocked?'unlocked':'locked'} ${key===selectedAccessory?'selected':''}`;
    b.innerHTML=unlocked
      ? `<span class="item-art item-${key}"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><span class="status">${key===selectedAccessory?'Ausgewählt':'Freigeschaltet'}</span>`
      : `<span class="mystery-art">?</span><strong>Geheimes Accessoire</strong><span class="status">🔒 Durch einen Sieg freischalten</span>`;
    b.disabled=!unlocked;
    if(unlocked)b.addEventListener('click',()=>{
  selectedAccessory=key;localStorage.setItem('cc_accessory',key);renderAccessoryGrid();updateHomePreview();
  if(state?.phase==='lobby')socket.emit('setAccessory',{accessory:key});
  if(state&&state.phase!=='lobby')renderGame();
});
    g.append(b);
  }
}
$('#accessoryBtn').addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});
$('#lobbyAccessoryBtn')?.addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});

$('#createBtn').addEventListener('click',()=>{ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim();if(!name)return toast('Bitte zuerst einen Namen eingeben.');remember();socket.emit('createRoom',{name,accessory:selectedAccessory})});
$('#joinBtn').addEventListener('click',()=>{ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim(),code=$('#roomCode').value.trim();if(!name||!code)return toast('Name und Raumcode eingeben.');remember();socket.emit('joinRoom',{name,code,accessory:selectedAccessory})});
$('#startBtn').addEventListener('click',()=>{ensureAudio();socket.emit('startGame')});

socket.on('connect',()=>{myId=socket.id;updateHomePreview();});
socket.on('errorMsg',toast); socket.on('notice',toast); socket.on('specialDone',e=>toast(e.text));
socket.on('roomState',s=>{
  state=s;
  if(s.phase==='lobby'){show('lobby');renderLobby();}
  else{
    show('game');renderGame();
    if(s.phase==='countdown')runCountdown(s.countdownUntil||Date.now()+5000);
    else if(s.phase==='select')startSelectionTimer(s.selectionDeadline);
  }
});
socket.on('hand',h=>{hand=h;renderHand();if(state)renderGame()});

function renderLobby(){
  $('#lobbyCode').textContent=state.code;
  $('#lobbyHint').textContent=state.players.length<2?'Schick den Code an deine Mitspieler.':'Bereit zum Start!';
  $('#lobbyPlayers').innerHTML=state.players.map(p=>`<div class="lobby-player">${nameplateHTML(p.name,p.accessory,true)}<div>${p.id===state.hostId?'Host 👑':'Mitspieler'} · ${p.handCount} Karten</div></div>`).join('');
  $('#startBtn').style.display=myId===state.hostId?'inline-block':'none';
  $('#startBtn').disabled=state.players.length<2;
  updateMusicUI();
}

function renderGame(){
  if(!state)return;
  const me=state.players.find(p=>p.id===myId);if(!me)return;
  $('#abortBtn').style.display=myId===state.hostId&&state.phase!=='gameover'?'inline-block':'none';
  $('#selfName').textContent=me.name;
  $('#selfCount').textContent=`${me.handCount} Karten`;
  $('#selfNameplate').innerHTML=nameplateHTML(me.name,me.accessory,true);
  const others=state.players.filter(p=>p.id!==myId);
  $('#opponents').innerHTML=others.length?others.map(p=>`<div class="opponent ${p.selected?'has-selected':''}" data-player-id="${p.id}">${nameplateHTML(p.name,p.accessory,true)}<div class="opponent-meta"><span>${p.handCount} Karten</span>${p.selected?'<span class="selected-mark">✓ Karte liegt</span>':'<span>wartet …</span>'}</div><div class="back-fan">${Array.from({length:Math.min(p.handCount,7)},(_,i)=>`<img src="/assets/card_back.webp" alt="verdeckte Karte" style="transform:rotate(${(i-3)*5}deg)">`).join('')}</div></div>`).join(''):'<div class="opponent-empty">Warte auf Mitspieler …</div>';
  renderHand();updateMusicUI();
}

function specialUseInfo(c){
  return `<div class="special-category-badge"><span>${c.useIcon||'✦'}</span><strong>${escapeHtml(c.useLabel||'Jede Kategorie')}</strong></div><div class="special-description">${escapeHtml(c.text||'Spezialeffekt')}</div>`;
}
function statOverlayHTML(c){
  if(!c||c.type!=='normal')return '';
  return `<span class="card-stat-number stat-strength">${c.strength}</span><span class="card-stat-number stat-speed">${c.speed}</span><span class="card-stat-number stat-magic">${c.magic}</span><span class="card-stat-number stat-energy">${c.energy}</span>`;
}
function renderHand(){
  const wrap=$('#hand');if(!wrap)return;wrap.innerHTML='';
  const me=state?.players?.find(p=>p.id===myId);
  const blockedId=me?.lastPlayedCardId||null;
  const normals=hand.filter(c=>c.type==='normal');
  for(const c of hand){
    const blocked=c.type==='normal'&&c.id===blockedId&&normals.some(x=>x.id!==blockedId);
    const el=document.createElement('div');el.className=`hand-card ${c.type==='special'?'special':''} ${blocked?'recently-played disabled':''}`;
    const img=document.createElement('img');img.src=c.image;img.alt=c.name;el.append(img);
    if(c.type==='normal')el.insertAdjacentHTML('beforeend',statOverlayHTML(c));
    if(c.type==='normal'){
      if(blocked){const lock=document.createElement('div');lock.className='recent-lock';lock.textContent='⏳ Gerade gespielt';el.append(lock)}
      el.tabIndex=blocked?-1:0;
      const play=()=>{ensureAudio();if(blocked)return toast('Diese Karte hast du gerade gespielt – nimm eine andere.');if(state?.phase!=='select')return toast('Warte auf die nächste Auswahl.');if(me?.selected)return toast('Du hast schon eine Karte gelegt.');socket.emit('playCard',{cardId:c.id})};
      el.addEventListener('click',play);
      el.addEventListener('keydown',e=>{if(!blocked&&(e.key==='Enter'||e.key===' ')){e.preventDefault();play()}});
    }else{
      el.insertAdjacentHTML('beforeend',specialUseInfo(c));
      const b=document.createElement('button');b.className='special-use';b.type='button';b.textContent='✨ Spezial einsetzen';
      b.addEventListener('click',e=>{e.stopPropagation();ensureAudio();if(state?.phase!=='select')return toast('Spezialkarten nur während der Auswahl.');socket.emit('useSpecial',{cardId:c.id})});
      el.append(b);
    }
    wrap.append(el);
  }
}

function ensureAudio(){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    if(A){if(!ensureAudio.ctx)ensureAudio.ctx=new A();if(ensureAudio.ctx.state==='suspended')ensureAudio.ctx.resume();}
  }catch(e){}
  syncMusic();return ensureAudio.ctx||null;
}
function tone(freq=620,dur=.1,gain=.045,type='sine',when=0){
  const ctx=ensureAudio.ctx;if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;
  const t=ctx.currentTime+when;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur);
}
function beep(freq=620,dur=.1){tone(freq,dur,.05,'sine')}
function setMusicMode(mode){musicMode=mode;syncMusic()}
function activeMusic(){return musicMode==='game'?battleMusic:musicMode==='lobby'?lobbyMusic:null}
function syncMusic(){
  lobbyMusic.volume=musicVolume/100;battleMusic.volume=musicVolume/100;
  const wanted=activeMusic();
  [lobbyMusic,battleMusic].forEach(a=>{if(a!==wanted||!musicEnabled){if(!a.paused)a.pause();}});
  if(musicEnabled&&wanted){const p=wanted.play();if(p&&p.catch)p.catch(()=>{});}
  updateMusicUI();
}
function toggleMusic(){musicEnabled=!musicEnabled;localStorage.setItem('mlp_music',musicEnabled?'on':'off');syncMusic()}
function setMusicVolume(v){musicVolume=Math.max(0,Math.min(100,Number(v)||0));localStorage.setItem('mlp_music_volume',String(musicVolume));lobbyMusic.volume=musicVolume/100;battleMusic.volume=musicVolume/100;updateMusicUI()}
function updateMusicUI(){document.querySelectorAll('.music-toggle').forEach(b=>b.textContent=musicEnabled?'🔇 Musik stumm':'🔊 Musik an');document.querySelectorAll('.music-volume').forEach(s=>s.value=String(musicVolume))}

function clearTable(){lastReveal=[];$('#tableCards').innerHTML=''}
function addCommitGhost(e){
  const t=$('#tableCards'); if(t.querySelector(`[data-player-id="${e.playerId}"]`))return;
  const d=document.createElement('div');d.className='played-card ghost-card card-commit';d.dataset.playerId=e.playerId;
  d.innerHTML=`<div class="card-flip-inner"><div class="card-face card-back-face"><img src="/assets/card_back.webp" alt="verdeckte Karte"></div></div><div class="who">${escapeHtml(e.name)}</div>`;
  t.append(d); beep(340,.06);
}
function revealCards(e){
  lastReveal=e.entries;const t=$('#tableCards');
  e.entries.forEach((x,i)=>{
    let d=t.querySelector(`[data-player-id="${x.pid}"]`);
    if(!d){d=document.createElement('div');t.append(d)}
    d.className='played-card reveal-flip';d.dataset.playerId=x.pid;d.style.animationDelay=`${i*.07}s`;
    d.innerHTML=`<div class="card-flip-inner"><div class="card-face card-front-face"><img src="${x.card.image}" alt="${escapeHtml(x.card.name)}">${statOverlayHTML(x.card)}<span class="value">${x.value}${x.bonus?` (+${x.bonus})`:''}</span></div></div><div class="who">${escapeHtml(x.name)}</div>`;
  });
  $('#roundMessage').textContent='Karten werden verglichen …';beep(920,.12);
}
function animateCapture(winnerId){
  const target=winnerId===myId?$('#hand'):document.querySelector(`.opponent[data-player-id="${winnerId}"]`);
  if(!target)return;
  const tr=target.getBoundingClientRect();const tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;
  [...document.querySelectorAll('#tableCards .played-card')].forEach((el,i)=>{
    const r=el.getBoundingClientRect();const dx=tx-(r.left+r.width/2),dy=ty-(r.top+r.height/2);
    el.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.28) rotate(${i%2?18:-18}deg)`,opacity:.05}],{duration:850,delay:i*60,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  });
  setTimeout(()=>{$('#tableCards').innerHTML=''},980);
}
function setupDice(e,msg){
  $('#roundMessage').textContent=msg;const z=$('#diceZone');z.innerHTML='<div id="diceSpectacle" class="dice-spectacle"></div>';
  if(e.playerIds.includes(myId)){
    const b=document.createElement('button');b.type='button';b.className='dice-btn roll-trigger';b.textContent='🎲 Würfeln';
    b.addEventListener('click',()=>{b.disabled=true;socket.emit('rollDice')});z.append(b)
  }else{
    const w=document.createElement('div');w.className='dice-wait';w.textContent='Die betroffenen Spieler würfeln …';z.append(w)
  }
}
function diceTile(id,name){
  let d=document.querySelector(`.dice-result[data-player-id="${id}"]`);if(d)return d;
  const z=$('#diceSpectacle')||$('#diceZone');d=document.createElement('div');d.className='dice-result';d.dataset.playerId=id;d.innerHTML=`<strong>${escapeHtml(name||'Spieler')}</strong><span class="dice-face">⚄</span>`;z.prepend(d);return d;
}
function startDiceAnimation(e){
  const d=diceTile(e.playerId,e.name),face=d.querySelector('.dice-face');d.classList.add('rolling-live');
  let n=0;const faces=['⚀','⚁','⚂','⚃','⚄','⚅'];const timer=setInterval(()=>{face.textContent=faces[n++%6]},70);diceAnimations.set(e.playerId,timer);beep(250,.22)
}
function stopDiceAnimation(e){
  const timer=diceAnimations.get(e.playerId);if(timer){clearInterval(timer);diceAnimations.delete(e.playerId)}
  const d=diceTile(e.playerId,e.name),face=d.querySelector('.dice-face');d.classList.remove('rolling-live');face.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][e.value-1];d.classList.add('dice-landed');toast(`${e.name} würfelt ${e.value}`);beep(520+e.value*70,.1)
}

let countdownUiTimer=null,selectionUiTimer=null;
function stopCountdown(){if(countdownUiTimer){clearTimeout(countdownUiTimer);countdownUiTimer=null}const e=$('#countdown');if(e)e.textContent=''}
function runCountdown(until){
  stopCountdown();const e=$('#countdown');if(!e)return;
  const tick=()=>{const left=Math.ceil((until-Date.now())/1000);if(left<=0){e.textContent='';countdownUiTimer=null;return}e.textContent=left;e.style.animation='none';void e.offsetWidth;e.style.animation='countfade .9s ease both';beep(430+left*70,.10);countdownUiTimer=setTimeout(tick,250)};tick();
}
function stopSelectionTimer(){if(selectionUiTimer){clearInterval(selectionUiTimer);selectionUiTimer=null}const e=$('#selectionTimer');if(e)e.textContent=''}
function startSelectionTimer(deadline){stopSelectionTimer();if(!deadline)return;const e=$('#selectionTimer');if(!e)return;const tick=()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));e.textContent=left?`⏱ ${left} Sek.`:'';if(!left)stopSelectionTimer()};tick();selectionUiTimer=setInterval(tick,200)}

socket.on('countdown',({seconds,until})=>{show('game');ensureAudio();runCountdown(until||Date.now()+(seconds||5)*1000)});
socket.on('roundStart',e=>{stopCountdown();clearTable();$('#categoryIcon').textContent=e.icon;$('#categoryText').textContent=e.label;$('#roundMessage').textContent='Wähle deine beste Karte.';$('#diceZone').innerHTML='';startSelectionTimer(e.deadline);beep(760,.15)});
socket.on('cardCommitted',addCommitGhost);
socket.on('playerSelected',()=>beep(300,.05));
socket.on('cardAccepted',()=>{$('#roundMessage').textContent='✓ Deine Karte liegt – warte auf die anderen.';beep(360,.06)});
socket.on('reveal',revealCards);
socket.on('roundWinner',e=>{stopSelectionTimer();$('#roundMessage').textContent=`🏆 ${e.winnerName} gewinnt die Runde!`;animateCapture(e.winnerId);beep(1040,.22)});
socket.on('roundTimeout',e=>{stopSelectionTimer();clearTable();const names=(e.penalties||[]).map(x=>x.name).join(', ');$('#roundMessage').textContent=names?`⏱ ${names} verliert eine Strafkarte. Neue Kategorie!`:'⏱ Zeit abgelaufen – neue Kategorie!';toast(e.message||'Zeit abgelaufen.');beep(190,.20)});
socket.on('tieStart',e=>setupDice(e,'Gleichstand! Würfeln entscheidet.'));
socket.on('tieAgain',e=>setupDice(e,'Schon wieder Gleichstand – nochmal würfeln!'));
socket.on('diceRolling',startDiceAnimation);
socket.on('diceRolled',stopDiceAnimation);
socket.on('gameOver',e=>{
  $('#roundMessage').textContent=`👑 ${e.winnerName} ist Champion!`;
  $('#gameOverTitle').textContent=`👑 ${e.winnerName} gewinnt!`;
  $('#gameOverText').textContent='Die Partie ist beendet. Ihr könnt gemeinsam in die Lobby zurückkehren oder ins Hauptmenü gehen.';
  pendingGift=e.winnerId===myId;$('#rewardBtn').style.display=pendingGift?'inline-block':'none';
  if(!$('#gameOverDialog').open)$('#gameOverDialog').showModal();
});
socket.on('backToLobby',()=>{stopCountdown();stopSelectionTimer();try{$('#gameOverDialog').close()}catch{};try{$('#giftDialog').close()}catch{};clearTable();show('lobby');toast('Zurück in der Lobby.')});
socket.on('roomLeft',()=>{stopCountdown();stopSelectionTimer();state=null;hand=[];clearTable();renderHand();show('home');toast('Du hast den Raum verlassen.')});
socket.on('flutterChoices',e=>showChoices('Fluttershy: Welche Karte möchtest du behalten?',e.cards,c=>socket.emit('flutterKeep',{cardId:c.id})));
socket.on('rarityChoose',e=>showChoices('Rarity: Welche Karte möchtest du austauschen?',e.cards,c=>socket.emit('raritySwap',{cardId:c.id})));
function showChoices(title,cards,cb){$('#choiceTitle').textContent=title;const g=$('#choiceCards');g.innerHTML='';cards.forEach(c=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<img src="${c.image}" alt="${escapeHtml(c.name)}">`;b.addEventListener('click',()=>{$('#choiceDialog').close();cb(c)});g.append(b)});$('#choiceDialog').showModal()}

$('#giftBox').addEventListener('click',()=>{
  if(!pendingGift)return; pendingGift=false;
  const locked=ACCESSORY_KEYS.filter(x=>!STARTER_KEYS.includes(x)&&!unlocks.includes(x));
  const key=locked.length?locked[Math.floor(Math.random()*locked.length)]:ACCESSORY_KEYS[Math.floor(Math.random()*ACCESSORY_KEYS.length)];
  if(!unlocks.includes(key)){unlocks.push(key);localStorage.setItem('cc_unlocks',JSON.stringify(unlocks))}
  const a=ACCESSORIES[key]; $('#giftBox').style.display='none';
  $('#giftResult').innerHTML=`<div class="gift-item"><span class="item-art item-${key}"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><small>${a.desc}</small></div>`;
  renderAccessoryGrid(); beep(1200,.35);
});


function leaveRoomNow(){ if(confirm('Raum wirklich verlassen und zum Hauptmenü zurück?')) socket.emit('leaveRoom') }
$('#leaveLobbyBtn').addEventListener('click',leaveRoomNow);
$('#leaveGameBtn').addEventListener('click',leaveRoomNow);
$('#abortBtn').addEventListener('click',()=>{if(confirm('Die laufende Partie für alle abbrechen und zur Lobby zurückkehren?')){socket.emit('abortGame');toast('Spiel wird abgebrochen …')}});
$('#returnLobbyBtn').addEventListener('click',()=>{socket.emit('returnToLobby');toast('Zurück zur Lobby …')});
$('#gameOverHomeBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};socket.emit('leaveRoom')});
$('#closeGameOverBtn').addEventListener('click',()=>$('#gameOverDialog').close());
$('#rewardBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};$('#giftResult').textContent='';$('#giftBox').style.display='inline-block';$('#giftDialog').showModal()});
$('#closeGiftBtn').addEventListener('click',()=>$('#giftDialog').close());
$('#giftDoneBtn').addEventListener('click',()=>$('#giftDialog').close());
document.querySelectorAll('.music-toggle').forEach(b=>b.addEventListener('click',()=>{ensureAudio();toggleMusic()}));
document.querySelectorAll('.music-volume').forEach(s=>s.addEventListener('input',e=>setMusicVolume(e.target.value)));
updateMusicUI();
updateHomePreview();

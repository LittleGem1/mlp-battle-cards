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
let musicEnabled=localStorage.getItem('mlp_music')!=='off', musicMode='home', musicTimer=null, musicStep=0;

const YT_TRACKS={
  lobby:{
    id:'pWAP7fIwGnI',
    title:'Dawn — Sappheiros',
    credit:'Sappheiros - Dawn · CC BY 3.0 · Musik via BreakingCopyright / YouTube'
  },
  game:{
    id:'9gBTKiVqprE',
    title:'Dragon Castle — Makai Symphony',
    credit:'Makai Symphony - Dragon Castle · CC BY-NC 3.0 · Musik via BreakingCopyright / YouTube'
  }
};
let ytPlayer=null, ytReady=false, ytWantedMode='home';

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
      selectedAccessory=key;
      localStorage.setItem('cc_accessory',key);
      renderAccessoryGrid();
      updateHomePreview();
      if(state?.phase==='lobby') socket.emit('setAccessory',{accessory:key});
      if(state && state.phase!=='lobby') renderGame();
    });
    g.append(b);
  }
}
$('#accessoryBtn').addEventListener('click',()=>{if(!ensureStarter())return;renderAccessoryGrid();$('#accessoryDialog').showModal()});
$('#lobbyAccessoryBtn')?.addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});

$('#createBtn').addEventListener('click',()=>{ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim();if(!name)return toast('Bitte zuerst einen Namen eingeben.');remember();socket.emit('createRoom',{name,accessory:selectedAccessory})});
$('#joinBtn').addEventListener('click',()=>{ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim(),code=$('#roomCode').value.trim();if(!name||!code)return toast('Name und Raumcode eingeben.');remember();socket.emit('joinRoom',{name,code,accessory:selectedAccessory})});
$('#startBtn').addEventListener('click',()=>{ensureAudio();socket.emit('startGame')});

socket.on('connect',()=>{myId=socket.id;updateHomePreview();});
socket.on('errorMsg',toast); socket.on('notice',toast); socket.on('specialDone',e=>toast(e.text));
socket.on('roomState',s=>{state=s;if(s.phase==='lobby'){show('lobby');renderLobby()}else{show('game');renderGame()}});
socket.on('hand',h=>{hand=h;renderHand();if(state)renderGame()});

function renderLobby(){
  $('#lobbyCode').textContent=state.code; $('#lobbyHint').textContent=state.players.length<2?'Schick den Code an deine Mitspieler.':'Bereit zum Start!';
  const me=state.players.find(p=>p.id===myId);
  if(me?.accessory && ACCESSORIES[me.accessory]) selectedAccessory=me.accessory;
  $('#lobbyPlayers').innerHTML=state.players.map(p=>`<div class="lobby-player">${nameplateHTML(p.name,p.accessory,true)}<div>${p.id===state.hostId?'Host 👑':'Mitspieler'} · ${p.handCount} Karten</div></div>`).join('');
  $('#startBtn').style.display=myId===state.hostId?'inline-block':'none'; $('#startBtn').disabled=state.players.length<2; updateMusicButtons();
}
function renderGame(){
  if(!state)return; const me=state.players.find(p=>p.id===myId); if(!me)return; $('#abortBtn').style.display=myId===state.hostId&&state.phase!=='gameover'?'inline-block':'none'; updateMusicButtons();
  $('#selfName').textContent=me.name; $('#selfCount').textContent=`${me.handCount} Karten`; $('#selfNameplate').innerHTML=nameplateHTML(me.name,me.accessory,true);
  const others=state.players.filter(p=>p.id!==myId);
  $('#opponents').innerHTML=others.map(p=>`<div class="opponent" data-player-id="${p.id}">${nameplateHTML(p.name,p.accessory,true)}<div class="opponent-meta"><span>${p.handCount} Karten</span>${p.selected?'<span>✓ gewählt</span>':''}</div><div class="back-fan">${Array.from({length:Math.min(p.handCount,7)},(_,i)=>`<img src="/assets/card_back.webp" alt="verdeckte Karte" style="transform:rotate(${(i-3)*5}deg)">`).join('')}</div></div>`).join('');
  renderHand();
}
function statOverlayHTML(c){
  if(!c || c.type!=='normal') return '';
  return `<span class="card-stat-number stat-strength">${c.strength}</span>
          <span class="card-stat-number stat-speed">${c.speed}</span>
          <span class="card-stat-number stat-magic">${c.magic}</span>
          <span class="card-stat-number stat-energy">${c.energy}</span>`;
}

function renderHand(){
  const wrap=$('#hand'); if(!wrap)return;
  wrap.innerHTML='';
  const me=state?.players?.find(p=>p.id===myId);
  const blockedId=me?.lastPlayedCardId||null;
  const normalCards=hand.filter(c=>c.type==='normal');

  for(const c of hand){
    const blocked=c.type==='normal' && c.id===blockedId && normalCards.some(x=>x.id!==blockedId);
    const el=document.createElement('div');
    el.className=`hand-card ${c.type==='special'?'special':''} ${blocked?'recently-played disabled':''}`;
    const img=document.createElement('img'); img.src=c.image; img.alt=c.name; el.append(img); if(c.type==='normal')el.insertAdjacentHTML('beforeend',statOverlayHTML(c));

    if(blocked){
      const lock=document.createElement('div');
      lock.className='recent-lock';
      lock.textContent='⏳ Gerade gespielt';
      el.append(lock);
    }

    if(c.type==='normal'){
      el.tabIndex=blocked?-1:0;
      const play=()=>{
        if(blocked)return toast('Diese Karte hast du gerade gespielt – nimm diesmal eine andere.');
        if(state?.phase!=='select')return toast('Warte auf die nächste Auswahl.');
        socket.emit('playCard',{cardId:c.id});
      };
      el.addEventListener('click',play);
      el.addEventListener('keydown',e=>{if(!blocked&&(e.key==='Enter'||e.key===' ')){e.preventDefault();play()}});
    }else{
      const b=document.createElement('button');b.className='special-use';b.type='button';b.textContent='Spezial einsetzen';
      b.addEventListener('click',e=>{e.stopPropagation();if(state?.phase!=='select')return toast('Spezialkarten werden während der Auswahl eingesetzt.');socket.emit('useSpecial',{cardId:c.id})});
      el.append(b);
    }
    wrap.append(el);
  }
}
function ensureAudio(){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    if(!A) return null;
    if(!ensureAudio.ctx) ensureAudio.ctx=new A();
    if(ensureAudio.ctx.state==='suspended') ensureAudio.ctx.resume();
    restartMusic();
    return ensureAudio.ctx;
  }catch(e){
    console.warn('Audio konnte nicht gestartet werden:',e);
    return null;
  }
}

function tone(freq=620,dur=.1,gain=.045,type='sine',when=0){
  if(!musicEnabled)return;
  const ctx=ensureAudio.ctx||ensureAudio(); if(!ctx)return;
  const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.value=freq;
  const t=ctx.currentTime+when;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur);
}
function beep(freq=620,dur=.1){tone(freq,dur,.055,'sine')}
function setMusicMode(mode){
  musicMode=mode;
  ytWantedMode=mode;
  restartMusic();
}

function updateMusicDock(){
  const dock=$('#ytMusicDock');
  const title=$('#ytMusicTitle');
  const credit=$('#ytMusicCredit');
  if(!dock||!title||!credit)return;

  if(musicMode==='home'){
    dock.classList.add('hidden');
    title.textContent='Musik';
    credit.textContent='';
    return;
  }

  dock.classList.remove('hidden');
  const track=YT_TRACKS[musicMode];
  if(track){
    title.textContent=track.title;
    credit.textContent=track.credit;
  }
}

window.onYouTubeIframeAPIReady=()=>{
  ytPlayer=new YT.Player('ytMusicPlayer',{
    width:'220',
    height:'124',
    videoId:YT_TRACKS.lobby.id,
    playerVars:{
      controls:0,
      rel:0,
      modestbranding:1,
      playsinline:1,
      loop:1,
      playlist:YT_TRACKS.lobby.id
    },
    events:{
      onReady:()=>{
        ytReady=true;
        updateMusicDock();
        restartMusic();
      },
      onError:(e)=>console.warn('YouTube-Musik konnte nicht geladen werden:',e)
    }
  });
};

function restartMusic(){
  if(musicTimer){clearInterval(musicTimer);musicTimer=null}
  updateMusicDock();

  if(!ytReady || !ytPlayer)return;

  if(!musicEnabled || musicMode==='home'){
    try{ytPlayer.pauseVideo()}catch(e){}
    return;
  }

  const track=YT_TRACKS[musicMode];
  if(!track)return;

  try{
    const current=ytPlayer.getVideoData?.().video_id;
    if(current!==track.id){
      ytPlayer.loadVideoById({videoId:track.id,startSeconds:0});
    }else{
      ytPlayer.playVideo();
    }
    ytPlayer.setVolume(musicMode==='game'?38:24);
  }catch(e){
    console.warn('Musik konnte nicht gestartet werden:',e);
  }
}

function toggleMusic(){
  musicEnabled=!musicEnabled;
  localStorage.setItem('mlp_music',musicEnabled?'on':'off');
  updateMusicButtons();

  if(!ytReady||!ytPlayer)return;

  if(musicEnabled){
    restartMusic();
  }else{
    try{ytPlayer.pauseVideo()}catch(e){}
  }
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

socket.on('countdown',({seconds})=>{show('game');ensureAudio();let n=seconds;const cd=$('#countdown');const tick=()=>{if(n<=0){cd.textContent='';return}cd.textContent=n;cd.style.animation='none';void cd.offsetWidth;cd.style.animation='countfade .9s ease both';beep(420+n*80,.12);n--;setTimeout(tick,1000)};tick()});
socket.on('roundStart',e=>{$('#categoryIcon').textContent=e.icon;$('#categoryText').textContent=e.label;clearTable();$('#roundMessage').textContent='Wähle deine beste Karte.';$('#diceZone').innerHTML='';beep(760,.15)});
socket.on('cardCommitted',addCommitGhost);
socket.on('playerSelected',()=>beep(300,.05));
socket.on('reveal',revealCards);
socket.on('roundWinner',e=>{$('#roundMessage').textContent=`🏆 ${e.winnerName} gewinnt die Runde!`;animateCapture(e.winnerId);beep(1040,.22)});
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
socket.on('backToLobby',()=>{try{$('#gameOverDialog').close()}catch{};try{$('#giftDialog').close()}catch{};clearTable()});
socket.on('roomLeft',()=>{state=null;hand=[];clearTable();renderHand();show('home');toast('Du hast den Raum verlassen.')});
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
$('#abortBtn').addEventListener('click',()=>{if(confirm('Die laufende Partie für alle abbrechen und zur Lobby zurückkehren?'))socket.emit('abortGame')});
$('#returnLobbyBtn').addEventListener('click',()=>socket.emit('returnToLobby'));
$('#gameOverHomeBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};socket.emit('leaveRoom')});
$('#closeGameOverBtn').addEventListener('click',()=>$('#gameOverDialog').close());
$('#rewardBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};$('#giftResult').textContent='';$('#giftBox').style.display='inline-block';$('#giftDialog').showModal()});
$('#closeGiftBtn').addEventListener('click',()=>$('#giftDialog').close());
$('#giftDoneBtn').addEventListener('click',()=>$('#giftDialog').close());
document.querySelectorAll('.music-toggle').forEach(b=>b.addEventListener('click',toggleMusic));
updateMusicButtons();
updateHomePreview();

$('#ytMusicDockToggle')?.addEventListener('click',()=>{
  $('#ytMusicDock')?.classList.toggle('collapsed');
});

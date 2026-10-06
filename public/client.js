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
const playerName=$('#playerName'); playerName.value=localStorage.getItem('cc_name')||'';

function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active')}
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
    if(unlocked)b.addEventListener('click',()=>{selectedAccessory=key;localStorage.setItem('cc_accessory',key);renderAccessoryGrid();updateHomePreview(); if(state)renderGame();});
    g.append(b);
  }
}
$('#accessoryBtn').addEventListener('click',()=>{if(!ensureStarter())return;renderAccessoryGrid();$('#accessoryDialog').showModal()});

$('#createBtn').addEventListener('click',()=>{if(!ensureStarter())return;const name=playerName.value.trim();if(!name)return toast('Bitte zuerst einen Namen eingeben.');remember();socket.emit('createRoom',{name,accessory:selectedAccessory})});
$('#joinBtn').addEventListener('click',()=>{if(!ensureStarter())return;const name=playerName.value.trim(),code=$('#roomCode').value.trim();if(!name||!code)return toast('Name und Raumcode eingeben.');remember();socket.emit('joinRoom',{name,code,accessory:selectedAccessory})});
$('#startBtn').addEventListener('click',()=>socket.emit('startGame'));

socket.on('connect',()=>{myId=socket.id;updateHomePreview();});
socket.on('errorMsg',toast); socket.on('notice',toast); socket.on('specialDone',e=>toast(e.text));
socket.on('roomState',s=>{state=s;if(s.phase==='lobby'){show('lobby');renderLobby()}else{show('game');renderGame()}});
socket.on('hand',h=>{hand=h;renderHand();if(state)renderGame()});

function renderLobby(){
  $('#lobbyCode').textContent=state.code; $('#lobbyHint').textContent=state.players.length<2?'Schick den Code an deine Mitspieler.':'Bereit zum Start!';
  $('#lobbyPlayers').innerHTML=state.players.map(p=>`<div class="lobby-player">${nameplateHTML(p.name,p.accessory,true)}<div>${p.id===state.hostId?'Host 👑':'Mitspieler'} · ${p.handCount} Karten</div></div>`).join('');
  $('#startBtn').style.display=myId===state.hostId?'inline-block':'none'; $('#startBtn').disabled=state.players.length<2;
}
function renderGame(){
  if(!state)return; const me=state.players.find(p=>p.id===myId); if(!me)return;
  $('#selfName').textContent=me.name; $('#selfCount').textContent=`${me.handCount} Karten`; $('#selfNameplate').innerHTML=nameplateHTML(me.name,me.accessory,true);
  const others=state.players.filter(p=>p.id!==myId);
  $('#opponents').innerHTML=others.map(p=>`<div class="opponent">${nameplateHTML(p.name,p.accessory,true)}<div class="opponent-meta"><span>${p.handCount} Karten</span>${p.selected?'<span>✓ gewählt</span>':''}</div><div class="back-fan">${Array.from({length:Math.min(p.handCount,7)},(_,i)=>`<img src="/assets/card_back.webp" alt="verdeckte Karte" style="transform:rotate(${(i-3)*5}deg)">`).join('')}</div></div>`).join('');
  renderHand();
}
function renderHand(){const wrap=$('#hand');if(!wrap)return;wrap.innerHTML='';for(const c of hand){const el=document.createElement('div');el.className=`hand-card ${c.type==='special'?'special':''}`;const img=document.createElement('img');img.src=c.image;img.alt=c.name;el.append(img);if(c.type==='normal'){el.tabIndex=0;const play=()=>{if(state?.phase!=='select')return toast('Warte auf die nächste Auswahl.');socket.emit('playCard',{cardId:c.id})};el.addEventListener('click',play);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play()}})}else{const b=document.createElement('button');b.className='special-use';b.type='button';b.textContent='Spezial einsetzen';b.addEventListener('click',e=>{e.stopPropagation();if(state?.phase!=='select')return toast('Spezialkarten werden während der Auswahl eingesetzt.');socket.emit('useSpecial',{cardId:c.id})});el.append(b)}wrap.append(el)}}

function beep(freq=620,dur=.1){try{const A=window.AudioContext||window.webkitAudioContext;const ctx=beep.ctx||(beep.ctx=new A());const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.06,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)}catch{}}
socket.on('countdown',({seconds})=>{show('game');let n=seconds;const cd=$('#countdown');const tick=()=>{if(n<=0){cd.textContent='';return}cd.textContent=n;cd.style.animation='none';void cd.offsetWidth;cd.style.animation='countfade .9s ease both';beep(420+n*80,.12);n--;setTimeout(tick,1000)};tick()});
socket.on('roundStart',e=>{$('#categoryIcon').textContent=e.icon;$('#categoryText').textContent=e.label;$('#tableCards').innerHTML='';$('#roundMessage').textContent='Wähle deine beste Karte.';$('#diceZone').innerHTML='';beep(760,.15)});
socket.on('playerSelected',()=>beep(300,.05));
socket.on('reveal',e=>{lastReveal=e.entries;const t=$('#tableCards');t.innerHTML='';e.entries.forEach((x,i)=>{const d=document.createElement('div');d.className='played-card';d.style.animationDelay=`${i*.08}s`;d.innerHTML=`<img src="${x.card.image}" alt="${escapeHtml(x.card.name)}"><span class="value">${x.value}${x.bonus?` (+${x.bonus})`:''}</span><div class="who">${escapeHtml(x.name)}</div>`;t.append(d)});$('#roundMessage').textContent='Karten werden verglichen …';beep(920,.12)});
socket.on('roundWinner',e=>{$('#roundMessage').textContent=`🏆 ${e.winnerName} gewinnt die Runde!`;beep(1040,.22)});
socket.on('tieStart',e=>setupDice(e,'Gleichstand! Würfeln entscheidet.'));
socket.on('tieAgain',e=>setupDice(e,'Schon wieder Gleichstand – nochmal würfeln!'));
function setupDice(e,msg){$('#roundMessage').textContent=msg;const z=$('#diceZone');z.innerHTML='';if(e.playerIds.includes(myId)){const b=document.createElement('button');b.type='button';b.className='dice-btn';b.textContent='🎲';b.addEventListener('click',()=>{b.disabled=true;b.classList.add('rolling');beep(250,.3);setTimeout(()=>socket.emit('rollDice'),500)});z.append(b)}else z.textContent='Die betroffenen Spieler würfeln …'}
socket.on('diceRolled',e=>{toast(`${e.name} würfelt ${e.value}`);beep(520+e.value*70,.08)});
socket.on('gameOver',e=>{$('#roundMessage').textContent=`👑 ${e.winnerName} ist Champion!`;if(e.winnerId===myId){pendingGift=true;setTimeout(()=>{const d=$('#giftDialog');$('#giftResult').textContent='';$('#giftBox').style.display='inline-block';d.showModal()},800)}});

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

updateHomePreview();

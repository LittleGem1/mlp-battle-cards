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

const NEW_ITEMS={
  apple:{image:'/assets/name_items/apple.webp',name:'Glanzapfel',desc:'Ein funkelnder roter Apfel.'},
  hourglass:{image:'/assets/name_items/hourglass.webp',name:'Zeitsanduhr',desc:'Eine goldene magische Sanduhr.'},
  rainbow_potion:{image:'/assets/name_items/rainbow_potion.webp',name:'Regenbogen-Elixier',desc:'Ein schimmernder Regenbogentrank.'},
  speed_potion:{image:'/assets/name_items/speed_potion.webp',name:'Blitz-Elixier',desc:'Ein blaues Elixier mit Blitzmagie.'},
  moon_potion:{image:'/assets/name_items/moon_potion.webp',name:'Mondschein-Trank',desc:'Ein violetter Trank mit Mondsichel.'},
  sun_potion:{image:'/assets/name_items/sun_potion.webp',name:'Sonnen-Elixier',desc:'Ein goldenes Sonnen-Elixier.'},
  mirror:{image:'/assets/name_items/mirror.webp',name:'Kristallspiegel',desc:'Ein verzierter magischer Spiegel.'},
  storm:{image:'/assets/name_items/storm.webp',name:'Gewitterwolke',desc:'Eine kleine Gewitterwolke mit Blitzen.'},
  grimoire:{image:'/assets/name_items/grimoire.webp',name:'Magisches Grimoire',desc:'Ein leuchtendes Zauberbuch.'},
  friendship_crown:{image:'/assets/name_items/friendship_crown.webp',name:'Freundschaftskrone',desc:'Eine goldene Krone mit Kristall.'}
};
const ITEMS={...ACCESSORIES,...Object.fromEntries(Object.entries(NEW_ITEMS).map(([k,v])=>['item_'+k,v]))};
const ITEM_KEYS=Object.keys(ITEMS);
const FRAMES={
  crystal_heart:{image:'/assets/frames/crystal_heart.webp',name:'Kristallherz'},night_star:{image:'/assets/frames/night_star.webp',name:'Nachtstern'},candy:{image:'/assets/frames/candy.webp',name:'Süßigkeiten'},butterfly:{image:'/assets/frames/butterfly.webp',name:'Schmetterling'},steampunk:{image:'/assets/frames/steampunk.webp',name:'Steampunk'},royal_crown:{image:'/assets/frames/royal_crown.webp',name:'Königskrone'},changeling:{image:'/assets/frames/changeling.webp',name:'Changeling'},rainbow_cloud:{image:'/assets/frames/rainbow_cloud.webp',name:'Regenbogenwolke'},star_book:{image:'/assets/frames/star_book.webp',name:'Sternenbuch'},rose_gold:{image:'/assets/frames/rose_gold.webp',name:'Rosengold'},iridescent:{image:'/assets/frames/iridescent.webp',name:'Irisierend'},honey:{image:'/assets/frames/honey.webp',name:'Honig'},pearl_sea:{image:'/assets/frames/pearl_sea.webp',name:'Perlmutt'},sakura:{image:'/assets/frames/sakura.webp',name:'Rosa Blümchen'},alchemy:{image:'/assets/frames/alchemy.webp',name:'Alchemie'},ice:{image:'/assets/frames/ice.webp',name:'Eiskristall'},forest:{image:'/assets/frames/forest.webp',name:'Zauberwald'},neon:{image:'/assets/frames/neon.webp',name:'Neonkristall'},velvet:{image:'/assets/frames/velvet.webp',name:'Roter Samt'},moon:{image:'/assets/frames/moon.webp',name:'Mondhimmel'}
};
const FRAME_KEYS=Object.keys(FRAMES);
const STARTER_FRAME_KEYS=['sakura','candy'];

const ACCESSORY_KEYS=ITEM_KEYS;
const STARTER_KEYS=['changeling','balloon','candy'];

let state=null, hand=[], myId=null;

/* Die drei Start-Accessoires sind IMMER sofort verfügbar.
   Das repariert auch alte Browser-Spielstände, in denen nur eins freigeschaltet war. */
let selectedAccessory=localStorage.getItem('cc_accessory')||'changeling';
let selectedFrame=localStorage.getItem('cc_frame')||'sakura';
let frameUnlocks=JSON.parse(localStorage.getItem('cc_frame_unlocks')||'[]').filter(x=>FRAMES[x]);
for(const f of STARTER_FRAME_KEYS){if(!frameUnlocks.includes(f))frameUnlocks.push(f);}
let starterFrameChosen=localStorage.getItem('cc_starter_frame_chosen')==='1';
let cosmeticTab='items';
let unlocks=JSON.parse(localStorage.getItem('cc_unlocks')||'[]').filter(x=>ITEMS[x]);

for(const starter of STARTER_KEYS){
  if(!unlocks.includes(starter)) unlocks.push(starter);
}
if(!STARTER_KEYS.includes(selectedAccessory) && !unlocks.includes(selectedAccessory)){
  selectedAccessory='changeling';
}

localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));
localStorage.setItem('cc_accessory',selectedAccessory);
if(!FRAMES[selectedFrame]||!frameUnlocks.includes(selectedFrame))selectedFrame='sakura';
localStorage.setItem('cc_frame',selectedFrame);
localStorage.setItem('cc_frame_unlocks',JSON.stringify(frameUnlocks));

let pendingGift=false, lastReveal=[];
let musicEnabled=localStorage.getItem('mlp_music')!=='off', musicMode='home';
if(localStorage.getItem('mlp_music_fix_v3')!=='1'){musicEnabled=true;localStorage.setItem('mlp_music','on');localStorage.setItem('mlp_music_fix_v3','1');}
let musicVolume=Math.max(0,Math.min(100,Number(localStorage.getItem('mlp_music_volume')||30)));
const YT_TRACKS={home:'pWAP7fIwGnI',lobby:'pWAP7fIwGnI',game:'9gBTKiVqprE'};
let ytPlayer=null,ytReady=false,userInteracted=false;
const diceAnimations=new Map();
const playerName=$('#playerName'); playerName.value=localStorage.getItem('cc_name')||'';

let currentScreen='home';
function show(name){
  Object.values(screens).forEach(x=>x.classList.remove('active'));
  screens[name].classList.add('active');
  document.body.classList.remove('scene-home','scene-lobby','scene-game');
  document.body.classList.add('scene-'+name);
  if(name==='home'||name==='lobby')buildLobbyScene('crystal_cave');
  currentScreen=name;
  setMusicMode(name==='game'?'game':'lobby');
}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function remember(){const n=playerName.value.trim();if(n)localStorage.setItem('cc_name',n)}
function ensureStarter(){ return true; }
function escapeHtml(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function buildCrystalDrift(){
  const root=$('#crystalDrift');if(!root||root.children.length)return;
  const hues=['cyan','violet','pink','gold','aqua'];
  for(let i=0;i<26;i++){
    const d=document.createElement('i');d.className=`float-crystal ${hues[i%hues.length]}`;
    d.style.setProperty('--x',`${(i*37)%101}%`);d.style.setProperty('--size',`${18+(i*13)%55}px`);d.style.setProperty('--dur',`${11+(i%9)*1.7}s`);d.style.setProperty('--delay',`${-(i%13)*1.25}s`);d.style.setProperty('--drift',`${-120+(i*29)%240}px`);d.style.setProperty('--rot',`${(i*41)%360}deg`);
    root.append(d);
  }
}
buildCrystalDrift();
const LOBBY_SCENES=['crystal_cave'];
let lastLobbyScene='';
function chooseLobbyScene(){return 'crystal_cave';}
function makeEl(cls,styles={}){const e=document.createElement('i');e.className=cls;for(const [k,v] of Object.entries(styles))e.style.setProperty(k,v);return e}
function buildLobbyScene(scene='crystal_cave'){
  scene='crystal_cave';
  const root=$('#lobbySceneVfx');if(!root)return;
  document.body.classList.remove('lobby-scene-dojo','lobby-scene-crystal_cave','lobby-scene-cosmic');
  document.body.classList.add('lobby-scene-'+scene);document.body.dataset.lobbyScene=scene;
  root.className='lobby-scene-vfx scene-'+scene;root.innerHTML='';
  if(scene==='dojo'){
    for(let i=0;i<5;i++)root.append(makeEl('dojo-lantern',{ '--x':`${8+i*21}%`,'--delay':`${-i*.8}s`,'--scale':`${.7+(i%2)*.2}` }));
    for(let i=0;i<18;i++)root.append(makeEl('dojo-petal',{ '--x':`${(i*19)%104}%`,'--delay':`${-(i%9)*.8}s`,'--dur':`${7+(i%6)}s`,'--drift':`${-90+(i*27)%180}px` }));
    for(let i=0;i<10;i++)root.append(makeEl('dojo-spark',{ '--x':`${(i*31)%100}%`,'--y':`${15+(i*17)%70}%`,'--delay':`${-i*.35}s` }));
  }else if(scene==='crystal_cave'){
    for(let i=0;i<13;i++)root.append(makeEl('cave-crystal',{ '--x':`${(i*23)%101}%`,'--h':`${70+(i*31)%150}px`,'--delay':`${-i*.3}s`,'--rot':`${-18+(i*13)%36}deg` }));
    for(let i=0;i<26;i++)root.append(makeEl('cave-mote',{ '--x':`${(i*37)%103}%`,'--delay':`${-(i%11)*.55}s`,'--dur':`${6+(i%7)}s`,'--size':`${3+(i%4)}px` }));
    for(let i=0;i<12;i++)root.append(makeEl('cave-drop',{ '--x':`${5+(i*47)%92}%`,'--delay':`${-(i%6)*.7}s` }));
  }else{
    root.append(makeEl('cosmic-planet'));
    root.append(makeEl('cosmic-ring'));
    for(let i=0;i<42;i++)root.append(makeEl('cosmic-star',{ '--x':`${(i*53)%101}%`,'--y':`${(i*29)%92}%`,'--delay':`${-(i%10)*.4}s`,'--size':`${1+(i%4)}px` }));
    for(let i=0;i<8;i++)root.append(makeEl('cosmic-meteor',{ '--x':`${-20+(i*19)%90}%`,'--y':`${5+(i*11)%55}%`,'--delay':`${-i*1.4}s` }));
  }
}
buildLobbyScene();
function buildArenaVfx(id){
  const root=$('#arenaVfx');if(!root)return;root.innerHTML='';root.className='arena-vfx vfx-'+id;
  if(id==='crystal_colosseum'){
    for(let i=0;i<18;i++)root.append(makeEl('arena-crystal-shard',{ '--x':`${(i*31)%101}%`,'--y':`${8+(i*23)%82}%`,'--delay':`${-(i%9)*.45}s`,'--scale':`${.45+(i%5)*.16}` }));
    for(let i=0;i<3;i++)root.append(makeEl('arena-rune-ring',{ '--ring':`${i}`,'--delay':`${-i*2.1}s` }));
    for(let i=0;i<5;i++)root.append(makeEl('arena-light-beam',{ '--x':`${8+i*21}%`,'--delay':`${-i*.9}s` }));
  }else if(id==='storm_temple'){
    for(let i=0;i<42;i++)root.append(makeEl('arena-rain',{ '--x':`${(i*17)%105}%`,'--delay':`${-(i%12)*.12}s`,'--dur':`${.55+(i%5)*.08}s` }));
    for(let i=0;i<5;i++)root.append(makeEl('arena-cloud',{ '--x':`${-5+i*24}%`,'--y':`${3+(i%2)*9}%`,'--delay':`${-i*1.4}s` }));
    for(let i=0;i<4;i++)root.append(makeEl('arena-lightning',{ '--x':`${13+i*23}%`,'--delay':`${-i*2.2}s` }));
  }else{
    for(let i=0;i<34;i++)root.append(makeEl('forge-spark',{ '--x':`${(i*29)%102}%`,'--delay':`${-(i%13)*.22}s`,'--dur':`${2.8+(i%6)*.35}s` }));
    for(let i=0;i<9;i++)root.append(makeEl('forge-rune',{ '--x':`${8+(i*11)%84}%`,'--y':`${12+(i*17)%72}%`,'--delay':`${-i*.7}s` }));
    for(let i=0;i<3;i++)root.append(makeEl('forge-orbit',{ '--ring':`${i}`,'--delay':`${-i*2.7}s` }));
  }
}
const CATEGORY_UI={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']};

function accessoryDecor(key){const a=ITEMS[key]||ITEMS.changeling;return `<span class="decor decor-${key}" aria-hidden="true"><img src="${a.image}" alt=""></span>`;}
function frameDecor(key){if(!key||!FRAMES[key])return '';return `<img class="name-frame" src="${FRAMES[key].image}" alt="" aria-hidden="true">`;}
function nameplateHTML(name,key,small=false,frame=selectedFrame){const safe=escapeHtml(name||'Spieler');const k=ITEMS[key]?key:'changeling';const f=FRAMES[frame]?frame:'';return `<div class="nameplate ${small?'nameplate-small':''} ${k} ${f?'has-frame frame-'+f:''}">${f?frameDecor(f):''}${accessoryDecor(k)}<span class="nameplate-text">${safe}</span></div>`;}
function updateHomePreview(){ $('#homeNamePreview').innerHTML=selectedAccessory?nameplateHTML(playerName.value.trim()||'Little Gem',selectedAccessory,false,selectedFrame):''; }
playerName.addEventListener('input',updateHomePreview);

$$('.starter-grid button').forEach(b=>b.addEventListener('click',()=>{
  selectedAccessory=b.value;
  unlocks=[...new Set([...unlocks,...STARTER_KEYS])];
  localStorage.setItem('cc_accessory',b.value);
  localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));
  $('#starterDialog').close();
  renderAccessoryGrid(); updateHomePreview();
}));

$$('[data-starter-frame]').forEach(b=>b.addEventListener('click',()=>{
  selectedFrame=b.dataset.starterFrame;
  starterFrameChosen=true;
  localStorage.setItem('cc_frame',selectedFrame);
  localStorage.setItem('cc_frame_unlocks',JSON.stringify(frameUnlocks));
  localStorage.setItem('cc_starter_frame_chosen','1');
  try{$('#starterFrameDialog').close()}catch{}
  renderAccessoryGrid();updateHomePreview();
}));

function maybeShowStarterFrame(){
  if(starterFrameChosen)return;
  const d=$('#starterFrameDialog');
  if(d&&!d.open)setTimeout(()=>{if(!starterFrameChosen&&!d.open)d.showModal()},350);
}

function renderAccessoryGrid(){
  const g=$('#accessoryGrid');g.innerHTML='';
  $('#collectionCount').textContent=`Items ${unlocks.length}/${ITEM_KEYS.length} · Rahmen ${frameUnlocks.length}/${FRAME_KEYS.length}`;
  $('#accessoryPreview').innerHTML=nameplateHTML(playerName.value.trim()||'Little Gem',selectedAccessory,false,selectedFrame);
  $('#itemsTabBtn')?.classList.toggle('active',cosmeticTab==='items');$('#framesTabBtn')?.classList.toggle('active',cosmeticTab==='frames');
  if(cosmeticTab==='items'){
    for(const key of ITEM_KEYS){const a=ITEMS[key],unlocked=unlocks.includes(key);const b=document.createElement('button');b.type='button';b.className=`accessory-card ${unlocked?'unlocked':'locked'} ${key===selectedAccessory?'selected':''}`;b.innerHTML=unlocked?`<span class="item-art"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><span class="status">${key===selectedAccessory?'Ausgewählt':'Freigeschaltet'}</span>`:`<span class="mystery-art">?</span><strong>Unentdecktes Item</strong><span class="status">🔒 Durch einen Sieg entdecken</span>`;b.disabled=!unlocked;if(unlocked)b.addEventListener('click',()=>{selectedAccessory=key;localStorage.setItem('cc_accessory',key);renderAccessoryGrid();updateHomePreview();if(['lobby','ready'].includes(state?.phase))socket.emit('setCosmetics',{accessory:selectedAccessory,frame:selectedFrame});if(state&&state.phase!=='lobby')renderGame()});g.append(b)}
  }else{
    const none=document.createElement('button');none.type='button';none.className=`accessory-card unlocked ${!selectedFrame?'selected':''}`;none.innerHTML='<span class="mystery-art">∅</span><strong>Kein Rahmen</strong><span class="status">Immer verfügbar</span>';none.addEventListener('click',()=>{selectedFrame='';localStorage.setItem('cc_frame','');renderAccessoryGrid();updateHomePreview();if(['lobby','ready'].includes(state?.phase))socket.emit('setCosmetics',{accessory:selectedAccessory,frame:selectedFrame})});g.append(none);
    for(const key of FRAME_KEYS){const a=FRAMES[key],unlocked=frameUnlocks.includes(key);const b=document.createElement('button');b.type='button';b.className=`accessory-card frame-card ${unlocked?'unlocked':'locked'} ${key===selectedFrame?'selected':''}`;b.innerHTML=unlocked?`<span class="frame-thumb"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><span class="status">${key===selectedFrame?'Ausgewählt':'Freigeschaltet'}</span>`:`<span class="mystery-art">?</span><strong>Unentdeckter Rahmen</strong><span class="status">🔒 Durch einen Sieg entdecken</span>`;b.disabled=!unlocked;if(unlocked)b.addEventListener('click',()=>{selectedFrame=key;localStorage.setItem('cc_frame',key);renderAccessoryGrid();updateHomePreview();if(['lobby','ready'].includes(state?.phase))socket.emit('setCosmetics',{accessory:selectedAccessory,frame:selectedFrame});if(state&&state.phase!=='lobby')renderGame()});g.append(b)}
  }
}
$('#itemsTabBtn')?.addEventListener('click',()=>{cosmeticTab='items';renderAccessoryGrid()});
$('#framesTabBtn')?.addEventListener('click',()=>{cosmeticTab='frames';renderAccessoryGrid()});
$('#accessoryBtn').addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});
$('#lobbyAccessoryBtn')?.addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});
$('#botLobbyBtn')?.addEventListener('click',()=>socket.emit('toggleBot'));

$('#createBtn').addEventListener('click',()=>{directMusicGesture('lobby');ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim();if(!name)return toast('Bitte zuerst einen Namen eingeben.');remember();socket.emit('createRoom',{name,accessory:selectedAccessory,frame:selectedFrame})});
$('#joinBtn').addEventListener('click',()=>{directMusicGesture('lobby');ensureAudio();if(!ensureStarter())return;const name=playerName.value.trim(),code=$('#roomCode').value.trim();if(!name||!code)return toast('Name und Raumcode eingeben.');remember();socket.emit('joinRoom',{name,code,accessory:selectedAccessory,frame:selectedFrame})});
function startBotTestRoom(){
  directMusicGesture('lobby');ensureAudio();if(!ensureStarter())return;
  const name=playerName.value.trim();if(!name)return toast('Bitte zuerst deinen Namen eingeben.');
  remember();try{$('#rulesDialog').close()}catch{};resetTraining?.();
  socket.emit('createBotRoom',{name,accessory:selectedAccessory,frame:selectedFrame});
  toast('🤖 PonyBot wird vorbereitet …');
}
$('#botTestBtn')?.addEventListener('click',startBotTestRoom);
$('#startBtn').addEventListener('click',()=>{directMusicGesture('lobby');ensureAudio();socket.emit('startGame')});
$('#arenaReadyBtn')?.addEventListener('click',()=>{directMusicGesture('game');ensureAudio();socket.emit('toggleReady')});
$('#arenaAccessoryBtn')?.addEventListener('click',()=>{renderAccessoryGrid();$('#accessoryDialog').showModal()});
$('#arenaReadyLeaveBtn')?.addEventListener('click',()=>leaveRoomNow());

socket.on('connect',()=>{myId=socket.id;updateHomePreview();});
socket.on('matchLoadout',e=>toast(`🃏 Start: ${e.normalCards} normale Karten + ${e.specialCards} Spezialkarte · Ziel: 3 Artefakte`));
socket.on('errorMsg',toast); socket.on('notice',toast); socket.on('specialDone',e=>toast(e.text));

let waitingForLobbyReset=false;

function renderPostGameLobby(){
  if(!state)return;
  const backSet=new Set(state.postGameReady||[]);
  $('#lobbyCode').textContent=state.code;
  if(typeof ensureRoomCodeCopyControl==='function')ensureRoomCodeCopyControl($('#lobbyCode'),state.code);

  $('#lobbyHint').textContent=`Du bist zurück in der Lobby. ${backSet.size}/${state.players.length} Spieler sind schon hier. Sobald alle zurück sind, kann die nächste Runde starten.`;

  $('#lobbyPlayers').innerHTML=state.players.map(p=>{
    const back=backSet.has(p.id);
    const status=back?'✓ In der Lobby':'⏳ Noch im Ergebnis';
    return `<div class="lobby-player postgame-lobby-player ${back?'is-back':'is-waiting'}">
      ${nameplateHTML(p.name,p.accessory,true,p.frame)}
      <div class="postgame-player-status">${status}</div>
    </div>`;
  }).join('');

  $('#startBtn').style.display='none';
  $('#botLobbyBtn')?.style.setProperty('display','none');
  $('#lobbyAccessoryBtn')?.style.setProperty('display','inline-block');
}

socket.on('roomState',s=>{
  state=s;

  // WICHTIG:
  // Wenn dieser Spieler nach dem Spiel bereits "Zur Lobby" gedrückt hat,
  // bleibt er dort, auch wenn der gemeinsame Raum serverseitig noch gameover ist.
  const alreadyBackAfterGame =
    s.phase==='gameover' &&
    Array.isArray(s.postGameReady) &&
    s.postGameReady.includes(myId);

  if(alreadyBackAfterGame){
    waitingForLobbyReset=true;
    show('lobby');
    document.body.classList.remove('scene-game','scene-home');
    document.body.classList.add('scene-lobby');
    currentScreen='lobby';
    buildLobbyScene('crystal_cave');
    setMusicMode('lobby');
    hideArenaReady();
    hideTieAlert();
    stopCountdown();
    stopSelectionTimer();
    clearTable();
    try{$('#gameOverDialog').close()}catch{}
    try{$('#giftDialog').close()}catch{}
    renderPostGameLobby();
    return;
  }

  if(s.phase==='lobby'){
    waitingForLobbyReset=false;
    show('lobby');
    document.body.classList.remove('scene-game','scene-home');
    document.body.classList.add('scene-lobby');
    currentScreen='lobby';
    buildLobbyScene('crystal_cave');
    setMusicMode('lobby');
    hideArenaReady();
    stopCountdown();
    stopSelectionTimer();
    clearTable();
    renderLobby();
    return;
  }

  show('game');
  document.body.classList.remove('scene-lobby','scene-home');
  document.body.classList.add('scene-game');
  currentScreen='game';
  setMusicMode('game');
  renderGame();

  if(s.phase==='ready'){
    stopCountdown();
    stopSelectionTimer();
    renderArenaReady();
    return;
  }

  hideArenaReady();
  if(s.phase==='countdown')runCountdown(s.countdownUntil||Date.now()+5000);
  if(s.phase==='roundintro')showRoundIntro({round:s.round,category:s.category,until:s.roundIntroUntil});
  else if(s.phase==='select')startSelectionTimer(s.selectionDeadline);
});
let newlyDrawn=new Set();
socket.on('hand',h=>{const before=new Set(hand.map(c=>c.id));newlyDrawn=new Set(h.filter(c=>!before.has(c.id)).map(c=>c.id));hand=h;renderHand();if(state)renderGame();if(newlyDrawn.size)setTimeout(()=>newlyDrawn.clear(),1000)});

function hideArenaReady(){
  const panel=$('#arenaReadyPanel');
  if(panel)panel.hidden=true;
}
function renderArenaReady(){
  const panel=$('#arenaReadyPanel');
  if(!panel||!state)return;
  panel.hidden=false;
  const me=state.players.find(p=>p.id===myId);
  const readyCount=state.players.filter(p=>p.ready).length;
  $('#arenaRoomCode').textContent=state.code;
  ensureRoomCodeCopyControl($('#arenaRoomCode'),state.code);
  $('#arenaReadyPlayers').innerHTML=state.players.map(p=>`<div class="arena-ready-player ${p.ready?'is-ready':''} ${p.isBot?'bot-player':''}">${nameplateHTML(p.name,p.accessory,true,p.frame)}<span>${p.isBot?'🤖 BOT · ':p.id===state.hostId?'👑 HOST · ':''}${p.ready?'✅ BEREIT':'⏳ WARTET'}</span></div>`).join('');
  const btn=$('#arenaReadyBtn');
  btn.disabled=state.players.length<2;
  btn.textContent=me?.ready?`↩ Nicht bereit (${readyCount}/${state.players.length})`:`✅ Bereit (${readyCount}/${state.players.length})`;
  btn.classList.toggle('ready-active',!!me?.ready);
  $('#categoryIcon').textContent='⚔️';
  $('#categoryText').textContent=state.players.length<2?'Warte auf Mitspieler':'Bereit machen!';
  $('#roundMessage').textContent=state.players.length<2?`Raumcode: ${state.code}`:'Sobald alle bereit sind, startet der Countdown für alle – direkt hier in der Arena.';
  updateMusicUI();
}


async function copyRoomCode(code){
  const value=String(code||'').trim();
  if(!value)return;

  let copied=false;
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(value);
      copied=true;
    }
  }catch(e){}

  if(!copied){
    try{
      const ta=document.createElement('textarea');
      ta.value=value;
      ta.setAttribute('readonly','');
      ta.style.position='fixed';
      ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.select();
      copied=document.execCommand('copy');
      ta.remove();
    }catch(e){}
  }

  toast(copied?`Raumcode ${value} kopiert!`:`Raumcode: ${value}`);
}

function ensureRoomCodeCopyControl(codeEl,code){
  if(!codeEl)return;

  codeEl.classList.add('copyable-room-code');
  codeEl.title='Klicken zum Kopieren';
  codeEl.setAttribute('role','button');
  codeEl.setAttribute('tabindex','0');

  if(!codeEl.dataset.copyBound){
    codeEl.dataset.copyBound='1';
    codeEl.addEventListener('click',()=>copyRoomCode(codeEl.textContent));
    codeEl.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        copyRoomCode(codeEl.textContent);
      }
    });
  }

  const parent=codeEl.parentElement;
  if(!parent)return;

  let btn=parent.querySelector('.room-code-copy-btn');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='room-code-copy-btn';
    btn.innerHTML='📋 Code kopieren';
    btn.addEventListener('click',()=>copyRoomCode(codeEl.textContent));
    codeEl.insertAdjacentElement('afterend',btn);
  }
  btn.dataset.code=String(code||'');
}

function renderLobby(){
  $('#lobbyCode').textContent=state.code;
  ensureRoomCodeCopyControl($('#lobbyCode'),state.code);
  $('#lobbyHint').textContent=state.players.length<2?'Schick den Code an deine Mitspieler.':'Der Host startet die Kampf-Vorbereitung. Bereit wird erst in der Arena geklickt.';
  $('#lobbyPlayers').innerHTML=state.players.map(p=>`<div class="lobby-player ${p.isBot?'bot-player':''}">${nameplateHTML(p.name,p.accessory,true,p.frame)}<div>${p.isBot?'🤖 COMPUTER':(p.id===state.hostId?'Host 👑':'Mitspieler')}</div></div>`).join('');
  const start=$('#startBtn');
  start.style.display=myId===state.hostId?'inline-block':'none';
  start.disabled=state.players.length<2;
  start.textContent='⚔️ In die Arena';
  const botBtn=$('#botLobbyBtn');
  if(botBtn){
    const hasBot=state.players.some(p=>p.isBot);
    botBtn.style.display=myId===state.hostId?'inline-block':'none';
    botBtn.textContent=hasBot?'🤖 Test-Bot entfernen':'🤖 Test-Bot hinzufügen';
    botBtn.disabled=!hasBot&&state.players.length>=8;
  }
  updateMusicUI();
}


function arenaSeatStyle(index,count){
  // Eigener Spieler sitzt unten. Alle Gegner bilden darüber den Rest des Kreises.
  if(count<=1)return '--seat-x:50%;--seat-y:8%;';
  const start=-160,end=-20;
  const angle=(start+(end-start)*(index/(count-1)))*Math.PI/180;
  const x=50+Math.cos(angle)*46;
  const y=48+Math.sin(angle)*40;
  return `--seat-x:${x.toFixed(2)}%;--seat-y:${y.toFixed(2)}%;`;
}

function ensureMatchActionButtons(){
  const actions=document.querySelector('.game-actions');
  if(!actions)return;

  let surrender=$('#surrenderBtn');
  if(!surrender){
    surrender=document.createElement('button');
    surrender.id='surrenderBtn';
    surrender.type='button';
    surrender.className='danger-btn surrender-btn';
    surrender.textContent='🏳 Aufgeben';
    const music=actions.querySelector('.music-controls');
    actions.insertBefore(surrender,music||actions.lastChild);

    let armTimer=null;
    surrender.addEventListener('click',()=>{
      if(surrender.dataset.armed==='1'){
        clearTimeout(armTimer);
        surrender.dataset.armed='0';
        surrender.textContent='🏳 Aufgeben';
        socket.emit('giveUp');
        return;
      }
      surrender.dataset.armed='1';
      surrender.textContent='⚠ Wirklich aufgeben?';
      toast('Nochmal klicken, um wirklich aufzugeben.');
      armTimer=setTimeout(()=>{
        surrender.dataset.armed='0';
        surrender.textContent='🏳 Aufgeben';
      },3000);
    });
  }

  let quickLobby=$('#quickLobbyBtn');
  if(!quickLobby){
    quickLobby=document.createElement('button');
    quickLobby.id='quickLobbyBtn';
    quickLobby.type='button';
    quickLobby.className='primary-btn quick-lobby-btn';
    quickLobby.textContent='↩ Zur Lobby';
    const music=actions.querySelector('.music-controls');
    actions.insertBefore(quickLobby,music||actions.lastChild);
    quickLobby.addEventListener('click',()=>{
      try{$('#gameOverDialog').close()}catch{}
      socket.emit('returnToLobby');
      toast('Zurück zur Lobby …');
    });
  }
}
ensureMatchActionButtons();


const ARTIFACT_ORDER=[
  {id:'a01',name:'Elemente der Harmonie',icon:'✦'},
  {id:'a02',name:'Kristall Herz',icon:'💎'},
  {id:'a03',name:'Star Swirls Tagebuch',icon:'📘'}
];
function artifactSlotsHTML(owned=[]){
  const ids=new Set((owned||[]).map(a=>typeof a==='string'?a:a.id));
  return `<div class="artifact-mini-row">${ARTIFACT_ORDER.map(a=>`<span class="artifact-mini ${ids.has(a.id)?'found':''}" title="${escapeHtml(a.name)}">${ids.has(a.id)?a.icon:'?'}</span>`).join('')}</div>`;
}
function renderArtifactShelf(me){
  const shelf=$('#artifactShelf');if(!shelf)return;
  const owned=me?.artifacts||[];
  const ids=new Set(owned.map(a=>a.id));
  shelf.innerHTML=`<div class="artifact-shelf-title"><strong>ARTEFAKTE</strong><span>${ids.size}/3</span></div>
    <div class="artifact-shelf-slots">${ARTIFACT_ORDER.map(a=>{
      const card=owned.find(x=>x.id===a.id);
      return `<div class="artifact-slot ${card?'found':''}" title="${escapeHtml(a.name)}">
        ${card?`<img src="${card.image}" alt="${escapeHtml(card.name)}">`:`<span>?</span>`}
        <small>${escapeHtml(a.name)}</small>
      </div>`;
    }).join('')}</div>`;
}
function updateDeckHud(){
  if(!state)return;
  const n=$('#normalDeckCount'),r=$('#rewardDeckCount');
  if(n)n.textContent=state.deckCounts?.normal??'–';
  if(r)r.textContent=state.deckCounts?.reward??'–';
}
function cardShuffleSound(){
  ensureAudio();
  [0,.055,.11,.17,.23,.31].forEach((t,i)=>tone(190+i*26,.045,.018,'triangle',t));
  noiseBurst?.(.16,.025,.08);
}
function rewardChime(){
  ensureAudio();
  [520,660,820,1040].forEach((f,i)=>tone(f,.18,.03,'sine',i*.085));
}
function artifactFanfare(){
  ensureAudio();
  [392,523,659,784,1046].forEach((f,i)=>tone(f,.28,.04,'triangle',i*.11));
  tone(130,.65,.035,'sine',.25);
}
function pulseDeck(id){
  const el=$(id);if(!el)return;
  el.classList.remove('deck-pulse');void el.offsetWidth;el.classList.add('deck-pulse');
  setTimeout(()=>el.classList.remove('deck-pulse'),900);
}
function showRewardDraw(e){
  const o=$('#rewardDrawOverlay');if(!o)return;
  const flipper=$('#rewardCardFlipper'),img=$('#rewardDrawImage');
  const title=$('#rewardDrawTitle'),txt=$('#rewardDrawText'),kicker=$('#rewardDrawKicker');
  const me=e.playerId===myId;
  const isArtifact=e.kind==='artifact';
  kicker.textContent=isArtifact?'ARTEFAKT GEFUNDEN':'GOLDSTAPEL';
  title.textContent=isArtifact?(e.card?.name||'Artefakt'):(me&&e.card?e.card.name:`${e.playerName} zieht eine Spezialkarte`);
  txt.textContent=isArtifact?`${e.playerName} sichert ein Artefakt!`:(me?'Neue Spezialkarte auf deiner Hand.':'Die Spezialkarte bleibt geheim.');
  img.src=e.card?.image||'/assets/special_back_gold.png';
  flipper.classList.remove('flipped');o.classList.add('active');o.setAttribute('aria-hidden','false');
  pulseDeck('rewardDeckHud');rewardChime();
  setTimeout(()=>{if(e.card)flipper.classList.add('flipped')},550);
  if(isArtifact)setTimeout(artifactFanfare,700);
  setTimeout(()=>{o.classList.remove('active');o.setAttribute('aria-hidden','true')},isArtifact?3000:2200);
}

function renderGame(){
  if(!state)return;
  const me=state.players.find(p=>p.id===myId);if(!me)return;
  const arena=document.querySelector('.arena');
  if(arena){
    arena.classList.remove('arena-crystal_colosseum','arena-storm_temple','arena-celestial_forge');
    const arenaId=state.arenaId||'crystal_colosseum';
    arena.classList.add('arena-'+arenaId);
    if(arena.dataset.vfx!==arenaId){arena.dataset.vfx=arenaId;buildArenaVfx(arenaId);}
  }
  ensureMatchActionButtons();
  $('#abortBtn').style.display=myId===state.hostId&&state.phase!=='gameover'?'inline-block':'none';

  const surrenderBtn=$('#surrenderBtn');
  const canSurrender=['countdown','roundintro','select'].includes(state.phase)&&!me.surrendered;
  if(surrenderBtn){
    surrenderBtn.style.display=canSurrender?'inline-block':'none';
    if(!canSurrender){surrenderBtn.dataset.armed='0';surrenderBtn.textContent='🏳 Aufgeben';}
  }
  const quickLobbyBtn=$('#quickLobbyBtn');
  if(quickLobbyBtn)quickLobbyBtn.style.display=state.phase==='gameover'?'inline-block':'none';

  $('#selfName').textContent=me.name;
  $('#selfCount').textContent=me.surrendered?'🏳 Aufgegeben · Zuschauer':`${me.handCount} Karten · ${me.artifactCount||0}/3 Artefakte`;
  renderArtifactShelf(me);
  updateDeckHud();
  $('#selfNameplate').innerHTML=nameplateHTML(me.name,me.accessory,true,me.frame);

  const others=state.players.filter(p=>p.id!==myId);
  $('#opponents').innerHTML=others.length?others.map((p,i)=>{
    const status=p.surrendered
      ? '<span class="surrendered-mark">🏳 Aufgegeben</span>'
      : (p.selected?'<span class="selected-mark">✓ Karte liegt</span>':`<span>${p.isBot?'🤖 überlegt …':'wartet …'}</span>`);
    const fan=p.surrendered?'':`<div class="back-fan">${Array.from({length:Math.min(p.handCount,7)},(_,j)=>`<img src="/assets/card_back.webp" alt="verdeckte Karte" style="transform:rotate(${(j-3)*5}deg)">`).join('')}</div>`;
    return `<div class="opponent ${p.selected?'has-selected':''} ${p.surrendered?'is-surrendered':''}" style="${arenaSeatStyle(i,others.length)}" data-player-id="${p.id}">
      ${nameplateHTML(p.name,p.accessory,true,p.frame)}
      ${p.isBot?'<div class="bot-badge">🤖 BOT</div>':''}<div class="opponent-meta"><span>${p.surrendered?'Zuschauer':`${p.handCount} Karten`}</span>${status}</div>${artifactSlotsHTML(p.artifacts)}
      ${fan}
    </div>`;
  }).join(''):'<div class="opponent-empty">Warte auf Mitspieler …</div>';

  renderHand();updateMusicUI();
}

function specialUseInfo(c){
  return `<div class="special-category-badge"><span>${c.useIcon||'✦'}</span><strong>${escapeHtml(c.useLabel||'Jede Kategorie')}</strong></div><div class="special-description">${escapeHtml(c.text||'Spezialeffekt')}</div>`;
}
function statOverlayHTML(c){return '';}
let inspectRotationY=0,inspectRotationX=0,inspectDragging=false,inspectLastX=0,inspectLastY=0;
function openCardInspect(card){
  if(!card)return;
  const overlay=$('#cardInspectOverlay'),front=$('#cardInspectFront'),name=$('#cardInspectName');
  front.src=card.image;front.alt=card.name||'Karte';name.textContent=card.name||'Karte';
  const back=$('#cardInspectBack');
  if(back)back.src=(card.type==='special'||card.type==='artifact')?'/assets/special_back_gold.png':'/assets/card_back.webp';
  inspectRotationY=0;inspectRotationX=0;applyInspectRotation();
  overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');
}
function closeCardInspect(){const o=$('#cardInspectOverlay');o?.classList.remove('open');o?.setAttribute('aria-hidden','true');inspectDragging=false}
function applyInspectRotation(){const c=$('#cardInspectCard');if(c)c.style.transform=`rotateX(${inspectRotationX}deg) rotateY(${inspectRotationY}deg)`}
function bindCardInspector(el,card){
  let timer=null,startX=0,startY=0;
  const cancel=()=>{if(timer){clearTimeout(timer);timer=null}};
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    startX=e.clientX;startY=e.clientY;
    timer=setTimeout(()=>{el.dataset.inspectConsumed='1';openCardInspect(card);timer=null},850);
  });
  el.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-startX,e.clientY-startY)>9)cancel()});
  el.addEventListener('pointerup',cancel);el.addEventListener('pointercancel',cancel);el.addEventListener('pointerleave',cancel);
}


function ensureSpecialChoiceDialog(){
  let d=$('#specialChoiceDialog');
  if(d)return d;
  d=document.createElement('dialog');d.id='specialChoiceDialog';d.className='modal special-choice-dialog';
  d.innerHTML=`<div class="special-choice-wrap">
    <h3 id="specialChoiceTitle">Spezialkarte</h3>
    <p id="specialChoiceHint"></p>
    <div id="specialChoiceGrid" class="special-choice-grid"></div>
    <button id="specialChoiceClose" class="soft-btn" type="button">Schließen</button>
  </div>`;
  document.body.append(d);
  $('#specialChoiceClose').addEventListener('click',()=>d.close());
  return d;
}
function showPlayerChoices(title,targets,onChoose){
  const d=ensureSpecialChoiceDialog(),g=$('#specialChoiceGrid');
  $('#specialChoiceTitle').textContent=title;$('#specialChoiceHint').textContent='Wähle einen Mitspieler.';
  g.innerHTML='';
  (targets||[]).forEach(t=>{
    const b=document.createElement('button');b.type='button';b.className='special-player-choice';
    b.innerHTML=`<strong>${escapeHtml(t.name)}</strong><small>${t.selected?'✓ Karte liegt':'wartet'} · ${t.handCount} Handkarten</small>`;
    b.addEventListener('click',()=>{d.close();onChoose(t.id)});
    g.append(b);
  });
  d.showModal();
}
function showCategoryChoices(title,categories,onChoose){
  const d=ensureSpecialChoiceDialog(),g=$('#specialChoiceGrid');
  $('#specialChoiceTitle').textContent=title;$('#specialChoiceHint').textContent='Diese Kategorie gilt sofort für die laufende Runde.';
  g.innerHTML='';
  (categories||[]).forEach(c=>{
    const b=document.createElement('button');b.type='button';b.className='special-category-choice';
    b.innerHTML=`<span>${c.icon}</span><strong>${escapeHtml(c.label)}</strong>`;
    b.addEventListener('click',()=>{d.close();onChoose(c.id)});
    g.append(b);
  });
  d.showModal();
}

function buildHandCard(c,me,normals,blockedId){
  const blocked=c.type==='normal'&&c.id===blockedId&&normals.some(x=>x.id!==blockedId);
  const el=document.createElement('div');
  el.className=`hand-card ${c.type==='special'?`special effect-${c.effect||'generic'}`:''} ${blocked?'recently-played disabled':''} ${newlyDrawn.has(c.id)?'drawing-in':''}`;
  el.dataset.cardId=c.id;
  const img=document.createElement('img');img.src=c.image;img.alt=c.name;el.append(img);bindCardInspector(el,c);

  if(c.type==='normal'){
    if(blocked){const lock=document.createElement('div');lock.className='recent-lock';lock.textContent='⏳ Gerade gespielt';el.append(lock)}
    el.tabIndex=blocked?-1:0;
    const play=()=>{
      if(el.dataset.inspectConsumed==='1'){delete el.dataset.inspectConsumed;return;}
      ensureAudio();
      if(blocked)return toast('Diese Karte hast du gerade gespielt – nimm eine andere.');
      if(state?.phase!=='select')return toast('Warte auf die nächste Auswahl.');
      if(me?.selected)return toast('Du hast schon eine Karte gelegt.');
      el.dataset.pendingPlay='1';socket.emit('playCard',{cardId:c.id});
    };
    el.addEventListener('click',play);
    el.addEventListener('keydown',e=>{if(!blocked&&(e.key==='Enter'||e.key===' ')){e.preventDefault();play()}});
  }else{
    el.insertAdjacentHTML('beforeend',specialUseInfo(c));
    const b=document.createElement('button');b.className='special-use';b.type='button';b.textContent='✨ Spezial einsetzen';
    b.addEventListener('click',e=>{
      e.stopPropagation();ensureAudio();
      if(state?.phase!=='select')return toast('Spezialkarten nur während der Auswahl.');
      socket.emit('useSpecial',{cardId:c.id});
    });
    el.append(b);
  }
  return el;
}

function renderHand(){
  const wrap=$('#hand');if(!wrap)return;wrap.innerHTML='';
  const me=state?.players?.find(p=>p.id===myId);
  if(me?.surrendered){
    wrap.classList.remove('large-hand');
    wrap.innerHTML='<div class="spectator-hand-note">🏳 Du hast aufgegeben · Du kannst das Match weiter ansehen</div>';
    return;
  }
  const blockedId=me?.lastPlayedCardId||null;
  const normals=hand.filter(c=>c.type==='normal');
  const activeCategory=state?.category;
  const hasCategory=['strength','speed','energy','magic'].includes(activeCategory);

  // Bis 10 Karten bleibt die gewohnte Handansicht erhalten.
  if(hand.length<=10){
    wrap.classList.remove('large-hand');
    for(const c of hand)wrap.append(buildHandCard(c,me,normals,blockedId));
    return;
  }

  // Große Hand: die zehn besten NORMALEN Karten für die aktuelle Kategorie
  // kommen in eine eigene obere Reihe. Alle anderen Karten bleiben darunter
  // vollständig erreichbar und auswählbar.
  wrap.classList.add('large-hand');
  const normalSorted=[...normals].sort((a,b)=>{
    if(!hasCategory)return 0;
    const av=Number(a?.[activeCategory]||0),bv=Number(b?.[activeCategory]||0);
    return bv-av || String(a.name||'').localeCompare(String(b.name||''),'de');
  });
  const topTen=normalSorted.slice(0,10);
  const topIds=new Set(topTen.map(c=>c.id));
  const rest=hand.filter(c=>!topIds.has(c.id));

  const top=document.createElement('section');top.className='hand-tier hand-tier-priority';
  const title=document.createElement('div');title.className='hand-tier-title';
  const catLabel=({strength:'🏋️ Stärke',speed:'⚡ Schnelligkeit',energy:'🔋 Energie',magic:'⭐ Magie'})[activeCategory]||'aktuelle Kategorie';
  title.innerHTML=`<strong>Top-Karten für ${catLabel}</strong><span>höchster Wert zuerst</span>`;
  const row=document.createElement('div');row.className='hand-tier-row';
  top.append(title,row);
  for(const c of topTen)row.append(buildHandCard(c,me,normals,blockedId));
  wrap.append(top);

  if(rest.length){
    const extra=document.createElement('section');extra.className='hand-tier hand-tier-extra';
    const extraTitle=document.createElement('div');extraTitle.className='hand-tier-title compact';
    extraTitle.innerHTML=`<strong>Weitere Karten</strong><span>${rest.length} Karte${rest.length===1?'':'n'} – weiterhin spielbar</span>`;
    const extraRow=document.createElement('div');extraRow.className='hand-tier-row';
    extra.append(extraTitle,extraRow);
    for(const c of rest)extraRow.append(buildHandCard(c,me,normals,blockedId));
    wrap.append(extra);
  }
}

function ensureAudio(){userInteracted=true;try{const A=window.AudioContext||window.webkitAudioContext;if(A){if(!ensureAudio.ctx)ensureAudio.ctx=new A();if(ensureAudio.ctx.state==='suspended')ensureAudio.ctx.resume();}}catch(e){}syncMusic();return ensureAudio.ctx||null;}
function tone(freq=620,dur=.1,gain=.045,type='sine',when=0){const ctx=ensureAudio.ctx;if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;const t=ctx.currentTime+when;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur);}
function beep(freq=620,dur=.1){tone(freq,dur,.05,'sine')}
function diceRollSound(){for(let i=0;i<8;i++)tone(180+i*33,.045,.035,i%2?'square':'triangle',i*.065)}
function diceLandSound(v){tone(420+v*70,.12,.07,'triangle');tone(210+v*25,.18,.045,'sine',.07)}
function specialSound(){tone(440,.12,.055,'sine');tone(660,.18,.05,'triangle',.08);tone(990,.28,.045,'sine',.18)}
function specialTheme(effect=''){
  if(['windigos'].includes(effect))return 'ice';
  if(['daybreaker','sunset'].includes(effect))return 'fire';
  if(['stormking','lightningdust','rainbow'].includes(effect))return 'storm';
  if(['nightmare','sombra','ponyshadows','tirek'].includes(effect))return 'shadow';
  if(['maneiac','starlight','chrysalis','changeling','grogar','trixie'].includes(effect))return 'magic';
  if(['bugbear','hydra','manticore','timberwolves','sludge','gilda'].includes(effect))return 'impact';
  if(['pinkie','twilight','fluttershy','rarity','diamonddogs','flimflam','cozy'].includes(effect))return 'sparkle';
  return 'magic';
}
function specialFxSound(effect=''){
  const theme=specialTheme(effect);
  if(theme==='ice'){[820,660,520,390].forEach((f,i)=>tone(f,.2,.035,'sine',i*.07));return}
  if(theme==='fire'){[260,390,620,930].forEach((f,i)=>tone(f,.22,.045,'sawtooth',i*.065));return}
  if(theme==='storm'){for(let i=0;i<7;i++)tone(180+i*105,.05,.035,i%2?'square':'sawtooth',i*.045);return}
  if(theme==='shadow'){tone(120,.55,.045,'sawtooth');tone(180,.38,.03,'triangle',.08);tone(90,.7,.025,'sine',.1);return}
  if(theme==='impact'){tone(120,.16,.07,'square');tone(75,.28,.06,'sine',.08);return}
  if(theme==='sparkle'){[520,720,920,1180].forEach((f,i)=>tone(f,.15,.032,'triangle',i*.06));return}
  specialSound();
}
function setMusicMode(mode){
  musicMode=mode;
  syncMusic();
}
let musicInitAttempts=0,musicPendingStart=false,musicPrimeDone=false,musicWatchdog=null;

function initYouTubeMusic(){
  if(ytPlayer||!window.YT?.Player)return !!ytPlayer;
  try{
    ytPlayer=new YT.Player('ytAudioPlayer',{
      width:'200',height:'112',videoId:YT_TRACKS.lobby,
      playerVars:{
        controls:0,rel:0,playsinline:1,enablejsapi:1,
        loop:1,playlist:YT_TRACKS.lobby,autoplay:1,fs:0,iv_load_policy:3
      },
      events:{
        onReady:()=>{
          ytReady=true;
          try{
            // Prime the player muted. Muted autoplay is allowed by modern browsers
            // and makes the later user-triggered unmute far more reliable.
            ytPlayer.mute();
            ytPlayer.setVolume(musicVolume);
            ytPlayer.playVideo();
            musicPrimeDone=true;
          }catch(e){}
          updateMusicUI();
          if(userInteracted||musicPendingStart)setTimeout(syncMusic,40);
          startMusicWatchdog();
        },
        onStateChange:()=>updateMusicUI(),
        onError:e=>{
          console.warn('Musik konnte nicht geladen werden',e);
          toast('Musik lädt nicht. Klicke einmal auf „Musik an“.');
        }
      }
    });
    return true;
  }catch(e){
    console.warn('YouTube-Player nicht verfügbar',e);
    return false;
  }
}
window.onYouTubeIframeAPIReady=()=>initYouTubeMusic();

function directMusicGesture(mode=null){
  userInteracted=true;
  musicPendingStart=musicEnabled;
  if(mode)musicMode=mode;
  if(!initYouTubeMusic()){
    if(musicInitAttempts<40){
      musicInitAttempts++;
      setTimeout(()=>directMusicGesture(mode),200);
    }
    return;
  }
  if(!ytReady||!ytPlayer)return;
  try{
    const id=YT_TRACKS[musicMode]||YT_TRACKS.lobby;
    const current=ytPlayer.getVideoData?.().video_id;
    ytPlayer.setVolume(musicVolume);
    if(!musicEnabled){
      ytPlayer.mute();ytPlayer.pauseVideo();return;
    }
    if(current!==id)ytPlayer.loadVideoById({videoId:id,startSeconds:0});
    ytPlayer.unMute();
    ytPlayer.playVideo();
    musicPendingStart=false;
  }catch(e){console.warn('Musik-Freischaltung:',e)}
}

function requestMusicActivation(){directMusicGesture();}

function syncMusic(){
  updateMusicUI();
  const id=YT_TRACKS[musicMode]||YT_TRACKS.lobby;
  if(!id)return;
  if(!ytReady||!ytPlayer){
    musicPendingStart=musicEnabled;
    initYouTubeMusic();
    return;
  }
  try{
    ytPlayer.setVolume(musicVolume);
    if(!musicEnabled){
      ytPlayer.mute();
      ytPlayer.pauseVideo();
      return;
    }
    if(!userInteracted){
      // Keep a muted stream primed until the first real click.
      ytPlayer.mute();
      if(musicPrimeDone)ytPlayer.playVideo();
      musicPendingStart=true;
      return;
    }
    const current=ytPlayer.getVideoData?.().video_id;
    if(current!==id)ytPlayer.loadVideoById({videoId:id,startSeconds:0});
    ytPlayer.unMute();
    ytPlayer.playVideo();
    musicPendingStart=false;
  }catch(e){console.warn('Musiksteuerung:',e)}
}

function toggleMusic(){
  userInteracted=true;
  musicEnabled=!musicEnabled;
  localStorage.setItem('mlp_music',musicEnabled?'on':'off');
  if(musicEnabled){
    musicPendingStart=true;
    directMusicGesture();
  }else if(ytReady&&ytPlayer){
    try{ytPlayer.mute();ytPlayer.pauseVideo()}catch(e){}
  }
  updateMusicUI();
}

function setMusicVolume(v){
  userInteracted=true;
  musicVolume=Math.max(0,Math.min(100,Number(v)||0));
  localStorage.setItem('mlp_music_volume',String(musicVolume));
  if(ytReady&&ytPlayer){
    try{
      ytPlayer.setVolume(musicVolume);
      if(musicEnabled){ytPlayer.unMute();ytPlayer.playVideo();}
    }catch(e){}
  }
  updateMusicUI();
}

function updateMusicUI(){
  document.querySelectorAll('.music-toggle').forEach(b=>{
    b.textContent=musicEnabled?'🔇 Musik stumm':'🔊 Musik an';
    b.title=musicEnabled?'Hintergrundmusik ausschalten':'Hintergrundmusik einschalten';
  });
  document.querySelectorAll('.music-volume').forEach(s=>s.value=String(musicVolume));
  document.querySelectorAll('.music-volume-readout').forEach(x=>x.textContent=`${Math.round(musicVolume)}%`);
}

function startMusicWatchdog(){
  if(musicWatchdog)clearInterval(musicWatchdog);
  musicWatchdog=setInterval(()=>{
    if(!musicEnabled||!userInteracted||!ytReady||!ytPlayer)return;
    try{
      const stateNow=ytPlayer.getPlayerState?.();
      if(stateNow!==YT.PlayerState.PLAYING&&stateNow!==YT.PlayerState.BUFFERING){
        const id=YT_TRACKS[musicMode]||YT_TRACKS.lobby;
        if(ytPlayer.getVideoData?.().video_id!==id)ytPlayer.loadVideoById({videoId:id,startSeconds:0});
        ytPlayer.setVolume(musicVolume);ytPlayer.unMute();ytPlayer.playVideo();
      }
    }catch(e){}
  },2200);
}

// Prime as early as possible.
setTimeout(()=>{if(window.YT?.Player)initYouTubeMusic()},250);
document.addEventListener('pointerdown',()=>{if(!userInteracted)directMusicGesture()},{once:true,capture:true});
document.addEventListener('keydown',()=>{if(!userInteracted)directMusicGesture()},{once:true,capture:true});

function clearTable(){lastReveal=[];$('#tableCards').innerHTML=''}
function addCommitGhost(e){const t=$('#tableCards');if(t.querySelector(`[data-player-id="${e.playerId}"]`))return;const d=document.createElement('div');d.className='played-card ghost-card card-commit';d.dataset.playerId=e.playerId;d.innerHTML=`<div class="card-flip-inner"><div class="card-face card-back-face"><img src="/assets/card_back.webp" alt="verdeckte Karte"></div></div><div class="who">${escapeHtml(e.name)}</div>`;t.append(d);const source=e.playerId===myId?document.querySelector('.hand-card[data-pending-play="1"]'):document.querySelector(`.opponent[data-player-id="${e.playerId}"] .back-fan`);if(source){const sr=source.getBoundingClientRect(),tr=d.getBoundingClientRect();const clone=document.createElement('img');clone.src='/assets/card_back.webp';clone.className='flying-card';clone.style.left=`${sr.left+sr.width/2-40}px`;clone.style.top=`${sr.top+sr.height/2-56}px`;document.body.append(clone);d.style.opacity='0';requestAnimationFrame(()=>{clone.style.transform=`translate(${tr.left+tr.width/2-(sr.left+sr.width/2)}px,${tr.top+tr.height/2-(sr.top+sr.height/2)}px) rotate(${e.playerId===myId?-10:10}deg) scale(.9)`;clone.style.opacity='.25'});setTimeout(()=>{clone.remove();d.style.opacity='1'},560)}beep(340,.06)}
function revealCards(e){
  lastReveal=e.entries;const t=$('#tableCards');
  e.entries.forEach((x,i)=>{
    let d=t.querySelector(`[data-player-id="${x.pid}"]`);
    if(!d){d=document.createElement('div');t.append(d)}
    d.className='played-card reveal-flip';d.dataset.playerId=x.pid;d.style.animationDelay=`${i*.07}s`;
    d.innerHTML=`<div class="card-flip-inner"><div class="card-face card-front-face"><img src="${x.card.image}" alt="${escapeHtml(x.card.name)}"><span class="value">${x.value}${x.bonus?` (+${x.bonus})`:''}</span></div></div><div class="who">${escapeHtml(x.name)}</div>`;bindCardInspector(d,x.card);
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
function tieAlertSound(){
  tone(210,.18,.07,'sawtooth');
  tone(315,.22,.06,'triangle',.08);
  tone(520,.28,.055,'sine',.18);
  setTimeout(()=>diceRollSound(),320);
}
function hideTieAlert(){
  const o=$('#tieOverlay');if(!o)return;
  o.classList.remove('active');o.setAttribute('aria-hidden','true');
}
function setupDice(e,msg){
  $('#roundMessage').textContent=msg;
  const z=$('#diceZone');z.innerHTML='<div id="diceSpectacle" class="dice-spectacle"></div>';
  const involved=e.playerIds.includes(myId);
  const overlay=$('#tieOverlay'),btn=$('#tieRollBtn');
  if(overlay){
    $('#tieAlertTitle').textContent=msg.includes('nochmal')?'NOCHMAL GLEICHSTAND!':'GLEICHSTAND!';
    $('#tieAlertText').textContent=involved?'Deine Karte ist gleichauf – jetzt musst DU würfeln!':'Die stärksten Karten sind gleichauf. Das Würfelduell entscheidet.';
    btn.hidden=!involved;
    btn.disabled=false;
    btn.textContent='🎲 JETZT WÜRFELN';
    btn.onclick=involved?()=>{btn.disabled=true;btn.textContent='🎲 Würfelt …';socket.emit('rollDice');setTimeout(hideTieAlert,450)}:null;
    overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');
    tieAlertSound();
    if(!involved)setTimeout(hideTieAlert,2600);
  }
  if(involved){
    const b=document.createElement('button');b.type='button';b.className='dice-btn roll-trigger';b.textContent='🎲 Würfeln';
    b.addEventListener('click',()=>{b.disabled=true;hideTieAlert();socket.emit('rollDice')});z.append(b);
  }else{
    const w=document.createElement('div');w.className='dice-wait';w.textContent='Die betroffenen Spieler würfeln …';z.append(w);
  }
}
function diceTile(id,name){
  let d=document.querySelector(`.dice-result[data-player-id="${id}"]`);if(d)return d;
  const z=$('#diceSpectacle')||$('#diceZone');d=document.createElement('div');d.className='dice-result';d.dataset.playerId=id;d.innerHTML=`<strong>${escapeHtml(name||'Spieler')}</strong><span class="dice-face">⚄</span>`;z.prepend(d);return d;
}
function startDiceAnimation(e){hideTieAlert();
  const d=diceTile(e.playerId,e.name),face=d.querySelector('.dice-face');d.classList.add('rolling-live');
  let n=0;const faces=['⚀','⚁','⚂','⚃','⚄','⚅'];const timer=setInterval(()=>{face.textContent=faces[n++%6]},70);diceAnimations.set(e.playerId,timer);diceRollSound()
}
function stopDiceAnimation(e){
  const timer=diceAnimations.get(e.playerId);if(timer){clearInterval(timer);diceAnimations.delete(e.playerId)}
  const d=diceTile(e.playerId,e.name),face=d.querySelector('.dice-face');d.classList.remove('rolling-live');face.textContent=['⚀','⚁','⚂','⚃','⚄','⚅'][e.value-1];d.classList.add('dice-landed');toast(`${e.name} würfelt ${e.value}`);diceLandSound(e.value)
}

function showSpecialBurst(e){
  const effect=e.card?.effect||'',theme=specialTheme(effect);
  specialFxSound(effect);
  const icons={ice:'❄',fire:'☀',storm:'⚡',shadow:'☾',magic:'✦',impact:'✹',sparkle:'✨'};
  const overlay=document.createElement('div');
  overlay.className=`special-burst special-theme-${theme}`;
  overlay.innerHTML=`<div class="special-burst-card">
    <div class="magic-ring"></div><div class="special-fx-glyph">${icons[theme]||'✦'}</div>
    <img src="${e.card.image}" alt="">
    <strong>${escapeHtml(e.name)}</strong>
    <span>${e.card.useIcon||'✦'} ${escapeHtml(e.card.useLabel||'Spezialkarte')}</span>
    <small>${escapeHtml(e.card.text||'')}</small>
  </div>`;
  document.body.append(overlay);
  setTimeout(()=>overlay.classList.add('active'),20);
  setTimeout(()=>overlay.classList.add('fade'),1450);
  setTimeout(()=>overlay.remove(),2050);
}
socket.on('specialPlayed',showSpecialBurst);

let roundIntroTimer=null;
function categorySound(cat){
  if(cat==='strength'){tone(120,.18,.055,'square');tone(180,.16,.04,'triangle',.08)}
  else if(cat==='speed'){tone(620,.06,.04,'square');tone(980,.1,.045,'sine',.07)}
  else if(cat==='energy'){tone(250,.15,.04,'sawtooth');tone(500,.2,.035,'triangle',.1)}
  else {tone(520,.12,.04,'sine');tone(780,.18,.045,'sine',.08);tone(1040,.2,.035,'triangle',.18)}
}
function crystalSpinSound(){
  [0,.18,.39,.62,.88,1.16,1.47,1.80,2.14,2.47,2.73].forEach((t,i)=>{
    tone(760+i*23,.05,.012,'sine',t);
    if(i%2===0)tone(1140+i*17,.035,.007,'triangle',t+.025);
  });
}
function crystalLandSound(){
  tone(310,.11,.035,'triangle');
  tone(620,.24,.045,'sine',.05);
  tone(930,.32,.035,'sine',.12);
  tone(1240,.38,.022,'triangle',.18);
}

function ensureCategoryCrystalMarkup(){
  const overlay=$('#roundIntroOverlay');
  if(!overlay)return;
  if($('#roundCategoryCrystal')&&$('#categoryCrystalResult'))return;

  let card=overlay.querySelector('.round-intro-card');
  if(!card){
    card=document.createElement('div');
    card.className='round-intro-card category-crystal-stage';
    overlay.append(card);
  }
  card.classList.add('category-crystal-stage');
  card.innerHTML=`
    <span id="roundIntroRound">RUNDE 1</span>
    <div id="roundCategoryCrystal" class="category-crystal" aria-label="Kristall zieht die Kategorie">
      <div class="category-crystal-face crystal-face-strength"><span></span></div>
      <div class="category-crystal-face crystal-face-speed"><span></span></div>
      <div class="category-crystal-face crystal-face-energy"><span></span></div>
      <div class="category-crystal-face crystal-face-magic"><span></span></div>
      <div class="category-crystal-core"></div>
      <div class="category-crystal-glint"></div>
    </div>
    <div id="categoryCrystalResult" class="category-crystal-result" aria-live="polite">
      <b id="roundIntroIcon">⭐</b>
      <strong id="roundIntroLabel">MAGIE</strong>
    </div>
    <small class="category-crystal-hint">Der Kristall bestimmt die Kategorie …</small>`;
}

function showRoundIntro(e){
  stopCountdown();
  ensureCategoryCrystalMarkup();
  const o=$('#roundIntroOverlay');if(!o)return;
  if(roundIntroTimer){clearTimeout(roundIntroTimer);roundIntroTimer=null}

  const ui=CATEGORY_UI[e.category]||['✦',String(e.category||'KATEGORIE').toUpperCase()];
  $('#roundIntroRound').textContent=`RUNDE ${e.round||state?.round||1}`;

  // Das Ergebnis ist während der Drehung bewusst verborgen.
  $('#roundIntroIcon').textContent=e.icon||ui[0];
  $('#roundIntroLabel').textContent=e.label||ui[1];
  $('#categoryIcon').textContent='💎';
  $('#categoryText').textContent='Der Kristall wählt die Kategorie …';
  $('#roundMessage').textContent='';
  clearTable();
  stopSelectionTimer();

  o.className='round-intro-overlay category-crystal-overlay active category-'+(e.category||'magic');
  o.setAttribute('aria-hidden','false');

  const crystal=$('#roundCategoryCrystal');
  const result=$('#categoryCrystalResult');

  // Keine Kategorie-Symbole auf dem Kristall.
  crystal?.querySelectorAll('.category-crystal-face span,.category-crystal-face small')
    .forEach(el=>el.setAttribute('aria-hidden','true'));

  // Unterschiedliche natürliche Endlage je Kategorie, ohne dass eine Seite beschriftet ist.
  const endAngles={
    strength:'1512deg',
    speed:'1602deg',
    energy:'1692deg',
    magic:'1782deg'
  };
  crystal?.style.setProperty('--crystal-land-y',endAngles[e.category]||'1782deg');
  crystal?.style.setProperty('--crystal-land-x',({
    strength:'8deg',speed:'-6deg',energy:'5deg',magic:'-8deg'
  })[e.category]||'-8deg');

  crystal?.classList.remove('crystal-running');
  result?.classList.remove('show');
  void crystal?.offsetWidth;
  crystal?.classList.add('crystal-running');
  crystalSpinSound();

  // Erst NACH der vollständigen Drehung wird Symbol + Begriff eingeblendet.
  setTimeout(()=>{
    result?.classList.add('show');
    $('#categoryIcon').textContent=e.icon||ui[0];
    $('#categoryText').textContent=e.label||ui[1];
    crystalLandSound();
    categorySound(e.category);
    const cat=$('#category');
    if(cat){cat.classList.remove('category-pulse');void cat.offsetWidth;cat.classList.add('category-pulse')}
  },3050);

  roundIntroTimer=setTimeout(()=>{
    o.classList.remove('active');
    o.setAttribute('aria-hidden','true');
    crystal?.classList.remove('crystal-running');
    result?.classList.remove('show');
  },4100);
}

let countdownUiTimer=null,selectionUiTimer=null;
function countdownTickSound(n){
  const base=n===1?520:250+n*32;
  tone(base,.055,n===1?.075:.035,'square');
  if(n===1)tone(780,.16,.045,'triangle',.05);
}
function selectionTickSound(n){if(n<=5&&n>0)tone(180+n*12,.035,.018,'square')}
function countdownPortal(){
  let e=document.getElementById('absoluteCountdownPortal');
  if(!e){
    e=document.createElement('div');
    e.id='absoluteCountdownPortal';
    e.setAttribute('aria-live','assertive');
    // Direkt an BODY statt an einen Screen: Host und Gäste bekommen exakt dieselbe Ebene.
    document.body.appendChild(e);
  }
  return e;
}
function stopCountdown(){
  if(countdownUiTimer){clearTimeout(countdownUiTimer);countdownUiTimer=null}
  const e=countdownPortal();
  e.style.display='none';e.innerHTML='';e.className='';
  const legacy=$('#countdown');if(legacy)legacy.style.display='none';
}
function runCountdown(until){
  if(!until)return;
  if(countdownUiTimer){clearTimeout(countdownUiTimer);countdownUiTimer=null}
  const e=countdownPortal();
  const legacy=$('#countdown');if(legacy)legacy.style.display='none';
  let previous=null;
  const tick=()=>{
    const left=Math.ceil((until-Date.now())/1000);
    e.style.display='grid';
    e.className='absolute-countdown-portal';
    if(left<=0){
      e.innerHTML='<div class="absolute-countdown-core go"><span>⚔️</span><strong>LOS!</strong><small>Der Kampf beginnt</small></div>';
      tone(780,.12,.06,'triangle');tone(1040,.24,.05,'sine',.08);
      countdownUiTimer=setTimeout(stopCountdown,720);return;
    }
    if(left!==previous){
      previous=left;
      e.innerHTML=`<div class="absolute-countdown-core n${Math.max(1,Math.min(5,left))}"><small>KAMPF STARTET IN</small><strong>${left}</strong><span>⚔️ ALLE BEREIT ⚔️</span></div>`;
      countdownTickSound(left);
      const core=e.firstElementChild;
      core?.animate([{transform:'scale(.78)',opacity:.2},{transform:'scale(1.08)',opacity:1},{transform:'scale(1)',opacity:1}],{duration:430,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    countdownUiTimer=setTimeout(tick,80);
  };
  tick();
}
function stopSelectionTimer(){if(selectionUiTimer){clearInterval(selectionUiTimer);selectionUiTimer=null}const e=$('#selectionTimer');if(e)e.textContent=''}
function startSelectionTimer(deadline){
  stopSelectionTimer();if(!deadline)return;const e=$('#selectionTimer');if(!e)return;
  let previous=null;
  const tick=()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));e.textContent=left?`⏱ ${left} Sek.`:'';if(left!==previous){previous=left;selectionTickSound(left)}if(!left)stopSelectionTimer()};
  tick();selectionUiTimer=setInterval(tick,180)
}

socket.on('countdown',({seconds,until})=>{hideArenaReady();show('game');setMusicMode('game');ensureAudio();runCountdown(until||Date.now()+(seconds||5)*1000)});
socket.on('allReady',e=>{toast(e.message||'Alle sind bereit!');beep(880,.18)});
socket.on('roundIntro',showRoundIntro);
socket.on('roundStart',e=>{
  stopCountdown();
  const cat=$('#category');
  $('#categoryIcon').textContent=e.icon;
  $('#categoryText').textContent=e.label;
  if(cat){
    cat.classList.add('category-visible');
    cat.setAttribute('aria-label',`${e.label}`);
    cat.classList.remove('category-pulse');void cat.offsetWidth;cat.classList.add('category-pulse');
  }
  $('#roundMessage').textContent='Wähle deine beste Karte.';
  $('#diceZone').innerHTML='';
  startSelectionTimer(e.deadline);
  beep(760,.15);
});
socket.on('cardCommitted',addCommitGhost);
socket.on('playerSelected',()=>beep(300,.05));
socket.on('cardAccepted',()=>{$('#roundMessage').textContent='✓ Deine Karte liegt – warte auf die anderen.';beep(360,.06)});
socket.on('reveal',revealCards);
function noiseBurst(duration=.15,gain=.06,when=0){
  const ctx=ensureAudio.ctx;if(!ctx)return;const len=Math.max(1,Math.floor(ctx.sampleRate*duration));const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=b;g.gain.value=gain;src.connect(g);g.connect(ctx.destination);src.start(ctx.currentTime+when);
}
function finisherSound(type){
  ensureAudio();
  const hit=(when=0,pitch=95,gain=.075)=>{noiseBurst(.085,gain,when);tone(pitch,.09,gain*.7,'square',when)};
  if(type==='dragonfire'){tone(72,.7,.075,'sawtooth');tone(48,.9,.06,'triangle',.18);noiseBurst(1.05,.075,.45);[180,140,105].forEach((f,i)=>tone(f,.28,.045,'sawtooth',1.1+i*.18))}
  else if(type==='dissolve'){for(let i=0;i<12;i++)tone(1250-i*72,.16,.025,'sine',i*.105);noiseBurst(.32,.035,1.2)}
  else if(type==='starbarrage'){for(let i=0;i<9;i++){tone(760+i*82,.065,.04,'triangle',i*.14);if(i%3===2)hit(i*.14+.05,170,.035)}tone(1450,.25,.045,'sine',1.45)}
  else if(type==='gunshots'){[0,.34,.69,1.05].forEach((t,i)=>{hit(t,145-i*11,.105);tone(62,.16,.04,'triangle',t+.03)});noiseBurst(.28,.045,1.45)}
  else if(type==='flowerdevour'){[330,440,550,660,820].forEach((f,i)=>tone(f,.34,.035,'sine',i*.23));noiseBurst(.22,.025,1.2);tone(240,.45,.05,'triangle',1.45)}
  else if(type==='cakebites'){[0,.42,.84,1.26,1.68].forEach((t,i)=>{tone(92+i*7,.09,.075,'triangle',t);noiseBurst(.05,.04,t+.015)});tone(520,.18,.035,'sine',2.05)}
  else if(type==='loserplank'){[0,.54,1.08].forEach(t=>{hit(t,115,.11);tone(58,.22,.05,'triangle',t+.03)});tone(180,.32,.04,'sawtooth',1.55)}
  else if(type==='freeze'){for(let i=0;i<10;i++)tone(720+i*105,.11,.026,'sine',i*.13);noiseBurst(.24,.055,1.38);tone(220,.5,.05,'triangle',1.5)}
  else if(type==='lightningstorm'){[0,.28,.6,1.02,1.35].forEach((t,i)=>{noiseBurst(.11,.09,t);tone(1550+i*90,.055,.038,'square',t)});tone(70,.75,.055,'sawtooth',1.55)}
  else if(type==='portalvoid'){for(let i=0;i<13;i++)tone(460-i*25,.18,.026,'sine',i*.1);noiseBurst(.35,.04,1.1);tone(52,.8,.06,'sawtooth',1.35)}
  else if(type==='crystalburst'){[720,900,1120,1360,1640].forEach((f,i)=>tone(f,.2,.035,'triangle',i*.18));noiseBurst(.2,.075,.92);tone(1820,.2,.04,'sine',1.05)}
  else if(type==='shadowchains'){[140,112,88,70].forEach((f,i)=>tone(f,.48,.055,'sawtooth',i*.26));[.38,.76,1.12].forEach(t=>hit(t,85,.045));noiseBurst(.25,.04,1.45)}
  else if(type==='paintbomb'){[0,.32,.64,.96,1.28].forEach((t,i)=>{tone(180+i*55,.08,.045,'triangle',t);noiseBurst(.09,.075,t+.03)});tone(620,.22,.04,'sine',1.55)}
  else if(type==='stickerstorm'){[420,540,670,820,980,1160].forEach((f,i)=>tone(f,.12,.028,'sine',i*.18));[.5,1.05,1.55].forEach(t=>hit(t,200,.03))}
  else if(type==='cometcrash'){for(let i=0;i<10;i++)tone(260+i*72,.08,.025,'sawtooth',i*.07);hit(.8,72,.13);noiseBurst(.42,.09,.82);tone(58,.7,.055,'triangle',.9)}
  else if(type==='magicseal'){[260,390,520,780,1040].forEach((f,i)=>tone(f,.24,.032,'sine',i*.22));tone(90,.55,.055,'triangle',1.35);noiseBurst(.18,.04,1.45)}
}
function finisherLabel(type){return ({dragonfire:'DRACHENFEUER',dissolve:'MAGISCHE AUFLÖSUNG',starbarrage:'STERNENREGEN',gunshots:'VOLLTREFFER',flowerdevour:'BLUMENFALLE',cakebites:'KUCHENHUNGER',loserplank:'LOSER-BRETT',freeze:'EISGEFÄNGNIS',lightningstorm:'BLITZSTURM',portalvoid:'PORTAL-SOG',crystalburst:'KRISTALL-BURST',shadowchains:'SCHATTENKETTEN',paintbomb:'FARB-BOMBE',stickerstorm:'STICKER-STURM',cometcrash:'KOMETEN-CRASH',magicseal:'MAGISCHES SIEGEL'})[type]||'FINISHER'}
function finisherMarkup(type){
  const map={
    dragonfire:'<span class="dragon-head">🐉</span><span class="dragon-eye"></span><span class="fire-wave"></span><span class="ember-cloud"></span>',
    dissolve:'<span class="dissolve-orb o1"></span><span class="dissolve-orb o2"></span><span class="dissolve-orb o3"></span><span class="dissolve-cloud">✦ ✧ ✦ ✧ ✦ ✧</span>',
    starbarrage:'<span class="star-shot s1">★</span><span class="star-shot s2">✦</span><span class="star-shot s3">★</span><span class="star-shot s4">✦</span><span class="star-shot s5">★</span><span class="star-explosion"></span>',
    gunshots:'<span class="muzzle m1"></span><span class="muzzle m2"></span><span class="muzzle m3"></span><span class="muzzle m4"></span><span class="bullet-hole h1"></span><span class="bullet-hole h2"></span><span class="bullet-hole h3"></span><span class="bullet-hole h4"></span><span class="smoke-puff"></span>',
    flowerdevour:'<span class="vine v1">🌿</span><span class="vine v2">🌺</span><span class="vine v3">🌿</span><span class="vine v4">🌸</span><span class="flower-maw">🌹</span><span class="petal-burst"></span>',
    cakebites:'<span class="cake-bite b1">🍰</span><span class="cake-bite b2">🧁</span><span class="cake-bite b3">🍰</span><span class="cake-bite b4">🧁</span><span class="crumb-cloud"></span>',
    loserplank:'<span class="loser-plank">LOSER</span><span class="hammer">🔨</span><span class="nail n1">●</span><span class="nail n2">●</span><span class="wood-splinter"></span>',
    freeze:'<span class="ice-spread"></span><span class="ice-crack c1"></span><span class="ice-crack c2"></span><span class="ice-crack c3"></span><span class="ice-spark">❄</span>',
    lightningstorm:'<span class="bolt b1">ϟ</span><span class="bolt b2">ϟ</span><span class="bolt b3">ϟ</span><span class="bolt b4">ϟ</span><span class="electric-ring"></span>',
    portalvoid:'<span class="portal-ring"></span><span class="portal-ring inner"></span><span class="portal-core"></span><span class="portal-dust"></span>',
    crystalburst:'<span class="crys c1">◆</span><span class="crys c2">◆</span><span class="crys c3">◆</span><span class="crys c4">◆</span><span class="crys c5">◆</span><span class="crystal-flash"></span>',
    shadowchains:'<span class="shadow-arm a1"></span><span class="shadow-arm a2"></span><span class="shadow-arm a3"></span><span class="shadow-chain">⛓</span><span class="shadow-eye">◉</span>',
    paintbomb:'<span class="paint-ball p1"></span><span class="paint-ball p2"></span><span class="paint-ball p3"></span><span class="paint-ball p4"></span><span class="paint-splat ps1"></span><span class="paint-splat ps2"></span><span class="paint-splat ps3"></span>',
    stickerstorm:'<span class="sticker st1">★</span><span class="sticker st2">♥</span><span class="sticker st3">✦</span><span class="sticker st4">☁</span><span class="sticker st5">⚡</span><span class="sticker st6">◆</span><span class="tape-strip t1"></span><span class="tape-strip t2"></span>',
    cometcrash:'<span class="comet"></span><span class="comet-tail"></span><span class="crater-ring"></span><span class="comet-shard cs1"></span><span class="comet-shard cs2"></span><span class="comet-shard cs3"></span>',
    magicseal:'<span class="seal-ring sr1"></span><span class="seal-ring sr2"></span><span class="seal-rune r1">✦</span><span class="seal-rune r2">◇</span><span class="seal-rune r3">☾</span><span class="seal-stamp">DEFEATED</span>'
  };return map[type]||map.dissolve;
}
function finisherTargetRect(winnerId){
  const target=winnerId===myId?$('#hand'):document.querySelector(`.opponent[data-player-id="${winnerId}"]`);
  if(!target)return {left:innerWidth/2,top:innerHeight-80,width:1,height:1};
  return target.getBoundingClientRect();
}
function flyFinisherCardsToWinner(winnerId){
  // Im neuen Spielsystem gehen die ausgespielten Karten zurück in den normalen Kartenkreislauf.
  const target=$('#normalDeckHud')||$('#tableCards');
  if(!target)return;
  const tr=target.getBoundingClientRect(),tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;
  document.querySelectorAll('#finisherOverlay .finisher-card-shell').forEach((el,i)=>{
    const r=el.getBoundingClientRect(),dx=tx-(r.left+r.width/2),dy=ty-(r.top+r.height/2);
    const from=getComputedStyle(el).transform==='none'?'translate(0,0) scale(1)':getComputedStyle(el).transform;
    el.animate([{transform:from,opacity:1},{transform:`translate(${dx}px,${dy}px) scale(.10) rotate(${i%2?30:-30}deg)`,opacity:.08}],
      {duration:850,delay:i*55,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
  });
  pulseDeck('normalDeckHud');cardShuffleSound();
}

function eraseCakeBite(ctx,w,h,b){
  ctx.save();
  ctx.globalCompositeOperation='destination-out';
  const base=Math.min(w,h);
  const r=base*(b.r||.16);
  // A bite is a cluster of round tooth marks, not a rectangle.
  const circles=[
    [b.x,b.y,r],
    [b.x + (b.dx||0)*r*.42,b.y-r*.58,r*.58],
    [b.x + (b.dx||0)*r*.42,b.y+r*.58,r*.58],
    [b.x + (b.dx||0)*r*.82,b.y-r*.18,r*.42],
    [b.x + (b.dx||0)*r*.82,b.y+r*.28,r*.38]
  ];
  for(const [x,y,rr] of circles){
    ctx.beginPath();ctx.arc(x,y,rr,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function popCakeCrumbs(shell,xPct,yPct,delay=0){
  const cloud=document.createElement('span');
  cloud.className='real-bite-crumbs';
  cloud.style.left=`${xPct}%`;
  cloud.style.top=`${yPct}%`;
  cloud.style.animationDelay=`${delay}ms`;
  cloud.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i>';
  shell.append(cloud);
  setTimeout(()=>cloud.remove(),900+delay);
}
function setupCakeBites(){
  const shells=[...document.querySelectorAll('#finisherOverlay .loser-card.finisher-cakebites')];
  shells.forEach((shell,shellIndex)=>{
    const img=shell.querySelector('.finisher-card-image');
    if(!img)return;
    const start=()=>{
      const w=img.naturalWidth||600,h=img.naturalHeight||840;
      const canvas=document.createElement('canvas');
      canvas.className='cake-bite-canvas';
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      try{ctx.drawImage(img,0,0,w,h)}catch(e){return}
      img.style.visibility='hidden';
      shell.insertBefore(canvas,shell.querySelector('.finisher-fx'));

      const bites=[
        {x:-w*.01,y:h*.18,r:.18,dx:1,xp:0,yp:18},
        {x:w*1.01,y:h*.34,r:.19,dx:-1,xp:100,yp:34},
        {x:-w*.01,y:h*.58,r:.20,dx:1,xp:0,yp:58},
        {x:w*1.01,y:h*.72,r:.20,dx:-1,xp:100,yp:72},
        {x:w*.45,y:-h*.01,r:.18,dx:0,xp:45,yp:0},
        {x:w*.54,y:h*1.01,r:.21,dx:0,xp:54,yp:100}
      ];
      bites.forEach((b,i)=>{
        setTimeout(()=>{
          eraseCakeBite(ctx,w,h,b);
          popCakeCrumbs(shell,b.xp,b.yp);
          // Each visible bite gets a soft chomp + crumb sound.
          tone(102+i*7,.075,.06,'triangle');
          noiseBurst(.055,.035,.01);
          canvas.classList.remove('bite-pulse');
          void canvas.offsetWidth;
          canvas.classList.add('bite-pulse');
        },380+i*520+shellIndex*80);
      });
      setTimeout(()=>canvas.classList.add('cake-final-crumble'),3650+shellIndex*80);
    };
    if(img.complete&&img.naturalWidth)start();
    else img.addEventListener('load',start,{once:true});
  });
}

function playFinisher(e){
  finisherSound(e.finisher);
  const overlay=$('#finisherOverlay'),winnerBox=$('#finisherWinner'),loserBox=$('#finisherLosers'),headline=$('#finisherHeadline'),impact=$('#finisherImpact');
  if(!overlay||!winnerBox||!loserBox)return animateCapture(e.winnerId);
  const winnerEntry=lastReveal.find(x=>x.pid===e.winnerId),losers=lastReveal.filter(x=>x.pid!==e.winnerId);
  headline.textContent=`${finisherLabel(e.finisher)}!`;
  winnerBox.innerHTML=winnerEntry?`<div class="finisher-card-shell winner-card"><span class="finisher-tag">🏆 ${escapeHtml(winnerEntry.name)}</span><img src="${winnerEntry.card.image}" alt="${escapeHtml(winnerEntry.card.name)}"></div>`:'';
  loserBox.innerHTML=losers.map((x,i)=>`<div class="finisher-card-shell loser-card finisher-${e.finisher}" style="--loser-index:${i}"><img class="finisher-card-image" src="${x.card.image}" alt="${escapeHtml(x.card.name)}"><div class="finisher-fx">${finisherMarkup(e.finisher)}</div></div>`).join('');
  impact.className='finisher-impact impact-'+e.finisher;
  overlay.className=`finisher-overlay active stage-${e.finisher}`;overlay.setAttribute('aria-hidden','false');document.body.classList.add('finisher-running');
  requestAnimationFrame(()=>{
    overlay.classList.add('play');
    if(e.finisher==='cakebites')setupCakeBites();
  });
  const duration=Math.max(4100,e.duration||4600);
  setTimeout(()=>impact.classList.add('boom'),900);
  setTimeout(()=>flyFinisherCardsToWinner(e.winnerId),duration-950);
  setTimeout(()=>{overlay.className='finisher-overlay';overlay.setAttribute('aria-hidden','true');winnerBox.innerHTML='';loserBox.innerHTML='';impact.className='finisher-impact';document.body.classList.remove('finisher-running');$('#tableCards').innerHTML='';},duration+80);
}

socket.on('playerGaveUp',e=>{toast(`🏳 ${e.name} hat aufgegeben und schaut jetzt zu.`);beep(180,.14)});
socket.on('roundWinner',e=>{stopSelectionTimer();$('#roundMessage').textContent=`🏆 ${e.winnerName} gewinnt die Runde!`;beep(1040,.22);playFinisher(e)});
socket.on('handRefill',e=>{
  pulseDeck('normalDeckHud');cardShuffleSound();
  const mine=(e.players||[]).find(p=>p.playerId===myId);
  if(mine?.cards?.length)toast(`♻ Deine normalen Karten werden auf ${e.target||6} aufgefüllt (+${mine.cards.length}).`);
  else toast('♻ Die normalen Hände werden automatisch aufgefüllt.');
});
socket.on('rewardDraw',e=>showRewardDraw(e));
socket.on('artifactFound',e=>{
  if(e.playerId===myId)toast(`💎 ${e.card.name} gefunden! ${e.collected}/${e.total} Artefakte.`);
  else toast(`💎 ${e.playerName} findet ${e.card.name}! (${e.collected}/${e.total})`);
  if(state)renderGame();
});
socket.on('rewardPhaseDone',e=>{
  $('#roundMessage').textContent=`✨ ${e.winnerName} hat seine Belohnung gezogen.`;
});
socket.on('roundTimeout',e=>{stopSelectionTimer();clearTable();const names=(e.penalties||[]).map(x=>x.name).join(', ');$('#roundMessage').textContent=names?`⏱ ${names} verliert eine Strafkarte. Neue Kategorie!`:'⏱ Zeit abgelaufen – neue Kategorie!';toast(e.message||'Zeit abgelaufen.');beep(190,.20)});
socket.on('tieStart',e=>setupDice(e,'Gleichstand! Würfeln entscheidet.'));
socket.on('tieAgain',e=>setupDice(e,'Schon wieder Gleichstand – nochmal würfeln!'));
socket.on('diceRolling',startDiceAnimation);
socket.on('diceRolled',stopDiceAnimation);
socket.on('gameOver',e=>{
  $('#roundMessage').textContent=`👑 ${e.winnerName} ist Champion!`;
  $('#gameOverTitle').textContent=`👑 ${e.winnerName} gewinnt!`;
  $('#gameOverText').textContent='Die Partie ist beendet. Jeder entscheidet selbst, wann er zurück in die Lobby geht. Es gibt keine zusätzliche Bestätigung. Sobald alle zurück sind, kann der Host direkt die nächste Runde vorbereiten.';
  pendingGift=e.winnerId===myId;$('#rewardBtn').style.display=pendingGift?'inline-block':'none';
  if(!$('#gameOverDialog').open)$('#gameOverDialog').showModal();
});
socket.on('postGameWaiting',e=>{
  waitingForLobbyReset=true;
  try{$('#gameOverDialog').close()}catch{}
  try{$('#giftDialog').close()}catch{}
  stopCountdown();
  stopSelectionTimer();
  hideTieAlert();
  clearTable();

  show('lobby');
  document.body.classList.remove('scene-game','scene-home');
  document.body.classList.add('scene-lobby');
  currentScreen='lobby';
  buildLobbyScene('crystal_cave');
  setMusicMode('lobby');

  if(state){
    if(!Array.isArray(state.postGameReady))state.postGameReady=[];
    if(!state.postGameReady.includes(myId))state.postGameReady.push(myId);
    renderPostGameLobby();
  }
  toast('Du bist zurück in der Lobby. Die anderen können ihr Ergebnis in Ruhe ansehen.');
});
socket.on('postGameReadyState',e=>{
  if(state)state.postGameReady=[...(e.ready||[])];
  if(waitingForLobbyReset){
    renderPostGameLobby();
  }
});
socket.on('backToLobby',()=>{waitingForLobbyReset=false;stopCountdown();stopSelectionTimer();hideTieAlert();try{$('#gameOverDialog').close()}catch{};try{$('#giftDialog').close()}catch{};clearTable();show('lobby');setMusicMode('lobby');if(state?.phase==='lobby')renderLobby();toast('Lobby ist bereit für die nächste Runde.')});
socket.on('roomLeft',()=>{waitingForLobbyReset=false;stopCountdown();stopSelectionTimer();hideTieAlert();state=null;hand=[];clearTable();renderHand();show('home');setMusicMode('lobby');toast('Du hast den Raum verlassen.')});
socket.on('specialTargetRequest',e=>showPlayerChoices(e.title,e.targets,id=>socket.emit('specialTargetChoice',{targetId:id})));
socket.on('specialCategoryRequest',e=>showCategoryChoices(e.title,e.categories,id=>socket.emit('specialCategoryChoice',{category:id})));
socket.on('specialCardRequest',e=>showChoices(e.title,e.cards,c=>socket.emit('specialCardChoice',{cardId:c.id})));
socket.on('forcedDiscardRequest',e=>showChoices(e.title,e.cards,c=>socket.emit('forcedDiscardChoice',{cardId:c.id})));
socket.on('extraNormalNeeded',e=>toast(`🌲 ${e.source}: Lege noch ${e.remaining} normale Karte${e.remaining===1?'':'n'}.`));
socket.on('bonusDraw',e=>{cardShuffleSound();toast(`🐲 ${e.source}: Du erhältst 1 zusätzliche normale Karte.`)});
socket.on('categoryOverride',e=>{
  toast(`🔔 ${e.source} bestimmt: ${e.icon} ${e.label}`);
  const cat=$('#category');if(cat)cat.innerHTML=`${e.icon} <strong>${escapeHtml(e.label)}</strong>`;
  specialFxSound('grogar');
});
socket.on('specialCopied',e=>toast(`♟ ${e.name} kopiert ${e.copied?.name||'eine Spezialkarte'}.`));
socket.on('playerSkipped',e=>toast(`⏸ ${e.name} setzt durch ${e.sourceName} diese Runde aus.`));
socket.on('specialBlocked',e=>{toast(`🛡 ${e.targetName} ist vor ${e.sourceName} geschützt.`);specialFxSound('sombra')});
socket.on('specialCleansed',e=>{toast(`🎩 ${e.name} hebt negative Spezialeffekte auf.`);specialFxSound('trixie')});
socket.on('specialImpact',e=>{
  (e.targetIds||[]).forEach(id=>{
    const target=document.querySelector(`.opponent[data-player-id="${id}"]`) || (id===myId?document.querySelector('.self-bar'):null);
    if(target){
      target.classList.remove('special-impact-hit');void target.offsetWidth;target.classList.add('special-impact-hit');
      setTimeout(()=>target.classList.remove('special-impact-hit'),900);
    }
  });
  if(e.text)toast(e.text);
});

socket.on('flutterChoices',e=>showChoices('Fluttershy: Welche Karte möchtest du behalten?',e.cards,c=>socket.emit('flutterKeep',{cardId:c.id})));
socket.on('rarityChoose',e=>showChoices('Rarity: Welche Karte möchtest du austauschen?',e.cards,c=>socket.emit('raritySwap',{cardId:c.id})));
function showChoices(title,cards,cb){$('#choiceTitle').textContent=title;const g=$('#choiceCards');g.innerHTML='';cards.forEach(c=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<img src="${c.image}" alt="${escapeHtml(c.name)}">`;b.addEventListener('click',()=>{$('#choiceDialog').close();cb(c)});g.append(b)});$('#choiceDialog').showModal()}

$('#giftBox').addEventListener('click',()=>{if(!pendingGift)return;pendingGift=false;const lockedItems=ITEM_KEYS.filter(x=>!STARTER_KEYS.includes(x)&&!unlocks.includes(x));const lockedFrames=FRAME_KEYS.filter(x=>!STARTER_FRAME_KEYS.includes(x)&&!frameUnlocks.includes(x));const kinds=[];if(lockedItems.length)kinds.push('item');if(lockedFrames.length)kinds.push('frame');$('#giftBox').style.display='none';if(!kinds.length){$('#giftResult').innerHTML='<div class="gift-item"><strong>Sammlung vollständig! ✨</strong><small>Du hast alle Items und Rahmen entdeckt.</small></div>';return;}const kind=kinds[Math.floor(Math.random()*kinds.length)];if(kind==='item'){const key=lockedItems[Math.floor(Math.random()*lockedItems.length)];unlocks.push(key);localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));const a=ITEMS[key];$('#giftResult').innerHTML=`<div class="gift-item"><span class="reward-type">✨ NEUES ITEM</span><span class="item-art"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><small>${a.desc||'Neues Namens-Item freigeschaltet.'}</small></div>`;}else{const key=lockedFrames[Math.floor(Math.random()*lockedFrames.length)];frameUnlocks.push(key);localStorage.setItem('cc_frame_unlocks',JSON.stringify(frameUnlocks));const a=FRAMES[key];$('#giftResult').innerHTML=`<div class="gift-item"><span class="reward-type">🖼 NEUER RAHMEN</span><span class="reward-frame"><img src="${a.image}" alt=""></span><strong>${a.name}</strong><small>Neuer Namensrahmen freigeschaltet.</small></div>`;}renderAccessoryGrid();specialSound();});


function leaveRoomNow(){ socket.emit('leaveRoom'); toast('Zurück zum Hauptmenü …'); }
$('#leaveLobbyBtn').addEventListener('click',leaveRoomNow);
$('#leaveGameBtn').addEventListener('click',leaveRoomNow);
$('#abortBtn').addEventListener('click',()=>{socket.emit('abortGame');toast('Zurück zur Lobby …')});
$('#returnLobbyBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};socket.emit('returnToLobby');toast('Zurück zur Lobby …')});
$('#gameOverHomeBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};socket.emit('leaveRoom')});
$('#closeGameOverBtn').addEventListener('click',()=>$('#gameOverDialog').close());
$('#rewardBtn').addEventListener('click',()=>{try{$('#gameOverDialog').close()}catch{};$('#giftResult').textContent='';$('#giftBox').style.display='inline-block';$('#giftDialog').showModal()});
$('#closeGiftBtn').addEventListener('click',()=>$('#giftDialog').close());
$('#giftDoneBtn').addEventListener('click',()=>$('#giftDialog').close());
document.querySelectorAll('.music-toggle').forEach(b=>b.addEventListener('click',()=>{ensureAudio();toggleMusic()}));
document.querySelectorAll('.music-volume').forEach(s=>s.addEventListener('input',e=>setMusicVolume(e.target.value)));
updateMusicUI();
updateHomePreview();
maybeShowStarterFrame();

let tutorialStep=0;
const tutorialSteps=[...document.querySelectorAll('.tutorial-step')];
let tutorialComplete=localStorage.getItem('cc_tutorial_complete')==='1';
function renderTutorialStep(){
  tutorialSteps.forEach((s,i)=>s.classList.toggle('active',i===tutorialStep));
  $('#tutorialStepCount').textContent=`${tutorialStep+1} / ${tutorialSteps.length}`;
  $('#tutorialProgressBar').style.width=`${((tutorialStep+1)/tutorialSteps.length)*100}%`;
  $('#tutorialPrevBtn').disabled=tutorialStep===0;
  const last=tutorialStep===tutorialSteps.length-1;
  $('#tutorialNextBtn').hidden=last;
  $('#tutorialTrainingBtn').hidden=!last;
  $('#tutorialBotBtn').hidden=!last;
  if(last){tutorialComplete=true;localStorage.setItem('cc_tutorial_complete','1')}
}
function openTutorial(){
  $('#trainingArea').hidden=true;$('#tutorialSlides').hidden=false;$('#tutorialNav').hidden=false;
  tutorialStep=0;renderTutorialStep();
  if(!$('#rulesDialog').open)$('#rulesDialog').showModal();
}
function closeTutorial(){try{$('#rulesDialog').close()}catch{} resetTraining()}
$('#rulesBtn')?.addEventListener('click',openTutorial);
$('#tutorialSkipBtn')?.addEventListener('click',closeTutorial);
$('#tutorialPrevBtn')?.addEventListener('click',()=>{tutorialStep=Math.max(0,tutorialStep-1);renderTutorialStep()});
$('#tutorialNextBtn')?.addEventListener('click',()=>{tutorialStep=Math.min(tutorialSteps.length-1,tutorialStep+1);renderTutorialStep()});
$('#tutorialTrainingBtn')?.addEventListener('click',startTraining);
$('#tutorialPracticeCtaBtn')?.addEventListener('click',startTraining);
$('#tutorialBotBtn')?.addEventListener('click',startBotTestRoom);
$('#trainingSkipBtn')?.addEventListener('click',()=>{resetTraining();closeTutorial()});


const PRACTICE_CATEGORIES=[
  {id:'strength',icon:'🏋️',label:'Stärke'},
  {id:'speed',icon:'⚡',label:'Schnelligkeit'},
  {id:'energy',icon:'🔋',label:'Energie'},
  {id:'magic',icon:'⭐',label:'Magie'}
];
const PRACTICE_HAND=[
  {id:'applejack',name:'Applejack',image:'/assets/cards/01_Applejack.webp',strength:9,speed:6,energy:8,magic:3},
  {id:'rainbow',name:'Rainbow Dash',image:'/assets/cards/02_Rainbow_Dash.webp',strength:6,speed:9,energy:8,magic:3},
  {id:'twilight',name:'Twilight Sparkle',image:'/assets/cards/03_Twilight_Sparkle.webp',strength:4,speed:6,energy:8,magic:9}
];
const PRACTICE_BOT={
  id:'rarity',name:'Rarity',image:'/assets/cards/06_Rarity.webp',
  strength:4,speed:5,energy:7,magic:8
};
const PRACTICE_SPECIAL={
  id:'ahuizotl',name:'Ahuizotl',image:'/assets/specials_new/89_Ahuizotl.png'
};

let practiceState=null;

function practiceCategory(){
  return PRACTICE_CATEGORIES[Math.floor(Math.random()*PRACTICE_CATEGORIES.length)];
}
function practiceValue(card,category){
  return Number(card?.[category]||0);
}
function setPracticeResult(html){
  const el=$('#trainingResult');if(el)el.innerHTML=html;
}
function practicePulse(selector){
  const el=document.querySelector(selector);if(!el)return;
  el.animate(
    [{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.08)',filter:'brightness(1.55)'},{transform:'scale(1)',filter:'brightness(1)'}],
    {duration:600,easing:'ease'}
  );
}
function startTraining(){
  $('#tutorialSlides').hidden=true;
  $('#tutorialNav').hidden=true;
  $('#trainingArea').hidden=false;
  const dialog=$('#rulesDialog');
  if(dialog)dialog.scrollTop=0;
  startPracticeRound();
}
function resetTraining(){
  practiceState=null;
  const a=$('#trainingArea');
  if(a)a.hidden=true;
}
function startPracticeRound(){
  const category=practiceCategory();
  practiceState={
    category,
    botCard:PRACTICE_BOT,
    botLaid:false,
    specialUsed:false,
    botPenalty:0,
    locked:false,
    won:false,
    rewardDrawn:false
  };

  $('#trainingTitle').textContent='Proberunde gegen PonyBot';
  $('#trainingText').textContent='PonyBot legt zuerst verdeckt. Sobald seine Karte liegt, kannst du Ahuizotl einsetzen oder direkt eine normale Karte wählen.';
  $('#trainingCategory').textContent=`${category.icon} ${category.label}`;
  $('#practicePlayerStatus').textContent='3 normale Karten · 1 Spezialkarte';
  $('#practiceBotStatus').textContent='überlegt …';
  $('#practiceBotCard').innerHTML='<img src="/assets/card_back.webp" alt="Verdeckte Gegnerkarte">';
  $('#trainingTable').innerHTML='<div class="practice-table-placeholder">Hier landen die gespielten Karten</div>';
  setPracticeResult('');
  renderPracticeHand();
  renderPracticeSpecial(false);

  // PonyBot behaves like in the real game: brief thinking time, then hidden card.
  setTimeout(()=>{
    if(!practiceState)return;
    practiceState.botLaid=true;
    $('#practiceBotStatus').textContent='✅ Karte liegt';
    const bot=$('#practiceBotCard');
    bot.classList.add('laid');
    bot.animate(
      [{transform:'translateY(-35px) scale(.85)',opacity:.4},{transform:'translateY(0) scale(1)',opacity:1}],
      {duration:550,easing:'cubic-bezier(.2,.8,.2,1)'}
    );
    beep(360,.08);
    renderPracticeSpecial(true);
    setPracticeResult('🤖 PonyBot hat verdeckt gelegt. Du bist dran.');
  },650);
}
function renderPracticeHand(){
  const g=$('#trainingChoices');if(!g)return;
  g.innerHTML='';
  for(const card of PRACTICE_HAND){
    const value=practiceValue(card,practiceState.category.id);
    const b=document.createElement('button');
    b.type='button';
    b.className='training-card practice-hand-card';
    b.innerHTML=`<img src="${card.image}" alt="${card.name}">
      <strong>${card.name}</strong>
      <span>${practiceState.category.icon} ${value}</span>`;
    b.addEventListener('click',()=>playPracticeCard(card,b));
    bindCardInspector(b,{name:card.name,image:card.image,type:'normal'});
    g.append(b);
  }
}
function renderPracticeSpecial(enabled){
  const zone=$('#practiceSpecialZone');if(!zone)return;
  zone.innerHTML='';
  if(practiceState?.specialUsed){
    zone.innerHTML='<div class="practice-special-used">✓ Ahuizotl wurde eingesetzt · PonyBots Wert erhält -2</div>';
    return;
  }
  const b=document.createElement('button');
  b.type='button';
  b.className='practice-special-button';
  b.disabled=!enabled||practiceState?.locked;
  b.innerHTML=`<img src="${PRACTICE_SPECIAL.image}" alt="Ahuizotl">
    <span><strong>Spezialkarte: Ahuizotl</strong><small>Nachdem der Gegner gelegt hat: Sein Wert sinkt um 2.</small></span>
    <b>${enabled?'Jetzt einsetzen':'Warte auf PonyBot …'}</b>`;
  b.addEventListener('click',usePracticeSpecial);
  bindCardInspector(b,{name:'Ahuizotl',image:PRACTICE_SPECIAL.image,type:'special'});
  zone.append(b);
}
function usePracticeSpecial(){
  if(!practiceState||!practiceState.botLaid||practiceState.locked||practiceState.specialUsed)return;
  practiceState.specialUsed=true;
  practiceState.botPenalty=-2;
  specialFxSound('ahuizotl');
  practicePulse('#practiceBotCard');
  renderPracticeSpecial(true);
  setPracticeResult('🗿 Ahuizotl aktiviert! PonyBots Kartenwert sinkt in dieser Runde um 2.');
}
function playPracticeCard(card,button){
  if(!practiceState||practiceState.locked)return;
  if(!practiceState.botLaid){
    beep(170,.1);
    setPracticeResult('PonyBot hat noch nicht gelegt. Warte einen kleinen Moment.');
    return;
  }
  practiceState.locked=true;
  [...document.querySelectorAll('.practice-hand-card')].forEach(x=>x.disabled=true);
  renderPracticeSpecial(false);

  const table=$('#trainingTable');
  table.innerHTML=`
    <div class="training-played practice-player-played"><img src="/assets/card_back.webp" alt="Deine verdeckte Karte"></div>
    <div class="practice-vs">VS</div>
    <div class="training-played practice-bot-played"><img src="/assets/card_back.webp" alt="PonyBots verdeckte Karte"></div>`;
  [...table.querySelectorAll('.training-played')].forEach((el,i)=>{
    el.animate(
      [{transform:`translate(${i?170:-170}px,100px) scale(.45)`,opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],
      {duration:650,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'}
    );
  });
  cardShuffleSound();
  setPracticeResult('🂠 Beide Karten liegen verdeckt … jetzt wird aufgedeckt.');

  setTimeout(()=>revealPracticeRound(card),900);
}
function revealPracticeRound(card){
  if(!practiceState)return;
  const cat=practiceState.category.id;
  const playerValue=practiceValue(card,cat);
  const botBase=practiceValue(practiceState.botCard,cat);
  const botValue=Math.max(0,botBase+practiceState.botPenalty);
  const table=$('#trainingTable');

  table.innerHTML=`
    <div class="practice-revealed-card">
      <img src="${card.image}" alt="${card.name}">
      <strong>${card.name}</strong>
      <span>${practiceState.category.icon} ${playerValue}</span>
    </div>
    <div class="practice-vs">VS</div>
    <div class="practice-revealed-card bot">
      <img src="${practiceState.botCard.image}" alt="${practiceState.botCard.name}">
      <strong>${practiceState.botCard.name}</strong>
      <span>${practiceState.category.icon} ${botValue}${practiceState.botPenalty?` <small>(${botBase} − 2)</small>`:''}</span>
    </div>`;
  [...table.querySelectorAll('.practice-revealed-card')].forEach(el=>el.animate(
    [{transform:'rotateY(90deg)',opacity:.25},{transform:'rotateY(0)',opacity:1}],
    {duration:550,easing:'ease-out'}
  ));
  specialSound();

  if(playerValue>botValue){
    practiceState.won=true;
    setPracticeResult(`🏆 Du gewinnst ${playerValue} zu ${botValue}! Jetzt siehst du, was nach einer echten Runde passiert.`);
    setTimeout(practiceRecycleAndRefill,1400);
  }else if(playerValue===botValue){
    setPracticeResult(`🎲 Gleichstand ${playerValue} zu ${botValue}! Im echten Spiel würdet ihr jetzt würfeln. Für die Proberunde würfeln wir automatisch …`);
    setTimeout(()=>practiceDice(card,playerValue,botValue),900);
  }else{
    practiceState.won=false;
    beep(170,.14);
    setPracticeResult(`🤖 PonyBot gewinnt ${botValue} zu ${playerValue}. Deine gespielte Karte würde trotzdem in den normalen Kartenkreislauf zurückgehen. Versuch die Proberunde nochmal und achte auf ${practiceState.category.label}.`);
    setTimeout(showPracticeRetry,700);
  }
}
function practiceDice(card,playerValue,botValue){
  const yourRoll=4+Math.floor(Math.random()*3);
  let botRoll=1+Math.floor(Math.random()*5);
  if(botRoll===yourRoll)botRoll=Math.max(1,yourRoll-1);
  $('#trainingTable').insertAdjacentHTML('beforeend',`<div class="practice-dice-result"><b>Du: 🎲 ${yourRoll}</b><b>PonyBot: 🎲 ${botRoll}</b></div>`);
  diceSound?.();
  if(yourRoll>botRoll){
    practiceState.won=true;
    setPracticeResult(`🎲 ${yourRoll} zu ${botRoll} – du gewinnst den Gleichstand!`);
    setTimeout(practiceRecycleAndRefill,1200);
  }else{
    practiceState.won=false;
    setPracticeResult(`🎲 ${yourRoll} zu ${botRoll} – PonyBot gewinnt den Gleichstand. Starte die Proberunde einfach erneut.`);
    setTimeout(showPracticeRetry,600);
  }
}
function practiceRecycleAndRefill(){
  if(!practiceState)return;
  cardShuffleSound();
  const table=$('#trainingTable');
  table.innerHTML=`
    <div class="practice-cycle-demo">
      <div><img src="/assets/card_back.webp" alt=""><strong>♻ Gespielte normale Karten</strong><small>gehen zurück in den Kartenkreislauf</small></div>
      <span>➜</span>
      <div><b>6</b><strong>Normale Karten</strong><small>werden automatisch wieder aufgefüllt</small></div>
    </div>`;
  practicePulse('.practice-deck.normal');
  $('#practicePlayerStatus').textContent='Normale Hand wird automatisch aufgefüllt';
  setPracticeResult('♻ Genau: Nach der Runde werden normale Karten automatisch wieder aufgefüllt. Als Rundensieger darfst du jetzt zusätzlich aus dem Goldstapel ziehen.');

  setTimeout(showPracticeGoldDraw,1000);
}
function showPracticeGoldDraw(){
  if(!practiceState)return;
  const g=$('#trainingChoices');
  g.innerHTML=`
    <button id="practiceGoldDrawBtn" class="training-gold-deck practice-gold-draw" type="button">
      <img src="/assets/special_back_gold.png" alt="Goldstapel">
      <strong>Goldstapel ziehen</strong>
      <small>Nur der Rundensieger zieht hier</small>
    </button>`;
  $('#practiceSpecialZone').innerHTML='<div class="practice-special-used">Spezialkarten werden nicht automatisch ersetzt.</div>';
  $('#practiceGoldDrawBtn').addEventListener('click',drawPracticeReward);
}
function drawPracticeReward(){
  if(!practiceState||practiceState.rewardDrawn)return;
  practiceState.rewardDrawn=true;
  rewardChime();
  $('#trainingChoices').innerHTML='';
  $('#trainingTable').innerHTML=`
    <div class="training-reward-flip practice-reward-flip">
      <div class="training-reward-inner">
        <img class="training-reward-back" src="/assets/special_back_gold.png" alt="Goldene Rückseite">
        <img class="training-reward-front" src="/assets/artifacts/02_Kristall_Herz.png" alt="Kristall Herz">
      </div>
    </div>`;
  setTimeout(()=>document.querySelector('.practice-reward-flip')?.classList.add('flipped'),300);
  setTimeout(()=>{
    artifactFanfare();
    $('#practicePlayerStatus').textContent='💎 1 / 3 Artefakte';
    $('#trainingTable').insertAdjacentHTML('beforeend',`
      <div class="training-artifact-row">
        <img src="/assets/artifacts/01_Elemente_der_Harmonie.png" alt="Elemente der Harmonie">
        <img class="found" src="/assets/artifacts/02_Kristall_Herz.png" alt="Kristall Herz">
        <img src="/assets/artifacts/03_Star_Swirls_Tagebuch.png" alt="Star Swirls Tagebuch">
        <small>Kristall Herz gefunden · 1 / 3</small>
      </div>`);
    setPracticeResult('<strong>💎 Kristall Herz gefunden!</strong><br>So läuft eine echte Runde: Kategorie → verdeckt legen → Spezialkarte möglich → aufdecken → normale Karten auffüllen → Sieger zieht aus dem Goldstapel.');
    showPracticeFinishActions();
  },1050);
}
function showPracticeRetry(){
  const g=$('#trainingChoices');
  g.innerHTML=`<button id="practiceRetryBtn" class="primary-btn" type="button">↻ Proberunde nochmal spielen</button>`;
  $('#practiceSpecialZone').innerHTML='';
  $('#practiceRetryBtn').addEventListener('click',startPracticeRound);
}
function showPracticeFinishActions(){
  const g=$('#trainingChoices');
  g.innerHTML=`
    <div class="training-finish-actions">
      <button id="practiceAgainBtn" class="primary-btn" type="button">↻ Noch eine Proberunde</button>
      <button id="practiceRealBotBtn" class="primary-btn" type="button">🤖 Echtes Match gegen PonyBot</button>
      <button id="practiceDoneBtn" class="soft-btn" type="button">Tutorial schließen</button>
    </div>`;
  $('#practiceAgainBtn').addEventListener('click',startPracticeRound);
  $('#practiceRealBotBtn').addEventListener('click',startBotTestRoom);
  $('#practiceDoneBtn').addEventListener('click',closeTutorial);
}


$('#cardInspectClose')?.addEventListener('click',closeCardInspect);
$('#cardInspectOverlay')?.addEventListener('click',e=>{if(e.target.id==='cardInspectOverlay')closeCardInspect()});
$('#cardInspectStage')?.addEventListener('contextmenu',e=>e.preventDefault());
$('#cardInspectStage')?.addEventListener('mousedown',e=>{if(e.button!==2)return;e.preventDefault();inspectDragging=true;inspectLastX=e.clientX;inspectLastY=e.clientY;document.body.classList.add('inspecting-card')});
window.addEventListener('mousemove',e=>{if(!inspectDragging)return;inspectRotationY+=(e.clientX-inspectLastX)*.75;inspectRotationX=Math.max(-55,Math.min(55,inspectRotationX-(e.clientY-inspectLastY)*.45));inspectLastX=e.clientX;inspectLastY=e.clientY;applyInspectRotation()});
window.addEventListener('mouseup',e=>{if(e.button===2){inspectDragging=false;document.body.classList.remove('inspecting-card')}});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#cardInspectOverlay')?.classList.contains('open'))closeCardInspect()});


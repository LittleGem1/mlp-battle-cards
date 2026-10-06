const socket=io();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={home:$('#home'),lobby:$('#lobby'),game:$('#game')};
const ACCESSORIES={
  changeling:{icon:'🦋',name:'Changeling-Flügel'},balloon:{icon:'🎈',name:'Ballon'},candy:{icon:'🍬',name:'Süßigkeiten'},
  catears:{icon:'🐱',name:'Katzenohren'},crown:{icon:'👑',name:'Krone'},gem:{icon:'💎',name:'Kristall'},moon:{icon:'🌙',name:'Mond'},star:{icon:'🌟',name:'Stern'},cupcake:{icon:'🧁',name:'Cupcake'},rainbow:{icon:'🌈',name:'Regenbogen'},lightning:{icon:'⚡',name:'Blitz'},flower:{icon:'🌸',name:'Blüte'},heart:{icon:'💖',name:'Glitzerherz'},glasses:{icon:'🕶️',name:'Coole Brille'}
};
let state=null, hand=[], myId=null, selectedAccessory=localStorage.getItem('cc_accessory')||'', unlocks=JSON.parse(localStorage.getItem('cc_unlocks')||'[]');
let pendingGift=false, lastReveal=[];
const playerName=$('#playerName'); playerName.value=localStorage.getItem('cc_name')||'';

function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active')}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),2600)}
function remember(){const n=playerName.value.trim();if(n)localStorage.setItem('cc_name',n)}
function ensureStarter(){
  if(selectedAccessory)return true;
  const d=$('#starterDialog');d.showModal();return false;
}
$$('.starter-grid button').forEach(b=>b.addEventListener('click',()=>{selectedAccessory=b.value;unlocks=[b.value];localStorage.setItem('cc_accessory',b.value);localStorage.setItem('cc_unlocks',JSON.stringify(unlocks));$('#starterDialog').close();renderAccessoryGrid()}));
function renderAccessoryGrid(){const g=$('#accessoryGrid');g.innerHTML='';for(const key of unlocks){const a=ACCESSORIES[key];if(!a)continue;const b=document.createElement('button');b.type='button';b.innerHTML=`${a.icon}<span>${a.name}</span>`;if(key===selectedAccessory)b.style.outline='2px solid #6ee7ff';b.addEventListener('click',()=>{selectedAccessory=key;localStorage.setItem('cc_accessory',key);renderAccessoryGrid(); if(state) $('#selfAccessory').textContent=a.icon;});g.append(b)}}
$('#accessoryBtn').addEventListener('click',()=>{if(!ensureStarter())return;renderAccessoryGrid();$('#accessoryDialog').showModal()});

$('#createBtn').addEventListener('click',()=>{if(!ensureStarter())return;const name=playerName.value.trim();if(!name)return toast('Bitte zuerst einen Namen eingeben.');remember();socket.emit('createRoom',{name,accessory:selectedAccessory})});
$('#joinBtn').addEventListener('click',()=>{if(!ensureStarter())return;const name=playerName.value.trim(),code=$('#roomCode').value.trim();if(!name||!code)return toast('Name und Raumcode eingeben.');remember();socket.emit('joinRoom',{name,code,accessory:selectedAccessory})});
$('#startBtn').addEventListener('click',()=>socket.emit('startGame'));

socket.on('connect',()=>{myId=socket.id;if(!selectedAccessory)setTimeout(ensureStarter,200)});
socket.on('errorMsg',toast);socket.on('notice',toast);socket.on('specialDone',e=>toast(e.text));
socket.on('roomState',s=>{state=s;if(s.phase==='lobby'){show('lobby');renderLobby()}else{show('game');renderGame()}});
socket.on('hand',h=>{hand=h;renderHand();if(state)renderGame()});

function accIcon(p){return ACCESSORIES[p.accessory]?.icon||'✦'}
function renderLobby(){
  $('#lobbyCode').textContent=state.code; $('#lobbyHint').textContent=state.players.length<2?'Schick den Code an deine Mitspieler.':'Bereit zum Start!';
  $('#lobbyPlayers').innerHTML=state.players.map(p=>`<div class="lobby-player"><div style="font-size:26px">${accIcon(p)}</div><strong>${escapeHtml(p.name)}</strong><div>${p.id===state.hostId?'Host 👑':'Mitspieler'}</div></div>`).join('');
  $('#startBtn').style.display=myId===state.hostId?'inline-block':'none'; $('#startBtn').disabled=state.players.length<2;
}
function escapeHtml(x){return String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function renderGame(){
  if(!state)return;const me=state.players.find(p=>p.id===myId);if(!me)return;
  $('#selfName').textContent=me.name;$('#selfAccessory').textContent=accIcon(me);$('#selfCount').textContent=`${me.handCount} Karten`;
  const others=state.players.filter(p=>p.id!==myId);
  $('#opponents').innerHTML=others.map(p=>`<div class="opponent"><div class="name-tag"><span>${accIcon(p)}</span><strong>${escapeHtml(p.name)}</strong><span>${p.handCount}</span>${p.selected?'✓':''}</div><div class="back-fan">${Array.from({length:Math.min(p.handCount,7)},(_,i)=>`<img src="/assets/card_back.webp" alt="verdeckte Karte" style="transform:rotate(${(i-3)*5}deg)">`).join('')}</div></div>`).join('');
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

$('#giftBox').addEventListener('click',()=>{if(!pendingGift)return;pendingGift=false;const locked=Object.keys(ACCESSORIES).filter(x=>!unlocks.includes(x));const key=locked.length?locked[Math.floor(Math.random()*locked.length)]:Object.keys(ACCESSORIES)[Math.floor(Math.random()*Object.keys(ACCESSORIES).length)];if(!unlocks.includes(key)){unlocks.push(key);localStorage.setItem('cc_unlocks',JSON.stringify(unlocks))}const a=ACCESSORIES[key];$('#giftBox').style.display='none';$('#giftResult').innerHTML=`${a.icon}<br>${a.name}`;renderAccessoryGrid();beep(1200,.35)});

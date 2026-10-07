const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { normal, specials, artifacts, byId } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const CATEGORIES = ['strength','speed','energy','magic'];
const CATEGORY_LABEL = { strength:'Stärke', speed:'Schnelligkeit', energy:'Energie', magic:'Magie' };
const CATEGORY_ICON = { strength:'🏋️', speed:'⚡', energy:'🔋', magic:'⭐' };
const NORMAL_HAND_TARGET = 6;
const NORMAL_COPIES = 3;
const REWARD_SPECIAL_COPIES = 8;
const REWARD_ARTIFACT_COPIES = 8;

function code(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join(''); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function roomPlayers(r){ return [...r.players.values()]; }
function getRoom(socket){ return socket.data.room ? rooms.get(socket.data.room) : null; }
function hasNormalCard(p){ return p.hand.some(id=>byId[id]?.type==='normal'); }
function activePlayers(r){ return roomPlayers(r).filter(p=>!p.surrendered); }

function clearTimers(r){
  for(const key of ['roundTimer','selectionTimer','countdownTimer','readyTimer']){
    if(r[key]){clearTimeout(r[key]);r[key]=null;}
  }
  r.selectionDeadline=null;
  r.countdownUntil=null;
}
function publicState(r){
  return {
    code:r.code,hostId:r.hostId,phase:r.phase,category:r.category,round:r.round,
    countdownUntil:r.countdownUntil||null,selectionDeadline:r.selectionDeadline||null,roundIntroUntil:r.roundIntroUntil||null,
    arenaId:r.arenaId||null,postGameReady:[...(r.postGameReady||new Set())],
    deckCounts:{normal:(r.normalDeck||[]).length,reward:(r.rewardDeck||[]).length},
    players:roomPlayers(r).map(p=>({
      id:p.id,name:p.name,accessory:p.accessory,frame:p.frame||'',handCount:p.hand.length,
      normalCount:p.hand.filter(id=>byId[id]?.type==='normal').length,
      specialCount:p.hand.filter(id=>byId[id]?.type==='special').length,
      artifacts:(p.artifacts||[]).map(id=>byId[id]).filter(Boolean),
      artifactCount:new Set(p.artifacts||[]).size,
      selected:!!p.selected,ready:!!p.ready,surrendered:!!p.surrendered,
      eliminated:!!p.surrendered,lastPlayedCardId:p.lastPlayedCardId||null
    }))
  };
}
function sendState(r){
  io.to(r.code).emit('roomState',publicState(r));
  for(const p of roomPlayers(r))io.to(p.id).emit('hand',p.hand.map(id=>byId[id]).filter(Boolean));
}
function buildNormalDeck(){
  const deck=[];
  for(let i=0;i<NORMAL_COPIES;i++)deck.push(...normal.map(c=>c.id));
  return shuffle(deck);
}
function buildRewardDeck(){
  const deck=[];
  for(let i=0;i<REWARD_SPECIAL_COPIES;i++)deck.push(...specials.map(c=>c.id));
  for(let i=0;i<REWARD_ARTIFACT_COPIES;i++)deck.push(...artifacts.map(c=>c.id));
  return shuffle(deck);
}
function initDecks(r){
  r.normalDeck=buildNormalDeck();
  r.normalDiscard=[];
  r.rewardDeck=buildRewardDeck();
  r.rewardDiscard=[];
}
function recycleNormalDeck(r){
  if(r.normalDeck.length)return;
  r.normalDeck=shuffle(r.normalDiscard.splice(0));
  if(!r.normalDeck.length)r.normalDeck=buildNormalDeck();
}
function recycleRewardDeck(r){
  if(r.rewardDeck.length)return;
  r.rewardDeck=shuffle(r.rewardDiscard.splice(0));
  if(!r.rewardDeck.length)r.rewardDeck=buildRewardDeck();
}
function drawNormal(r,count=1){
  const out=[];
  for(let i=0;i<count;i++){
    recycleNormalDeck(r);
    const id=r.normalDeck.pop();
    if(id)out.push(id);
  }
  return out;
}
function drawSpecialOnly(r){
  recycleRewardDeck(r);
  let idx=r.rewardDeck.findIndex(id=>byId[id]?.type==='special');
  if(idx<0){
    r.rewardDeck.push(...r.rewardDiscard.splice(0));
    r.rewardDeck=shuffle(r.rewardDeck);
    idx=r.rewardDeck.findIndex(id=>byId[id]?.type==='special');
  }
  if(idx<0)return null;
  return r.rewardDeck.splice(idx,1)[0];
}
function discardCard(r,id){
  const c=byId[id];
  if(!c)return;
  if(c.type==='normal')r.normalDiscard.push(id);
  else if(c.type==='special')r.rewardDiscard.push(id);
}
function refillNormalHands(r){
  const report=[];
  for(const p of roomPlayers(r)){
    if(p.surrendered)continue;
    const have=p.hand.filter(id=>byId[id]?.type==='normal').length;
    const need=Math.max(0,NORMAL_HAND_TARGET-have);
    const drawn=drawNormal(r,need);
    if(drawn.length){
      p.hand.push(...drawn);
      report.push({playerId:p.id,name:p.name,cards:drawn.map(id=>byId[id]).filter(Boolean)});
    }
  }
  if(report.length)io.to(r.code).emit('handRefill',{players:report,target:NORMAL_HAND_TARGET});
  return report;
}
function hasAllArtifacts(p){
  return new Set(p.artifacts||[]).size>=artifacts.length;
}
function drawRewardForWinner(r,winnerId){
  const p=r.players.get(winnerId);
  if(!p||p.surrendered)return null;
  const already=new Set(p.artifacts||[]);
  let attempts=0;
  while(attempts++<120){
    recycleRewardDeck(r);
    const id=r.rewardDeck.pop();
    if(!id)break;
    const card=byId[id];
    if(!card)continue;

    if(card.type==='artifact'){
      // Ein eigenes Duplikat zählt nicht doppelt und wird direkt zurückgemischt.
      if(already.has(card.id)){
        r.rewardDiscard.push(id);
        continue;
      }
      p.artifacts.push(card.id);
      io.to(r.code).emit('rewardDraw',{playerId:p.id,playerName:p.name,kind:'artifact',card});
      io.to(r.code).emit('artifactFound',{
        playerId:p.id,playerName:p.name,card,
        artifacts:p.artifacts.map(x=>byId[x]).filter(Boolean),
        collected:new Set(p.artifacts).size,total:artifacts.length
      });
      return card;
    }

    if(card.type==='special'){
      p.hand.push(id);
      io.to(p.id).emit('rewardDraw',{playerId:p.id,playerName:p.name,kind:'special',card});
      io.to(r.code).except(p.id).emit('rewardDraw',{playerId:p.id,playerName:p.name,kind:'special',card:null});
      return card;
    }
  }
  return null;
}
function nextCategory(r){
  if(!Array.isArray(r.categoryHistory)) r.categoryHistory=[];
  const previous=r.category;
  const last3=r.categoryHistory.slice(-3);
  const blocked=last3.length===3 && last3.every(c=>c===last3[0]) ? last3[0] : null;
  let choices=blocked ? CATEGORIES.filter(c=>c!==blocked) : [...CATEGORIES];

  // Nach einem Würfel-Gleichstand wird garantiert ein anderer Begriff gezogen.
  if(r.forceNextCategoryDifferent&&previous&&choices.length>1){
    const different=choices.filter(c=>c!==previous);
    if(different.length)choices=different;
  }
  r.forceNextCategoryDifferent=false;

  r.category=choices[Math.floor(Math.random()*choices.length)];
  r.categoryHistory.push(r.category);
  if(r.categoryHistory.length>3) r.categoryHistory=r.categoryHistory.slice(-3);
}
function requiredPlayers(r){ return (r.roundPlayerIds||[]).map(id=>r.players.get(id)).filter(p=>p&&!p.surrendered); }

function resetToLobby(r){
  clearTimers(r);
  r.phase='lobby';r.category=null;r.categoryHistory=[];r.roundIntroUntil=null;r.arenaId=null;r.readyLock=false;
  r.round=0;r.played={};r.dice={};r.tieIds=[];r.roundBuff={};r.roundPlayerIds=[];
  r.postGameReady=new Set();r.forceNextCategoryDifferent=false;
  r.normalDeck=[];r.normalDiscard=[];r.rewardDeck=[];r.rewardDiscard=[];
  for(const p of roomPlayers(r)){
    p.hand=[];p.artifacts=[];p.selected=null;p.lastPlayedCardId=null;p.ready=false;p.surrendered=false;
  }
  sendState(r);
  io.to(r.code).emit('backToLobby');
}
function removePlayerFromRoom(socket,notify=true){
  const r=getRoom(socket);if(!r)return;
  r.players.delete(socket.id);socket.leave(r.code);socket.data.room=null;socket.emit('roomLeft');
  if(!r.players.size){clearTimers(r);rooms.delete(r.code);return;}
  if(r.hostId===socket.id)r.hostId=roomPlayers(r)[0].id;
  r.roundPlayerIds=(r.roundPlayerIds||[]).filter(id=>id!==socket.id);
  if(notify)io.to(r.code).emit('notice','Ein Spieler hat den Raum verlassen.');
  sendState(r);
  if(r.phase==='select')maybeEvaluate(r);
  if(r.phase==='ready')maybeStartWhenReady(r);
  if(r.phase==='gameover'&&r.postGameReady&&roomPlayers(r).length&&roomPlayers(r).every(p=>r.postGameReady.has(p.id))){
    setTimeout(()=>{if(rooms.has(r.code)&&r.phase==='gameover')resetToLobby(r)},250);
  }
}
function maybeEvaluate(r){
  if(!r||r.phase!=='select')return;
  const req=requiredPlayers(r);
  if(req.length&&req.every(p=>p.selected)){
    if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;}
    r.selectionDeadline=null;
    evaluate(r);
  }
}
function endGame(r,champion,reason='artifacts'){
  if(!r||r.phase==='gameover'||!champion)return true;
  clearTimers(r);r.phase='gameover';r.postGameReady=new Set();
  io.to(r.code).emit('gameOver',{
    winnerId:champion.id,winnerName:champion.name,reason,
    artifacts:(champion.artifacts||[]).map(id=>byId[id]).filter(Boolean),
    counts:roomPlayers(r).map(p=>({
      id:p.id,name:p.name,count:p.hand.length,artifactCount:new Set(p.artifacts||[]).size
    }))
  });
  sendState(r);return true;
}
function gameOverIfNeeded(r){
  const artifactChampion=roomPlayers(r).find(p=>!p.surrendered&&hasAllArtifacts(p));
  if(artifactChampion)return endGame(r,artifactChampion,'artifacts');
  const alive=activePlayers(r);
  if(alive.length===1)return endGame(r,alive[0],'last-player');
  return false;
}
function handleSelectionTimeout(r){
  if(!r||r.phase!=='select')return;
  r.selectionTimer=null;r.selectionDeadline=null;
  const req=requiredPlayers(r),late=req.filter(p=>!p.selected);
  if(!late.length){maybeEvaluate(r);return;}

  for(const [pid,entry] of Object.entries(r.played)){
    const p=r.players.get(pid);
    if(p&&entry?.cardId&&!p.hand.includes(entry.cardId))p.hand.push(entry.cardId);
  }

  const penalties=[];
  for(const p of late){
    const normals=p.hand.filter(id=>byId[id]?.type==='normal');
    const pool=normals.length?normals:p.hand;
    if(!pool.length)continue;
    const lostId=pool[Math.floor(Math.random()*pool.length)];
    p.hand.splice(p.hand.indexOf(lostId),1);discardCard(r,lostId);
    penalties.push({playerId:p.id,name:p.name,card:byId[lostId]});
  }
  for(const p of req)p.selected=null;
  r.played={};r.roundBuff={};r.roundPlayerIds=[];
  io.to(r.code).emit('roundTimeout',{penalties,message:'Zeit abgelaufen! Der zu langsame Spieler verliert eine Strafkarte.'});
  sendState(r);
  if(gameOverIfNeeded(r))return;
  r.phase='result';refillNormalHands(r);sendState(r);startRound(r,1700);
}
function startRound(r,delay=900){
  if(r.roundTimer)clearTimeout(r.roundTimer);
  if(r.selectionTimer)clearTimeout(r.selectionTimer);
  r.roundTimer=setTimeout(()=>{
    if(!rooms.has(r.code))return;
    r.roundTimer=null;r.round++;r.phase='roundintro';r.played={};r.dice={};r.tieIds=[];r.roundBuff={};
    for(const p of roomPlayers(r))p.selected=null;
    nextCategory(r);
    r.roundPlayerIds=roomPlayers(r).filter(p=>!p.surrendered&&p.hand.length>0&&hasNormalCard(p)).map(p=>p.id);
    if(!r.roundPlayerIds.length){gameOverIfNeeded(r);return;}
    r.roundIntroUntil=Date.now()+3000;
    io.to(r.code).emit('roundIntro',{round:r.round,category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],until:r.roundIntroUntil});
    sendState(r);
    r.roundTimer=setTimeout(()=>{
      if(!rooms.has(r.code)||r.phase!=='roundintro')return;
      r.roundTimer=null;r.roundIntroUntil=null;r.phase='select';
      r.selectionDeadline=Date.now()+30000;
      io.to(r.code).emit('roundStart',{round:r.round,category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],deadline:r.selectionDeadline});
      sendState(r);
      r.selectionTimer=setTimeout(()=>handleSelectionTimeout(r),30050);
    },3000);
  },delay);
}
function finishRoundCycle(r,winnerId,playedIds){
  if(!r||r.phase==='gameover')return;
  const winner=r.players.get(winnerId);if(!winner)return;

  // Die gespielten normalen Karten gehen NICHT an den Sieger.
  // Sie wandern in den normalen Ablagestapel und können später wieder auftauchen.
  for(const id of playedIds)discardCard(r,id);
  r.played={};
  for(const p of roomPlayers(r))p.selected=null;

  refillNormalHands(r);
  sendState(r);

  setTimeout(()=>{
    if(!rooms.has(r.code)||r.phase==='gameover')return;
    const reward=drawRewardForWinner(r,winnerId);
    sendState(r);
    if(gameOverIfNeeded(r))return;
    io.to(r.code).emit('rewardPhaseDone',{
      winnerId,
      winnerName:winner.name,
      rewardKind:reward?.type||null
    });
    startRound(r,1800);
  },900);
}
const FINISHERS=['dragonfire','dissolve','starbarrage','gunshots','flowerdevour','cakebites','loserplank','freeze','lightningstorm','portalvoid','crystalburst','shadowchains','paintbomb','stickerstorm','cometcrash','magicseal'];
function pickFinisher(r){
  const choices=FINISHERS.filter(x=>x!==r.lastFinisher);
  const f=choices[Math.floor(Math.random()*choices.length)]||FINISHERS[0];
  r.lastFinisher=f;return f;
}
function settleRound(r,winnerId){
  const ids=Object.values(r.played).map(x=>x.cardId),winner=r.players.get(winnerId);if(!winner)return;
  r.phase='result';
  const finisher=pickFinisher(r),duration=4600;
  io.to(r.code).emit('roundWinner',{winnerId,winnerName:winner.name,cards:ids.map(id=>byId[id]).filter(Boolean),finisher,duration});
  sendState(r);
  setTimeout(()=>finishRoundCycle(r,winnerId,ids),duration+220);
}
function evaluate(r){
  if(r.phase!=='select')return;
  if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;}r.selectionDeadline=null;
  const vals=[];
  for(const [pid,e] of Object.entries(r.played)){
    const c=byId[e.cardId];if(!c)continue;
    const base=Math.min(9,Number(c[r.category]||0));let value=base;
    const buff=r.roundBuff[pid]||{};
    if(r.category==='speed'&&buff.speed)value+=buff.speed;
    if(r.category==='strength'&&buff.strength)value+=buff.strength;
    value=Math.min(9,value);
    vals.push({pid,cardId:c.id,value,base,bonus:Math.max(0,value-base)});
  }
  if(!vals.length){startRound(r,700);return;}
  const max=Math.max(...vals.map(x=>x.value)),tied=vals.filter(x=>x.value===max);
  r.phase='reveal';
  io.to(r.code).emit('reveal',{category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],entries:vals.map(x=>({...x,card:byId[x.cardId],name:r.players.get(x.pid)?.name||'?'}))});
  sendState(r);
  if(tied.length===1)setTimeout(()=>settleRound(r,tied[0].pid),2100);
  else setTimeout(()=>{r.phase='tie';r.tieIds=tied.map(x=>x.pid);r.dice={};io.to(r.code).emit('tieStart',{playerIds:r.tieIds,names:r.tieIds.map(id=>r.players.get(id)?.name)});sendState(r);},1700);
}
function drawFromPool(r,count,exclude=[],kind='any'){
  if(kind==='normal'||kind==='any')return drawNormal(r,count);
  if(kind==='special'){
    const out=[];
    for(let i=0;i<count;i++){const id=drawSpecialOnly(r);if(id)out.push(id);}
    return out;
  }
  return [];
}
function completeDiceRoll(r,pid){
  if(!r||r.phase!=='tie'||r.dice[pid]!=='rolling'||!r.tieIds.includes(pid))return;
  const value=1+Math.floor(Math.random()*6);r.dice[pid]=value;
  io.to(r.code).emit('diceRolled',{playerId:pid,name:r.players.get(pid)?.name,value});
  if(r.tieIds.every(id=>typeof r.dice[id]==='number')){
    const max=Math.max(...r.tieIds.map(id=>r.dice[id])),top=r.tieIds.filter(id=>r.dice[id]===max);
    if(top.length===1){
      r.forceNextCategoryDifferent=true;
      setTimeout(()=>settleRound(r,top[0]),1300);
    }
    else setTimeout(()=>{r.tieIds=top;r.dice={};io.to(r.code).emit('tieAgain',{playerIds:top,names:top.map(id=>r.players.get(id)?.name)});sendState(r);},1300);
  }
}

function beginMatch(r){
  if(!r||r.phase!=='ready'||r.players.size<2)return;
  clearTimers(r);
  if(!r.arenaId){
    const arenas=['crystal_colosseum','storm_temple','celestial_forge'];
    r.arenaId=arenas[Math.floor(Math.random()*arenas.length)];
  }
  const ps=roomPlayers(r);
  initDecks(r);

  for(const p of ps){
    p.hand=[];p.artifacts=[];p.selected=null;p.lastPlayedCardId=null;p.ready=false;p.surrendered=false;
    p.hand.push(...drawNormal(r,NORMAL_HAND_TARGET));
    const starterSpecial=drawSpecialOnly(r);
    if(starterSpecial)p.hand.push(starterSpecial);
  }

  r.categoryHistory=[];r.forceNextCategoryDifferent=false;r.phase='countdown';r.round=0;r.countdownUntil=Date.now()+5000;
  io.to(r.code).emit('matchLoadout',{
    normalCards:NORMAL_HAND_TARGET,
    specialCards:1,
    artifactGoal:artifacts.map(a=>({id:a.id,name:a.name,image:a.image}))
  });
  sendState(r);
  io.to(r.code).emit('countdown',{seconds:5,until:r.countdownUntil,arenaId:r.arenaId});
  r.countdownTimer=setTimeout(()=>{r.countdownTimer=null;r.countdownUntil=null;startRound(r,0);},5100);
}
function enterArenaReady(r){
  if(!r||r.phase!=='lobby'||r.players.size<2)return false;
  clearTimers(r);
  const arenas=['crystal_colosseum','storm_temple','celestial_forge'];
  r.arenaId=arenas[Math.floor(Math.random()*arenas.length)];
  r.phase='ready';
  r.readyLock=false;
  for(const p of roomPlayers(r)){p.ready=false;p.selected=null;}
  io.to(r.code).emit('arenaReadyPhase',{arenaId:r.arenaId});
  sendState(r);
  return true;
}
function maybeStartWhenReady(r){
  if(!r||r.phase!=='ready'||r.readyLock||r.players.size<2)return;
  if(roomPlayers(r).every(p=>p.ready)){
    r.readyLock=true;
    io.to(r.code).emit('allReady',{message:'Alle sind bereit! Der Kampf beginnt.'});
    sendState(r);
    r.readyTimer=setTimeout(()=>{r.readyTimer=null;r.readyLock=false;beginMatch(r)},850);
  }
}

io.on('connection',socket=>{
  socket.on('createRoom',({name,accessory,frame})=>{
    let c;do c=code();while(rooms.has(c));
    const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',category:null,categoryHistory:[],round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,selectionDeadline:null,countdownUntil:null,roundIntroUntil:null,arenaId:null,lastFinisher:null,readyLock:false,readyTimer:null,postGameReady:new Set(),forceNextCategoryDifferent:false,normalDeck:[],normalDiscard:[],rewardDeck:[],rewardDiscard:[]};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false});
    rooms.set(c,r);socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('joinRoom',({code:rc,name,accessory,frame})=>{
    const c=String(rc||'').trim().toUpperCase(),r=rooms.get(c);
    if(!r)return socket.emit('errorMsg','Raum nicht gefunden.');
    if(r.phase!=='lobby')return socket.emit('errorMsg','Die Partie läuft bereits.');
    if(r.players.size>=8)return socket.emit('errorMsg','Der Raum ist voll.');
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false});
    if(r.readyTimer){clearTimeout(r.readyTimer);r.readyTimer=null;r.readyLock=false;}
    for(const p of roomPlayers(r))p.ready=false;
    socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('setAccessory',({accessory})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!r||!['lobby','ready'].includes(r.phase)||!p)return;p.accessory=String(accessory||'changeling');sendState(r);});
  socket.on('setCosmetics',({accessory,frame})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!r||!['lobby','ready'].includes(r.phase)||!p)return;p.accessory=String(accessory||'changeling');p.frame=String(frame||'');sendState(r);});
  socket.on('toggleReady',()=>{
    const r=getRoom(socket),p=r?.players.get(socket.id);
    if(!r||r.phase!=='ready'||!p||r.readyLock)return;
    p.ready=!p.ready;
    sendState(r);
    maybeStartWhenReady(r);
  });
  socket.on('startGame',()=>{
    const r=getRoom(socket);
    if(!r||r.phase!=='lobby')return;
    if(r.hostId!==socket.id)return socket.emit('errorMsg','Nur der Host kann das Match vorbereiten.');
    if(r.players.size<2)return socket.emit('errorMsg','Mindestens 2 Spieler werden benötigt.');
    enterArenaReady(r);
  });
  socket.on('playCard',({cardId})=>{
    const r=getRoom(socket);if(!r||r.phase!=='select')return socket.emit('errorMsg','Gerade kann keine Karte gespielt werden.');
    if(!r.roundPlayerIds.includes(socket.id))return socket.emit('errorMsg','Du bist in dieser Runde nicht aktiv.');
    const p=r.players.get(socket.id),c=byId[cardId];
    if(p?.surrendered)return socket.emit('errorMsg','Du hast aufgegeben und schaust nur noch zu.');
    if(!p||!c||c.type!=='normal'||!p.hand.includes(cardId))return socket.emit('errorMsg','Diese Karte kann nicht gespielt werden.');
    if(p.selected)return socket.emit('errorMsg','Du hast bereits eine Karte gewählt.');
    if(p.lastPlayedCardId===cardId){
      const alt=p.hand.some(id=>id!==cardId&&byId[id]?.type==='normal');
      if(alt)return socket.emit('errorMsg','Diese Karte hast du gerade gespielt. Nimm diesmal eine andere.');
    }
    p.selected=cardId;p.lastPlayedCardId=cardId;p.hand.splice(p.hand.indexOf(cardId),1);r.played[socket.id]={cardId};
    io.to(r.code).emit('cardCommitted',{playerId:socket.id,name:p.name});
    io.to(r.code).emit('playerSelected',{playerId:socket.id,name:p.name});
    socket.emit('cardAccepted',{cardId});sendState(r);maybeEvaluate(r);
  });
  socket.on('useSpecial',({cardId})=>{
    const r=getRoom(socket);if(!r||r.phase!=='select')return socket.emit('errorMsg','Spezialkarten nur während der Auswahl.');
    const p=r.players.get(socket.id),c=byId[cardId];if(p?.surrendered)return socket.emit('errorMsg','Du hast aufgegeben und schaust nur noch zu.');if(!p||!c||c.type!=='special'||!p.hand.includes(cardId))return;
    if(p.selected)return socket.emit('errorMsg','Du hast schon eine normale Karte gelegt.');
    const consume=()=>{
      const i=p.hand.indexOf(cardId);
      if(i>=0){p.hand.splice(i,1);r.rewardDiscard.push(cardId);}
    };
    io.to(r.code).emit('specialPlayed',{playerId:p.id,name:p.name,card:c});
    if(c.effect==='rainbow'){if(r.category!=='speed')return socket.emit('errorMsg','Nur bei Schnelligkeit.');consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:2};socket.emit('specialDone',{text:'+2 Schnelligkeit.'});}
    else if(c.effect==='applejack'){if(r.category!=='strength')return socket.emit('errorMsg','Nur bei Stärke.');consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:1};socket.emit('specialDone',{text:'+1 Stärke.'});}
    else if(c.effect==='pinkie'){consume();const d=drawFromPool(r,1,[],'normal');p.hand.push(...d);socket.emit('specialDone',{text:d.length?'1 neue Karte gezogen.':'Keine freie Karte.'});}
    else if(c.effect==='twilight'){consume();const d=drawFromPool(r,2,[],'normal');p.hand.push(...d);socket.emit('specialDone',{text:`${d.length} neue Karten gezogen.`});}
    else if(c.effect==='fluttershy'){const d=drawFromPool(r,2,[],'normal');if(!d.length)return socket.emit('errorMsg','Keine freie Karte.');consume();socket.data.pendingFlutter={room:r.code,choices:d};socket.emit('flutterChoices',{cards:d.map(id=>byId[id])});}
    else if(c.effect==='rarity'){const candidates=p.hand.filter(id=>id!==cardId);if(!candidates.length)return socket.emit('errorMsg','Du brauchst eine weitere Karte.');consume();socket.data.pendingRarity={room:r.code};socket.emit('rarityChoose',{cards:p.hand.map(id=>byId[id])});}
    sendState(r);
  });
  socket.on('flutterKeep',({cardId})=>{const x=socket.data.pendingFlutter,r=getRoom(socket);if(!x||!r||x.room!==r.code||!x.choices.includes(cardId))return;const p=r.players.get(socket.id);
    const other=x.choices.filter(id=>id!==cardId);
    r.normalDiscard.push(...other);
    p.hand.push(cardId);socket.data.pendingFlutter=null;socket.emit('specialDone',{text:`${byId[cardId].name} behalten.`});sendState(r);});
  socket.on('raritySwap',({cardId})=>{const x=socket.data.pendingRarity,r=getRoom(socket);if(!x||!r||x.room!==r.code)return;const p=r.players.get(socket.id);if(!p.hand.includes(cardId))return;p.hand.splice(p.hand.indexOf(cardId),1);discardCard(r,cardId);const d=drawFromPool(r,1,[cardId],'normal');if(d.length)p.hand.push(d[0]);socket.data.pendingRarity=null;socket.emit('specialDone',{text:d.length?`${byId[cardId].name} getauscht.`:'Keine freie Karte.'});sendState(r);});

  socket.on('giveUp',()=>{
    const r=getRoom(socket),p=r?.players.get(socket.id);
    if(!r||!p)return socket.emit('errorMsg','Du bist in keinem laufenden Match.');
    if(!['countdown','roundintro','select'].includes(r.phase)){
      return socket.emit('errorMsg','Aufgeben ist vor dem Aufdecken einer Runde möglich.');
    }
    if(p.surrendered)return;
    if(activePlayers(r).length<=1)return socket.emit('errorMsg','Das Match ist bereits entschieden.');

    // Bereits gelegte Karte sauber zurücknehmen, damit die laufende Runde
    // ohne den aufgegebenen Spieler weiter ausgewertet werden kann.
    const entry=r.played[socket.id];
    if(entry?.cardId)discardCard(r,entry.cardId);
    delete r.played[socket.id];
    delete r.roundBuff[socket.id];
    delete r.dice[socket.id];

    p.selected=null;
    p.surrendered=true;
    r.roundPlayerIds=(r.roundPlayerIds||[]).filter(id=>id!==socket.id);
    r.tieIds=(r.tieIds||[]).filter(id=>id!==socket.id);

    io.to(r.code).emit('playerGaveUp',{playerId:p.id,name:p.name});
    sendState(r);

    if(gameOverIfNeeded(r))return;
    if(r.phase==='select')maybeEvaluate(r);
  });

  socket.on('rollDice',()=>{const r=getRoom(socket);if(!r||r.phase!=='tie'||!r.tieIds.includes(socket.id)||r.dice[socket.id]!==undefined)return;r.dice[socket.id]='rolling';io.to(r.code).emit('diceRolling',{playerId:socket.id,name:r.players.get(socket.id)?.name});setTimeout(()=>completeDiceRoll(r,socket.id),900);});
  socket.on('returnToLobby',()=>{
    const r=getRoom(socket);
    if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');
    if(r.phase!=='gameover')return socket.emit('errorMsg','Während einer laufenden Partie nutzt der Host bitte „Spiel abbrechen“.');
    if(!r.postGameReady)r.postGameReady=new Set();
    r.postGameReady.add(socket.id);
    socket.emit('postGameWaiting',{ready:r.postGameReady.size,total:r.players.size});
    io.to(r.code).emit('postGameReadyState',{ready:[...r.postGameReady],total:r.players.size});
    // Erst wenn wirklich ALLE selbst fertig sind, geht der gemeinsame Raum zurück in die Lobby.
    if(roomPlayers(r).every(p=>r.postGameReady.has(p.id))){
      if(rooms.has(r.code)&&r.phase==='gameover') resetToLobby(r);
    }
  });
  socket.on('abortGame',()=>{const r=getRoom(socket);if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');if(r.hostId!==socket.id)return socket.emit('errorMsg','Nur der Host kann abbrechen.');if(r.phase==='lobby')return;io.to(r.code).emit('notice','Die Partie wurde abgebrochen.');resetToLobby(r);});
  socket.on('leaveRoom',()=>removePlayerFromRoom(socket));
  socket.on('disconnect',()=>removePlayerFromRoom(socket,false));
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MLP Battle Cards läuft auf http://localhost:${PORT}`));

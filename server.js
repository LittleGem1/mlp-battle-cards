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
const REWARD_SPECIAL_COPIES = 2;
const REWARD_ARTIFACT_COPIES = 10;

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

function playedCardIds(entry){
  if(!entry)return [];
  if(Array.isArray(entry.cardIds))return entry.cardIds.filter(Boolean);
  return entry.cardId?[entry.cardId]:[];
}
function resetRoundFX(r){
  r.roundFX={
    skipped:[],forcedLose:[],protected:[],autoWinner:[],hydra:[],stormKing:[],doubleNormal:[],
    debuff:{},strengthDebuff:{},artifactBlocked:false
  };
  r.specialHistory=[];
}
function fxHas(r,key,id){return !!r.roundFX?.[key]?.includes(id)}
function fxAdd(r,key,id){
  if(!r.roundFX)resetRoundFX(r);
  if(!Array.isArray(r.roundFX[key]))r.roundFX[key]=[];
  if(!r.roundFX[key].includes(id))r.roundFX[key].push(id);
}
function fxRemove(r,key,id){
  if(Array.isArray(r.roundFX?.[key]))r.roundFX[key]=r.roundFX[key].filter(x=>x!==id);
}
function isProtectedFrom(r,targetId,sourceId){
  return targetId!==sourceId && fxHas(r,'protected',targetId);
}
function emitImpact(r,effect,targetIds,text){
  io.to(r.code).emit('specialImpact',{effect,targetIds:Array.isArray(targetIds)?targetIds:[targetIds],text});
}
function discardPlayedEntry(r,pid){
  const entry=r.played?.[pid];
  if(!entry)return;
  for(const id of playedCardIds(entry))discardCard(r,id);
  delete r.played[pid];
  const p=r.players.get(pid);if(p)p.selected=null;
}
function skipPlayerThisRound(r,targetId,sourceId,sourceName){
  const target=r.players.get(targetId);
  if(!target||target.surrendered)return false;
  if(isProtectedFrom(r,targetId,sourceId)){
    io.to(r.code).emit('specialBlocked',{targetId,targetName:target.name,sourceName});
    return false;
  }
  discardPlayedEntry(r,targetId);
  fxAdd(r,'skipped',targetId);
  r.roundPlayerIds=(r.roundPlayerIds||[]).filter(id=>id!==targetId);
  io.to(r.code).emit('playerSkipped',{playerId:targetId,name:target.name,sourceName});
  emitImpact(r,'skip',targetId,`${target.name} setzt diese Runde aus.`);
  return true;
}
function markForcedLose(r,targetId,sourceId,sourceName,effect='shadow'){
  const target=r.players.get(targetId);
  if(!target||target.surrendered)return false;
  if(isProtectedFrom(r,targetId,sourceId)){
    io.to(r.code).emit('specialBlocked',{targetId,targetName:target.name,sourceName});
    return false;
  }
  fxAdd(r,'forcedLose',targetId);
  emitImpact(r,effect,targetId,`${target.name}s Karte zählt diese Runde nicht.`);
  return true;
}
function addDebuff(r,targetId,amount,sourceId,sourceName,kind='generic'){
  const target=r.players.get(targetId);
  if(!target||target.surrendered)return false;
  if(isProtectedFrom(r,targetId,sourceId)){
    io.to(r.code).emit('specialBlocked',{targetId,targetName:target.name,sourceName});
    return false;
  }
  const field=kind==='strength'?'strengthDebuff':'debuff';
  if(!r.roundFX)resetRoundFX(r);
  r.roundFX[field][targetId]=(r.roundFX[field][targetId]||0)+amount;
  emitImpact(r,'debuff',targetId,`${target.name}: ${amount} auf den Kartenwert.`);
  return true;
}
function clearNegativeEffects(r,pid){
  const wasSkipped=fxHas(r,'skipped',pid);
  fxRemove(r,'skipped',pid);fxRemove(r,'forcedLose',pid);
  if(r.roundFX){delete r.roundFX.debuff[pid];delete r.roundFX.strengthDebuff[pid];}
  const p=r.players.get(pid);
  if(wasSkipped&&p&&!p.surrendered&&hasNormalCard(p)&&!r.roundPlayerIds.includes(pid))r.roundPlayerIds.push(pid);
  if(p?.pendingForcedDiscard){
    clearTimeout(p.pendingForcedDiscard.timer);
    p.pendingForcedDiscard=null;
  }
}
function availableTargets(r,p,mode='any'){
  return roomPlayers(r).filter(t=>{
    if(t.id===p.id||t.surrendered)return false;
    if(mode==='played'&&!playedCardIds(r.played?.[t.id]).length)return false;
    if(mode==='hand'&&!t.hand.length)return false;
    return true;
  });
}
function requestTarget(socket,r,p,sourceCard,action,mode='any',title='Wähle einen Gegner'){
  const targets=availableTargets(r,p,mode);
  if(!targets.length){socket.emit('errorMsg','Für diesen Effekt gibt es gerade kein gültiges Ziel.');return false;}
  socket.data.pendingSpecial={room:r.code,action,sourceCardId:sourceCard.id};
  socket.emit('specialTargetRequest',{title,card:sourceCard,targets:targets.map(t=>({id:t.id,name:t.name,selected:!!t.selected,handCount:t.hand.length}))});
  return true;
}
function consumeSpecial(r,p,c){
  const i=p.hand.indexOf(c.id);
  if(i<0)return false;
  p.hand.splice(i,1);r.rewardDiscard.push(c.id);
  p.specialUsed=(p.specialUsed||0)+1;
  r.specialHistory.push({playerId:p.id,cardId:c.id,effect:c.effect});
  io.to(r.code).emit('specialPlayed',{playerId:p.id,name:p.name,card:c});
  return true;
}
function specialAllowance(p){return 1+(p.specialExtra||0)}
function mayUseSpecial(p){return (p.specialUsed||0)<specialAllowance(p)}
function forceDiscardChoice(r,target,sourceName){
  if(!target||!target.hand.length)return;
  if(target.pendingForcedDiscard?.timer)clearTimeout(target.pendingForcedDiscard.timer);
  const token=`${Date.now()}-${Math.random()}`;
  const auto=()=>{
    if(!target.pendingForcedDiscard||target.pendingForcedDiscard.token!==token||!target.hand.length)return;
    const id=target.hand[Math.floor(Math.random()*target.hand.length)];
    target.hand.splice(target.hand.indexOf(id),1);discardCard(r,id);
    target.pendingForcedDiscard=null;
    io.to(target.id).emit('specialDone',{text:`${sourceName}: Eine Karte wurde automatisch abgelegt.`});
    emitImpact(r,'discard',target.id,`${target.name} legt 1 Karte ab.`);
    sendState(r);
  };
  const timer=setTimeout(auto,8000);
  target.pendingForcedDiscard={token,sourceName,timer};
  io.to(target.id).emit('forcedDiscardRequest',{title:`${sourceName}: Lege 1 Handkarte ab`,cards:target.hand.map(id=>byId[id]).filter(Boolean)});
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
      // Iron Will: In dieser Runde darf niemand ein Artefakt ziehen.
      if(r.roundFX?.artifactBlocked){
        r.rewardDiscard.push(id);
        continue;
      }
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

  if(r.forcedNextCategory&&CATEGORIES.includes(r.forcedNextCategory)){
    r.category=r.forcedNextCategory;
    r.forcedNextCategory=null;
    r.forceNextCategoryDifferent=false;
    r.categoryHistory.push(r.category);
    if(r.categoryHistory.length>3)r.categoryHistory=r.categoryHistory.slice(-3);
    return;
  }

  const last3=r.categoryHistory.slice(-3);
  const blocked=last3.length===3&&last3.every(c=>c===last3[0])?last3[0]:null;
  let choices=blocked?CATEGORIES.filter(c=>c!==blocked):[...CATEGORIES];
  if(r.forceNextCategoryDifferent&&previous&&choices.length>1){
    const different=choices.filter(c=>c!==previous);
    if(different.length)choices=different;
  }
  r.forceNextCategoryDifferent=false;
  r.category=choices[Math.floor(Math.random()*choices.length)];
  r.categoryHistory.push(r.category);
  if(r.categoryHistory.length>3)r.categoryHistory=r.categoryHistory.slice(-3);
}
function requiredPlayers(r){ return (r.roundPlayerIds||[]).map(id=>r.players.get(id)).filter(p=>p&&!p.surrendered); }

function resetToLobby(r){
  clearTimers(r);
  r.phase='lobby';r.category=null;r.categoryHistory=[];r.roundIntroUntil=null;r.arenaId=null;r.readyLock=false;
  r.round=0;r.played={};r.dice={};r.tieIds=[];r.roundBuff={};r.roundPlayerIds=[];
  r.postGameReady=new Set();r.forceNextCategoryDifferent=false;r.forcedNextCategory=null;resetRoundFX(r);
  r.normalDeck=[];r.normalDiscard=[];r.rewardDeck=[];r.rewardDiscard=[];
  for(const p of roomPlayers(r)){
    p.hand=[];p.artifacts=[];p.selected=null;p.lastPlayedCardId=null;p.ready=false;p.surrendered=false;p.specialUsed=0;p.specialExtra=0;p.pendingForcedDiscard=null;p.specialUsed=0;p.specialExtra=0;p.pendingForcedDiscard=null;
  }
  sendState(r);
  io.to(r.code).emit('backToLobby');
}
function removePlayerFromRoom(socket,notify=true){
  const r=getRoom(socket);if(!r)return;
  const leaving=r.players.get(socket.id);if(leaving?.pendingForcedDiscard?.timer)clearTimeout(leaving.pendingForcedDiscard.timer);
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
    if(!p)continue;
    for(const id of playedCardIds(entry))p.hand.push(id);
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
    r.roundTimer=null;r.round++;r.phase='roundintro';r.played={};r.dice={};r.tieIds=[];r.roundBuff={};resetRoundFX(r);
    for(const p of roomPlayers(r)){p.selected=null;p.specialUsed=0;p.specialExtra=0;}
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

  for(const id of playedIds)discardCard(r,id);
  r.played={};
  for(const p of roomPlayers(r))p.selected=null;

  refillNormalHands(r);

  // Hydra: Wer Hydra eingesetzt und die Runde NICHT gewonnen hat, erhält danach
  // zusätzlich 1 normale Karte. Diese kommt extra zur normalen Auffüllung dazu.
  for(const pid of (r.roundFX?.hydra||[])){
    if(pid===winnerId)continue;
    const p=r.players.get(pid);
    if(!p||p.surrendered)continue;
    const bonus=drawNormal(r,1);
    if(bonus.length){
      p.hand.push(...bonus);
      io.to(pid).emit('bonusDraw',{source:'Hydra',cards:bonus.map(id=>byId[id]).filter(Boolean)});
    }
  }
  sendState(r);

  setTimeout(()=>{
    if(!rooms.has(r.code)||r.phase==='gameover')return;
    const reward=drawRewardForWinner(r,winnerId);
    sendState(r);
    if(gameOverIfNeeded(r))return;
    io.to(r.code).emit('rewardPhaseDone',{winnerId,winnerName:winner.name,rewardKind:reward?.type||null});
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
  const ids=Object.values(r.played).flatMap(playedCardIds),winner=r.players.get(winnerId);if(!winner)return;
  r.phase='result';
  const finisher=pickFinisher(r),duration=4600;
  io.to(r.code).emit('roundWinner',{winnerId,winnerName:winner.name,cards:ids.map(id=>byId[id]).filter(Boolean),finisher,duration});
  sendState(r);
  setTimeout(()=>finishRoundCycle(r,winnerId,ids),duration+220);
}
function evaluate(r){
  if(r.phase!=='select')return;
  if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;}
  r.selectionDeadline=null;

  let vals=[];
  for(const [pid,e] of Object.entries(r.played)){
    const ids=playedCardIds(e),cards=ids.map(id=>byId[id]).filter(c=>c?.type==='normal');
    if(!cards.length)continue;

    // Timberwolves: Von den zwei gespielten normalen Karten zählt der höhere
    // Wert der aktuellen Kategorie. Beide Karten gehen danach in den Ablagestapel.
    let c=cards[0];
    for(const candidate of cards){
      if(Number(candidate[r.category]||0)>Number(c[r.category]||0))c=candidate;
    }

    const base=Math.min(9,Number(c[r.category]||0));
    let value=base;
    const buff=r.roundBuff[pid]||{};
    if(r.category==='speed'&&buff.speed)value+=buff.speed;
    if(r.category==='strength'&&buff.strength)value+=buff.strength;
    value+=(r.roundFX?.debuff?.[pid]||0);
    if(r.category==='strength')value+=(r.roundFX?.strengthDebuff?.[pid]||0);
    value=Math.max(0,value);

    vals.push({
      pid,cardId:c.id,value,base,bonus:value-base,cards:cards.map(x=>x.id),
      forcedLose:fxHas(r,'forcedLose',pid)
    });
  }

  if(!vals.length){startRound(r,700);return;}

  // Daybreaker: Nur Daybreaker-Nutzer mit einer gelegten normalen Karte können gewinnen.
  const auto=vals.filter(x=>fxHas(r,'autoWinner',x.pid)&&!x.forcedLose);
  let contenders=auto.length?auto:vals.filter(x=>!x.forcedLose);
  if(!contenders.length)contenders=vals;

  // Storm King: Nur bei Schnelligkeit und nur wenn er tatsächlich im höchsten
  // Gleichstand liegt, bekommt er +2 und kann den Gleichstand brechen.
  if(!auto.length&&r.category==='speed'){
    let top=Math.max(...contenders.map(x=>x.value));
    const initiallyTied=contenders.filter(x=>x.value===top);
    if(initiallyTied.length>1){
      for(const x of initiallyTied){
        if(fxHas(r,'stormKing',x.pid))x.value+=2;
      }
    }
  }

  const max=Math.max(...contenders.map(x=>x.value));
  const tied=contenders.filter(x=>x.value===max);

  r.phase='reveal';
  io.to(r.code).emit('reveal',{
    category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],
    entries:vals.map(x=>({...x,card:byId[x.cardId],name:r.players.get(x.pid)?.name||'?'}))
  });
  sendState(r);

  if(tied.length===1)setTimeout(()=>settleRound(r,tied[0].pid),2100);
  else setTimeout(()=>{
    r.phase='tie';r.tieIds=tied.map(x=>x.pid);r.dice={};
    io.to(r.code).emit('tieStart',{playerIds:r.tieIds,names:r.tieIds.map(id=>r.players.get(id)?.name)});
    sendState(r);
  },1700);
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

  r.categoryHistory=[];r.forceNextCategoryDifferent=false;r.forcedNextCategory=null;resetRoundFX(r);r.phase='countdown';r.round=0;r.countdownUntil=Date.now()+5000;
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
    const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',category:null,categoryHistory:[],round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,selectionDeadline:null,countdownUntil:null,roundIntroUntil:null,arenaId:null,lastFinisher:null,readyLock:false,readyTimer:null,postGameReady:new Set(),forceNextCategoryDifferent:false,forcedNextCategory:null,normalDeck:[],normalDiscard:[],rewardDeck:[],rewardDiscard:[],roundFX:null,specialHistory:[]};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false,specialUsed:0,specialExtra:0,pendingForcedDiscard:null});
    rooms.set(c,r);socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('joinRoom',({code:rc,name,accessory,frame})=>{
    const c=String(rc||'').trim().toUpperCase(),r=rooms.get(c);
    if(!r)return socket.emit('errorMsg','Raum nicht gefunden.');
    if(r.phase!=='lobby')return socket.emit('errorMsg','Die Partie läuft bereits.');
    if(r.players.size>=8)return socket.emit('errorMsg','Der Raum ist voll.');
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false,specialUsed:0,specialExtra:0,pendingForcedDiscard:null});
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
    if(p.selected)return socket.emit('errorMsg','Du hast bereits alle Karten für diese Runde gewählt.');

    const entry=r.played[socket.id]||{cardIds:[]};
    const needed=fxHas(r,'doubleNormal',p.id)?2:1;
    if(entry.cardIds.length>=needed)return socket.emit('errorMsg','Du hast bereits genug normale Karten gelegt.');

    if(p.lastPlayedCardId===cardId&&entry.cardIds.length===0){
      const alt=p.hand.some(id=>id!==cardId&&byId[id]?.type==='normal');
      if(alt)return socket.emit('errorMsg','Diese Karte hast du gerade gespielt. Nimm diesmal eine andere.');
    }

    p.hand.splice(p.hand.indexOf(cardId),1);
    entry.cardIds.push(cardId);entry.cardId=entry.cardIds[0];
    r.played[socket.id]=entry;
    socket.emit('cardAccepted',{cardId});
    io.to(r.code).emit('cardCommitted',{playerId:socket.id,name:p.name});

    if(entry.cardIds.length<needed){
      p.selected=false;
      socket.emit('extraNormalNeeded',{remaining:needed-entry.cardIds.length,source:'Timberwolves'});
      sendState(r);
      return;
    }

    p.selected=true;
    p.lastPlayedCardId=cardId;
    io.to(r.code).emit('playerSelected',{playerId:socket.id,name:p.name});
    sendState(r);maybeEvaluate(r);
  });
  socket.on('useSpecial',({cardId})=>{
    const r=getRoom(socket);
    if(!r||r.phase!=='select')return socket.emit('errorMsg','Spezialkarten nur während der Auswahl.');
    const p=r.players.get(socket.id),source=byId[cardId];
    if(p?.surrendered)return socket.emit('errorMsg','Du hast aufgegeben und schaust nur noch zu.');
    if(!p||!source||source.type!=='special'||!p.hand.includes(cardId))return;
    if(p.selected)return socket.emit('errorMsg','Du hast schon deine normale Karte vollständig gelegt.');
    if(socket.data.pendingSpecial)return socket.emit('errorMsg','Beende zuerst die aktuelle Spezialkarten-Auswahl.');
    if(!mayUseSpecial(p))return socket.emit('errorMsg','Du kannst in dieser Runde nur 1 Spezialkarte einsetzen. Changeling erlaubt eine zusätzliche.');

    let effectCard=source;

    // Chrysalis kopiert die zuletzt von einem Gegner ausgespielte Spezialkarte.
    if(source.effect==='chrysalis'){
      const last=[...(r.specialHistory||[])].reverse().find(x=>x.playerId!==p.id&&x.effect!=='chrysalis');
      if(!last)return socket.emit('errorMsg','Es wurde noch keine gegnerische Spezialkarte gespielt, die Chrysalis kopieren kann.');
      effectCard=byId[last.cardId]||source;
    }

    const effect=effectCard.effect;

    // Vorbedingungen VOR dem Verbrauch prüfen.
    if(effect==='rainbow'&&r.category!=='speed')return socket.emit('errorMsg','Rainbow Dash kann nur bei Schnelligkeit eingesetzt werden.');
    if(effect==='applejack'&&r.category!=='strength')return socket.emit('errorMsg','Applejack kann nur bei Stärke eingesetzt werden.');
    if(effect==='stormking'&&r.category!=='speed')return socket.emit('errorMsg','Storm King wirkt nur bei Schnelligkeit.');
    if(effect==='ahuizotl'&&!availableTargets(r,p,'played').length)return socket.emit('errorMsg','Ahuizotl braucht einen Gegner, der seine Karte bereits gelegt hat.');
    if(['tirek','cozy','sludge','bugbear','sombra','ponyshadows','maneiac','lightningdust','gilda'].includes(effect)){
      const mode=['cozy','sludge','maneiac','gilda'].includes(effect)?'hand':'any';
      if(!availableTargets(r,p,mode).length)return socket.emit('errorMsg','Für diese Spezialkarte gibt es gerade kein gültiges Ziel.');
    }
    if(effect==='manticore'&&!r.normalDiscard.length&&!r.rewardDiscard.length)return socket.emit('errorMsg','Die Ablagestapel sind noch leer.');

    if(!consumeSpecial(r,p,source))return;

    // Bei Chrysalis wird visuell Chrysalis gezeigt, aber mechanisch der kopierte Effekt ausgeführt.
    if(source.effect==='chrysalis'){
      socket.emit('specialDone',{text:`Chrysalis kopiert: ${effectCard.name}.`});
      io.to(r.code).emit('specialCopied',{playerId:p.id,name:p.name,copied:effectCard});
    }

    if(effect==='rainbow'){
      r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:(r.roundBuff[p.id]?.speed||0)+2};
      socket.emit('specialDone',{text:'+2 Schnelligkeit.'});
    }else if(effect==='applejack'){
      r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:(r.roundBuff[p.id]?.strength||0)+1};
      socket.emit('specialDone',{text:'+1 Stärke.'});
    }else if(effect==='pinkie'){
      const d=drawNormal(r,1);p.hand.push(...d);socket.emit('specialDone',{text:d.length?'1 normale Karte gezogen.':'Keine Karte verfügbar.'});
    }else if(effect==='twilight'){
      const d=drawNormal(r,2);p.hand.push(...d);socket.emit('specialDone',{text:`${d.length} normale Karten gezogen.`});
    }else if(effect==='fluttershy'){
      const d=drawNormal(r,2);socket.data.pendingFlutter={room:r.code,choices:d};
      socket.emit('flutterChoices',{cards:d.map(id=>byId[id]).filter(Boolean)});
    }else if(effect==='rarity'){
      socket.data.pendingRarity={room:r.code};
      socket.emit('rarityChoose',{cards:p.hand.map(id=>byId[id]).filter(Boolean)});
    }else if(effect==='tirek'){
      requestTarget(socket,r,p,source,'tirek','any','Tirek: Welchen Gegner willst du schwächen?');
    }else if(effect==='stormking'){
      fxAdd(r,'stormKing',p.id);socket.emit('specialDone',{text:'Bei Schnelligkeits-Gleichstand erhältst du +2.'});
    }else if(effect==='flimflam'){
      const d=drawNormal(r,1);p.hand.push(...d);
      forceDiscardChoice(r,p,'Flim und Flam');
      socket.emit('specialDone',{text:'1 normale Karte gezogen – jetzt 1 Handkarte ablegen.'});
    }else if(effect==='cozy'){
      requestTarget(socket,r,p,source,'cozy','hand','Cozy Glow: Wer soll eine zufällige Handkarte verlieren?');
    }else if(effect==='sludge'){
      requestTarget(socket,r,p,source,'sludge','hand','Sludge: Wähle den Gegner, dessen Karte du bestimmst.');
    }else if(effect==='diamonddogs'){
      const d=drawNormal(r,2);
      socket.data.pendingSpecial={room:r.code,action:'diamonddogs',sourceCardId:source.id,choices:d};
      socket.emit('specialCardRequest',{title:'Diamond Dogs: Behalte 1 der 2 Karten',cards:d.map(id=>byId[id]).filter(Boolean)});
    }else if(effect==='changeling'){
      p.specialExtra=(p.specialExtra||0)+1;
      socket.emit('specialDone',{text:'Du darfst diese Runde noch 1 zusätzliche Spezialkarte spielen.'});
    }else if(effect==='nightmare'){
      r.forcedNextCategory='magic';
      socket.emit('specialDone',{text:'Die nächste Runde wird automatisch Magie.'});
      io.to(r.code).emit('specialImpact',{effect:'nightmare',targetIds:[],text:'Die nächste Runde gehört der Magie.'});
    }else if(effect==='hydra'){
      fxAdd(r,'hydra',p.id);socket.emit('specialDone',{text:'Bei einer Niederlage erhältst du nach der Runde 1 zusätzliche normale Karte.'});
    }else if(effect==='bugbear'){
      requestTarget(socket,r,p,source,'bugbear','any','Bugbear: Wer setzt diese Runde aus?');
    }else if(effect==='manticore'){
      const pool=[...r.normalDiscard.map(id=>({id,zone:'normal'})),...r.rewardDiscard.map(id=>({id,zone:'reward'}))];
      socket.data.pendingSpecial={room:r.code,action:'manticore',sourceCardId:source.id,choices:pool};
      socket.emit('specialCardRequest',{title:'Manticore: Nimm 1 Karte aus dem Ablagestapel zurück',cards:pool.map(x=>byId[x.id]).filter(Boolean)});
    }else if(effect==='timberwolves'){
      fxAdd(r,'doubleNormal',p.id);socket.emit('specialDone',{text:'Lege diese Runde 2 normale Karten. Der höhere Kategorienwert zählt.'});
    }else if(effect==='grogar'){
      socket.data.pendingSpecial={room:r.code,action:'grogar',sourceCardId:source.id};
      socket.emit('specialCategoryRequest',{title:'Grogar: Wähle die Kategorie',categories:CATEGORIES.map(id=>({id,label:CATEGORY_LABEL[id],icon:CATEGORY_ICON[id]}))});
    }else if(effect==='sombra'){
      fxAdd(r,'protected',p.id);
      requestTarget(socket,r,p,source,'sombra','any','King Sombra: Welcher Gegner verliert 2 Stärke?');
    }else if(effect==='daybreaker'){
      fxAdd(r,'autoWinner',p.id);socket.emit('specialDone',{text:'Sobald du deine normale Karte legst, gewinnst du diese Runde automatisch.'});
    }else if(effect==='ironwill'){
      r.roundFX.artifactBlocked=true;socket.emit('specialDone',{text:'In dieser Runde kann niemand ein Artefakt ziehen.'});
      io.to(r.code).emit('specialImpact',{effect:'ironwill',targetIds:[],text:'Artefaktziehungen sind für diese Runde blockiert.'});
    }else if(effect==='ponyshadows'){
      requestTarget(socket,r,p,source,'ponyshadows','any','Pony of Shadows: Welche gegnerische Karte soll nicht zählen?');
    }else if(effect==='windigos'){
      for(const t of roomPlayers(r)){
        if(t.id!==p.id&&!t.surrendered)skipPlayerThisRound(r,t.id,p.id,'Windigos');
      }
      socket.emit('specialDone',{text:'Alle anderen Spieler setzen diese Runde aus.'});
      maybeEvaluate(r);
    }else if(effect==='sunset'){
      const d=drawNormal(r,3);
      socket.data.pendingSpecial={room:r.code,action:'sunset',sourceCardId:source.id,choices:d};
      socket.emit('specialCardRequest',{title:'Sunset Shimmer: Behalte 1 der obersten 3 normalen Karten',cards:d.map(id=>byId[id]).filter(Boolean)});
    }else if(effect==='starlight'){
      for(const t of roomPlayers(r)){
        if(t.id===p.id||t.surrendered)continue;
        if(isProtectedFrom(r,t.id,p.id)){io.to(r.code).emit('specialBlocked',{targetId:t.id,targetName:t.name,sourceName:'Starlight Glimmer'});continue;}
        forceDiscardChoice(r,t,'Starlight Glimmer');
      }
      socket.emit('specialDone',{text:'Alle Gegner müssen 1 Handkarte ablegen.'});
    }else if(effect==='trixie'){
      clearNegativeEffects(r,p.id);
      socket.emit('specialDone',{text:'Trixie hebt die negativen Spezialeffekte auf dir auf.'});
      io.to(r.code).emit('specialCleansed',{playerId:p.id,name:p.name});
    }else if(effect==='ahuizotl'){
      requestTarget(socket,r,p,source,'ahuizotl','played','Ahuizotl: Wähle einen Gegner, der bereits gelegt hat.');
    }else if(effect==='maneiac'){
      requestTarget(socket,r,p,source,'maneiac','hand','Mane-iac: Wähle den Gegner, dessen Handkarte du bestimmst.');
    }else if(effect==='lightningdust'){
      requestTarget(socket,r,p,source,'lightningdust','any','Lightning Dust: Wer verliert diese Runde automatisch?');
    }else if(effect==='gilda'){
      requestTarget(socket,r,p,source,'gilda','hand','Gilda: Von welchem Gegner willst du eine zufällige Karte nehmen?');
    }

    sendState(r);
  });

  socket.on('specialTargetChoice',({targetId})=>{
    const pending=socket.data.pendingSpecial,r=getRoom(socket),p=r?.players.get(socket.id);
    if(!pending||!r||pending.room!==r.code||!p)return;
    const target=r.players.get(targetId),action=pending.action,source=byId[pending.sourceCardId];
    if(!target||target.id===p.id||target.surrendered){socket.data.pendingSpecial=null;return socket.emit('errorMsg','Ungültiges Ziel.');}
    socket.data.pendingSpecial=null;

    if(action==='tirek'){
      addDebuff(r,target.id,-2,p.id,'Tirek');
    }else if(action==='cozy'){
      if(!target.hand.length)return socket.emit('errorMsg','Dieser Gegner hat keine Handkarte.');
      const id=target.hand[Math.floor(Math.random()*target.hand.length)];
      target.hand.splice(target.hand.indexOf(id),1);discardCard(r,id);
      const d=drawNormal(r,1);target.hand.push(...d);
      emitImpact(r,'cozy',target.id,`${target.name} verliert zufällig 1 Handkarte und zieht 1 normale Karte.`);
    }else if(action==='sludge'||action==='maneiac'){
      if(!target.hand.length)return socket.emit('errorMsg','Dieser Gegner hat keine Handkarte.');
      socket.data.pendingSpecial={room:r.code,action:action==='sludge'?'sludge-card':'maneiac-card',sourceCardId:source.id,targetId:target.id};
      socket.emit('specialCardRequest',{title:`${action==='sludge'?'Sludge':'Mane-iac'}: Welche Karte von ${target.name} soll abgelegt werden?`,cards:target.hand.map(id=>byId[id]).filter(Boolean)});
      return;
    }else if(action==='bugbear'){
      skipPlayerThisRound(r,target.id,p.id,'Bugbear');maybeEvaluate(r);
    }else if(action==='sombra'){
      addDebuff(r,target.id,-2,p.id,'King Sombra','strength');
    }else if(action==='ponyshadows'){
      markForcedLose(r,target.id,p.id,'Pony of Shadows','shadow');
    }else if(action==='ahuizotl'){
      if(!playedCardIds(r.played[target.id]).length)return socket.emit('errorMsg','Dieser Gegner hat noch keine Karte gelegt.');
      addDebuff(r,target.id,-2,p.id,'Ahuizotl');
    }else if(action==='lightningdust'){
      markForcedLose(r,target.id,p.id,'Lightning Dust','lightning');
    }else if(action==='gilda'){
      if(!target.hand.length)return socket.emit('errorMsg','Dieser Gegner hat keine Handkarte.');
      const id=target.hand[Math.floor(Math.random()*target.hand.length)];
      target.hand.splice(target.hand.indexOf(id),1);p.hand.push(id);
      emitImpact(r,'steal',[target.id,p.id],`${p.name} nimmt eine zufällige Karte von ${target.name}.`);
    }
    sendState(r);
  });

  socket.on('specialCategoryChoice',({category})=>{
    const pending=socket.data.pendingSpecial,r=getRoom(socket);
    if(!pending||!r||pending.room!==r.code||pending.action!=='grogar'||!CATEGORIES.includes(category))return;
    socket.data.pendingSpecial=null;
    r.category=category;
    if(Array.isArray(r.categoryHistory)&&r.categoryHistory.length)r.categoryHistory[r.categoryHistory.length-1]=category;
    io.to(r.code).emit('categoryOverride',{category,label:CATEGORY_LABEL[category],icon:CATEGORY_ICON[category],source:'Grogar'});
    io.to(socket.id).emit('specialDone',{text:`Grogar bestimmt: ${CATEGORY_LABEL[category]}.`});
    sendState(r);
  });

  socket.on('specialCardChoice',({cardId})=>{
    const pending=socket.data.pendingSpecial,r=getRoom(socket),p=r?.players.get(socket.id);
    if(!pending||!r||pending.room!==r.code||!p)return;
    const action=pending.action;

    if(action==='sludge-card'||action==='maneiac-card'){
      const target=r.players.get(pending.targetId);
      if(!target||!target.hand.includes(cardId))return socket.emit('errorMsg','Diese Karte ist nicht mehr verfügbar.');
      target.hand.splice(target.hand.indexOf(cardId),1);discardCard(r,cardId);
      emitImpact(r,action==='sludge-card'?'sludge':'maneiac',target.id,`${target.name} muss ${byId[cardId]?.name||'eine Karte'} ablegen.`);
      socket.data.pendingSpecial=null;sendState(r);return;
    }

    if(action==='diamonddogs'||action==='sunset'){
      if(!pending.choices?.includes(cardId))return;
      p.hand.push(cardId);
      const rest=[...pending.choices];
      rest.splice(rest.indexOf(cardId),1);
      if(action==='sunset'){
        // Die zwei nicht gewählten Karten bleiben im normalen Ziehstapel.
        r.normalDeck.unshift(...rest);
      }else{
        r.normalDiscard.push(...rest);
      }
      socket.data.pendingSpecial=null;
      socket.emit('specialDone',{text:`${byId[cardId]?.name||'Karte'} behalten.`});
      sendState(r);return;
    }

    if(action==='manticore'){
      const idx=pending.choices?.findIndex(x=>x.id===cardId);
      if(idx<0)return;
      const choice=pending.choices[idx];
      const pile=choice.zone==='reward'?r.rewardDiscard:r.normalDiscard;
      const pileIndex=pile.indexOf(cardId);
      if(pileIndex<0)return socket.emit('errorMsg','Diese Karte liegt nicht mehr im Ablagestapel.');
      pile.splice(pileIndex,1);p.hand.push(cardId);
      socket.data.pendingSpecial=null;
      socket.emit('specialDone',{text:`${byId[cardId]?.name||'Karte'} aus dem Ablagestapel zurückgeholt.`});
      sendState(r);return;
    }
  });

  socket.on('forcedDiscardChoice',({cardId})=>{
    const r=getRoom(socket),p=r?.players.get(socket.id);
    if(!r||!p?.pendingForcedDiscard||!p.hand.includes(cardId))return;
    clearTimeout(p.pendingForcedDiscard.timer);
    const sourceName=p.pendingForcedDiscard.sourceName;
    p.pendingForcedDiscard=null;
    p.hand.splice(p.hand.indexOf(cardId),1);discardCard(r,cardId);
    socket.emit('specialDone',{text:`${sourceName}: ${byId[cardId]?.name||'Eine Karte'} abgelegt.`});
    emitImpact(r,'discard',p.id,`${p.name} legt 1 Karte ab.`);
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
    for(const id of playedCardIds(entry))discardCard(r,id);
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

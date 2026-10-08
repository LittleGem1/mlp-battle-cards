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
const MAX_TOTAL_HAND = 7; // V5: Maximum inklusive aller Spezialkarten
const NORMAL_COPIES = 3;
const REWARD_SPECIAL_COPIES = 2;
const REWARD_ARTIFACT_COPIES = 2;
const ARTIFACT_REWARD_COOLDOWN = 1;

function code(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join(''); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function roomPlayers(r){ return [...r.players.values()]; }
function getRoom(socket){ return socket.data.room ? rooms.get(socket.data.room) : null; }
function hasNormalCard(p){ return p.hand.some(id=>byId[id]?.type==='normal'); }
function activePlayers(r){ return roomPlayers(r).filter(p=>!p.surrendered); }

function clearBotTimers(r){
  for(const t of (r.botTimers||[]))clearTimeout(t);
  r.botTimers=[];
}
function botLater(r,fn,delay=650){
  if(!r)return null;
  const t=setTimeout(()=>{
    r.botTimers=(r.botTimers||[]).filter(x=>x!==t);
    if(rooms.has(r.code))fn();
  },delay);
  if(!Array.isArray(r.botTimers))r.botTimers=[];
  r.botTimers.push(t);
  return t;
}
function clearTimers(r){
  for(const key of ['roundTimer','selectionTimer','countdownTimer','readyTimer','rewardChoiceTimer']){
    if(r[key]){clearTimeout(r[key]);r[key]=null;}
  }
  clearBotTimers(r);
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
      artifactCount:new Set(p.artifacts||[]).size,timeoutPenaltyCount:p.timeoutPenaltyCount||0,normalRefillTarget:Math.max(0,NORMAL_HAND_TARGET-(p.timeoutPenaltyCount||0)),
      selected:!!p.selected,ready:!!p.ready,surrendered:!!p.surrendered,isBot:!!p.isBot,
      eliminated:!!p.surrendered,lastPlayedCardId:p.lastPlayedCardId||null
    }))
  };
}
function enforceHandLimit(r,p){
  if(!p || !Array.isArray(p.hand))return;
  while(p.hand.length>MAX_TOTAL_HAND){
    // Newly drawn normals are at the end, but special rewards must survive.
    let idx=-1;
    for(let i=p.hand.length-1;i>=0;i--){
      if(byId[p.hand[i]]?.type==='normal'){idx=i;break;}
    }
    if(idx<0)idx=p.hand.length-1;
    const [excess]=p.hand.splice(idx,1);
    if(byId[excess]?.type==='normal')r.normalDeck.unshift(excess);
    else if(byId[excess]?.type==='special')r.rewardDeck.unshift(excess);
  }
}
function sendState(r){
  for(const p of roomPlayers(r))enforceHandLimit(r,p);
  io.to(r.code).emit('roomState',publicState(r));
  for(const p of roomPlayers(r)){
    if(!p.isBot)io.to(p.id).emit('hand',p.hand.map(id=>byId[id]).filter(Boolean));
  }
}
function buildNormalDeck(){
  const deck=[];
  for(let i=0;i<NORMAL_COPIES;i++)deck.push(...normal.map(c=>c.id));
  return shuffle(deck);
}
function buildRewardDeck(){
  const deck=[];
  for(let i=0;i<REWARD_SPECIAL_COPIES;i++)deck.push(...specials.map(c=>c.id));

  // Jedes Artefakt ist exakt gleich selten. Die Reihenfolge ist komplett zufällig:
  // Elemente, Kristall Herz oder Star Swirls Tagebuch können jeweils zuerst kommen.
  for(let i=0;i<REWARD_ARTIFACT_COPIES;i++){
    deck.push(...shuffle(artifacts.map(c=>c.id)));
  }
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
function drawNormalForHand(r,p,count=1){
  return drawNormal(r,Math.max(0,Math.min(count,MAX_TOTAL_HAND-p.hand.length)));
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
    const normals=target.hand.filter(id=>byId[id]?.type==='normal');
    const pool=normals.length?normals:target.hand;
    const id=target.isBot
      ? [...pool].sort((a,b)=>(byId[a]?.[r.category]||0)-(byId[b]?.[r.category]||0))[0]
      : pool[Math.floor(Math.random()*pool.length)];
    target.hand.splice(target.hand.indexOf(id),1);discardCard(r,id);
    target.pendingForcedDiscard=null;
    if(!target.isBot)io.to(target.id).emit('specialDone',{text:`${sourceName}: Eine Karte wurde automatisch abgelegt.`});
    emitImpact(r,'discard',target.id,`${target.name} legt 1 Karte ab.`);
    sendState(r);maybeEvaluate(r);
  };
  const delay=target.isBot?550:8000;
  const timer=setTimeout(auto,delay);
  target.pendingForcedDiscard={token,sourceName,timer};
  if(!target.isBot)io.to(target.id).emit('forcedDiscardRequest',{title:`${sourceName}: Lege 1 Handkarte ab`,cards:target.hand.map(id=>byId[id]).filter(Boolean)});
}


function botTargets(r,p,mode='any'){
  return availableTargets(r,p,mode).filter(t=>!t.surrendered);
}
function botTarget(r,p,mode='any'){
  const pool=botTargets(r,p,mode);
  if(!pool.length)return null;
  // Bots bevorzugen Spieler, die dem Artefaktsieg näher sind, bleiben aber nicht perfekt.
  pool.sort((a,b)=>(new Set(b.artifacts||[]).size-new Set(a.artifacts||[]).size)||((b.hand?.length||0)-(a.hand?.length||0)));
  return Math.random()<.68?pool[0]:pool[Math.floor(Math.random()*pool.length)];
}
function botNormalCards(p,category){
  return p.hand.map(id=>byId[id]).filter(c=>c?.type==='normal').sort((a,b)=>(b[category]||0)-(a[category]||0));
}
function botChooseNormalIds(r,p,count=1){
  let cards=botNormalCards(p,r.category);
  if(cards.length>1&&p.lastPlayedCardId){
    const without=cards.filter(c=>c.id!==p.lastPlayedCardId);
    if(without.length)cards=without;
  }
  const chosen=[];
  while(cards.length&&chosen.length<count){
    const top=cards.slice(0,Math.min(3,cards.length));
    const pick=Math.random()<.74?top[0]:top[Math.floor(Math.random()*top.length)];
    chosen.push(pick.id);
    cards=cards.filter(c=>c.id!==pick.id);
  }
  return chosen;
}
function botDiscardWorst(r,p){
  if(!p?.hand?.length)return null;
  const normals=p.hand.filter(id=>byId[id]?.type==='normal');
  let id;
  if(normals.length){
    id=[...normals].sort((a,b)=>(byId[a]?.[r.category]||0)-(byId[b]?.[r.category]||0))[0];
  }else id=p.hand[Math.floor(Math.random()*p.hand.length)];
  p.hand.splice(p.hand.indexOf(id),1);discardCard(r,id);return id;
}
function botKeepBestNormal(ids,category){
  return [...ids].sort((a,b)=>(byId[b]?.[category]||0)-(byId[a]?.[category]||0))[0]||null;
}
function botHasNegative(r,p){
  return fxHas(r,'skipped',p.id)||fxHas(r,'forcedLose',p.id)||!!r.roundFX?.debuff?.[p.id]||!!r.roundFX?.strengthDebuff?.[p.id];
}
function botApplySpecial(r,p,c){
  const effect=c.effect;
  const targetAny=()=>botTarget(r,p,'any');
  const targetHand=()=>botTarget(r,p,'hand');
  if(effect==='rainbow'){
    r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:(r.roundBuff[p.id]?.speed||0)+2};
  }else if(effect==='applejack'){
    r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:(r.roundBuff[p.id]?.strength||0)+1};
  }else if(effect==='pinkie'){
    p.hand.push(...drawNormal(r,1));
  }else if(effect==='twilight'){
    p.hand.push(...drawNormal(r,2));
  }else if(effect==='fluttershy'){
    const d=drawNormal(r,2),keep=botKeepBestNormal(d,r.category);
    if(keep)p.hand.push(keep);
    r.normalDiscard.push(...d.filter(id=>id!==keep));
  }else if(effect==='rarity'){
    botDiscardWorst(r,p);p.hand.push(...drawNormal(r,1));
  }else if(effect==='tirek'){
    const t=targetAny();if(t)addDebuff(r,t.id,-2,p.id,'Tirek');
  }else if(effect==='stormking'){
    fxAdd(r,'stormKing',p.id);
  }else if(effect==='flimflam'){
    p.hand.push(...drawNormal(r,1));botDiscardWorst(r,p);
  }else if(effect==='cozy'){
    const t=targetHand();if(t&&t.hand.length){
      const id=t.hand[Math.floor(Math.random()*t.hand.length)];t.hand.splice(t.hand.indexOf(id),1);discardCard(r,id);t.hand.push(...drawNormal(r,1));
      emitImpact(r,'cozy',t.id,`${t.name} verliert zufällig 1 Handkarte und zieht 1 normale Karte.`);
    }
  }else if(effect==='sludge'||effect==='maneiac'){
    const t=targetHand();if(t&&t.hand.length){
      const normals=t.hand.filter(id=>byId[id]?.type==='normal');
      const pool=normals.length?normals:t.hand;
      const id=effect==='sludge'
        ? [...pool].sort((a,b)=>(byId[b]?.[r.category]||0)-(byId[a]?.[r.category]||0))[0]
        : pool[Math.floor(Math.random()*pool.length)];
      t.hand.splice(t.hand.indexOf(id),1);discardCard(r,id);emitImpact(r,effect,t.id,`${t.name} muss ${byId[id]?.name||'eine Karte'} ablegen.`);
    }
  }else if(effect==='diamonddogs'){
    const d=drawNormal(r,2),keep=botKeepBestNormal(d,r.category);if(keep)p.hand.push(keep);r.normalDiscard.push(...d.filter(id=>id!==keep));
  }else if(effect==='changeling'){
    p.specialExtra=(p.specialExtra||0)+1;
  }else if(effect==='nightmare'){
    r.forcedNextCategory='magic';io.to(r.code).emit('specialImpact',{effect:'nightmare',targetIds:[],text:'Die nächste Runde wird automatisch Magie.'});
  }else if(effect==='hydra'){
    fxAdd(r,'hydra',p.id);
  }else if(effect==='bugbear'){
    const t=targetAny();if(t)skipPlayerThisRound(r,t.id,p.id,'Bugbear');
  }else if(effect==='manticore'){
    let id=null,zone=null;
    if(r.normalDiscard.length){id=botKeepBestNormal(r.normalDiscard,r.category);zone='normal';}
    else if(r.rewardDiscard.length){id=r.rewardDiscard[r.rewardDiscard.length-1];zone='reward';}
    if(id){const pile=zone==='normal'?r.normalDiscard:r.rewardDiscard;const i=pile.indexOf(id);if(i>=0)pile.splice(i,1);p.hand.push(id);}
  }else if(effect==='timberwolves'){
    fxAdd(r,'doubleNormal',p.id);
  }else if(effect==='grogar'){
    let best='strength',bestVal=-1;
    for(const cat of CATEGORIES){const v=Math.max(0,...botNormalCards(p,cat).map(x=>x[cat]||0));if(v>bestVal){bestVal=v;best=cat;}}
    r.category=best;if(Array.isArray(r.categoryHistory)&&r.categoryHistory.length)r.categoryHistory[r.categoryHistory.length-1]=best;
    io.to(r.code).emit('categoryOverride',{category:best,label:CATEGORY_LABEL[best],icon:CATEGORY_ICON[best],source:'Grogar'});
  }else if(effect==='sombra'){
    fxAdd(r,'protected',p.id);const t=targetAny();if(t)addDebuff(r,t.id,-2,p.id,'King Sombra','strength');
  }else if(effect==='daybreaker'){
    fxAdd(r,'autoWinner',p.id);
  }else if(effect==='ironwill'){
    r.roundFX.artifactBlocked=true;io.to(r.code).emit('specialImpact',{effect:'ironwill',targetIds:[],text:'Artefaktziehungen sind für diese Runde blockiert.'});
  }else if(effect==='ponyshadows'){
    const t=targetAny();if(t)markForcedLose(r,t.id,p.id,'Pony of Shadows','shadow');
  }else if(effect==='windigos'){
    for(const t of roomPlayers(r))if(t.id!==p.id&&!t.surrendered)skipPlayerThisRound(r,t.id,p.id,'Windigos');
  }else if(effect==='sunset'){
    const d=drawNormal(r,3),keep=botKeepBestNormal(d,r.category);if(keep)p.hand.push(keep);r.normalDeck.unshift(...d.filter(id=>id!==keep));
  }else if(effect==='starlight'){
    for(const t of roomPlayers(r)){
      if(t.id===p.id||t.surrendered)continue;
      if(isProtectedFrom(r,t.id,p.id)){io.to(r.code).emit('specialBlocked',{targetId:t.id,targetName:t.name,sourceName:'Starlight Glimmer'});continue;}
      forceDiscardChoice(r,t,'Starlight Glimmer');
    }
  }else if(effect==='trixie'){
    clearNegativeEffects(r,p.id);io.to(r.code).emit('specialCleansed',{playerId:p.id,name:p.name});
  }else if(effect==='ahuizotl'){
    const t=botTarget(r,p,'played');if(t)addDebuff(r,t.id,-2,p.id,'Ahuizotl');
  }else if(effect==='lightningdust'){
    const t=targetAny();if(t)markForcedLose(r,t.id,p.id,'Lightning Dust','lightning');
  }else if(effect==='gilda'){
    const t=targetHand();if(t&&t.hand.length){const id=t.hand[Math.floor(Math.random()*t.hand.length)];t.hand.splice(t.hand.indexOf(id),1);p.hand.push(id);emitImpact(r,'steal',[t.id,p.id],`${p.name} nimmt eine zufällige Karte von ${t.name}.`);}
  }
}
function botUsableSpecials(r,p){
  const history=(r.specialHistory||[]).some(x=>x.playerId!==p.id&&x.effect!=='chrysalis');
  return p.hand.map(id=>byId[id]).filter(c=>c?.type==='special').filter(c=>{
    if(c.effect==='rainbow'||c.effect==='stormking')return r.category==='speed';
    if(c.effect==='applejack')return r.category==='strength';
    if(c.effect==='chrysalis')return history;
    if(c.effect==='ahuizotl')return botTargets(r,p,'played').length>0;
    if(['cozy','sludge','maneiac','gilda'].includes(c.effect))return botTargets(r,p,'hand').length>0;
    if(['tirek','bugbear','sombra','ponyshadows','lightningdust'].includes(c.effect))return botTargets(r,p,'any').length>0;
    if(c.effect==='timberwolves')return botNormalCards(p,r.category).length>=2;
    if(c.effect==='manticore')return r.normalDiscard.length+r.rewardDiscard.length>0;
    if(c.effect==='trixie')return botHasNegative(r,p);
    if(c.effect==='ironwill')return roomPlayers(r).some(x=>x.id!==p.id&&new Set(x.artifacts||[]).size>=2);
    return true;
  });
}
function botMaybeUseSpecial(r,p,forced=false){
  if(!r||r.phase!=='select'||!p?.isBot||p.selected||!r.roundPlayerIds.includes(p.id)||!mayUseSpecial(p))return false;
  const usable=botUsableSpecials(r,p);if(!usable.length)return false;
  let chance=forced?.86:.42;
  if(new Set(p.artifacts||[]).size>=2)chance+=.08;
  if(Math.random()>chance)return false;
  const priority=['daybreaker','windigos','lightningdust','grogar','bugbear','sombra'];
  usable.sort((a,b)=>priority.indexOf(b.effect)-priority.indexOf(a.effect));
  let source=Math.random()<.55?usable[0]:usable[Math.floor(Math.random()*usable.length)];
  if(!source)return false;
  let effective=source;
  if(source.effect==='chrysalis'){
    const last=[...(r.specialHistory||[])].reverse().find(x=>x.playerId!==p.id&&x.effect!=='chrysalis');
    if(last&&byId[last.cardId])effective=byId[last.cardId];
  }
  if(!consumeSpecial(r,p,source))return false;
  if(source.effect==='chrysalis')io.to(r.code).emit('specialCopied',{playerId:p.id,name:p.name,copied:effective});
  botApplySpecial(r,p,effective);
  sendState(r);
  if(source.effect==='changeling'&&mayUseSpecial(p))botLater(r,()=>botMaybeUseSpecial(r,p,true),260);
  return true;
}
function botCommitNormal(r,p){
  if(!r||r.phase!=='select'||!p?.isBot||p.selected||p.surrendered||!r.roundPlayerIds.includes(p.id))return;
  const needed=fxHas(r,'doubleNormal',p.id)?2:1;
  const ids=botChooseNormalIds(r,p,needed);
  if(!ids.length)return;
  const entry=r.played[p.id]||{cardIds:[]};
  for(const id of ids){
    if(!p.hand.includes(id))continue;
    p.hand.splice(p.hand.indexOf(id),1);entry.cardIds.push(id);io.to(r.code).emit('cardCommitted',{playerId:p.id,name:p.name});
  }
  if(!entry.cardIds.length)return;
  entry.cardId=entry.cardIds[0];r.played[p.id]=entry;
  if(entry.cardIds.length>=needed){p.selected=true;p.lastPlayedCardId=entry.cardIds[entry.cardIds.length-1];io.to(r.code).emit('playerSelected',{playerId:p.id,name:p.name});}
  sendState(r);maybeEvaluate(r);
}
function scheduleBotsForSelect(r){
  for(const id of (r.roundPlayerIds||[])){
    const p=r.players.get(id);if(!p?.isBot||p.surrendered)continue;
    botLater(r,()=>botMaybeUseSpecial(r,p,false),650+Math.floor(Math.random()*550));
    botLater(r,()=>botCommitNormal(r,p),1550+Math.floor(Math.random()*1000));
  }
}
function scheduleBotDice(r){
  if(!r||r.phase!=='tie')return;
  for(const id of (r.tieIds||[])){
    const p=r.players.get(id);if(!p?.isBot||r.dice[id]!==undefined)continue;
    botLater(r,()=>{
      if(r.phase!=='tie'||!r.tieIds.includes(id)||r.dice[id]!==undefined)return;
      r.dice[id]='rolling';io.to(r.code).emit('diceRolling',{playerId:id,name:p.name});
      botLater(r,()=>completeDiceRoll(r,id),850);
    },600+Math.floor(Math.random()*500));
  }
}
function makeBotPlayer(r){
  const id=`bot:${r.code}:1`;
  return {id,name:'PonyBot',isBot:true,accessory:'changeling',frame:'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false,specialUsed:0,specialExtra:0,pendingForcedDiscard:null};
}
function addBotToRoom(r){
  if(!r||r.phase!=='lobby'||roomPlayers(r).some(p=>p.isBot)||r.players.size>=8)return false;
  const bot=makeBotPlayer(r);r.players.set(bot.id,bot);return true;
}
function removeBotFromRoom(r){
  if(!r||r.phase!=='lobby')return false;
  const bot=roomPlayers(r).find(p=>p.isBot);if(!bot)return false;
  if(bot.pendingForcedDiscard?.timer)clearTimeout(bot.pendingForcedDiscard.timer);
  r.players.delete(bot.id);return true;
}

function refillNormalHands(r){
  const report=[];
  for(const p of roomPlayers(r)){
    if(p.surrendered)continue;
    const have=p.hand.filter(id=>byId[id]?.type==='normal').length;
    const cap=Math.max(0,NORMAL_HAND_TARGET-(p.timeoutPenaltyCount||0));
    // Never refill past 7 total cards, including specials won from the gold deck.
    const need=Math.max(0,Math.min(cap-have,MAX_TOTAL_HAND-p.hand.length));
    const drawn=drawNormal(r,need);
    if(drawn.length){
      p.hand.push(...drawn);
      report.push({playerId:p.id,name:p.name,cards:drawn.map(id=>byId[id]).filter(Boolean)});
    }
  }
  if(report.length)io.to(r.code).emit('handRefill',{players:report,target:MAX_TOTAL_HAND});
  return report;
}
function hasAllArtifacts(p){
  return new Set(p.artifacts||[]).size>=artifacts.length;
}
function drawRewardCandidate(r,p,{allowArtifact=true,excludeIds=[]}={}){
  const already=new Set(p.artifacts||[]);
  const excluded=new Set(excludeIds||[]);
  const deferred=[];
  let result=null;
  let attempts=0;

  while(attempts++<220){
    recycleRewardDeck(r);
    const id=r.rewardDeck.pop();
    if(!id)break;
    const card=byId[id];
    if(!card)continue;

    if(excluded.has(id)){
      deferred.push(id);
      continue;
    }

    if(card.type==='artifact'){
      // Iron Will oder Artefakt-Cooldown: in dieser Goldauswahl keine Artefakte.
      if(!allowArtifact || r.roundFX?.artifactBlocked){
        deferred.push(id);
        continue;
      }
      // Ein Artefakt, das dieser Spieler bereits besitzt, wird ihm nicht erneut angeboten.
      if(already.has(card.id)){
        deferred.push(id);
        continue;
      }
    }

    result=id;
    break;
  }

  // Übersprungene Karten bleiben im Goldstapel und werden neu gemischt.
  if(deferred.length){
    r.rewardDeck.push(...deferred);
    r.rewardDeck=shuffle(r.rewardDeck);
  }

  return result;
}
function returnRewardCandidate(r,id){
  if(!id)return;
  r.rewardDeck.push(id);
  r.rewardDeck=shuffle(r.rewardDeck);
}
function beginRewardChoice(r,winnerId){
  const p=r.players.get(winnerId);
  if(!p||p.surrendered){
    startRound(r,1200);
    return;
  }

  const candidates=[];
  const artifactAllowed=(r.artifactRewardCooldown||0)<=0;

  // 2 Goldkarten, aber höchstens EIN Artefakt in derselben Auswahl.
  const first=drawRewardCandidate(r,p,{allowArtifact:artifactAllowed});
  if(first)candidates.push(first);

  const firstIsArtifact=first&&byId[first]?.type==='artifact';
  const second=drawRewardCandidate(r,p,{
    allowArtifact:artifactAllowed&&!firstIsArtifact,
    excludeIds:first?[first]:[]
  });
  if(second)candidates.push(second);

  if(!candidates.length){
    io.to(r.code).emit('rewardPhaseDone',{winnerId,winnerName:p.name,rewardKind:null});
    startRound(r,1300);
    return;
  }

  r.phase='rewardchoice';
  const token=`reward:${r.round}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  r.pendingReward={winnerId,cards:candidates,token};
  sendState(r);

  const publicInfo={winnerId,playerName:p.name,count:candidates.length};
  io.to(r.code).emit('rewardChoiceWaiting',publicInfo);

  if(p.isBot){
    botLater(r,()=>{
      if(!r.pendingReward||r.pendingReward.token!==token)return;
      // PonyBot bevorzugt ein fehlendes Artefakt, sonst zufällige Spezialkarte.
      const missingArtifact=candidates.find(id=>byId[id]?.type==='artifact' && !(p.artifacts||[]).includes(id));
      const chosen=missingArtifact||candidates[Math.floor(Math.random()*candidates.length)];
      resolveRewardChoice(r,winnerId,chosen,token);
    },900);
    return;
  }

  io.to(p.id).emit('rewardChoice',{
    token,
    cards:candidates.map(id=>byId[id]).filter(Boolean),
    seconds:18
  });

  if(r.rewardChoiceTimer)clearTimeout(r.rewardChoiceTimer);
  r.rewardChoiceTimer=setTimeout(()=>{
    r.rewardChoiceTimer=null;
    if(!r.pendingReward||r.pendingReward.token!==token)return;
    const auto=candidates[Math.floor(Math.random()*candidates.length)];
    resolveRewardChoice(r,winnerId,auto,token);
  },18000);
}
function resolveRewardChoice(r,winnerId,chosenId,token){
  const pending=r.pendingReward;
  const p=r.players.get(winnerId);
  if(!pending||!p||pending.winnerId!==winnerId)return false;
  if(token&&pending.token!==token)return false;
  if(!pending.cards.includes(chosenId))return false;

  if(r.rewardChoiceTimer){clearTimeout(r.rewardChoiceTimer);r.rewardChoiceTimer=null;}

  const chosen=byId[chosenId];
  const unchosen=pending.cards.filter(id=>id!==chosenId);

  // Nicht gewählte Goldkarte geht zurück in den Goldstapel und kann später wieder auftauchen.
  for(const id of unchosen)returnRewardCandidate(r,id);

  if(chosen?.type==='artifact'){
    if(!(p.artifacts||[]).includes(chosen.id))p.artifacts.push(chosen.id);

    // Nach einem gefundenen Artefakt ist die nächste Goldauswahl garantiert
    // artefaktfrei. Erst die darauffolgende darf wieder eines enthalten.
    r.artifactRewardCooldown=ARTIFACT_REWARD_COOLDOWN;

    io.to(r.code).emit('artifactFound',{
      playerId:p.id,playerName:p.name,card:chosen,
      artifacts:p.artifacts.map(x=>byId[x]).filter(Boolean),
      collected:new Set(p.artifacts).size,total:artifacts.length
    });
  }else if(chosen?.type==='special'){
    p.hand.push(chosen.id);

    // Eine komplette artefaktfreie Goldauswahl verbraucht den Cooldown.
    if((r.artifactRewardCooldown||0)>0){
      r.artifactRewardCooldown=Math.max(0,r.artifactRewardCooldown-1);
    }
  }

  r.pendingReward=null;
  const publicReward={playerId:p.id,playerName:p.name,kind:chosen?.type||null};
  if(chosen?.type==='artifact'){
    // Artefakte sind öffentliche Sammelobjekte.
    io.to(r.code).emit('rewardChosen',{...publicReward,card:chosen});
  }else{
    // Niemals eine geheime Spezialkarte an den gesamten Raum senden.
    io.to(r.code).emit('rewardChosen',{...publicReward,card:null});
    if(!p.isBot)io.to(p.id).emit('rewardChosenPrivate',{...publicReward,card:chosen});
  }
  sendState(r);

  if(gameOverIfNeeded(r))return true;

  io.to(r.code).emit('rewardPhaseDone',{
    winnerId:p.id,winnerName:p.name,rewardKind:chosen?.type||null
  });
  startRound(r,1800);
  return true;
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
  r.normalDeck=[];r.normalDiscard=[];r.rewardDeck=[];r.rewardDiscard=[];r.pendingReward=null;r.artifactRewardCooldown=0;
  for(const p of roomPlayers(r)){
    p.hand=[];p.artifacts=[];p.timeoutPenaltyCount=0;p.selected=null;p.lastPlayedCardId=null;p.ready=false;p.surrendered=false;p.specialUsed=0;p.specialExtra=0;p.pendingForcedDiscard=null;
  }
  sendState(r);
  io.to(r.code).emit('backToLobby');
}
function removePlayerFromRoom(socket,notify=true){
  const r=getRoom(socket);if(!r)return;
  const leaving=r.players.get(socket.id);if(leaving?.pendingForcedDiscard?.timer)clearTimeout(leaving.pendingForcedDiscard.timer);
  if(r.phase==='rewardchoice'&&r.pendingReward?.winnerId===socket.id){
    if(r.rewardChoiceTimer){clearTimeout(r.rewardChoiceTimer);r.rewardChoiceTimer=null;}
    for(const id of (r.pendingReward.cards||[]))returnRewardCandidate(r,id);
    r.pendingReward=null;
    startRound(r,900);
  }
  r.players.delete(socket.id);socket.leave(r.code);socket.data.room=null;socket.emit('roomLeft');
  const humans=roomPlayers(r).filter(p=>!p.isBot);
  if(!humans.length){clearTimers(r);rooms.delete(r.code);return;}
  if(r.hostId===socket.id)r.hostId=humans[0].id;
  r.roundPlayerIds=(r.roundPlayerIds||[]).filter(id=>id!==socket.id);
  if(notify)io.to(r.code).emit('notice','Ein Spieler hat den Raum verlassen.');
  sendState(r);
  if(r.phase==='select')maybeEvaluate(r);
  if(r.phase==='ready')maybeStartWhenReady(r);
  if(r.phase==='gameover'&&r.postGameReady&&roomPlayers(r).length&&roomPlayers(r).every(p=>p.isBot||r.postGameReady.has(p.id))){
    setTimeout(()=>{if(rooms.has(r.code)&&r.phase==='gameover')resetToLobby(r)},250);
  }
}
function maybeEvaluate(r){
  if(!r||r.phase!=='select')return;
  const req=requiredPlayers(r);
  // Effekte wie Starlight / Flim & Flam müssen erst vollständig abgearbeitet
  // sein, bevor die Karten aufgedeckt werden.
  if(req.some(p=>p.pendingForcedDiscard))return;
  if(req.length&&req.every(p=>p.selected)){
    if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;}
    r.selectionDeadline=null;
    evaluate(r);
  }
}
function endGame(r,champion,reason='artifacts'){
  if(!r||r.phase==='gameover'||!champion)return true;
  clearTimers(r);r.phase='gameover';r.postGameReady=new Set(roomPlayers(r).filter(p=>p.isBot).map(p=>p.id));
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
    p.timeoutPenaltyCount=Math.min(NORMAL_HAND_TARGET,(p.timeoutPenaltyCount||0)+1);
    penalties.push({playerId:p.id,name:p.name,card:byId[lostId],remainingRefillTarget:Math.max(0,NORMAL_HAND_TARGET-p.timeoutPenaltyCount)});
  }
  for(const p of req)p.selected=null;
  r.played={};r.roundBuff={};r.roundPlayerIds=[];
  io.to(r.code).emit('roundTimeout',{penalties,message:'Zeit abgelaufen! Strafkarte verloren. Sie wird nicht automatisch ersetzt.'});
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
    r.roundIntroUntil=Date.now()+4000;
    io.to(r.code).emit('roundIntro',{round:r.round,category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],until:r.roundIntroUntil});
    sendState(r);
    r.roundTimer=setTimeout(()=>{
      if(!rooms.has(r.code)||r.phase!=='roundintro')return;
      r.roundTimer=null;r.roundIntroUntil=null;r.phase='select';
      r.selectionDeadline=Date.now()+30000;
      io.to(r.code).emit('roundStart',{round:r.round,category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],deadline:r.selectionDeadline});
      sendState(r);
      scheduleBotsForSelect(r);
      r.selectionTimer=setTimeout(()=>handleSelectionTimeout(r),30050);
    },4000);
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
    beginRewardChoice(r,winnerId);
  },900);
}
const FINISHERS=['fall','melt','glass','portal','xmark','shadow','spin','meteor','dust','heart','smolder','cookie'];
function pickFinisher(r){
  const choices=FINISHERS.filter(x=>x!==r.lastFinisher);
  const f=choices[Math.floor(Math.random()*choices.length)]||FINISHERS[0];
  r.lastFinisher=f;return f;
}
function settleRound(r,winnerId){
  const ids=Object.values(r.played).flatMap(playedCardIds),winner=r.players.get(winnerId);if(!winner)return;
  r.phase='result';
  const finisher=pickFinisher(r),duration=4200;
  io.to(r.code).emit('roundWinner',{winnerId,winnerName:winner.name,cards:ids.map(id=>byId[id]).filter(Boolean),finisher,duration,
    revealEntries:Object.entries(r.played).map(([pid,entry])=>{
      const p=r.players.get(pid),cardId=playedCardIds(entry)[0];
      return {pid,name:p?.name||'Spieler',card:byId[cardId]};
    }).filter(x=>x.card)});
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
    sendState(r);scheduleBotDice(r);
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
    else setTimeout(()=>{r.tieIds=top;r.dice={};io.to(r.code).emit('tieAgain',{playerIds:top,names:top.map(id=>r.players.get(id)?.name)});sendState(r);scheduleBotDice(r);},1300);
  }
}

function beginMatch(r){
  if(!r||r.phase!=='ready'||r.players.size<2)return;
  clearTimers(r);
  if(!r.arenaId){
    const arenas=['jade_palace','whispering_forest','steampunk_works','witchs_table'];
    r.arenaId=arenas[Math.floor(Math.random()*arenas.length)];
  }
  const ps=roomPlayers(r);
  initDecks(r);

  for(const p of ps){
    p.hand=[];p.artifacts=[];p.timeoutPenaltyCount=0;p.selected=null;p.lastPlayedCardId=null;p.ready=false;p.surrendered=false;p.specialUsed=0;p.specialExtra=0;p.pendingForcedDiscard=null;
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
  const arenas=['jade_palace','whispering_forest','steampunk_works','witchs_table'];
  r.arenaId=arenas[Math.floor(Math.random()*arenas.length)];
  r.phase='ready';
  r.readyLock=false;
  for(const p of roomPlayers(r)){p.ready=!!p.isBot;p.selected=null;}
  io.to(r.code).emit('arenaReadyPhase',{arenaId:r.arenaId});
  sendState(r);
  maybeStartWhenReady(r);
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
    const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',category:null,categoryHistory:[],round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,selectionDeadline:null,countdownUntil:null,roundIntroUntil:null,arenaId:null,lastFinisher:null,readyLock:false,readyTimer:null,postGameReady:new Set(),forceNextCategoryDifferent:false,forcedNextCategory:null,normalDeck:[],normalDiscard:[],rewardDeck:[],rewardDiscard:[],roundFX:null,specialHistory:[],botTimers:[],pendingReward:null,rewardChoiceTimer:null,artifactRewardCooldown:0};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false,specialUsed:0,specialExtra:0,pendingForcedDiscard:null});
    rooms.set(c,r);socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('createBotRoom',({name,accessory,frame})=>{
    let c;do c=code();while(rooms.has(c));
    const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',category:null,categoryHistory:[],round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,selectionDeadline:null,countdownUntil:null,roundIntroUntil:null,arenaId:null,lastFinisher:null,readyLock:false,readyTimer:null,postGameReady:new Set(),forceNextCategoryDifferent:false,forcedNextCategory:null,normalDeck:[],normalDiscard:[],rewardDeck:[],rewardDiscard:[],roundFX:null,specialHistory:[],botTimers:[],pendingReward:null,rewardChoiceTimer:null,artifactRewardCooldown:0};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],artifacts:[],selected:null,lastPlayedCardId:null,ready:false,surrendered:false,specialUsed:0,specialExtra:0,pendingForcedDiscard:null});
    rooms.set(c,r);socket.join(c);socket.data.room=c;addBotToRoom(r);sendState(r);
    socket.emit('notice','🤖 PonyBot wurde als Testgegner hinzugefügt.');
  });
  socket.on('toggleBot',()=>{
    const r=getRoom(socket);if(!r||r.phase!=='lobby')return socket.emit('errorMsg','Bots können nur in der Lobby geändert werden.');
    if(r.hostId!==socket.id)return socket.emit('errorMsg','Nur der Host kann den Test-Bot ändern.');
    const hasBot=roomPlayers(r).some(p=>p.isBot);
    if(hasBot){removeBotFromRoom(r);io.to(r.code).emit('notice','🤖 Test-Bot entfernt.');}
    else if(addBotToRoom(r)){io.to(r.code).emit('notice','🤖 PonyBot ist dem Raum beigetreten.');}
    else return socket.emit('errorMsg','Es kann gerade kein Bot hinzugefügt werden.');
    sendState(r);
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

    // Computer-Spieler brauchen keinen eigenen Button und bleiben immer bereit.
    for(const bot of roomPlayers(r).filter(x=>x.isBot))bot.ready=true;

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
      const d=drawNormalForHand(r,p,1);p.hand.push(...d);socket.emit('specialDone',{text:d.length?'1 normale Karte gezogen.':'Keine Karte verfügbar.'});
    }else if(effect==='twilight'){
      const d=drawNormalForHand(r,p,2);p.hand.push(...d);socket.emit('specialDone',{text:`${d.length} normale Karten gezogen.`});
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
    sendState(r);maybeEvaluate(r);
  });

  socket.on('chooseReward',({cardId,token})=>{
    const r=getRoom(socket),p=r?.players.get(socket.id);
    if(!r||!p||p.isBot)return;
    if(r.phase!=='rewardchoice'||!r.pendingReward||r.pendingReward.winnerId!==socket.id){
      return socket.emit('errorMsg','Gerade gibt es keine Goldkarte für dich auszuwählen.');
    }
    if(!resolveRewardChoice(r,socket.id,cardId,token)){
      socket.emit('errorMsg','Diese Goldkarte kann nicht mehr gewählt werden.');
    }
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
    if(roomPlayers(r).every(p=>p.isBot||r.postGameReady.has(p.id))){
      if(rooms.has(r.code)&&r.phase==='gameover') resetToLobby(r);
    }
  });
  socket.on('abortGame',()=>{const r=getRoom(socket);if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');if(r.hostId!==socket.id)return socket.emit('errorMsg','Nur der Host kann abbrechen.');if(r.phase==='lobby')return;io.to(r.code).emit('notice','Die Partie wurde abgebrochen.');resetToLobby(r);});
  socket.on('leaveRoom',()=>removePlayerFromRoom(socket));
  socket.on('disconnect',()=>removePlayerFromRoom(socket,false));
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MLP Battle Cards läuft auf http://localhost:${PORT}`));

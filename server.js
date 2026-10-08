const path = require('path');
const crypto = require('crypto');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { normal, specials, byId } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();
const CATEGORIES = ['strength','speed','energy','magic'];
const CATEGORY_LABEL = { strength:'Stärke', speed:'Schnelligkeit', energy:'Energie', magic:'Magie' };
const CATEGORY_ICON = { strength:'🏋️', speed:'⚡', energy:'🔋', magic:'⭐' };


// Private owner/bot mode. Set OWNER_CODE only in Render -> Environment.
// The secret itself is never sent to normal clients or stored in GitHub.
const OWNER_CODE=String(process.env.OWNER_CODE||'').trim();
const OWNER_TOKEN_MAX_AGE=1000*60*60*24*180; // 180 days

function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length && aa.length>0 && crypto.timingSafeEqual(aa,bb);
}
function ownerSignature(payload){
  return crypto.createHmac('sha256',OWNER_CODE).update(payload).digest('base64url');
}
function makeOwnerToken(){
  const payload=`owner.${Date.now()}`;
  return `${payload}.${ownerSignature(payload)}`;
}
function verifyOwnerToken(token){
  if(!OWNER_CODE||!token)return false;
  const parts=String(token).split('.');
  if(parts.length!==3||parts[0]!=='owner')return false;
  const payload=`${parts[0]}.${parts[1]}`;
  if(!safeEqual(parts[2],ownerSignature(payload)))return false;
  const issued=Number(parts[1]);
  return Number.isFinite(issued)&&issued>0&&(Date.now()-issued)<OWNER_TOKEN_MAX_AGE;
}

function code(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join(''); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function roomPlayers(r){ return [...r.players.values()]; }
function getRoom(socket){ return socket.data.room ? rooms.get(socket.data.room) : null; }
function hasNormalCard(p){ return p.hand.some(id=>byId[id]?.type==='normal'); }
function activePlayers(r){ return roomPlayers(r).filter(p=>p.hand.length>0); }

function clearTimers(r){
  for(const key of ['roundTimer','selectionTimer','countdownTimer','botTimer']){
    if(r[key]){clearTimeout(r[key]);r[key]=null;}
  }
  r.selectionDeadline=null;
  r.countdownUntil=null;
}
function publicState(r){
  return {
    code:r.code,hostId:r.hostId,phase:r.phase,category:r.category,round:r.round,ownerBotRoom:!!r.ownerBotRoom,
    countdownUntil:r.countdownUntil||null,selectionDeadline:r.selectionDeadline||null,
    players:roomPlayers(r).map(p=>({
      id:p.id,name:p.name,accessory:p.accessory,frame:p.frame||'',handCount:p.hand.length,
      selected:!!p.selected,eliminated:p.hand.length===0,lastPlayedCardId:p.lastPlayedCardId||null,isBot:!!p.isBot
    }))
  };
}
function sendState(r){
  io.to(r.code).emit('roomState',publicState(r));
  for(const p of roomPlayers(r)){if(!p.isBot)io.to(p.id).emit('hand',p.hand.map(id=>byId[id]).filter(Boolean));}
}
function freshPool(){ return shuffle([...normal,...specials].map(c=>c.id)); }
function nextCategory(r){ r.category=CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)]; }
function requiredPlayers(r){ return (r.roundPlayerIds||[]).map(id=>r.players.get(id)).filter(Boolean); }

function resetToLobby(r){
  clearTimers(r);
  r.phase='lobby';r.category=null;r.round=0;r.played={};r.dice={};r.tieIds=[];r.roundBuff={};r.roundPlayerIds=[];
  for(const p of roomPlayers(r)){p.hand=[];p.selected=null;p.lastPlayedCardId=null;}
  io.to(r.code).emit('backToLobby');
  sendState(r);
}
function removePlayerFromRoom(socket,notify=true){
  const r=getRoom(socket);if(!r)return;
  // A private bot room belongs only to its authorized owner. If the owner leaves,
  // remove the whole room instead of leaving a ghost bot behind.
  if(r.ownerBotRoom && r.hostId===socket.id){
    clearTimers(r);rooms.delete(r.code);socket.leave(r.code);socket.data.room=null;socket.emit('roomLeft');return;
  }
  r.players.delete(socket.id);socket.leave(r.code);socket.data.room=null;socket.emit('roomLeft');
  if(!r.players.size){clearTimers(r);rooms.delete(r.code);return;}
  if(r.hostId===socket.id)r.hostId=roomPlayers(r)[0].id;
  r.roundPlayerIds=(r.roundPlayerIds||[]).filter(id=>id!==socket.id);
  if(notify)io.to(r.code).emit('notice','Ein Spieler hat den Raum verlassen.');
  sendState(r);
  if(r.phase==='select')maybeEvaluate(r);
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
function gameOverIfNeeded(r){
  const alive=activePlayers(r);
  if(alive.length>1)return false;
  clearTimers(r);r.phase='gameover';
  const champion=alive[0]||roomPlayers(r).sort((a,b)=>b.hand.length-a.hand.length)[0];
  if(champion)io.to(r.code).emit('gameOver',{winnerId:champion.id,winnerName:champion.name,counts:roomPlayers(r).map(p=>({id:p.id,name:p.name,count:p.hand.length}))});
  sendState(r);return true;
}

function commitNormalCard(r,p,cardId,feedbackSocket=null){
  if(!r||r.phase!=='select'){
    if(feedbackSocket)feedbackSocket.emit('errorMsg','Gerade kann keine Karte gespielt werden.');
    return false;
  }
  if(!r.roundPlayerIds.includes(p.id)){
    if(feedbackSocket)feedbackSocket.emit('errorMsg','Du bist in dieser Runde nicht aktiv.');
    return false;
  }
  const c=byId[cardId];
  if(!c||c.type!=='normal'||!p.hand.includes(cardId)){
    if(feedbackSocket)feedbackSocket.emit('errorMsg','Diese Karte kann nicht gespielt werden.');
    return false;
  }
  if(p.selected){
    if(feedbackSocket)feedbackSocket.emit('errorMsg','Du hast bereits eine Karte gewählt.');
    return false;
  }
  if(p.lastPlayedCardId===cardId){
    const alt=p.hand.some(id=>id!==cardId&&byId[id]?.type==='normal');
    if(alt){
      if(feedbackSocket)feedbackSocket.emit('errorMsg','Diese Karte hast du gerade gespielt. Nimm diesmal eine andere.');
      return false;
    }
  }
  p.selected=cardId;
  p.lastPlayedCardId=cardId;
  p.hand.splice(p.hand.indexOf(cardId),1);
  r.played[p.id]={cardId};
  io.to(r.code).emit('cardCommitted',{playerId:p.id,name:p.name});
  io.to(r.code).emit('playerSelected',{playerId:p.id,name:p.name});
  if(feedbackSocket)feedbackSocket.emit('cardAccepted',{cardId});
  sendState(r);
  maybeEvaluate(r);
  return true;
}

function botPlaySpecial(r,p){
  if(!p?.isBot||r.phase!=='select'||p.selected)return;
  const specialsInHand=p.hand.map(id=>byId[id]).filter(c=>c?.type==='special');
  if(!specialsInHand.length)return;
  const normalCount=p.hand.filter(id=>byId[id]?.type==='normal').length;
  let c=null;
  if(r.category==='speed')c=specialsInHand.find(x=>x.effect==='rainbow');
  if(!c&&r.category==='strength')c=specialsInHand.find(x=>x.effect==='applejack');
  if(!c&&normalCount===0)c=specialsInHand.find(x=>['twilight','pinkie','fluttershy','rarity'].includes(x.effect));
  // Occasionally demonstrate a general special even when the bot still has normal cards.
  if(!c&&Math.random()<0.16)c=specialsInHand.find(x=>['pinkie','twilight'].includes(x.effect));
  if(!c)return;

  const consume=()=>{const i=p.hand.indexOf(c.id);if(i>=0)p.hand.splice(i,1)};
  if(c.effect==='rainbow'&&r.category==='speed'){
    consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:2};
  }else if(c.effect==='applejack'&&r.category==='strength'){
    consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:1};
  }else if(c.effect==='pinkie'){
    consume();p.hand.push(...drawFromPool(r,1,[],'normal'));
  }else if(c.effect==='twilight'){
    consume();p.hand.push(...drawFromPool(r,2,[],'normal'));
  }else if(c.effect==='fluttershy'){
    const d=drawFromPool(r,2,[],'normal');
    if(!d.length)return;
    consume();
    const keep=d.sort((a,b)=>(byId[b]?.[r.category]||0)-(byId[a]?.[r.category]||0))[0];
    p.hand.push(keep);
  }else if(c.effect==='rarity'){
    const swap=p.hand.find(id=>id!==c.id);
    if(!swap)return;
    consume();
    const i=p.hand.indexOf(swap);if(i>=0)p.hand.splice(i,1);
    p.hand.push(...drawFromPool(r,1,[swap],'normal'));
  }else return;
  io.to(r.code).emit('specialPlayed',{playerId:p.id,name:p.name,card:c});
  sendState(r);
}

function chooseBotCard(r,p){
  let ids=p.hand.filter(id=>byId[id]?.type==='normal');
  if(!ids.length)return null;
  if(p.lastPlayedCardId&&ids.length>1)ids=ids.filter(id=>id!==p.lastPlayedCardId);
  if(!ids.length)return null;
  // Usually plays intelligently, but sometimes chooses another legal card so the
  // test opponent does not feel perfectly deterministic.
  if(Math.random()<0.72){
    const max=Math.max(...ids.map(id=>Number(byId[id]?.[r.category]||0)));
    const best=ids.filter(id=>Number(byId[id]?.[r.category]||0)===max);
    return best[Math.floor(Math.random()*best.length)];
  }
  return ids[Math.floor(Math.random()*ids.length)];
}

function scheduleBotMove(r){
  if(!r?.ownerBotRoom||r.phase!=='select')return;
  const bot=requiredPlayers(r).find(p=>p.isBot&&!p.selected);
  if(!bot)return;
  if(r.botTimer)clearTimeout(r.botTimer);
  r.botTimer=setTimeout(()=>{
    r.botTimer=null;
    if(!rooms.has(r.code)||r.phase!=='select'||bot.selected)return;
    botPlaySpecial(r,bot);
    const cardId=chooseBotCard(r,bot);
    if(cardId)commitNormalCard(r,bot,cardId,null);
  },1050+Math.floor(Math.random()*1350));
}

function rollDiceForPlayer(r,pid){
  if(!r||r.phase!=='tie'||!r.tieIds.includes(pid)||r.dice[pid]!==undefined)return false;
  r.dice[pid]='rolling';
  io.to(r.code).emit('diceRolling',{playerId:pid,name:r.players.get(pid)?.name});
  setTimeout(()=>completeDiceRoll(r,pid),900);
  return true;
}
function scheduleBotDice(r){
  if(!r?.ownerBotRoom||r.phase!=='tie')return;
  const botId=r.tieIds.find(id=>r.players.get(id)?.isBot);
  if(!botId)return;
  setTimeout(()=>{if(rooms.has(r.code)&&r.phase==='tie')rollDiceForPlayer(r,botId)},700+Math.floor(Math.random()*600));
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
    p.hand.splice(p.hand.indexOf(lostId),1);
    penalties.push({playerId:p.id,name:p.name,card:byId[lostId]});
  }
  for(const p of req)p.selected=null;
  r.played={};r.roundBuff={};r.roundPlayerIds=[];
  io.to(r.code).emit('roundTimeout',{penalties,message:'Zeit abgelaufen! Der zu langsame Spieler verliert eine Strafkarte.'});
  sendState(r);
  if(gameOverIfNeeded(r))return;
  r.phase='result';sendState(r);startRound(r,1500);
}
function startRound(r,delay=900){
  if(r.roundTimer)clearTimeout(r.roundTimer);
  if(r.selectionTimer)clearTimeout(r.selectionTimer);
  r.roundTimer=setTimeout(()=>{
    if(!rooms.has(r.code))return;
    r.roundTimer=null;r.round++;r.phase='select';r.played={};r.dice={};r.tieIds=[];r.roundBuff={};
    for(const p of roomPlayers(r))p.selected=null;
    nextCategory(r);
    r.roundPlayerIds=roomPlayers(r).filter(p=>p.hand.length>0&&hasNormalCard(p)).map(p=>p.id);
    if(!r.roundPlayerIds.length){gameOverIfNeeded(r);return;}
    r.selectionDeadline=Date.now()+10000;
    io.to(r.code).emit('roundStart',{round:r.round,category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],deadline:r.selectionDeadline});
    sendState(r);
    r.selectionTimer=setTimeout(()=>handleSelectionTimeout(r),10050);
    scheduleBotMove(r);
  },delay);
}
function finishAfterCapture(r,winnerId,playedIds){
  const winner=r.players.get(winnerId);if(!winner)return;
  winner.hand.push(...playedIds);sendState(r);
  if(gameOverIfNeeded(r))return;
  startRound(r,1500);
}
function settleRound(r,winnerId){
  const ids=Object.values(r.played).map(x=>x.cardId),winner=r.players.get(winnerId);if(!winner)return;
  r.phase='result';
  io.to(r.code).emit('roundWinner',{winnerId,winnerName:winner.name,cards:ids.map(id=>byId[id]).filter(Boolean)});
  setTimeout(()=>finishAfterCapture(r,winnerId,ids),3300);
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
  else setTimeout(()=>{r.phase='tie';r.tieIds=tied.map(x=>x.pid);r.dice={};io.to(r.code).emit('tieStart',{playerIds:r.tieIds,names:r.tieIds.map(id=>r.players.get(id)?.name)});sendState(r);scheduleBotDice(r);},1700);
}
function drawFromPool(r,count,exclude=[],kind='any'){
  const used=new Set(roomPlayers(r).flatMap(p=>p.hand).concat(Object.values(r.played||{}).map(x=>x.cardId)).concat(exclude));
  const source=kind==='normal'?normal:(kind==='special'?specials:[...normal,...specials]);
  return shuffle(source.map(c=>c.id).filter(id=>!used.has(id))).slice(0,count);
}
function completeDiceRoll(r,pid){
  if(!r||r.phase!=='tie'||r.dice[pid]!=='rolling'||!r.tieIds.includes(pid))return;
  const value=1+Math.floor(Math.random()*6);r.dice[pid]=value;
  io.to(r.code).emit('diceRolled',{playerId:pid,name:r.players.get(pid)?.name,value});
  if(r.tieIds.every(id=>typeof r.dice[id]==='number')){
    const max=Math.max(...r.tieIds.map(id=>r.dice[id])),top=r.tieIds.filter(id=>r.dice[id]===max);
    if(top.length===1)setTimeout(()=>settleRound(r,top[0]),1300);
    else setTimeout(()=>{r.tieIds=top;r.dice={};io.to(r.code).emit('tieAgain',{playerIds:top,names:top.map(id=>r.players.get(id)?.name)});sendState(r);scheduleBotDice(r);},1300);
  }
}

io.on('connection',socket=>{
  socket.data.isOwner=false;
  socket.data.ownerAttempts=0;

  socket.on('ownerAuth',({token}={})=>{
    const ok=verifyOwnerToken(token);
    socket.data.isOwner=ok;
    socket.emit('ownerStatus',{authorized:ok,configured:!!OWNER_CODE});
  });

  socket.on('ownerVerify',({code:entered}={})=>{
    if(!OWNER_CODE)return socket.emit('ownerStatus',{authorized:false,configured:false,message:'OWNER_CODE ist auf Render noch nicht eingerichtet.'});
    socket.data.ownerAttempts=(socket.data.ownerAttempts||0)+1;
    if(socket.data.ownerAttempts>6)return socket.emit('ownerStatus',{authorized:false,configured:true,message:'Zu viele Versuche. Seite neu laden und später erneut versuchen.'});
    if(!safeEqual(String(entered||''),OWNER_CODE))return socket.emit('ownerStatus',{authorized:false,configured:true,message:'Owner-Code ist nicht korrekt.'});
    socket.data.isOwner=true;
    socket.data.ownerAttempts=0;
    socket.emit('ownerStatus',{authorized:true,configured:true,token:makeOwnerToken()});
  });

  socket.on('createBotRoom',({name,accessory,frame})=>{
    if(!socket.data.isOwner)return socket.emit('errorMsg','Dieser Testmodus ist nicht freigeschaltet.');
    if(getRoom(socket))removePlayerFromRoom(socket,false);
    let c;do c=code();while(rooms.has(c));
    const botId=`bot:${c}`;
    const r={code:c,hostId:socket.id,ownerBotRoom:true,players:new Map(),phase:'lobby',category:null,round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,botTimer:null,selectionDeadline:null,countdownUntil:null};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Little Gem').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],selected:null,lastPlayedCardId:null,isBot:false});
    r.players.set(botId,{id:botId,name:'Test-Bot',accessory:'crystalhorn',frame:'night_star',hand:[],selected:null,lastPlayedCardId:null,isBot:true});
    rooms.set(c,r);socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('createRoom',({name,accessory,frame})=>{
    let c;do c=code();while(rooms.has(c));
    const r={code:c,hostId:socket.id,ownerBotRoom:false,players:new Map(),phase:'lobby',category:null,round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundPlayerIds:[],roundTimer:null,selectionTimer:null,countdownTimer:null,botTimer:null,selectionDeadline:null,countdownUntil:null};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],selected:null,lastPlayedCardId:null,isBot:false});
    rooms.set(c,r);socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('joinRoom',({code:rc,name,accessory,frame})=>{
    const c=String(rc||'').trim().toUpperCase(),r=rooms.get(c);
    if(!r||r.ownerBotRoom)return socket.emit('errorMsg','Raum nicht gefunden.');
    if(r.phase!=='lobby')return socket.emit('errorMsg','Die Partie läuft bereits.');
    if(r.players.size>=8)return socket.emit('errorMsg','Der Raum ist voll.');
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',frame:frame||'',hand:[],selected:null,lastPlayedCardId:null,isBot:false});
    socket.join(c);socket.data.room=c;sendState(r);
  });
  socket.on('setAccessory',({accessory})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!r||r.phase!=='lobby'||!p)return;p.accessory=String(accessory||'changeling');sendState(r);});
  socket.on('setCosmetics',({accessory,frame})=>{const r=getRoom(socket),p=r?.players.get(socket.id);if(!r||r.phase!=='lobby'||!p)return;p.accessory=String(accessory||'changeling');p.frame=String(frame||'');sendState(r);});
  socket.on('startGame',()=>{
    const r=getRoom(socket);if(!r||r.hostId!==socket.id||r.phase!=='lobby')return;
    if(r.players.size<2)return socket.emit('errorMsg','Mindestens 2 Spieler werden benötigt.');
    clearTimers(r);const pool=freshPool(),ps=roomPlayers(r);
    for(const p of ps){p.hand=[];p.selected=null;p.lastPlayedCardId=null;}
    for(let k=0;k<7;k++)for(const p of ps){
      // In the private test room the AI starts with normal battle cards only.
      // This prevents the synthetic player from ever getting stuck with a hand
      // made entirely of decision-based special cards, while all human rules,
      // comparisons, reveals, captures and dice logic remain identical.
      let idx=0;
      if(p.isBot){idx=pool.findIndex(id=>byId[id]?.type==='normal');if(idx<0)idx=0;}
      const id=pool.splice(idx,1)[0];if(id)p.hand.push(id);
    }
    r.phase='countdown';r.round=0;r.countdownUntil=Date.now()+5000;sendState(r);
    io.to(r.code).emit('countdown',{seconds:5,until:r.countdownUntil});
    r.countdownTimer=setTimeout(()=>{r.countdownTimer=null;r.countdownUntil=null;startRound(r,0);},5100);
  });
  socket.on('playCard',({cardId})=>{
    const r=getRoom(socket);if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');
    const p=r.players.get(socket.id);if(!p)return;
    commitNormalCard(r,p,cardId,socket);
  });
  socket.on('useSpecial',({cardId})=>{
    const r=getRoom(socket);if(!r||r.phase!=='select')return socket.emit('errorMsg','Spezialkarten nur während der Auswahl.');
    const p=r.players.get(socket.id),c=byId[cardId];if(!p||!c||c.type!=='special'||!p.hand.includes(cardId))return;
    if(p.selected)return socket.emit('errorMsg','Du hast schon eine normale Karte gelegt.');
    const consume=()=>p.hand.splice(p.hand.indexOf(cardId),1);
    io.to(r.code).emit('specialPlayed',{playerId:p.id,name:p.name,card:c});
    if(c.effect==='rainbow'){if(r.category!=='speed')return socket.emit('errorMsg','Nur bei Schnelligkeit.');consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:2};socket.emit('specialDone',{text:'+2 Schnelligkeit.'});}
    else if(c.effect==='applejack'){if(r.category!=='strength')return socket.emit('errorMsg','Nur bei Stärke.');consume();r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:1};socket.emit('specialDone',{text:'+1 Stärke.'});}
    else if(c.effect==='pinkie'){consume();const d=drawFromPool(r,1,[],'normal');p.hand.push(...d);socket.emit('specialDone',{text:d.length?'1 neue Karte gezogen.':'Keine freie Karte.'});}
    else if(c.effect==='twilight'){consume();const d=drawFromPool(r,2,[],'normal');p.hand.push(...d);socket.emit('specialDone',{text:`${d.length} neue Karten gezogen.`});}
    else if(c.effect==='fluttershy'){const d=drawFromPool(r,2,[],'normal');if(!d.length)return socket.emit('errorMsg','Keine freie Karte.');consume();socket.data.pendingFlutter={room:r.code,choices:d};socket.emit('flutterChoices',{cards:d.map(id=>byId[id])});}
    else if(c.effect==='rarity'){const candidates=p.hand.filter(id=>id!==cardId);if(!candidates.length)return socket.emit('errorMsg','Du brauchst eine weitere Karte.');consume();socket.data.pendingRarity={room:r.code};socket.emit('rarityChoose',{cards:p.hand.map(id=>byId[id])});}
    sendState(r);
  });
  socket.on('flutterKeep',({cardId})=>{const x=socket.data.pendingFlutter,r=getRoom(socket);if(!x||!r||x.room!==r.code||!x.choices.includes(cardId))return;const p=r.players.get(socket.id);p.hand.push(cardId);socket.data.pendingFlutter=null;socket.emit('specialDone',{text:`${byId[cardId].name} behalten.`});sendState(r);});
  socket.on('raritySwap',({cardId})=>{const x=socket.data.pendingRarity,r=getRoom(socket);if(!x||!r||x.room!==r.code)return;const p=r.players.get(socket.id);if(!p.hand.includes(cardId))return;p.hand.splice(p.hand.indexOf(cardId),1);const d=drawFromPool(r,1,[cardId],'normal');if(d.length)p.hand.push(d[0]);socket.data.pendingRarity=null;socket.emit('specialDone',{text:d.length?`${byId[cardId].name} getauscht.`:'Keine freie Karte.'});sendState(r);});
  socket.on('rollDice',()=>{const r=getRoom(socket);rollDiceForPlayer(r,socket.id);});
  socket.on('returnToLobby',()=>{const r=getRoom(socket);if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');if(r.phase!=='gameover'&&r.hostId!==socket.id)return socket.emit('errorMsg','Während des Spiels kann nur der Host zurück zur Lobby.');resetToLobby(r);});
  socket.on('abortGame',()=>{const r=getRoom(socket);if(!r)return socket.emit('errorMsg','Du bist in keinem Raum.');if(r.hostId!==socket.id)return socket.emit('errorMsg','Nur der Host kann abbrechen.');if(r.phase==='lobby')return;io.to(r.code).emit('notice','Die Partie wurde abgebrochen.');resetToLobby(r);});
  socket.on('leaveRoom',()=>removePlayerFromRoom(socket));
  socket.on('disconnect',()=>removePlayerFromRoom(socket,false));
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MLP Battle Cards läuft auf http://localhost:${PORT}`));

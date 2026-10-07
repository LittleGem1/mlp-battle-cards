const path = require('path');
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

function code(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:5},()=>a[Math.floor(Math.random()*a.length)]).join(''); }
function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function roomPlayers(r){ return [...r.players.values()]; }
function publicState(r){
  return {
    code:r.code, hostId:r.hostId, phase:r.phase, category:r.category, countdownUntil:r.countdownUntil||null, selectionDeadline:r.selectionDeadline||null,
    players:roomPlayers(r).map(p=>({id:p.id,name:p.name,accessory:p.accessory,handCount:p.hand.length,selected:!!p.selected,eliminated:p.hand.length===0,lastPlayedCardId:p.lastPlayedCardId||null})),
    round:r.round
  };
}
function sendState(r){ io.to(r.code).emit('roomState',publicState(r)); for(const p of roomPlayers(r)) io.to(p.id).emit('hand',p.hand.map(id=>byId[id])); }
function nextCategory(r){ r.category=CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)]; }
function freshPool(){ return shuffle([...normal,...specials].map(c=>c.id)); }
function getRoom(socket){ const rc=socket.data.room; return rc?rooms.get(rc):null; }
function activePlayers(r){ return roomPlayers(r).filter(p=>p.hand.length>0); }
function hasNormalCard(p){ return p.hand.some(id=>byId[id]?.type==='normal'); }
function requiredRoundPlayers(r){
  const ids=(r.roundPlayerIds||[]).filter(id=>r.players.has(id));
  return ids.map(id=>r.players.get(id));
}
function maybeEvaluate(r){
  if(!r || r.phase!=='select') return;
  const expected=requiredRoundPlayers(r);
  if(expected.length && expected.every(p=>p.selected)){ if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;} r.selectionDeadline=null; evaluate(r); }
}
function clearPending(r){
  if(r.roundTimer){clearTimeout(r.roundTimer);r.roundTimer=null;}
  if(r.selectionTimer){clearTimeout(r.selectionTimer);r.selectionTimer=null;}
  r.selectionDeadline=null;
}
function resetToLobby(r){
  clearPending(r);
  r.phase='lobby'; r.category=null; r.countdownUntil=null; r.selectionDeadline=null; r.roundPlayerIds=[]; r.round=0; r.played={}; r.dice={}; r.tieIds=[]; r.roundBuff={};
  for(const p of roomPlayers(r)){ p.hand=[]; p.selected=null; p.lastPlayedCardId=null; }
  io.to(r.code).emit('backToLobby');
  sendState(r);
}
function removePlayerFromRoom(socket, notify=true){
  const r=getRoom(socket); if(!r) return;
  r.players.delete(socket.id); socket.leave(r.code); socket.data.room=null;
  socket.emit('roomLeft');
  if(!r.players.size){ clearPending(r); rooms.delete(r.code); return; }
  if(r.hostId===socket.id) r.hostId=roomPlayers(r)[0].id;
  if(notify) io.to(r.code).emit('notice','Ein Spieler hat den Raum verlassen.');
  sendState(r);
  if(r.phase==='select') maybeEvaluate(r);
}

function handleSelectionTimeout(r){
  if(!r || r.phase!=='select') return;
  r.selectionTimer=null;
  r.selectionDeadline=null;

  const timedOut=requiredRoundPlayers(r).filter(p=>!p.selected);
  if(!timedOut.length){ maybeEvaluate(r); return; }

  // Cards already committed by punctual players go back to their hands because
  // this round is cancelled and a fresh category is drawn.
  for(const [pid,entry] of Object.entries(r.played||{})){
    const p=r.players.get(pid);
    if(p && entry?.cardId && !p.hand.includes(entry.cardId)) p.hand.push(entry.cardId);
    if(p) p.selected=null;
  }

  const penalties=[];
  for(const p of timedOut){
    // Remove one random card as penalty. Prefer a normal card, but if none exists
    // any remaining card can be lost.
    const choices=p.hand.filter(id=>byId[id]?.type==='normal');
    const pool=choices.length?choices:p.hand;
    if(!pool.length) continue;
    const lostId=pool[Math.floor(Math.random()*pool.length)];
    p.hand.splice(p.hand.indexOf(lostId),1);
    penalties.push({playerId:p.id,name:p.name,card:byId[lostId]});
  }

  r.played={};
  r.roundBuff={};
  r.roundPlayerIds=[];
  io.to(r.code).emit('roundTimeout',{
    penalties,
    message:'Zeit abgelaufen! Eine Strafkarte wurde abgegeben. Neue Kategorie wird gezogen.'
  });
  sendState(r);

  const alive=activePlayers(r);
  if(alive.length<=1){
    r.phase='gameover';
    const champion=alive[0] || roomPlayers(r).sort((a,b)=>b.hand.length-a.hand.length)[0];
    io.to(r.code).emit('gameOver',{
      winnerId:champion.id,
      winnerName:champion.name,
      counts:roomPlayers(r).map(p=>({id:p.id,name:p.name,count:p.hand.length}))
    });
    sendState(r);
    return;
  }

  r.phase='result';
  sendState(r);
  startRound(r,1600);
}

function startRound(r, delay=900){
  clearPending(r);
  r.roundTimer=setTimeout(()=>{
    if(!rooms.has(r.code)) return;
    r.roundTimer=null;
    r.countdownUntil=null;
    r.round += 1;
    r.phase='select';
    r.played={};
    r.dice={};
    r.tieIds=[];
    r.roundBuff={};
    for(const p of roomPlayers(r)) p.selected=null;

    nextCategory(r);

    // Freeze the participant list for this round. This prevents a round from
    // hanging because hand contents change after a card is committed.
    r.roundPlayerIds=roomPlayers(r).filter(hasNormalCard).map(p=>p.id);

    if(!r.roundPlayerIds.length){
      r.phase='gameover';
      const champion=roomPlayers(r).sort((a,b)=>b.hand.length-a.hand.length)[0];
      io.to(r.code).emit('gameOver',{
        winnerId:champion.id,winnerName:champion.name,
        counts:roomPlayers(r).map(p=>({id:p.id,name:p.name,count:p.hand.length}))
      });
      sendState(r);
      return;
    }

    r.selectionDeadline=Date.now()+10000;
    io.to(r.code).emit('roundStart',{
      round:r.round,
      category:r.category,
      label:CATEGORY_LABEL[r.category],
      icon:CATEGORY_ICON[r.category],
      deadline:r.selectionDeadline
    });
    sendState(r);

    r.selectionTimer=setTimeout(()=>handleSelectionTimeout(r),10050);
  },delay);
}

function finishAfterCapture(r,winnerId,playedIds){
  const winner=r.players.get(winnerId); if(!winner) return;
  winner.hand.push(...playedIds);
  sendState(r);
  const alive=activePlayers(r);
  if(alive.length<=1){
    r.phase='gameover';
    const champion=alive[0] || roomPlayers(r).sort((a,b)=>b.hand.length-a.hand.length)[0];
    io.to(r.code).emit('gameOver',{winnerId:champion.id,winnerName:champion.name,counts:roomPlayers(r).map(p=>({id:p.id,name:p.name,count:p.hand.length}))});
    sendState(r); return;
  }
  startRound(r,1500);
}

function settleRound(r,winnerId){
  const playedIds=Object.values(r.played).map(x=>x.cardId);
  const winner=r.players.get(winnerId); if(!winner) return;
  r.phase='result';
  io.to(r.code).emit('roundWinner',{winnerId,winnerName:winner.name,cards:playedIds.map(id=>byId[id])});
  // Give the clients enough time to visibly animate the cards flying to the winner.
  setTimeout(()=>finishAfterCapture(r,winnerId,playedIds),1050);
}

function evaluate(r){
  const vals=[];
  for(const [pid,entry] of Object.entries(r.played)){
    const c=byId[entry.cardId]; let v=c[r.category];
    const buff=r.roundBuff[pid]||{};
    if(r.category==='speed' && buff.speed) v+=buff.speed;
    if(r.category==='strength' && buff.strength) v+=buff.strength;
    // Auch mit Spezialbonus niemals über 9: bei Gleichstand entscheidet weiter der Würfel.
    v=Math.min(9,v);
    vals.push({pid,cardId:c.id,value:v,base:Math.min(9,c[r.category]),bonus:v-Math.min(9,c[r.category])});
  }
  if(!vals.length) return;
  const max=Math.max(...vals.map(x=>x.value)); const tied=vals.filter(x=>x.value===max);
  r.phase='reveal';
  io.to(r.code).emit('reveal',{category:r.category,label:CATEGORY_LABEL[r.category],icon:CATEGORY_ICON[r.category],entries:vals.map(x=>({...x,card:byId[x.cardId],name:r.players.get(x.pid)?.name||'?'}))});
  if(tied.length===1){ setTimeout(()=>settleRound(r,tied[0].pid),2100); }
  else {
    setTimeout(()=>{
      r.phase='tie'; r.tieIds=tied.map(x=>x.pid); r.dice={};
      io.to(r.code).emit('tieStart',{playerIds:r.tieIds,names:r.tieIds.map(id=>r.players.get(id)?.name)});
      sendState(r);
    },1700);
  }
}

function drawFromPool(r,count,exclude=[]){
  const used=new Set(roomPlayers(r).flatMap(p=>p.hand).concat(Object.values(r.played||{}).map(x=>x.cardId)).concat(exclude));
  const available=shuffle([...normal,...specials].map(c=>c.id).filter(id=>!used.has(id)));
  return available.slice(0,count);
}

function completeDiceRoll(r,pid){
  if(!r || r.phase!=='tie' || r.dice[pid]!=='rolling' || !r.tieIds.includes(pid)) return;
  const value=1+Math.floor(Math.random()*6); r.dice[pid]=value;
  io.to(r.code).emit('diceRolled',{playerId:pid,name:r.players.get(pid)?.name,value});
  if(r.tieIds.every(id=>typeof r.dice[id]==='number')){
    const max=Math.max(...r.tieIds.map(id=>r.dice[id])); const top=r.tieIds.filter(id=>r.dice[id]===max);
    if(top.length===1){ setTimeout(()=>settleRound(r,top[0]),1300); }
    else { setTimeout(()=>{ r.tieIds=top; r.dice={}; io.to(r.code).emit('tieAgain',{playerIds:top,names:top.map(id=>r.players.get(id)?.name)}); sendState(r); },1300); }
  }
}

io.on('connection', socket=>{
  socket.on('createRoom',({name,accessory})=>{
    let c; do c=code(); while(rooms.has(c));
    const r={code:c,hostId:socket.id,players:new Map(),phase:'lobby',category:null,round:0,played:{},dice:{},tieIds:[],roundBuff:{},roundTimer:null,selectionTimer:null,selectionDeadline:null,roundPlayerIds:[]};
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',hand:[],selected:null,lastPlayedCardId:null});
    rooms.set(c,r); socket.join(c); socket.data.room=c; sendState(r);
  });
  socket.on('joinRoom',({code:rc,name,accessory})=>{
    const c=String(rc||'').trim().toUpperCase(); const r=rooms.get(c);
    if(!r) return socket.emit('errorMsg','Raum nicht gefunden.');
    if(r.phase!=='lobby') return socket.emit('errorMsg','Die Partie läuft bereits.');
    if(r.players.size>=8) return socket.emit('errorMsg','Der Raum ist voll.');
    r.players.set(socket.id,{id:socket.id,name:String(name||'Spieler').slice(0,24),accessory:accessory||'changeling',hand:[],selected:null,lastPlayedCardId:null});
    socket.join(c); socket.data.room=c; sendState(r);
  });
  socket.on('setAccessory',({accessory})=>{
    const r=getRoom(socket);
    if(!r||r.phase!=='lobby') return;
    const p=r.players.get(socket.id);
    if(!p) return;
    const allowed=new Set(['changeling','balloon','candy','crystalhorn','crown','halo','angelwings','batwings','magicflames','orbitcrystals','bow','scarf','goggles','gears','flowercrown','butterflies','bandages','potions','collar','bell','cape','cards','techwings','moon']);
    if(!allowed.has(accessory)) return;
    p.accessory=accessory;
    sendState(r);
  });

  socket.on('startGame',()=>{
    const r=getRoom(socket); if(!r||r.hostId!==socket.id||r.phase!=='lobby') return;
    if(r.players.size<2) return socket.emit('errorMsg','Mindestens 2 Spieler werden benötigt.');
    const pool=freshPool(); const ps=roomPlayers(r);
    for(const p of ps){ p.hand=[]; p.lastPlayedCardId=null; }
    for(let k=0;k<7;k++) for(const p of ps) p.hand.push(pool.shift());
    r.phase='countdown'; r.round=0;
    r.countdownUntil=Date.now()+5200;
    sendState(r);
    io.to(r.code).emit('countdown',{seconds:5,until:r.countdownUntil});
    setTimeout(()=>startRound(r,0),5300);
  });
  socket.on('playCard',({cardId})=>{
    const r=getRoom(socket); if(!r||r.phase!=='select') return;
    const p=r.players.get(socket.id); const c=byId[cardId];
    if(!r.roundPlayerIds?.includes(socket.id)) return socket.emit('errorMsg','Du bist in dieser Runde nicht als aktiver Spieler eingeplant.');
    if(!p||!c||c.type!=='normal'||!p.hand.includes(cardId)) return socket.emit('errorMsg','Diese Karte kann gerade nicht gespielt werden.');
    if(p.selected) return socket.emit('errorMsg','Du hast für diese Runde bereits eine Karte gewählt.');
    if(p.lastPlayedCardId===cardId){
      const hasAlternative=p.hand.some(id=>id!==cardId && byId[id]?.type==='normal');
      if(hasAlternative){
        return socket.emit('errorMsg','Diese Karte hast du gerade erst gespielt. Wähle in dieser Runde eine andere Karte.');
      }
    }
    p.selected=cardId;
    p.lastPlayedCardId=cardId;
    p.hand.splice(p.hand.indexOf(cardId),1);
    r.played[socket.id]={cardId};
    // Everyone sees a face-down card fly onto the table as soon as a player commits.
    io.to(r.code).emit('cardCommitted',{playerId:socket.id,name:p.name});
    io.to(r.code).emit('playerSelected',{playerId:socket.id,name:p.name});
    socket.emit('cardAccepted',{cardId});
    sendState(r);
    maybeEvaluate(r);
  });
  socket.on('useSpecial',({cardId})=>{
    const r=getRoom(socket); if(!r||r.phase!=='select') return;
    const p=r.players.get(socket.id); const c=byId[cardId];
    if(!p||!c||c.type!=='special'||!p.hand.includes(cardId)) return;
    const consume=()=>p.hand.splice(p.hand.indexOf(cardId),1);
    if(c.effect==='rainbow'){
      if(r.category!=='speed') return socket.emit('errorMsg','Sonic Rainboom kann nur bei Schnelligkeit eingesetzt werden.');
      consume(); r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),speed:2}; socket.emit('specialDone',{text:'+2 Schnelligkeit für deine Karte in dieser Runde.'});
    } else if(c.effect==='applejack'){
      if(r.category!=='strength') return socket.emit('errorMsg','Ehrliche Arbeit kann nur bei Stärke eingesetzt werden.');
      consume(); r.roundBuff[p.id]={...(r.roundBuff[p.id]||{}),strength:1}; socket.emit('specialDone',{text:'+1 Stärke für deine Karte in dieser Runde.'});
    } else if(c.effect==='pinkie'){
      consume(); const d=drawFromPool(r,1); p.hand.push(...d); socket.emit('specialDone',{text:d.length?'Du hast 1 neue Karte gezogen.':'Keine freie Karte mehr im Stapel.'});
    } else if(c.effect==='twilight'){
      consume(); const d=drawFromPool(r,2); p.hand.push(...d); socket.emit('specialDone',{text:`Du hast ${d.length} neue Karte${d.length===1?'':'n'} gezogen.`});
    } else if(c.effect==='fluttershy'){
      const d=drawFromPool(r,2); if(!d.length) return socket.emit('errorMsg','Keine freie Karte mehr im Stapel.');
      consume(); socket.data.pendingFlutter={room:r.code,choices:d}; socket.emit('flutterChoices',{cards:d.map(id=>byId[id])});
    } else if(c.effect==='rarity'){
      const candidates=p.hand.filter(id=>id!==cardId); if(!candidates.length) return socket.emit('errorMsg','Du brauchst noch eine andere Karte zum Tauschen.');
      consume(); socket.data.pendingRarity={room:r.code}; socket.emit('rarityChoose',{cards:p.hand.map(id=>byId[id])});
    }
    sendState(r);
    maybeEvaluate(r);
  });
  socket.on('flutterKeep',({cardId})=>{
    const x=socket.data.pendingFlutter; const r=getRoom(socket); if(!x||!r||x.room!==r.code||!x.choices.includes(cardId)) return;
    const p=r.players.get(socket.id); p.hand.push(cardId); socket.data.pendingFlutter=null; socket.emit('specialDone',{text:`${byId[cardId].name} wurde behalten.`}); sendState(r); maybeEvaluate(r);
  });
  socket.on('raritySwap',({cardId})=>{
    const x=socket.data.pendingRarity; const r=getRoom(socket); if(!x||!r||x.room!==r.code) return;
    const p=r.players.get(socket.id); if(!p.hand.includes(cardId)) return;
    p.hand.splice(p.hand.indexOf(cardId),1); const d=drawFromPool(r,1,[cardId]); if(d.length)p.hand.push(d[0]);
    socket.data.pendingRarity=null; socket.emit('specialDone',{text:d.length?`${byId[cardId].name} wurde gegen ${byId[d[0]].name} getauscht.`:'Keine freie Karte mehr im Stapel.'}); sendState(r); maybeEvaluate(r);
  });
  socket.on('rollDice',()=>{
    const r=getRoom(socket); if(!r||r.phase!=='tie'||!r.tieIds.includes(socket.id)||r.dice[socket.id]!==undefined) return;
    r.dice[socket.id]='rolling';
    io.to(r.code).emit('diceRolling',{playerId:socket.id,name:r.players.get(socket.id)?.name});
    setTimeout(()=>completeDiceRoll(r,socket.id),900);
  });
  socket.on('returnToLobby',()=>{
    const r=getRoom(socket);
    if(!r) return socket.emit('errorMsg','Du bist in keinem Raum.');
    if(r.phase==='lobby'){ sendState(r); return; }
    if(r.phase!=='gameover' && r.hostId!==socket.id){
      return socket.emit('errorMsg','Während einer laufenden Partie kann nur der Host zur Lobby zurückkehren.');
    }
    io.to(r.code).emit('notice',r.phase==='gameover'?'Zurück in die Lobby.':'Die Partie wurde beendet. Zurück in die Lobby.');
    resetToLobby(r);
  });
  socket.on('abortGame',()=>{
    const r=getRoom(socket);
    if(!r) return socket.emit('errorMsg','Du bist in keinem Raum.');
    if(r.hostId!==socket.id) return socket.emit('errorMsg','Nur der Host kann die laufende Partie abbrechen.');
    if(r.phase==='lobby'){ sendState(r); return; }
    io.to(r.code).emit('notice','Die Partie wurde vom Host abgebrochen.');
    resetToLobby(r);
  });
  socket.on('leaveRoom',()=>removePlayerFromRoom(socket));
  socket.on('disconnect',()=>removePlayerFromRoom(socket));
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MLP Battle Cards läuft auf http://localhost:${PORT}`));

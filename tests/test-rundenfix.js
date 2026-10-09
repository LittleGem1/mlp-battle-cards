const fs=require('fs'), path=require('path'), vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const catalogPath=fs.existsSync(path.join(root,'cards.js'))?path.join(root,'cards.js'):path.resolve(root,'../MLP_13_KARTEN_COCKATRICE_KOMPAKT/cards.js');
const {normal,specials,artifacts,byId}=require(catalogPath);
let clock=Date.now(),nextId=1; const tasks=new Map();
function schedule(fn,delay,interval=false){const n=nextId++;tasks.set(n,{fn,at:clock+Math.max(0,Number(delay)||0),delay,interval});return n;}
const timers={setTimeout:(f,d)=>schedule(f,d),clearTimeout:n=>tasks.delete(n),setInterval:(f,d)=>({unref(){},_id:schedule(f,d,true)}),clearInterval:n=>tasks.delete(n?._id)};
function advance(ms){const end=clock+ms;let n=0;while(true){let next=null;for(const [id,t] of tasks)if(t.at<=end&&(!next||t.at<next.t.at))next={id,t};if(!next)break;if(++n>10000)throw Error('Too many timers');clock=next.t.at;if(next.t.interval)next.t.at+=next.t.delay;else tasks.delete(next.id);next.t.fn();}clock=end;}
let connectionHandler;
class FakeIO{constructor(){this.sockets={sockets:new Map()};this.events=[];}on(name,fn){if(name==='connection')connectionHandler=fn;}to(room){return {emit:(event,data)=>{this.events.push({room,event,data});}};}}
const io=new FakeIO();
const express=()=>({use(){}});express.static=()=>()=>{};
const server={listen:()=>{}};
const pg={createProfileStore:()=>null};
function localRequire(name){if(name==='path')return path;if(name==='http')return {createServer:()=>server};if(name==='express')return express;if(name==='socket.io')return {Server:class{constructor(){return io;}}};if(name==='./cards')return {normal,specials,artifacts,byId};if(name==='crypto')return crypto;if(name==='./player_profiles')return pg;throw Error('Unexpected require '+name);}
const FakeDate=class extends Date{static now(){return clock;}};
const context={__dirname:root,require:localRequire,console,process:{env:{PORT:3011}},Date:FakeDate,Math,Map,Set,Object,Array,Number,String,Boolean,JSON,crypto,...timers};
const code=fs.readFileSync(path.join(root,'server.js'),'utf8')+'\n;globalThis.__internals={rooms,maybeEvaluate,startRound,guardRoomProgress,settleRound,finishRoundCycle,resetRoundFX,sendState};';
vm.runInNewContext(code,context,{filename:'server.js'});
const S=context.__internals;
function mkSocket(id){const handlers={};const s={id,data:{},sent:[],on:(n,fn)=>handlers[n]=fn,emit:(n,d)=>s.sent.push({name:n,data:d}),join(){},leave(){},disconnect(){this.fire('disconnect');io.sockets.sockets.delete(this.id);},fire(n,data){if(!handlers[n])throw Error('No handler '+n);return handlers[n](data)}};io.sockets.sockets.set(id,s);connectionHandler(s);return s;}
function tkn(socket){return socket.sent.find(x=>x.name==='roomResumeToken')?.data;}
const a=mkSocket('a1'),b=mkSocket('b1');
a.fire('createRoom',{name:'Alice',accessory:'changeling',frame:'sakura'});
const room=tkn(a);assert(room&&room.token.length===64,'Room secret issued');
b.fire('joinRoom',{code:room.code,name:'Bob',accessory:'changeling',frame:'sakura'});
assert.equal(S.rooms.get(room.code).players.size,2);
const r=S.rooms.get(room.code);
a.fire('startGame');assert.equal(r.phase,'ready');
a.fire('toggleReady');b.fire('toggleReady');advance(1000);assert.equal(r.phase,'countdown');advance(5150);advance(4150);assert.equal(r.phase,'select');
assert(r.selectionDeadline>clock);
const roundNumber=r.round;
// A reconnect must NOT delete the player's cards/placement, and must rekey the current round.
const aPlayer=r.players.get('a1');const handBefore=[...aPlayer.hand];
a.fire('disconnect');io.sockets.sockets.delete('a1');assert.equal(r.players.size,2,'room seat retained');
const a2=mkSocket('a2');a2.fire('resumeRoom',room);assert.equal(r.players.size,2);assert.equal(r.players.get('a2'),aPlayer);assert.equal(r.roundPlayerIds.includes('a2'),true);assert.equal(r.players.get('a2').hand.join(','),handBefore.join(','));assert(a2.sent.some(x=>x.name==='roomResumed'));
// Normal 30s selection deadline still completes and starts another round.
advance(32000);assert(['result','roundintro','select','gameover'].includes(r.phase),'selection should not freeze');advance(4000);assert(r.round>=roundNumber+1||r.phase==='gameover','round proceeds');
// Special skipped everybody: no zero-player permanent deadlock.
r.phase='select';r.roundPlayerIds=[];S.maybeEvaluate(r);assert.equal(r.phase,'result');
advance(2500);assert.notEqual(r.phase,'result','zero-player round continues');
// Tie must auto-roll if a disconnected client does not press the dice button.
r.phase='tie';r.tieIds=['a2','b1'];r.dice={};r.watchdogTag=r.round+':tie';r.watchdogSince=clock-20000;
S.guardRoomProgress(r,clock);
assert(typeof r.dice.a2==='number'&&typeof r.dice.b1==='number','dice rolled automatically');
// Late callbacks may not reactivate a phase after the host has gone to the lobby.
r.phase='lobby';const before=r.phase;
S.settleRound(r,'a2');assert.equal(r.phase,before,'stale finisher never re-opens a lobby round');
// If both players cannot play any normal card, the match must end rather than freeze.
r.phase='result';for(const p of r.players.values())p.hand= p.hand.filter(id=>byId[id]?.type!=='normal');
S.startRound(r,0);advance(1100);assert.equal(r.phase,'gameover','empty-hand match ends');
// Asset regression checks.
for(const f of ['public/assets/cards_fixes/17_Cozy_Glow.webp','public/assets/cards_new/097_Chandra.webp','public/assets/cards_new/099_Kik.webp'])assert(fs.existsSync(path.join(root,f)),f);
assert(fs.readFileSync(path.join(root,'public/assets/cards_fixes/17_Cozy_Glow.webp')).equals(fs.readFileSync('/mnt/data/17_Cozy_Glow.webp')),'uploaded Cozy file unchanged');
console.log('OK: lobby, room secrets, reconnect, hand preservation, 30s timeout, zero-participant rounds, dice fallback, stale event protection, no-card gameover, 3 assets.');

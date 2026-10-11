'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {normal,specials,artifacts,byId}=require('../cards');
let clock=Date.now(),sequence=0;const tasks=new Map();
function addTask(cb,delay,repeat=false){const id=++sequence;tasks.set(id,{cb,repeat,delay:Math.max(1,Number(delay)||1),at:clock+(Number(delay)||0)});return id}
const timers={setTimeout:(fn,ms)=>addTask(fn,ms),clearTimeout:(id)=>tasks.delete(id),setInterval:(fn,ms)=>({unref(){},_id:addTask(fn,ms,true)}),clearInterval:(id)=>tasks.delete(id?._id??id)};
function advance(ms){const end=clock+ms;let count=0;while(true){let upcoming=null;for(const [id,t] of tasks){if(t.at<=end && (!upcoming || t.at<upcoming.t.at))upcoming={id,t}}if(!upcoming)break;if(++count>30000)throw Error('Loop');clock=upcoming.t.at;if(upcoming.t.repeat)upcoming.t.at+=upcoming.t.delay;else tasks.delete(upcoming.id);upcoming.t.cb()}clock=end}
let connect;
class IO{constructor(){this.sockets={sockets:new Map()};this.events=[]}on(name,cb){if(name==='connection')connect=cb}to(room){return {emit:(type,data)=>this.events.push({room,type,data})}}}
const io=new IO(),express=()=>({use(){}});express.static=()=>()=>{};
const server={listen(){}};
function fakeRequire(mod){if(mod==='path')return path;if(mod==='http')return {createServer:()=>server};if(mod==='express')return express;if(mod==='socket.io')return {Server:class{constructor(){return io}}};if(mod==='./cards')return {normal,specials,artifacts,byId};if(mod==='./player_profiles')return {createProfileStore:()=>null};if(mod==='crypto')return crypto;if(mod==='./host_gallery_autocatalog')return require('../host_gallery_autocatalog');throw Error('Unexpected require: '+mod)}
const FakeDate=class extends Date{static now(){return clock}};
const ctx={__dirname:root,require:fakeRequire,console,process:{env:{PORT:3099}},Date:FakeDate,Math,Map,Set,Object,Array,Number,String,Boolean,JSON,crypto,Buffer,...timers};
const source=fs.readFileSync(path.join(root,'server.js'),'utf8');
vm.runInNewContext(source+'\n;globalThis.qa={rooms,beginRewardChoice,resolveRewardChoice,beginMatch}',ctx,{filename:'server.js'});
function socket(id){const handlers={};const s={id,data:{},sent:[],handshake:{address:id},on:(n,fn)=>handlers[n]=fn,emit(n,data){this.sent.push({n,data})},join(){},leave(){},disconnect(){},fire(n,data){assert(handlers[n],'No handler '+n);return handlers[n](data)}};io.sockets.sockets.set(id,s);connect(s);return s;}
const a=socket('anna'),b=socket('bert');a.fire('createRoom',{name:'Anna',accessory:'changeling',frame:''});const ticket=a.sent.find(x=>x.n==='roomResumeToken').data;
b.fire('joinRoom',{code:ticket.code,name:'Bert',accessory:'changeling',frame:''});const r=ctx.qa.rooms.get(ticket.code);
a.fire('startGame');a.fire('toggleReady');b.fire('toggleReady');advance(11000);
assert.equal(r.phase,'select');assert.equal(r.players.get(a.id).hand.length,7);
const pa=r.players.get(a.id),pb=r.players.get(b.id);
// Add the test special without ever changing catalogue or player collection globally.
const specIndex=pa.hand.findIndex(x=>byId[x]?.type==='special');assert(specIndex>=0);pa.hand[specIndex]='s94';
const placed=pb.hand.find(id=>byId[id]?.type==='normal');assert(placed);
pb.hand.splice(pb.hand.indexOf(placed),1);r.played[b.id]={cardIds:[placed],cardId:placed};pb.selected=true;
const bHandsBefore=io.events.filter(x=>x.room===b.id&&x.type==='hand').length;
a.fire('useSpecial',{cardId:'s94'});
assert(io.events.some(x=>x.type==='windchaosAnimation'),'Tornado event sent');
assert.equal(pa.hand.includes('s94'),false,'caster used special');
assert.equal(pa.hand.filter(id=>byId[id]?.type==='normal').length,6,'caster keeps 6 normals');
assert.equal(pb.hand.filter(id=>byId[id]?.type==='normal').length,6,'enemy receives 6 normals');
assert.equal(pb.hand.filter(id=>byId[id]?.type==='special').length,1,'enemy receives 1 special');
assert.equal(pb.selected,null,'enemy selection reset');
assert(!r.played[b.id],'old placed card discarded');
assert.equal(io.events.filter(x=>x.room===b.id&&x.type==='hand').length,bHandsBefore,'enemy NEW hand stays hidden during tornado');
b.fire('playCard',{cardId:pb.hand[0]});assert(b.sent.some(x=>x.n==='errorMsg'&&/Windchaos/.test(x.data)),'actions blocked during tornado');
advance(4450);
assert.equal(r.windchaosUntil,0,'tornado finished');
assert(io.events.filter(x=>x.room===b.id&&x.type==='hand').length>bHandsBefore,'enemy gets new hand after animation');
assert(r.selectionDeadline-clock>29000,'selection time reset after tornado');
// Winner reconnect during their goldcard-choice phase: timeout must use updated socket id.
if(r.selectionTimer){tasks.delete(r.selectionTimer);r.selectionTimer=null}
r.phase='result';r.round=6;ctx.qa.beginRewardChoice(r,a.id);
assert.equal(r.phase,'rewardchoice');assert(r.pendingReward?.cards?.length,'gold selection offered');
const pending=r.pendingReward;
a.fire('disconnect');
const resumed=socket('anna-new');resumed.fire('resumeRoom',ticket);
assert.equal(r.pendingReward.winnerId,'anna-new','pending reward migrated');
advance(18050);
assert.equal(r.pendingReward,null,'auto-selection finished after reconnect');
assert(io.events.some(x=>x.type==='rewardPhaseDone'),'reward finished and game can continue');
// Seven-round bad-luck protection offers an artifact no later than the next eligible gold choice.
if(r.roundTimer){tasks.delete(r.roundTimer);r.roundTimer=null}
r.phase='result';r.round=7;r.artifactRewardCooldown=0;r.lastArtifactOfferRound=0;
r.roundFX={artifactBlocked:false};
ctx.qa.beginRewardChoice(r,'anna-new');
assert(r.pendingReward?.cards?.some(id=>byId[id]?.type==='artifact'),'pity guarantee artifact offer');
assert(r.pendingReward.cards.filter(id=>byId[id]?.type==='artifact').length<=1,'max one artifact per gold choice');
console.log('OK: Windchaos visual timing, 6+1 enemy, caster preserved, blocked play, 30s selection, reconnect-safe reward auto-pick, artifact pity');

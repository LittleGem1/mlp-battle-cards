'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const {normal,specials,artifacts,byId}=require(path.join(root,'cards.js'));
const serverCode=process.argv[2] || path.join(root,'server.js');
const calls=[];
const store={choose:async (id,accessory,frame)=>{calls.push({id,accessory,frame});return {accessory,frame}}};
let onConnection;
const io={events:[],sockets:{sockets:new Map()},on(event,cb){if(event==='connection')onConnection=cb;},to(room){return {emit:(type,data)=>this.events.push({room,type,data})}}};
const express=()=>({use(){}});express.static=()=>()=>{};
const fakeServer={listen(){}};
const req=(m)=>{
  if(m==='path')return path;
  if(m==='http')return {createServer:()=>fakeServer};
  if(m==='express')return express;
  if(m==='socket.io')return {Server:class{constructor(){return io}}};
  if(m==='./cards')return {normal,specials,artifacts,byId};
  if(m==='crypto')return crypto;
  if(m==='./player_profiles')return {createProfileStore:()=>store};
  if(m==='./host_gallery_autocatalog')return require(path.join(root,'host_gallery_autocatalog'));
  throw Error(`Unexpected require: ${m}`)
};
const clock={setTimeout:(fn)=>({fn}),clearTimeout(){},setInterval:(fn)=>({unref(){}}),clearInterval(){}};
const ctx={__dirname:root,require:req,console,process:{env:{PORT:3999,DATABASE_URL:'mock'}},Date,Math,Map,Set,Object,Array,Number,String,Boolean,JSON,crypto,Buffer,...clock};
vm.runInNewContext(fs.readFileSync(serverCode,'utf8')+'\n;globalThis.test={rooms,publicState}',ctx,{filename:serverCode});
function makeSocket(id){
  const handlers={};const s={id,data:{profile:{id,items:['changeling','moon'],frames:['sakura','forest'],accessory:'changeling',frame:'sakura'}},sent:[],
   handshake:{address:id},on(name,fn){handlers[name]=fn},emit(name,data){s.sent.push({name,data})},join(){},leave(){},disconnect(){},
   fire(name,data){assert(handlers[name],`Missing event ${name}`);return handlers[name](data)}};
  io.sockets.sockets.set(id,s);onConnection(s);return s;
}
const a=makeSocket('host'),b=makeSocket('guest');
a.fire('createRoom',{name:'Host',accessory:'changeling',frame:'sakura'});
const r=[...ctx.test.rooms.values()][0];
b.fire('joinRoom',{code:r.code,name:'Guest',accessory:'changeling',frame:'sakura'});
const person=r.players.get(a.id);assert.equal(person.frame,'sakura');
// Existing lobby still allows changes.
a.fire('setCosmetics',{accessory:'moon',frame:'forest'});
assert.equal(person.accessory,'moon');assert.equal(person.frame,'forest');
// During a game an attempt should NOT silently change the room player.
r.phase='select';a.fire('setCosmetics',{accessory:'changeling',frame:'sakura'});
assert.equal(person.frame,'forest');
// Gameover but not back yet is also NOT a lobby.
r.phase='gameover';r.postGameReady=new Set();
a.fire('setCosmetics',{accessory:'changeling',frame:'sakura'});
assert.equal(person.frame,'forest');
// After returning to post-game lobby, the change must immediately work
// before all other players are back.
r.postGameReady.add('host');
a.fire('setCosmetics',{accessory:'changeling',frame:'sakura'});
assert.equal(person.accessory,'changeling');assert.equal(person.frame,'sakura','Post-game lobby cosmetic change must update roomState immediately');
assert(io.events.some(e=>e.type==='roomState'&&e.data.phase==='gameover'&&e.data.players.some(p=>p.id==='host'&&p.frame==='sakura')));
// A locked frame may not be selected even in the post-game lobby.
a.fire('setCosmetics',{accessory:'changeling',frame:'velvet'});
assert.equal(person.frame,'sakura');
assert(a.sent.some(m=>m.name==='errorMsg'&&/gesperrt/.test(m.data)));
// Profile database path must also sync this transition.
(async()=>{
 await a.fire('profileChoose',{accessory:'moon',frame:'forest'});
 assert.equal(calls.at(-1).frame,'forest');
 assert.equal(person.frame,'forest');
 // Normal lobby remains functional after a reset.
 r.phase='lobby';r.postGameReady=new Set();
 a.fire('setCosmetics',{accessory:'changeling',frame:'sakura'});
 assert.equal(person.frame,'sakura');
 // Selection for player who is still watching result must remain denied.
 r.phase='gameover';r.postGameReady=new Set(['host']);
 b.fire('setCosmetics',{accessory:'moon',frame:'forest'});
 assert.equal(r.players.get('guest').frame,'sakura');
 console.log('PASS: lobby, game, postgame pre/post ready, locked cosmetics, DB choice, other player isolation');
})().catch(error=>{console.error(error);process.exitCode=1});

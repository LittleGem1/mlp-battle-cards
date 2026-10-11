'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const serverCode = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const starterProfile = (id) => ({id, items:['changeling','balloon','candy'], frames:['sakura','candy'], accessory:'changeling', frame:'sakura'});
const awardedProfile = (id) => ({id, items:['changeling','balloon','candy','item_apple'], frames:['sakura','candy','forest'], accessory:'changeling', frame:'sakura'});
const awards=[];const choices=[];
const store={
  awardWin: async (id, matchId)=>{awards.push({id,matchId});return {profile:awardedProfile(id),reward:{kind:'item',key:'item_apple'}};},
  choose: async (id,accessory,frame)=>{choices.push({id,accessory,frame});return {accessory,frame}}
};
const io={events:[],sockets:{sockets:new Map()},on(event,cb){if(event==='connection')onConnection=cb},to(room){return {emit:(type,data)=>io.events.push({room,type,data})}}};
let onConnection;
const express=()=>({use(){}});express.static=()=>()=>{};
const fakeServer={listen(){}};
const req=(name)=>{
  if(name==='path')return path;
  if(name==='http')return {createServer:()=>fakeServer};
  if(name==='express')return express;
  if(name==='socket.io')return {Server:class {constructor(){return io}}};
  if(name==='./cards')return {normal:[],specials:[],artifacts:[],byId:{}};
  if(name==='crypto')return crypto;
  if(name==='./player_profiles')return {createProfileStore:()=>store};
  if(name==='./asset_bandwidth_optimization')return ()=>{};
  if(name==='./host_gallery_autocatalog')return {galleryCards:()=>[]};
  throw new Error(`Unknown module ${name}`);
};
const clock={setTimeout:()=>({}),clearTimeout(){},setInterval:()=>({unref(){}}),clearInterval(){}};
const ctx={__dirname:root,require:req,console,process:{env:{PORT:3000,DATABASE_URL:'mock'}},Date,Math,Map,Set,Object,Array,Number,String,Boolean,JSON,Buffer,...clock};
vm.runInNewContext(serverCode + '\n;globalThis.test={rooms,endGame,publicState}',ctx,{filename:'server.js'});
function socket(id){
  const handlers={};const s={id,data:{profile:starterProfile(id)},sent:[],handshake:{address:id},
    on(name,fn){handlers[name]=fn},emit(name,data){s.sent.push({name,data})},join(){},leave(){},disconnect(){},
    fire(name,data){assert(handlers[name], `No handler for ${name}`);return handlers[name](data)}
  };
  io.sockets.sockets.set(id,s);onConnection(s);return s;
}
async function test(){
  const alice=socket('alice'),bob=socket('bob');
  alice.fire('createRoom',{name:'Alice',accessory:'changeling',frame:'sakura'});
  const room=[...ctx.test.rooms.values()][0];
  bob.fire('joinRoom',{code:room.code,name:'Bob',accessory:'changeling',frame:'sakura'});
  assert(room.players.get('alice'));
  // Before a win a locked reward is rejected.
  await alice.fire('profileChoose',{accessory:'item_apple',frame:'forest'});
  assert(alice.sent.some(x=>x.name==='profileSaveError'&&x.data.includes('gesperrt')));
  assert.equal(choices.length,0);
  // Winning unlocks the item in DB AND the server-side live session.
  ctx.test.endGame(room,room.players.get('alice'));
  await Promise.resolve();await Promise.resolve();
  assert.equal(awards.length,1);
  assert(alice.data.profile.items.includes('item_apple'));
  assert(alice.data.profile.frames.includes('forest'));
  assert(alice.sent.some(x=>x.name==='profileWinReward'));
  // Directly after reward, still on gameover screen; self + other players see change.
  await alice.fire('profileChoose',{accessory:'item_apple',frame:'forest'});
  assert.equal(choices.length,1);
  assert.equal(room.players.get('alice').accessory,'item_apple');
  assert.equal(room.players.get('alice').frame,'forest');
  assert(io.events.some(x=>x.type==='roomState'&&x.data.phase==='gameover'&&x.data.players.some(p=>p.id==='alice'&&p.accessory==='item_apple'&&p.frame==='forest')));
  assert(alice.sent.some(x=>x.name==='profileSaved'&&x.data.frame==='forest'));
  // A visual-only choice may also update players while a match is in progress.
  room.phase='select';
  await alice.fire('profileChoose',{accessory:'balloon',frame:'sakura'});
  assert.equal(room.players.get('alice').accessory,'balloon');
  assert.equal(room.players.get('alice').frame,'sakura');
  assert(io.events.some(x=>x.type==='roomState'&&x.data.phase==='select'&&x.data.players.some(p=>p.id==='alice'&&p.accessory==='balloon')));
  // Other player's choices not changed.
  assert.equal(room.players.get('bob').accessory,'changeling');
  assert.equal(room.players.get('bob').frame,'sakura');
  assert(css.includes('V19: Gewonnene Rahmen/Items'));
  assert(css.includes('.nameplate[class*="item_"] > .decor'));
  assert(css.includes('.nameplate.has-frame > .name-frame'));
  assert(serverCode.includes("require('./asset_bandwidth_optimization')(app)"));
  console.log('PASS V19: Gewinn freigeschaltet, direkt ausrüstbar, gameover-/Spielraum-Sync, gesperrte Items gesichert, CSS, V18 erhalten');
}
test().catch(e=>{console.error(e);process.exitCode=1});

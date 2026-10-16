'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const path=require('node:path');
const states=new Map(), wins=new Map();
function clone(a){return JSON.parse(JSON.stringify(a))}
class FakePool {
  async query(sql,args){return FakeClient.prototype.query.call(this,sql,args)}
  async connect(){return new FakeClient()}
  async end(){}
}
class FakeClient {
  async query(sql,args=[]){
    const s=sql.trim();
    if(/^(BEGIN|COMMIT|ROLLBACK|CREATE TABLE|CREATE INDEX|ALTER TABLE)/.test(s))return {rowCount:0,rows:[]};
    if(s.startsWith('INSERT INTO mlp_player_profiles')){
      const row={id:args[0],item_unlocks:JSON.parse(args[1]),frame_unlocks:JSON.parse(args[2]),selected_item:args[3],selected_frame:args[4]};
      states.set(row.id,row);return {rowCount:1,rows:[clone(row)]};
    }
    if(s.startsWith('SELECT id FROM mlp_player_accounts WHERE username_norm='))return {rowCount:0,rows:[]};
    if(s.startsWith('INSERT INTO mlp_player_accounts'))return {rowCount:1,rows:[]};
    if(s.startsWith('INSERT INTO mlp_player_sessions'))return {rowCount:1,rows:[]};
    if(s.startsWith('SELECT * FROM mlp_player_profiles')){
      const row=states.get(args[0]);return {rowCount:row?1:0,rows:row?[clone(row)]:[]};
    }
    if(s.startsWith('UPDATE mlp_player_profiles SET selected_item')){
      const row=states.get(args[0]);row.selected_item=args[1];row.selected_frame=args[2];return {rowCount:1,rows:[]};
    }
    if(s.startsWith('UPDATE mlp_player_profiles SET item_unlocks')){
      const row=states.get(args[0]);row.item_unlocks=JSON.parse(args[1]);row.frame_unlocks=JSON.parse(args[2]);return {rowCount:1,rows:[]};
    }
    if(s.startsWith('SELECT reward FROM mlp_cosmetic_wins')){
      const reward=wins.get(args[0]+':'+args[1]);return {rowCount:reward?1:0,rows:reward?[{reward:clone(reward)}]:[]};
    }
    if(s.startsWith('INSERT INTO mlp_cosmetic_wins')){
      wins.set(args[0]+':'+args[1],JSON.parse(args[2]));return {rowCount:1,rows:[]};
    }
    throw new Error('Unexpected SQL: '+s);
  }
  release(){}
}
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){if(request==='pg')return {Pool:FakePool};return originalLoad.apply(this,arguments)};
const {createProfileStore,ITEMS,FRAMES,STARTER_ITEMS,STARTER_FRAMES}=require(path.resolve(__dirname,'../player_profiles.js'));
(async()=>{
  assert.equal(createProfileStore(null),null);
  const db=createProfileStore('postgres://test');
  const a=await db.login({legacy:{items:['crown','item_mirror','unknown'],frames:['ice','bad'],accessory:'crown',frame:'ice'}});
  assert.equal(a.created,true);
  assert.ok(a.profile.items.includes('crown'));
  assert.ok(!a.profile.items.includes('unknown'));
  assert.ok(a.profile.frames.includes('ice'));
  assert.ok(STARTER_ITEMS.every(x=>a.profile.items.includes(x)));
  assert.ok(STARTER_FRAMES.every(x=>a.profile.frames.includes(x)));
  assert.equal(a.profile.accessory,'crown');
  const b=await db.login({token:a.token,legacy:{items:ITEMS,frames:FRAMES}});
  assert.equal(b.created,false);
  assert.deepEqual(b.profile.items,a.profile.items,'browser cannot overwrite existing account');
  await assert.rejects(()=>db.login({token:'f'.repeat(64)}),/Profil nicht gefunden/);
  await assert.rejects(()=>db.choose(a.profile.id,'no_such_item','ice'),/noch nicht freigeschaltet/);
  const picked=await db.choose(a.profile.id,'crown','ice');
  assert.equal(picked.frame,'ice');
  const first=await db.awardWin(a.profile.id,'match_unique_123');
  assert.ok(['item','frame'].includes(first.reward.kind));
  const second=await db.awardWin(a.profile.id,'match_unique_123');
  assert.equal(second.alreadyAwarded,true);
  assert.deepEqual(second.reward,first.reward);
  const fresh=await db.login({token:a.token});
  assert.deepEqual(fresh.profile.items,first.profile.items,'persistent items after login');
  assert.deepEqual(fresh.profile.frames,first.profile.frames,'persistent frames after login');
  assert.ok(first.reward.kind==='item'?fresh.profile.items.includes(first.reward.key):fresh.profile.frames.includes(first.reward.key));
  for(let i=0;i<100;i++)await db.awardWin(a.profile.id,'match_extra_'+i);
  const all=await db.login({token:a.token});
  assert.equal(all.profile.items.length,ITEMS.filter(k=>!k.startsWith('tester_')).length);
  assert.equal(all.profile.frames.length,FRAMES.filter(k=>!k.startsWith('tester_')).length);
  assert.ok(!all.profile.items.some(k=>k.startsWith('tester_')),'Tester-Items sind kein Zufallsgewinn');
  assert.ok(!all.profile.frames.some(k=>k.startsWith('tester_')),'Tester-Rahmen sind kein Zufallsgewinn');
  assert.equal((await db.awardWin(a.profile.id,'match_complete_999')).reward.kind,'complete');
  // A new account must never get arbitrary localStorage unlocks supplied by a client.
  const forged=await db.accountRegister({username:'NeueSpielerin',password:'sicheres-demo-passwort',legacy:{items:ITEMS,frames:FRAMES,accessory:'crown',frame:'ice'}});
  assert.deepEqual(forged.profile.items,STARTER_ITEMS,'a new account cannot inject unlocked items');
  assert.deepEqual(forged.profile.frames,STARTER_FRAMES,'a new account cannot inject unlocked frames');
  const different=await db.login({legacy:{}});
  assert.ok(different.profile.items.length===STARTER_ITEMS.length,'profiles do not share earned items');
  assert.notEqual(different.token,a.token);
  console.log('OK: 14 Profiltests (Import, Isolation, Login, Auswahl, Persistenz, Belohnung, Duplikatschutz, Vollständigkeit)');
  await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});

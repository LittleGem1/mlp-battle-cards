'use strict';
const assert=require('node:assert/strict');
const {ITEMS,FRAMES,STARTER_ITEMS,STARTER_FRAMES,asProfile,testerGiftForUsername}=require('../player_profiles');
const gifts={
  mimsch:['tester_mimsch','tester_mimsch_claws'],
  chandra:['tester_chandra','tester_chandra_crown'],
  littlegem:['tester_little_gem','tester_little_gem_angel'],
  inpherno:['tester_inpherno','tester_inpherno_weapon']
};
for(const [user,[frame,item]] of Object.entries(gifts)){
  const gift=testerGiftForUsername(user);
  assert.equal(gift.frame,frame);
  assert.equal(gift.item,item);
  assert(ITEMS.includes(item));
  assert(FRAMES.includes(frame));
  assert(!STARTER_ITEMS.includes(item));
  assert(!STARTER_FRAMES.includes(frame));
}
assert.equal(testerGiftForUsername('Little Gem').key,'little_gem');
assert.equal(testerGiftForUsername('LITTLE_GEM').key,'little_gem');
assert.equal(testerGiftForUsername('mImScH').key,'mimsch');
assert.equal(testerGiftForUsername('other'),null);
const original=asProfile({id:'p',item_unlocks:[],frame_unlocks:[],selected_item:'changeling',selected_frame:'sakura'});
assert.equal(original.testerGiftClaimed,false);
assert.equal(original.title,'');
const claimed=asProfile({id:'p',item_unlocks:['tester_chandra_crown'],frame_unlocks:['tester_chandra'],selected_item:'tester_chandra_crown',selected_frame:'tester_chandra',tester_gift_key:'chandra',selected_title:'die Königin'});
assert.equal(claimed.testerGiftClaimed,true);
assert.equal(claimed.title,'die Königin');
assert.equal(claimed.accessory,'tester_chandra_crown');
assert.equal(claimed.frame,'tester_chandra');
const falseTitle=asProfile({...claimed,tester_gift_key:'mimsch'});
assert.equal(falseTitle.title,'');
// Only Chandra and Inpherno get the HQ replacement present again in the gift popup.
for(const who of ['chandra','inpherno']){
  const old=asProfile({
    id:'p',item_unlocks:[],frame_unlocks:[],selected_item:'changeling',selected_frame:'sakura',
    tester_gift_key:who,tester_gift_version:0
  });
  assert.equal(old.testerGiftClaimed,true);
  assert.equal(old.testerGiftUpdatePending,true);
  const newGift=asProfile({...old, tester_gift_key:who,tester_gift_version:2});
  assert.equal(newGift.testerGiftUpdatePending,false);
}
for(const who of ['mimsch','little_gem']){
  const unchanged=asProfile({
    id:'p',item_unlocks:[],frame_unlocks:[],selected_item:'changeling',selected_frame:'sakura',
    tester_gift_key:who,tester_gift_version:0
  });
  assert.equal(unchanged.testerGiftUpdatePending,false);
}
console.log('✓ Probetester-Geschenke: Namen, Berechtigungen, Inventar, Titel');


const fs=require('node:fs');
const path=require('node:path');
// Previous mistaken name-forced frames must never be served or applied again.
const obsolete=['mimsch_exklusiv.webp','chandra_exklusiv.webp','little_gem_exklusiv.webp','inpherno_exklusiv.webp'];
for(const old of obsolete){
  assert.equal(fs.existsSync(path.join(__dirname,'../public/assets/frames',old)),false,
    'Old wrongly assigned frame must be absent: '+old);
}
const client=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
assert.equal(client.includes('NAMED_EXCLUSIVE_FRAMES'),false);
assert.equal(client.includes('forcedFrameForName'),false);
for(const old of obsolete)assert.equal(client.includes(old),false);
console.log('✓ Alte falsche Namensrahmen restlos aus der aktuellen Spielversion entfernt');

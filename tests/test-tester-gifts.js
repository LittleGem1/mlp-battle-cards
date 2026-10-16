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
console.log('✓ Probetester-Geschenke: Namen, Berechtigungen, Inventar, Titel');

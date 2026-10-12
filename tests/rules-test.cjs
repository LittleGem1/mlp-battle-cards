const assert=require('node:assert/strict');
const {definitions,halveCategoryValue,sweetieEffect,helementsEffect}=require('../server/special-cards.cjs');
assert.equal(definitions.sweetie_bot.type,'special');
assert.equal(halveCategoryValue(9),5);
assert.equal(halveCategoryValue(8),4);
assert.equal(sweetieEffect({category:'energie',playedCard:{energie:7},targetPlayerId:'p2'}).newValue,4);
assert.equal(helementsEffect({allArtifactIds:['a','a','b'],ownedArtifactIds:['a']}).grantedArtifactId,'b');
assert.equal(helementsEffect({allArtifactIds:['a'],ownedArtifactIds:['a']}).grantedArtifactId,null);
console.log('OK: special card helpers');

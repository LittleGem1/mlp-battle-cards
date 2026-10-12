"use strict";
// Server-side utilities only. Integrate into the existing match/event handlers.
const crypto = require('node:crypto');
const SWEETIE_BOT = 'sweetie_bot';
const HELEMENTS_OF_ARMORY = 'helements_of_armory';
const definitions = Object.freeze({
  [SWEETIE_BOT]: { id:SWEETIE_BOT, name:'Sweetie Bot', type:'special', image:'/assets/sweetie-bot.png', ability:'total_elimination_protocol' },
  [HELEMENTS_OF_ARMORY]: { id:HELEMENTS_OF_ARMORY, name:'Helements of Armory', type:'special', image:'/assets/helements-of-armory.png', ability:'grant_missing_artifact' }
});
function assert(condition, message) { if (!condition) throw new Error(message); }
function halveCategoryValue(value) {
 assert(Number.isInteger(value) && value>=1 && value<=9,'Aktueller Kartenwert muss zwischen 1 und 9 liegen');
 return Math.max(1,Math.ceil(value/2));
}
/** Call ONCE after the server verified active turn, actual ownership and submitted special card.
 * Never mutate base card values; store the newValue as a temporary round modifier.
 */
function sweetieEffect({category,playedCard,targetPlayerId}) {
 assert(typeof targetPlayerId==='string'&&!!targetPlayerId,'Gegner fehlt');
 assert(typeof category==='string'&&category.length>0,'Kategorie fehlt');
 assert(playedCard&&Object.hasOwn(playedCard,category),'Gespielte Gegnerkarte/Kategorie fehlt');
 const previousValue=playedCard[category];
 return {type:'sweetie_bot_half',cardId:SWEETIE_BOT,targetPlayerId,category,previousValue,newValue:halveCategoryValue(previousValue)};
}
/** allArtifactIds: full game's artifact ID list, ownedArtifactIds: THIS player's owned IDs.
 * Use cryptographic randomness on server, and check/store the grant atomically in match state.
 */
function helementsEffect({allArtifactIds,ownedArtifactIds}) {
 assert(Array.isArray(allArtifactIds)&&Array.isArray(ownedArtifactIds),'Artefaktlisten müssen Arrays sein');
 const owned=new Set(ownedArtifactIds), unique=new Set();
 const missing=allArtifactIds.filter(id=>typeof id==='string'&&id.length>0&&!owned.has(id)&&!unique.has(id)&&!!unique.add(id));
 const grantedArtifactId=missing.length ? missing[crypto.randomInt(missing.length)] : null;
 return {type:'grant_missing_artifact',cardId:HELEMENTS_OF_ARMORY,grantedArtifactId};
}
module.exports={definitions,SWEETIE_BOT,HELEMENTS_OF_ARMORY,halveCategoryValue,sweetieEffect,helementsEffect};

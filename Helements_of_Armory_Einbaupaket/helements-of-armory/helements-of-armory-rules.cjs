'use strict';
// Server-side helper for Helements of Armory.
// The actual artifact inventory, persistence and multiplayer events remain authoritative in your game server.
const HELEMENTS_OF_ARMORY_ID = 'helements_of_armory';

/**
 * Selects one random artifact the player does NOT yet own.
 * @param {Object} args
 * @param {string[]} args.allArtifactIds complete list of valid artifact IDs in the game
 * @param {string[]} args.ownedArtifactIds artifacts already owned by the affected player
 * @param {Function} [args.random] injectable RNG for tests, default Math.random
 * @returns {{cardId:string,type:string,missingArtifactIds:string[],grantedArtifactId:string|null}}
 */
function getHelementsOfArmoryEffect({ allArtifactIds, ownedArtifactIds, random=Math.random }) {
  if (!Array.isArray(allArtifactIds) || !Array.isArray(ownedArtifactIds)) throw new Error('Artifact lists must be arrays');
  const owned = new Set(ownedArtifactIds);
  const missingArtifactIds = allArtifactIds.filter(id => typeof id === 'string' && id && !owned.has(id));
  const grantedArtifactId = missingArtifactIds.length ? missingArtifactIds[Math.floor(random() * missingArtifactIds.length)] : null;
  return { cardId: HELEMENTS_OF_ARMORY_ID, type: 'grant_missing_artifact', missingArtifactIds, grantedArtifactId };
}
module.exports = { HELEMENTS_OF_ARMORY_ID, getHelementsOfArmoryEffect };

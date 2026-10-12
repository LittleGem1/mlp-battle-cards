'use strict';
// Server-side rules helper (CommonJS for Node). Call only from the authoritative game server.
const SWEETIE_BOT_ID = 'sweetie_bot';
/** Effect on only the chosen opponent's ALREADY PLAYED card and only the current category.
 * This helper does not mutate the game. Pass its result into your existing server state update.
 * Numeric values are rounded UP and never drop below 1 for the existing 1–9 card system.
 */
function halvePlayedCategoryValue(value) {
  if (!Number.isInteger(value) || value < 1 || value > 9) throw new RangeError('Expected category value in range 1–9');
  return Math.max(1, Math.ceil(value / 2));
}
function getSweetieBotEffect({category, playedCard, targetPlayerId, alreadyApplied=false}) {
  if (!targetPlayerId || !playedCard || typeof category !== 'string' || !category || alreadyApplied) throw new Error('Invalid Sweetie Bot target or duplicate activation');
  if (!Object.prototype.hasOwnProperty.call(playedCard,category)) throw new Error('Missing active category');
  const previousValue=playedCard[category], newValue=halvePlayedCategoryValue(previousValue);
  return { type:'sweetie_bot_half', cardId:SWEETIE_BOT_ID, targetPlayerId, category, previousValue, newValue };
}
module.exports={SWEETIE_BOT_ID,halvePlayedCategoryValue,getSweetieBotEffect};

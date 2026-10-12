/** Browser integration – call from your EXISTING confirmed server event listener. */
import {playSweetieBotAnimation} from './sweetie-bot.js';
import {playHelementsOfArmoryAnimation} from './helements-of-armory.js';
export const specialCardDefinitions = [
  {id:'sweetie_bot',name:'Sweetie Bot',type:'special',image:'/assets/sweetie-bot.png'},
  {id:'helements_of_armory',name:'Helements of Armory',type:'special',image:'/assets/helements-of-armory.png'}
];
/** Optional, deliberately only visual; current server remains authoritative. */
export async function showSpecialEffect(event, elements, options={}) {
  if(event.cardId==='sweetie_bot') return playSweetieBotAnimation({
    sourceElement:elements.sourceElement,targetElement:elements.targetElement,
    oldValue:event.previousValue,newValue:event.newValue,muted:!!options.muted,
    voiceUrl:'/assets/sweetie-bot-voice.mp3',onValueReveal:options.onValueReveal||(()=>{})
  });
  if(event.cardId==='helements_of_armory') return playHelementsOfArmoryAnimation({
    sourceElement:elements.sourceElement,deckElement:elements.deckElement,
    arenaElement:elements.arenaElement||document.body,
    rumbleUrl:'/assets/helements-rumble.mp3',fartUrl:'/assets/helements-fart.mp3',
    muted:!!options.muted,artifactName:event.grantedArtifactName||'Artefakt',
    artifactImageUrl:event.grantedArtifactImageUrl||'',
    deckCountBefore:event.deckCountBefore,deckCountAfter:event.deckCountAfter,
    onArtifactGranted:options.onArtifactGranted||(()=>{})
  });
}

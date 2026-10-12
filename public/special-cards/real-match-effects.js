// Real-match effects. Server state is authoritative; animations only illustrate confirmed events.
import {playSweetieBotAnimation} from './sweetie-bot.js';
import {playHelementsOfArmoryAnimation} from './helements-of-armory.js?v=hoa-fartcue-20261012-4';
function anchor(){return document.querySelector('#game')||document.body;}
function sourceImage(src){
 const img=document.createElement('img');
 img.src=src;img.alt='Spezialkarte';img.style.cssText='position:fixed;left:18%;top:40%;width:145px;max-height:260px;object-fit:contain;z-index:99998;pointer-events:none';
 document.body.append(img);return img;
}
function destination(playerId){
 return document.querySelector('.opponent[data-player-id="'+CSS.escape(playerId)+'"]')||
        document.querySelector('[data-player-id="'+CSS.escape(playerId)+'"]')||
        document.querySelector('.self-bar')||anchor();
}
async function handle(e){
 const isSweetie=e.cardId==='sweetie_bot';
 const source=sourceImage(isSweetie?'/assets/sweetie-bot.png':'/assets/helements-of-armory.png');
 const target=destination(isSweetie?e.targetId:e.playerId);
 // Ignore synthetic local state updates; let normal state events refresh cards and artifacts.
 try{
   if(isSweetie)await playSweetieBotAnimation({sourceElement:source,targetElement:target,oldValue:e.previousValue,newValue:e.newValue,voiceUrl:'/assets/sweetie-bot-voice.mp3'});
   else await playHelementsOfArmoryAnimation({sourceElement:source,deckElement:target,arenaElement:anchor(),artifactName:e.grantedArtifactName,artifactImageUrl:e.grantedArtifactImageUrl,deckCountBefore:e.deckCountBefore,deckCountAfter:e.deckCountAfter,rumbleUrl:'/assets/helements-rumble.mp3',fartUrl:'/assets/helements-fart.mp3'});
 }catch(error){console.error('[MLP special animation]',error);}
 finally{source.remove();}
}
// client.js creates lexical socket, so attach via the shared io socket manager only once after initialization.
window.MLPRealSpecialEffects={handle};

// Nur lokale Testanimationen. Keine Socket-Events oder serverseitige Kartenänderungen.
import {playSweetieBotAnimation} from './sweetie-bot.js';
import {playHelementsOfArmoryAnimation} from './helements-of-armory.js?v=hoa-read6-20261012-9';
export async function playSpecialPreview(id){
 const old=document.getElementById('mlp-special-preview-stage');if(old)old.remove();
 const stage=document.createElement('div');stage.id='mlp-special-preview-stage';
 stage.style.cssText='position:fixed;inset:0;z-index:999999;background:#0e1023ec;display:grid;place-items:center;color:white;font:700 20px sans-serif';
 
 // Fix: Spezialeffekte über der Vorschau anzeigen
 if (!document.getElementById('mlp-preview-layer-fix')) {
   const style = document.createElement('style');
   style.id = 'mlp-preview-layer-fix';
   style.textContent = `
     #mlp-special-preview-stage {
       z-index: 999999 !important;
     }
     .sb-fx-layer,
     .hoa-fx-layer {
       z-index: 1000000 !important;
       pointer-events: none;
     }
   `;
   document.head.appendChild(style);
 }

 stage.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:30px;align-items:center;justify-content:center;padding:25px"><img id="sp-card" style="width:min(30vw,240px);max-height:65vh;object-fit:contain" alt="Specialkarte"><div id="sp-target" style="min-width:180px;padding:45px 20px;text-align:center;border:3px solid #ac7ddb;border-radius:20px;background:#302047"><span id="sp-label"></span><p id="sp-count" style="font-size:66px;margin:15px">8</p></div></div><button id="sp-exit" style="position:fixed;right:20px;top:20px;padding:12px;background:#37254e;color:white;border:1px solid white;border-radius:10px" disabled>Animation läuft…</button>';
 document.body.append(stage);
 const source=stage.querySelector('#sp-card'), target=stage.querySelector('#sp-target'), count=stage.querySelector('#sp-count'),exit=stage.querySelector('#sp-exit');
 source.src=id==='sweetie'?'/assets/sweetie-bot.png':'/assets/helements-of-armory.png';
 stage.querySelector('#sp-label').textContent=id==='sweetie'?'Gegner · aktiver Wert':'Artefakt-Deck';
 if(id==='helements')count.textContent='6';
 try{
 if(id==='sweetie')await playSweetieBotAnimation({sourceElement:source,targetElement:target,voiceUrl:'/assets/sweetie-bot-voice.mp3',oldValue:8,newValue:4,onValueReveal:()=>{count.textContent='4';}});
 else await playHelementsOfArmoryAnimation({sourceElement:source,deckElement:target,arenaElement:stage,rumbleUrl:'/assets/helements-rumble.mp3',fartUrl:'/assets/helements-fart.mp3',artifactName:'Test-Artefakt',deckCountBefore:6,deckCountAfter:7,onArtifactGranted:()=>{count.textContent='7';}});
 }catch(e){console.error(e);stage.querySelector('#sp-label').textContent='Fehler: '+e.message;}
 finally{exit.disabled=false;exit.textContent='Schließen';exit.onclick=()=>stage.remove();}
}

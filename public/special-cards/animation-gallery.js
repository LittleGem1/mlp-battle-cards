import {playSweetieBotAnimation} from './sweetie-bot.js';
import {playHelementsOfArmoryAnimation} from './helements-of-armory.js';
const ENTRIES=[{id:'sweetie',name:'Sweetie Bot',desc:'Voiceline, Schüsse, 8 → 4',image:'/assets/sweetie-bot.png'},{id:'helements',name:'Helements of Armory',desc:'Erdbeben, Furz, Artefakt',image:'/assets/helements-of-armory.png'}];
/** Adds an optional local-only preview menu inside the visible arena.
 * Additional entries may be registered by calling addAnimationPreview(name, callback).
 * Mount this ONLY on the Arena page. Does not emit socket messages, draw cards, or modify match state.
 */
const extras=[];
export function addAnimationPreview(name,callback){if(typeof callback!=='function')throw new Error('callback required');extras.push({name,callback});}
export function mountArenaAnimationGallery({parent=document.body,onlyWhenArenaVisible=false,arenaSelector='.arena, #arena, .battle-arena, #gameArena',muted=false}={}){
 if(document.getElementById('mlp-animation-gallery'))return ()=>{};
 const root=document.createElement('aside');root.id='mlp-animation-gallery';root.innerHTML='<section class="gallery-panel" hidden><div class="gallery-head"><h3>🎬 Animationen testen</h3><button type="button" class="gallery-dismiss">✕</button></div><div class="gallery-list"></div><p>Nur Vorschau: Es werden keine Karten gespielt oder Matchwerte verändert.</p></section><button type="button" class="gallery-toggle">🎬 Animationen</button>';
 parent.append(root);
 const panel=root.querySelector('.gallery-panel'),list=root.querySelector('.gallery-list'),toggle=root.querySelector('.gallery-toggle');
 root.querySelector('.gallery-dismiss').addEventListener('click',()=>{panel.hidden=true;});toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;});
 let playing=false,active=true;
 const checkVisibility=()=>{if(!onlyWhenArenaVisible)return;const arena=document.querySelector(arenaSelector);root.hidden=!(arena&&arena.getClientRects().length);};
 checkVisibility();const observer=new MutationObserver(checkVisibility);if(onlyWhenArenaVisible)observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','hidden'],childList:true});
 function choice(item,callback){const button=document.createElement('button');button.type='button';const thumb=item.image?`<img src="${item.image}" alt="">`:'';button.innerHTML=`${thumb}<span><b>${item.name}</b><small>${item.desc||'Vorschau'}</small></span>`;button.addEventListener('click',async()=>{if(playing)return;playing=true;toggle.disabled=true;panel.hidden=true;try{await callback();}finally{playing=false;toggle.disabled=false;}});list.append(button);}
 for(const item of ENTRIES)choice(item,()=>openDemo(item,muted));
 for(const item of extras)choice(item,item.callback);
 return ()=>{active=false;observer.disconnect();root.remove();};
}
async function openDemo(item,muted){
 const overlay=document.createElement('section');overlay.id='mlp-gallery-overlay';overlay.innerHTML=`<div class="gallery-stage"><div class="gallery-top"><b>🎬 ${item.name} · TESTMODUS</b><button class="gallery-close" type="button" disabled>Animation läuft …</button></div><img class="gallery-source" src="${item.image}" alt="Special Karte"><div class="gallery-target">${item.id==='sweetie'?'<span>Gegner · Energie</span><strong class="gallery-count">8</strong>':'<span>Artefakt-Deck</span><strong class="gallery-count">6</strong>'}</div><div class="gallery-error" aria-live="polite"></div></div>`;
 document.body.append(overlay);const source=overlay.querySelector('.gallery-source'),target=overlay.querySelector('.gallery-target'),count=overlay.querySelector('.gallery-count'),close=overlay.querySelector('.gallery-close');
 try{
  if(item.id==='sweetie') await playSweetieBotAnimation({sourceElement:source,targetElement:target,muted,voiceUrl:'/assets/sweetie-bot-voice.mp3',oldValue:8,newValue:4,onValueReveal:()=>{count.textContent='4';}});
  else await playHelementsOfArmoryAnimation({sourceElement:source,deckElement:target,arenaElement:overlay.querySelector('.gallery-stage'),rumbleUrl:'/assets/helements-rumble.mp3',fartUrl:'/assets/helements-fart.mp3',muted,artifactName:'Test-Artefakt',artifactIcon:'💎',deckCountBefore:6,deckCountAfter:7,onArtifactGranted:()=>{count.textContent='7';}});
 }catch(err){overlay.querySelector('.gallery-error').textContent='Vorschaufehler: '+err.message;console.error(err);}
 finally{close.disabled=false;close.textContent='Schließen';close.addEventListener('click',()=>overlay.remove(),{once:true});}
}

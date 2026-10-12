(()=>{'use strict';const BASE='/assets/new_specials/';let active=null;let sequence=0;const clock=()=>performance.now();
function sound(file){const audio=new Audio(BASE+file+'.wav');audio.preload='auto';audio.volume=.78;audio.play().catch(()=>{});return audio;}
function play(kind){const id=++sequence;if(active)active.remove();const root=document.createElement('div');root.id='lg-special-stage';root.className='lg-fx-'+kind;document.body.appendChild(root);active=root;
const hero=document.createElement('div');hero.className='lg-hero';hero.innerHTML='<img alt="Spezialkarte" src="'+BASE+(kind==='sweetiebot'?'sweetie_bot':'helements_armory')+'.svg">';root.appendChild(hero);
const after=(fn,ms)=>setTimeout(()=>{if(id===sequence&&root.isConnected)fn()},ms);
if(kind==='sweetiebot'){
 root.classList.add('lg-quake');sound('rumble');for(let i=0;i<25;i++){let stone=document.createElement('span');stone.className='lg-stone';stone.textContent='🪨';stone.style.left=(Math.random()*98)+'%';stone.style.animationDelay=(Math.random()*1.2)+'s';root.appendChild(stone)}
 after(()=>{root.classList.remove('lg-quake');root.classList.add('lg-fart');sound('fart')},2150);
 after(()=>root.classList.add('lg-ending'),3400);after(()=>{root.remove();if(active===root)active=null},3950);
}else{
 // Six elemental motifs start at the same instant in a single mixed WAV, no sequential .play calls.
 sound('helements_sync');const gems=['💎','⚡','🔥','❄️','🌪️','✨'];gems.forEach((gem,i)=>{const g=document.createElement('div');g.className='lg-gem';g.textContent=gem;g.style.setProperty('--angle',(i*60)+'deg');g.style.setProperty('--radius','min(28vw,220px)');g.style.setProperty('--delay','0s');root.appendChild(g)});
 after(()=>root.classList.add('lg-ending'),3600);after(()=>{root.remove();if(active===root)active=null},4300);
}return root}
window.LGSpecialAnimations={play};
function connect(){if(typeof socket!=='undefined'&&socket?.on){socket.on('specialPlayed',e=>{let fx=e?.card?.effect;if(fx==='sweetiebot'||fx==='helementsarmory')play(fx)});socket.on('helementsArtifactGranted',e=>{let id=sequence;setTimeout(()=>{if(id!==sequence)return;const root=active;if(!root||!root.classList.contains('lg-fx-helementsarmory'))return;const card=document.createElement('div');card.className='lg-artifact-reveal';const img=document.createElement('img');img.src=e?.artifact?.image||'';img.alt=e?.artifact?.name||'Artefakt';card.appendChild(img);root.appendChild(card)},2600)});}else setTimeout(connect,350)}connect();})();
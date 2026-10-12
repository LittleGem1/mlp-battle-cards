(()=>{'use strict';
const BASE='/assets/new_specials/';let active=null,sequence=0,artifactByPlayer=new Map(),lastPlayed=null;
function clear(){if(active){active.remove();active=null}}
function sweetie(){const id=++sequence;clear();const root=document.createElement('div');root.id='lg-special-stage';root.className='lg-fx-sweetiebot lg-quake';document.body.append(root);active=root;
const img=document.createElement('img');img.className='lg-sweetie-card';img.src=BASE+'sweetie_bot.svg';img.alt='Sweetie Bot';root.append(img);
const a=new Audio(BASE+'rumble.wav');a.volume=.8;a.play().catch(()=>{});
for(let i=0;i<28;i++){let s=document.createElement('span');s.className='lg-stone';s.textContent='🪨';s.style.left=Math.random()*100+'%';s.style.animationDelay=Math.random()*1.4+'s';root.append(s)}
setTimeout(()=>{if(id!==sequence)return;root.classList.remove('lg-quake');const s=new Audio(BASE+'fart.wav');s.volume=.9;s.play().catch(()=>{});root.classList.add('lg-fart')},2150);
setTimeout(()=>{if(id===sequence)clear()},4200)}
function helements(e){const id=++sequence;clear();const root=document.createElement('div');root.id='lg-armory-stage';document.body.append(root);active=root;const frame=document.createElement('iframe');frame.title='Helements of Armory Originalanimation';frame.setAttribute('allow','autoplay');frame.src=BASE+'helements_original_animation.html?v=original3';root.append(frame);
const p=e?.playerId;const artifact=artifactByPlayer.get(p)||null;lastPlayed={playerId:p,frame,ready:false};
frame.onload=()=>{if(id!==sequence)return;lastPlayed.ready=true;frame.contentWindow.postMessage({type:'lg-armory-start',artifact:artifactByPlayer.get(p)||artifact},'*')};
setTimeout(()=>{if(id===sequence){clear();lastPlayed=null}},10900)}
function connect(){if(typeof socket==='undefined'||!socket?.on){setTimeout(connect,300);return}
socket.on('helementsArtifactGranted',e=>{artifactByPlayer.set(e.playerId,e.artifact);if(lastPlayed?.playerId===e.playerId&&lastPlayed.ready){lastPlayed.frame.contentWindow.postMessage({type:'lg-armory-artifact',artifact:e.artifact},'*')}});
socket.on('specialPlayed',e=>{if(e?.card?.effect==='sweetiebot')sweetie();if(e?.card?.effect==='helementsarmory')helements(e)})}
connect();window.LGSpecialAnimations={play(kind){if(kind==='sweetiebot')sweetie();else if(kind==='helementsarmory')helements({playerId:'preview'})}};
})();
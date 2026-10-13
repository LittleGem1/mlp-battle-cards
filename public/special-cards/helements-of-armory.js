/* Helements of Armory – native browser animation; no GIF/video.
 * Audio tracks run in parallel. Rumble -> falling rocks -> giant gas cloud -> artifact.
 * Scene ends precisely when BOTH audio tracks reach their end (fallback on failed playback).
 * Compatible with the existing game entry point and server-side artifact selection.
 */
const HOA_DEFAULT_RUMBLE='/assets/helements-rumble.mp3';
const HOA_DEFAULT_FART='/assets/helements-fart.mp3';
const hoaClamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const hoaPoint=(el,within)=>{const r=el.getBoundingClientRect(),c=within.getBoundingClientRect();return {x:r.left+r.width/2-c.left,y:r.top+r.height/2-c.top};};
const hoaSleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function hoaNode(className,parent,tag='div'){const n=document.createElement(tag);n.className=className;parent.append(n);return n;}

export async function playHelementsOfArmoryAnimation({
  sourceElement,deckElement,arenaElement=document.querySelector('#game .arena')||document.body,
  containerElement=null,
  rumbleUrl=HOA_DEFAULT_RUMBLE,fartUrl=HOA_DEFAULT_FART,
  muted=false,artifactName='Zufälliges Artefakt',artifactImageUrl='',artifactIcon='💎',
  deckCountBefore,deckCountAfter,onArtifactGranted=()=>{},onProgress=()=>{},onPhase=()=>{}
}={}){
  if(!(sourceElement instanceof Element)||!(deckElement instanceof Element))
    throw Error('Helements: sourceElement/deckElement müssen existieren.');
  const parent=containerElement instanceof Element?containerElement:document.body;
  const arena=arenaElement instanceof Element?arenaElement:document.body;
  const stage=hoaNode('hoa-rebuilt-stage'+(containerElement?' hoa-rebuilt-contained':''),parent);
  const canvas=hoaNode('hoa-rebuilt-canvas',stage,'canvas');const ctx=canvas.getContext('2d');
  const tint=hoaNode('hoa-rebuilt-tint',stage),cracks=hoaNode('hoa-rebuilt-cracks',stage);
  cracks.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g fill="none" stroke="#ffc8d8" stroke-width=".42" opacity=".85"><path d="M0 23 L14 28 21 16 32 37 47 41 53 55 61 51 71 65 86 58 100 76"/><path d="M20 0 L30 14 27 33 40 47 39 61 52 71 58 100"/><path d="M100 17 L81 24 71 38 62 31 50 49 41 67 25 74 10 100"/><path d="M5 66 L18 60 35 74 47 65 65 85 90 88"/><path d="M67 0 L58 16 74 29 88 45 100 42"/></g></svg>';
  const title=hoaNode('hoa-rebuilt-title',stage);title.textContent='HELEMENTS OF ARMORY';
  const flare=hoaNode('hoa-rebuilt-flare',stage);
  const shock=hoaNode('hoa-rebuilt-shock',stage);
  const cloud=hoaNode('hoa-rebuilt-cloud',stage),cloudCore=hoaNode('hoa-rebuilt-cloud-core',cloud);
  const artifact=hoaNode('hoa-rebuilt-artifact',stage),face=hoaNode('hoa-rebuilt-artifact-face',artifact);
  if(artifactImageUrl){const img=hoaNode('',face,'img');img.src=artifactImageUrl;img.alt=artifactName;}
  else{const icon=hoaNode('hoa-rebuilt-artifact-icon',face);icon.textContent=artifactIcon;}
  const label=hoaNode('',face,'strong');label.textContent=artifactName;
  const sfxVolume=()=>{
    try{return hoaClamp(Number(window.__hoaPreviewVolume??localStorage.getItem('mlp_sfx_volume')??.8),0,1)}
    catch{return hoaClamp(Number(window.__hoaPreviewVolume??.8),0,1)}
  };
  const rumble=new Audio(rumbleUrl),fart=new Audio(fartUrl);
  rumble.preload='auto';fart.preload='auto';rumble.volume=.83*sfxVolume();fart.volume=sfxVolume();
  const updateVolume=()=>{rumble.volume=.83*sfxVolume();fart.volume=sfxVolume();};
  window.addEventListener('mlp-sfx-volume-change',updateVolume);
  let raf=0,playback=true,phase='',prev=0,spawnPool=0,dustPool=0,rocks=[],dusts=[],sparkles=[];
  let started=performance.now(),dur=8.02,quakeState=0,smokeStarted=false,artifactStarted=false;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function setPhase(name){if(phase===name)return;phase=name;onPhase(name);}
  function resize(){const r=stage.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);return {w:r.width,h:r.height};}
  let {w,h}=resize();
  const onResize=()=>{({w,h}=resize());};window.addEventListener('resize',onResize);
  function makeRock(t,weight){
    const x=rnd(-w*.08,w*1.08),y=rnd(-100,-20),size=rnd(5,23)*(weight?rnd(1.1,2.2):1);
    rocks.push({x,y,size,vx:rnd(-150,150)*(weight?1.4:1),vy:rnd(130,350)+weight*130,rot:rnd(0,6),vr:rnd(-8,8),life:rnd(1.4,2.9),age:0,shape:Array.from({length:7},(_,i)=>.7+rnd(0,.5))});
  }
  function makeDust(x,y){dusts.push({x,y,age:0,life:rnd(.48,1.1),s:rnd(13,55),vx:rnd(-40,40),vy:rnd(-45,-8)});}
  function startSmoke(){
    smokeStarted=true;setPhase('💨 DIE RIESIGE FURZWOLKE!');
    arena.classList.remove('hoa-rebuilt-quake','hoa-rebuilt-extreme');tint.classList.remove('on');cracks.classList.remove('on');
    shock.classList.add('burst');flare.classList.add('burst');cloud.classList.add('active');
    const remaining=Math.max(.6,dur-6);
    cloudCore.style.setProperty('--duration',remaining*1000+'ms');
    for(let i=0;i<38;i++){
      const blob=hoaNode('hoa-rebuilt-blob',cloud);
      let angle=rnd(-Math.PI,0), radius=rnd(10,210),dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius-rnd(10,125);
      blob.style.setProperty('--size',rnd(65,196)+'px');
      blob.style.setProperty('--dx',dx.toFixed(0)+'px');blob.style.setProperty('--dy',dy.toFixed(0)+'px');
      blob.style.setProperty('--delay',Math.min(130,rnd(0,110))+'ms');
      blob.style.setProperty('--scale',rnd(1.15,1.8).toFixed(2));
      blob.style.setProperty('--blur',rnd(7,19)+'px');
      blob.style.setProperty('--duration',Math.max(400,remaining*1000-130)+'ms');
    }
  }
  function revealArtifact(){
    artifactStarted=true;setPhase('💎 DAS ARTEFAKT ERSCHEINT ÜBER DER WOLKE!');
    artifact.classList.add('reveal');
    for(let i=0;i<18;i++){let dot=hoaNode('hoa-rebuilt-sparkle',stage);const x=50+rnd(-17,17),y=33+rnd(-20,27);dot.style.left=x+'%';dot.style.top=y+'%';dot.style.animationDelay=rnd(0,.85)+'s';sparkles.push(dot);}
  }
  function render(time){
    if(!playback)return;
    const progressAudio=(!muted&&!fart.paused&&!rumble.paused) ? Math.max(fart.currentTime,rumble.currentTime) : NaN;
    const t=Math.min(dur,Number.isFinite(progressAudio)&&progressAudio>0?progressAudio:(time-started)/1000);
    const dt=Math.min(.045,Math.max(0,t-prev));prev=t;
    ctx.clearRect(0,0,w,h);
    let intensity=hoaClamp((t-.1)/2.5,0,1),apocalypse=t>=2.3&&t<5.8;
    if(t>=.3&&t<5.8){
      if(!quakeState){arena.classList.add('hoa-rebuilt-quake');quakeState=1;setPhase('🌋 ERDBEBEN!');title.classList.add('visible');}
      if(apocalypse&&quakeState<2){arena.classList.add('hoa-rebuilt-extreme');quakeState=2;cracks.classList.add('on');tint.classList.add('on');setPhase('🪨 TOTALER WELTUNTERGANG!');}
      const perSec=24+intensity*85;spawnPool+=perSec*dt;while(spawnPool>=1){spawnPool--;makeRock(t,apocalypse?1:0);}
      dustPool+=(12+intensity*16)*dt;while(dustPool>=1){dustPool--;makeDust(rnd(0,w),rnd(h*.4,h*.95));}
    }
    for(let i=rocks.length-1;i>=0;i--){const r=rocks[i];r.age+=dt;r.vy+=dt*300;r.x+=r.vx*dt;r.y+=r.vy*dt;r.rot+=r.vr*dt;
      if(r.age>r.life||r.y>h+80){if(r.y>h-35&&r.age<r.life)for(let k=0;k<2;k++)makeDust(r.x,h-rnd(0,35));rocks.splice(i,1);continue;}
      ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.rot);ctx.globalAlpha=hoaClamp((r.life-r.age)*2);
      ctx.shadowBlur=13;ctx.shadowColor='rgba(5,1,15,.83)';ctx.beginPath();for(let j=0;j<7;j++){const theta=j*2*Math.PI/7,radius=r.size*r.shape[j];const x=Math.cos(theta)*radius,y=Math.sin(theta)*radius*.72;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
      const gr=ctx.createLinearGradient(-r.size,-r.size,r.size,r.size);gr.addColorStop(0,'#ece2e3');gr.addColorStop(.28,'#aa9ea7');gr.addColorStop(.66,'#56465b');gr.addColorStop(1,'#1e1726');ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle='#271c36';ctx.lineWidth=1.3;ctx.stroke();ctx.restore();
    }
    for(let i=dusts.length-1;i>=0;i--){const d=dusts[i];d.age+=dt;if(d.age>d.life){dusts.splice(i,1);continue;}d.x+=d.vx*dt;d.y+=d.vy*dt;const a=1-d.age/d.life;let rad=d.s*(.6+d.age/d.life);ctx.save();ctx.globalAlpha=a*.32;const g=ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,rad);g.addColorStop(0,'rgba(239,211,203,.85)');g.addColorStop(.6,'rgba(188,156,163,.5)');g.addColorStop(1,'rgba(125,95,126,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(d.x,d.y,rad,0,Math.PI*2);ctx.fill();ctx.restore();}
    if(t>=5.8&&quakeState){arena.classList.remove('hoa-rebuilt-quake','hoa-rebuilt-extreme');tint.classList.remove('on');cracks.classList.remove('on');quakeState=0;title.classList.remove('visible');}
    if(t>=6&&!smokeStarted)startSmoke();
    if(t>=6.18&&!artifactStarted)revealArtifact();
    onProgress(hoaClamp(t/dur),t,dur);
    if(t>=dur-.025)return stop();
    raf=requestAnimationFrame(render);
  }
  let endResolve;
  const finished=new Promise(resolve=>endResolve=resolve);
  function stop(){
    if(!playback)return;playback=false;cancelAnimationFrame(raf);
    arena.classList.remove('hoa-rebuilt-quake','hoa-rebuilt-extreme');
    window.removeEventListener('resize',onResize);window.removeEventListener('mlp-sfx-volume-change',updateVolume);
    rumble.pause();fart.pause();
    if(Number.isFinite(deckCountBefore)&&Number.isFinite(deckCountAfter))deckElement.dataset.hoaNewCount=String(deckCountAfter);
    onArtifactGranted();stage.remove();setPhase('✅ ARTEFAKT ERHALTEN');endResolve();
  }
  function loaded(a){return new Promise(resolve=>{if(Number.isFinite(a.duration)&&a.duration>1)return resolve(a.duration);let ended=false;const done=()=>{if(ended)return;ended=true;resolve(Number.isFinite(a.duration)&&a.duration>1?a.duration:null)};a.addEventListener('loadedmetadata',done,{once:true});a.addEventListener('error',done,{once:true});setTimeout(done,1200);a.load();});}
  try{
    const d=await Promise.all([loaded(rumble),loaded(fart)]);
    dur=Math.max(7.95,...d.filter(x=>Number.isFinite(x)&&x>0));
    if(!muted){
      // Crucial: both audio files start here in the same event loop, not sequentially.
      const results=await Promise.allSettled([rumble.play(),fart.play()]);
      if(results.every(x=>x.status==='rejected'))setPhase('🔇 Browser blockiert Audio; Animation läuft trotzdem');
    }
    started=performance.now();prev=0;raf=requestAnimationFrame(render);
    // When tracks end naturally, finish; preserve short final frames.
    const bothEnded=()=>{if((rumble.ended||rumble.error||muted)&&(fart.ended||fart.error||muted))stop();};
    rumble.addEventListener('ended',bothEnded);fart.addEventListener('ended',bothEnded);
    return await finished;
  }catch(e){stop();throw e;}
}

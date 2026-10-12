(()=>{
  'use strict';
  const qs=s=>document.querySelector(s);
  if(!qs('link[data-artifact-magic-css]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/artifact_magic_fx.css?v=18';
    link.dataset.artifactMagicCss='1';
    document.head.appendChild(link);
  }
  let current=null, currentAudio=null;
  const safeImage=v=>typeof v==='string' && /^\/assets\/[\w./-]+\.(?:png|webp|jpg)$/i.test(v) ? v : '/assets/artifacts/01_Elemente_der_Harmonie.png';
  function stop(){
    current?.remove(); current=null; document.body.classList.remove('artifactmagic-running');
    if(currentAudio){try{currentAudio.pause(); currentAudio.currentTime=0;}catch(_){ } currentAudio=null;}
  }
  function play(evt={}){
    const preview=!!evt.preview;
    const scene=preview ? document.body : qs('#game.screen.active');
    if(!scene)return;
    stop();
    const stealing=evt.action==='artifactsteal';
    const layer=document.createElement('div');
    layer.className='artifactmagic-overlay '+(stealing?'artifactmagic-steal':'artifactmagic-copy');
    layer.setAttribute('aria-label',stealing?'Zauberklau – ein Artefakt wird gestohlen':'Zauberkopierer – ein Artefakt wird kopiert');
    const title=document.createElement('div'); title.className='artifactmagic-title';
    title.innerHTML=`<strong>${stealing?'ZAUBERKLAU':'ZAUBERKOPIERER'}</strong><small>${evt.casterName||'Spieler'} ${stealing?'entreißt':'spiegelt'} ${(evt.artifact?.name)||'ein Artefakt'} ${stealing?'von':'bei'} ${evt.targetName||'einem Gegner'}</small>`;
    const moving=document.createElement('img'); moving.className='artifactmagic-moving'; moving.alt=evt.artifact?.name||'Artefakt'; moving.src=safeImage(evt.artifact?.image);
    const original=document.createElement('img'); original.className='artifactmagic-original'; original.alt=''; original.src=moving.src;
    const ring=document.createElement('div'); ring.className='artifactmagic-ring';
    const targetBurst=document.createElement('div'); targetBurst.className='artifactmagic-targetburst';
    const mirror=document.createElement('div'); mirror.className='artifactmagic-mirror';
    const beam=document.createElement('div'); beam.className='artifactmagic-beam';
    layer.append(title,targetBurst,ring,mirror,beam,original,moving);
    for(let i=0;i<28;i++){
      const spark=document.createElement('i'); spark.className='artifactmagic-spark';
      spark.style.setProperty('--i',i); spark.style.setProperty('--angle',(i*360/28)+'deg'); layer.append(spark);
    }
    for(let i=0;i<10;i++){
      const rune=document.createElement('b'); rune.className='artifactmagic-rune'; rune.textContent=['✦','✧','✶','✷','⟡'][i%5];
      rune.style.setProperty('--i',i); layer.append(rune);
    }
    document.body.appendChild(layer); current=layer; document.body.classList.add('artifactmagic-running');
    const audio=new Audio(stealing?'/assets/sounds/evil_sci_twi_zauberklau.mp3?v=18':'/assets/sounds/flawless_zauberkopierer.mp3?v=18');
    audio.volume=0.72*Math.max(0,Math.min(1,Number(localStorage.getItem('mlp_sfx_volume')??.55))); currentAudio=audio; audio.play().catch(()=>{});
    requestAnimationFrame(()=>layer.classList.add('show'));
    const duration=Math.max(1800,Math.min(Number(evt.duration)||2800,5200));
    setTimeout(stop,duration+180);
  }
  function afterCardReveal(evt){
    const started=performance.now();
    const poll=()=>{
      if(!qs('#game.screen.active'))return;
      if(qs('.special-burst') && performance.now()-started<6500){setTimeout(poll,55); return;}
      requestAnimationFrame(()=>play(evt));
    };
    poll();
  }
  if(typeof socket!=='undefined'&&socket?.on){ socket.on('artifactMagicAnimation',afterCardReveal); }
  window.ArtifactMagicFX={play,stop};
})();

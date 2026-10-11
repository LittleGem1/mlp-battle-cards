/* Flawless Sparkle Moon / Evil Sci Twi – reiner Arena-Effekt.
   Die Artefakt-Regeln und Besitzdaten bleiben vollständig auf dem Server. */
(()=>{
  'use strict';
  const get=(s)=>document.querySelector(s);
  if(!get('link[data-artifact-magic-css]')){
    const link=document.createElement('link');link.rel='stylesheet';
    link.href='/artifact_magic_fx.css?v=17';link.dataset.artifactMagicCss='1';
    document.head.append(link);
  }
  let current=null;
  let currentAudio=null;
  const safeImage=value=>typeof value==='string' && /^\/assets\/artifacts\/[\w.-]+\.(?:png|webp|jpg)$/i.test(value)
    ? value:'/assets/artifacts/01_Elemente_der_Harmonie.png';

  function play(evt={}){
    const scene=get('#game.screen.active');if(!scene)return;
    current?.remove();
    if(currentAudio){try{currentAudio.pause();currentAudio.currentTime=0;}catch(_){}}
    const stealing=evt.action==='artifactsteal';
    const layer=document.createElement('div');
    layer.className='artifactmagic-overlay '+(stealing?'artifactmagic-steal':'artifactmagic-copy');
    layer.setAttribute('aria-label',stealing?'Zauberklau – ein Artefakt wird gestohlen':'Zauberkopierer – ein Artefakt wird kopiert');
    const title=document.createElement('div');title.className='artifactmagic-title';
    const strong=document.createElement('strong');strong.textContent=stealing?'ZAUBERKLAU':'ZAUBERKOPIERER';
    const detail=document.createElement('small');
    detail.textContent=(evt.casterName||'Spieler')+(stealing?' stiehlt ':' kopiert ')+(evt.artifact?.name||'ein Artefakt')+' von '+(evt.targetName||'einem Gegner');
    title.append(strong,detail);
    const card=document.createElement('img');card.className='artifactmagic-moving';card.alt=evt.artifact?.name||'Artefakt';card.src=safeImage(evt.artifact?.image);
    const original=document.createElement('img');original.className='artifactmagic-original';original.alt='';original.src=card.src;
    const ring=document.createElement('div');ring.className='artifactmagic-ring';
    layer.append(title,original,ring,card);
    for(let i=0;i<22;i++){
      const spark=document.createElement('i');spark.className='artifactmagic-spark';
      spark.style.setProperty('--i',i);
      spark.style.setProperty('--angle',(i*360/22)+'deg');
      layer.append(spark);
    }
    document.body.append(layer);current=layer;
    document.body.classList.add('artifactmagic-running');
    // Sound beginnt mit dem sichtbaren Zauber, nicht beim Karten-Popup.
    const audio=new Audio(stealing?'/assets/sounds/evil_sci_twi_zauberklau.mp3?v=17':'/assets/sounds/flawless_zauberkopierer.mp3?v=17');
    audio.volume=0.66;currentAudio=audio;audio.play().catch(()=>{});
    requestAnimationFrame(()=>layer.classList.add('show'));
    const duration=Math.max(1600,Math.min(Number(evt.duration)||2600,5000));
    setTimeout(()=>{
      if(current===layer){layer.remove();current=null;document.body.classList.remove('artifactmagic-running');}
      if(currentAudio===audio){try{audio.pause();}catch(_){} currentAudio=null;}
    },duration+160);
  }
  function afterCardReveal(evt){
    const started=performance.now();
    const poll=()=>{
      if(!get('#game.screen.active'))return;
      if(get('.special-burst') && performance.now()-started<6500){setTimeout(poll,55);return;}
      requestAnimationFrame(()=>play(evt));
    };
    poll();
  }
  if(typeof socket!=='undefined'&&socket?.on){
    socket.on('artifactMagicAnimation',afterCardReveal);
  }
  window.ArtifactMagicFX={play};
})();

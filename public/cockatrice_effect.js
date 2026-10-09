(function(){
  'use strict';
  const config={
    spriteSrc:'/assets/animations/cockatrice_sprite.png',
    soundSrc:'/assets/sounds/cockatrice_steinbruch.mp3',
    cardBackSrc:'/assets/card_back.webp'
  };
  let active=null,removeTimer=null,soundTimer=null,audio=null;
  function configure(options={}){Object.assign(config,options);}
  function stop(){
    if(removeTimer){clearTimeout(removeTimer);removeTimer=null;}
    if(soundTimer){clearTimeout(soundTimer);soundTimer=null;}
    if(audio){try{audio.pause();audio.currentTime=0;}catch(e){} audio=null;}
    if(active){active.remove();active=null;}
  }
  function getCardImage(playerId){
    const cards=[...document.querySelectorAll('#tableCards .played-card')];
    const found=cards.find(el=>el.dataset.playerId===playerId);
    // Opponent cards stay face down until normal reveal: do not expose hidden art.
    return found?.querySelector('.card-face img')?.getAttribute('src') || config.cardBackSrc;
  }
  function create(tag,css,text){
    const el=document.createElement(tag);el.className=css||'';
    if(text!==undefined)el.textContent=text;
    return el;
  }
  function play({targetId='',targetName='Gegner',cardImage=null,sound=true}={}){
    stop();
    const stage=create('div','cockatricefx');
    stage.setAttribute('aria-hidden','true');
    const panel=create('div','cockatricefx-stage');
    stage.append(panel);
    const bird=create('img','cockatricefx-bird');bird.alt='';bird.src=config.spriteSrc;panel.append(bird);
    const glow=create('div','cockatricefx-gaze');panel.append(glow);
    const card=create('div','cockatricefx-card');
    const img=create('img','cockatricefx-card-picture');img.alt='';img.src=cardImage||getCardImage(targetId);
    img.onerror=()=>{img.onerror=null;img.src=config.cardBackSrc;};card.append(img);
    card.append(create('div','cockatricefx-stone'));
    const cracks=create('div','cockatricefx-cracks');
    cracks.innerHTML='<svg viewBox="0 0 180 252" preserveAspectRatio="none" aria-hidden="true"><path d="M82 0l12 45-24 25 15 31-35 34 20 30-30 44 6 43M94 45l43 12 24-27M85 101l35-11 27 31-14 27M70 165l48 18 16 42M40 209l-30-18M70 70L34 53 12 76"/></svg>';
    card.append(cracks);
    const status=create('div','cockatricefx-card-label','VERSTEINERT');card.append(status);
    panel.append(card);
    const title=create('div','cockatricefx-headline','VERSTEINERT!');panel.append(title);
    const subtitle=create('div','cockatricefx-subtitle',`${targetName} setzt diese Runde aus`);panel.append(subtitle);
    for(let i=0;i<17;i++){
      const shard=create('span','cockatricefx-shard');
      shard.style.setProperty('--angle',`${i*360/17}deg`);
      shard.style.setProperty('--radius',`${72+(i%4)*23}px`);
      shard.style.setProperty('--lag',`${(i%6)*.045}s`);
      panel.append(shard);
    }
    document.body.append(stage);active=stage;
    requestAnimationFrame(()=>stage.classList.add('active'));
    if(sound){
      // Play the user-supplied rock crumbling sound when the gaze petrifies the card.
      soundTimer=setTimeout(()=>{
        soundTimer=null;
        try{
          audio=new Audio(config.soundSrc);
          audio.volume=.72;
          audio.play().catch(()=>{});
        }catch(e){}
      },800);
    }
    // Keep the finished stone card visible until the rock-crumble sound has ended.
    removeTimer=setTimeout(stop,5700);
  }
  window.CockatriceEffect={play,stop,configure};
})();

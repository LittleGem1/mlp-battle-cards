'use strict';
// This script runs inside the approved HTML preview when used as a real match
// finisher. The preview's own particle/sound timeline remains unchanged.
window.startLittleGemMatch=function startLittleGemMatch(payload){
  document.body.classList.add('game-mode');
  startOverlay.classList.add('hidden');
  // The round server emits "revealEntries", not "entries". A mismatch here
  // previously removed every real opponent from Little Gem's victory scene.
  const revealed=Array.isArray(payload?.revealEntries)?payload.revealEntries:
    Array.isArray(payload?.entries)?payload.entries:[];
  const actual=revealed.filter(x=>x.pid!==payload.winnerId&&x.card?.image).slice(0,7);
  const slots=[
    [13.5,47,-13],[30,60,-7],[70,60,7],[86.5,47,13],
    [12,31,-17],[88,31,17],[50,81,0]
  ];
  // Use exactly the real losers, not the sample cards in the preview.
  losers.forEach(el=>el.remove());
  losers=[];
  actual.forEach((item,i)=>{
    const [left,top,rot]=slots[i];
    const el=document.createElement('div');
    el.className='card loser';
    el.dataset.name=item.name||item.card.name||'Verlierer';
    el.style.left=left+'%';el.style.top=top+'%';el.style.rotate=rot+'deg';
    el.style.width=actual.length>4?'11.7%':'13.8%';
    const img=new Image();
    img.src=item.card.image;img.alt=el.dataset.name;
    el.append(img);
    arena.insertBefore(el,hero);
    losers.push(el);
  });
  const champion=revealed.find(x=>x.pid===payload.winnerId);
  const championImage='/assets/cards_new/095_Little_Gem_Magie9.svg';
  hero.querySelectorAll('img').forEach(el=>el.remove());
  const img=new Image();img.src=championImage;img.alt='Little Gem – Magie 9';
  hero.append(img);
  // The preview starts loading its sample image before the live match data
  // arrives. Remove any late-loading old Magic-8 image immediately.
  const guard=new MutationObserver(()=>{
    hero.querySelectorAll('img').forEach(node=>{
      if(!node.src.includes('095_Little_Gem_Magie9.svg'))node.remove();
    });
  });
  guard.observe(hero,{childList:true});
  resize();
  begin();
};

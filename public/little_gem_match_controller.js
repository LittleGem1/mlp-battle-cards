'use strict';
// This script runs inside the approved HTML preview when used as a real match
// finisher. The preview's own particle/sound timeline remains unchanged.
window.startLittleGemMatch=function startLittleGemMatch(payload){
  document.body.classList.add('game-mode');
  startOverlay.classList.add('hidden');
  const actual=(payload?.entries||[]).filter(x=>x.pid!==payload.winnerId&&x.card?.image).slice(0,7);
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
  const champion=(payload?.entries||[]).find(x=>x.pid===payload.winnerId);
  const championImage='/assets/cards_new/095_Little_Gem_Magie9.svg';
  hero.querySelectorAll('img').forEach(el=>el.remove());
  const img=new Image();img.src=championImage;img.alt='Little Gem – Magie 9';
  hero.append(img);
  resize();
  begin();
};

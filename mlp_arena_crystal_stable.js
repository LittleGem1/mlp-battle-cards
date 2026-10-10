/* Nur Layout: keine Spielregeln, keine Timer-Manipulation, keine Kartenlogik. */
(function installStableArenaLayout(){
  'use strict';
  const game=document.getElementById('game');
  const arena=game?.querySelector('.arena');
  const hud=document.getElementById('deckHud');
  const normal=document.getElementById('normalDeckHud');
  const gold=document.getElementById('rewardDeckHud');
  const shelf=document.getElementById('artifactShelf');
  if(!game||!arena||!hud||!normal||!gold||!shelf)return;
  // Das Stapel-HUD lebt im selben Container wie die Arena: kein Layout-Sprung.
  if(hud.parentElement!==arena)arena.appendChild(hud);
  let scheduled=false;
  const setPx=(el,prop,value)=>{
    const px=Math.round(value)+'px';
    if(el.style.getPropertyValue(prop)!==px)el.style.setProperty(prop,px,'important');
  };
  function layout(){
    scheduled=false;
    if(!game.classList.contains('active')||!document.body.classList.contains('scene-game'))return;
    const rect=arena.getBoundingClientRect();
    const h=rect.height,w=rect.width;
    if(!h||!w)return;
    const compact=w<820;
    const top=Math.max(compact?207:158, Math.min(h*.34,235));
    const shelfW=compact?122:146;
    setPx(shelf,'top',top);
    setPx(shelf,'right',compact?5:8);
    setPx(shelf,'width',shelfW);
    // Gemessene Artefakthöhe: Goldstapel IMMER mit Abstand darunter.
    const artH=Math.max(125,shelf.getBoundingClientRect().height);
    const goldH=Math.max(56,gold.getBoundingClientRect().height);
    const goldTop=Math.min(h-goldH-10, top+artH+12);
    setPx(gold,'right',compact?5:8);
    gold.style.setProperty('left','auto','important');
    gold.style.setProperty('bottom','auto','important');
    setPx(gold,'top',Math.max(top+artH+5,goldTop));
    setPx(normal,'left',compact?5:8);
    normal.style.setProperty('right','auto','important');
    normal.style.setProperty('bottom','auto','important');
    setPx(normal,'top',Math.max(compact?170:155,Math.min(top-70,h*.28)));
  }
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(layout);}
  window.addEventListener('resize',queue,{passive:true});
  document.addEventListener('visibilitychange',queue);
  new MutationObserver(queue).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(typeof ResizeObserver==='function')new ResizeObserver(queue).observe(shelf);
  if(typeof socket!=='undefined'&&socket&&typeof socket.on==='function'){
    ['roomState','roundIntro','roundStart','rewardChosen','hand'].forEach(e=>socket.on(e,queue));
  }
  queue();setTimeout(queue,300);
})();

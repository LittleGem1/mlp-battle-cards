/* MLP Battle Cards – Probetester-Geschenke. Konto-/Datenbankserver vergibt die Preise. */
(function(){
  'use strict';
  const gifts={
    mimsch:{label:'Mimsch',item:'Mimschs Magie-Krallen',frame:'Mimsch – Magie',art:'/assets/name_items/tester_mimsch_claws.webp',frameArt:'/assets/frames/tester_mimsch.webp'},
    chandra:{label:'Chandra',item:'Silberkrone + Titel „die Königin“',frame:'Chandra – Silberkrone',art:'/assets/name_items/tester_chandra_crown.webp',frameArt:'/assets/frames/tester_chandra.webp?v=hq-gift-20261017'},
    little_gem:{label:'Little Gem',item:'Little Gems Kristallkette',frame:'Little Gem – Kristallflügel',art:'/assets/name_items/tester_little_gem_crystal_necklace.webp?v=little-gem-gift-v2-20261017',frameArt:'/assets/frames/tester_little_gem_crystal_frame.webp?v=little-gem-gift-v2-20261017'},
    inpherno:{label:'Inpherno',item:'His Special Weapon',frame:'Inpherno – Schwarze Klinge',art:'/assets/name_items/tester_inpherno_weapon.webp',frameArt:'/assets/frames/tester_inpherno.webp?v=hq-gift-20261017'}
  };
  let overlay=null,opening=false,closed=false;
  function closeGift(){
    if(opening)return;
    overlay?.remove();overlay=null;
    try{if(typeof maybeShowStarterFrame==='function' && !starterFrameChosen)maybeShowStarterFrame()}catch(_){}
  }
  function sparkConfetti(parent){
    const colors=['#76f6ff','#ffda5e','#e477ff','#ff80bd','#77fbb1','#fff'];
    const burst=document.createElement('div');burst.className='tester-confetti';burst.setAttribute('aria-hidden','true');
    for(let i=0;i<74;i++){
      const dot=document.createElement('i');
      const angle=(i*137.508)%360;
      const distance=95+(i*43)%330;
      const rad=angle*Math.PI/180;
      dot.style.cssText='--x:'+(Math.cos(rad)*distance)+'px;--y:'+(Math.sin(rad)*distance)+'px;--rot:'+(i*53)+'deg;--wait:'+(i%12*18)+'ms;background:'+colors[i%colors.length];
      burst.append(dot);
    }
    parent.append(burst);
    setTimeout(()=>burst.remove(),2600);
  }
  function display(gift){
    if(overlay||!gift||!gifts[gift.key])return;
    const data=gifts[gift.key];
    opening=false;
    overlay=document.createElement('div');overlay.className='tester-gift-overlay';
    overlay.innerHTML='<section class="tester-gift-panel" role="dialog" aria-modal="true" aria-label="Geschenk für Probetester">'+
      '<button type="button" class="tester-gift-close" aria-label="Später öffnen">×</button>'+
      '<div class="tester-gift-head">✦ Eine Überraschung für dich! ✦</div>'+
      '<div class="tester-gift-intro">Für '+data.label+' wartet ein persönliches Geschenk.</div>'+
      '<button type="button" class="tester-gift-open" aria-label="Geschenk öffnen"><span class="tester-gift-package">🎁</span><strong>Geschenk öffnen</strong></button>'+
      '<div class="tester-gift-result" hidden></div>'+
      '<p class="tester-gift-tip">Deine Belohnungen werden erst beim Öffnen freigeschaltet und danach dauerhaft gespeichert.</p>'+
      '</section>';
    document.body.append(overlay);
    overlay.querySelector('.tester-gift-close').addEventListener('click',()=>{closed=true;closeGift()});
    overlay.querySelector('.tester-gift-open').addEventListener('click',()=>{
      if(opening)return;
      opening=true;overlay.querySelector('.tester-gift-open').disabled=true;
      overlay.querySelector('.tester-gift-open strong').textContent='Geschenk wird geöffnet …';
      socket.emit('testerGiftClaim');
    });
    overlay.querySelector('.tester-gift-open').focus();
  }
  socket.on('accountData',data=>{
    closed=false;
    overlay?.remove();overlay=null;opening=false;
    if(data?.giftOffer&&(data.profile?.testerGiftClaimed===false||data.profile?.testerGiftUpdatePending===true)){
      requestAnimationFrame(()=>{if(!closed)display(data.giftOffer)});
    }
  });
  socket.on('testerGiftGranted',data=>{
    const reward=gifts[data?.gift?.key];
    if(!overlay||!reward)return;
    opening=false;
    overlay.classList.add('tester-gift-revealed');
    const panel=overlay.querySelector('.tester-gift-panel');
    panel.querySelector('.tester-gift-head').textContent='Ein kleines Danke an meine Probetester';
    panel.querySelector('.tester-gift-intro').textContent='Dein Geschenk wurde freigeschaltet! ✨';
    panel.querySelector('.tester-gift-open').hidden=true;
    panel.querySelector('.tester-gift-tip').textContent='Rahmen und Item kannst du jederzeit über Items & Rahmen auswählen.';
    const result=panel.querySelector('.tester-gift-result');
    result.hidden=false;
    result.innerHTML='<div class="tester-gift-prizes"><div><img src="'+reward.frameArt+'" alt=""><strong>'+reward.frame+'</strong><small>Exklusiver Rahmen</small></div>'+
      '<div><img src="'+reward.art+'" alt=""><strong>'+reward.item+'</strong><small>Exklusives Item'+(data.gift.key==='chandra'?' + frei wählbarer Titel':'')+'</small></div></div>'+
      '<button type="button" class="tester-gift-done">Zum Inventar ✨</button>';
    result.querySelector('button').addEventListener('click',closeGift);
    sparkConfetti(panel);
    try{
      if(typeof applyServerProfile==='function')applyServerProfile(data.profile);
      if(typeof playSfx==='function')playSfx('accessoire',{gain:.7});
    }catch(err){console.warn('[MLP] Geschenk-Vorschau:',err)}
  });
  socket.on('testerGiftError',message=>{
    if(!overlay)return;
    opening=false;
    const button=overlay.querySelector('.tester-gift-open');
    if(button){button.disabled=false;button.querySelector('strong').textContent='Erneut versuchen';}
    const tip=overlay.querySelector('.tester-gift-tip');
    if(tip)tip.textContent=String(message||'Geschenk konnte nicht geöffnet werden.');
  });
  socket.on('accountLoggedOut',()=>{opening=false;overlay?.remove();overlay=null;closed=true});
})();
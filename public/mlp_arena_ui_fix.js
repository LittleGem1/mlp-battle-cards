/* 2026-10-10: Das HUD ist eine rein optische Ebene.
   Die vorhandenen Deck-Knoten werden unverändert verschoben; die IDs,
   Kartenzähler und Klicklogik bleiben erhalten. */
(function installArenaDeckAndArtifactLayout(){
  const game=document.getElementById('game');
  const arena=game?.querySelector('.arena');
  const hud=document.getElementById('deckHud');
  const normal=document.getElementById('normalDeckHud');
  const gold=document.getElementById('rewardDeckHud');
  const shelf=document.getElementById('artifactShelf');
  if(!game||!arena||!hud||!normal||!gold||!shelf)return;

  // Aus .center-stage herausnehmen, damit sie auch bei backdrop-filter/overflow
  // nicht abgeschnitten werden. Das betrifft nur die Darstellung.
  if(hud.parentElement!==document.body)document.body.appendChild(hud);
  hud.classList.add('mlp-decks-fixed');
  let scheduled=false;
  const setPx=(element,property,value)=>element.style.setProperty(property,`${Math.round(value)}px`,'important');
  function layout(){
    scheduled=false;
    const visible=game.classList.contains('active') && document.body.classList.contains('scene-game');
    hud.classList.toggle('hud-visible',visible);
    if(!visible)return;
    const bounds=arena.getBoundingClientRect();
    const winW=window.innerWidth,winH=window.innerHeight;
    const compact=winW<660;
    const edge=compact?7:14;
    const xLeft=Math.max(edge,bounds.left+edge);
    const xRight=Math.max(edge,winW-bounds.right+edge);
    // Absolute Positionierung im Viewport ohne die Spielfläche zu strecken.
    for(const [element,side,sideValue] of [[normal,'left',xLeft],[gold,'right',xRight]]){
      element.style.setProperty('position','fixed','important');
      element.style.setProperty('transform','none','important');
      element.style.setProperty(side==='left'?'right':'left','auto','important');
      element.style.setProperty('bottom','auto','important');
      setPx(element,side,sideValue);
    }
    shelf.style.setProperty('position','fixed','important');
    shelf.style.setProperty('transform','none','important');
    shelf.style.setProperty('left','auto','important');
    shelf.style.setProperty('bottom','auto','important');
    shelf.style.setProperty('margin','0','important');
    shelf.style.setProperty('width',compact?'143px':'168px','important');
    setPx(shelf,'right',xRight);

    // Goldstapel sichtbar unter dem Artefakt-Kasten (nie dahinter).
    const artHeight=Math.max(130,shelf.getBoundingClientRect().height);
    const goldHeight=Math.max(55,gold.getBoundingClientRect().height);
    const viewTop=Math.max(8,bounds.top+8);
    const lowerLimit=Math.min(winH-12,bounds.bottom-12);
    const visibleHeight=Math.max(200,lowerLimit-viewTop);
    const desiredArtTop=viewTop+Math.min(visibleHeight*.4,235);
    const artTop=Math.max(viewTop+46,
      Math.min(desiredArtTop,lowerLimit-artHeight-goldHeight-15));
    const goldTop=Math.min(lowerLimit-goldHeight,artTop+artHeight+10);
    setPx(shelf,'top',Math.max(6,artTop));
    setPx(gold,'top',Math.max(6,goldTop));
    // Normalstapel links, deutlich oberhalb der Kategorie.
    const normalHeight=Math.max(55,normal.getBoundingClientRect().height);
    const normalTop=Math.min(artTop-15-normalHeight,viewTop+Math.min(visibleHeight*.22,150));
    setPx(normal,'top',Math.max(viewTop+25,normalTop));
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(layout)}}
  window.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(typeof ResizeObserver==='function')new ResizeObserver(schedule).observe(shelf);
  if(typeof socket!=='undefined'){
    ['roomState','roundIntro','roundStart','rewardChosen','hand'].forEach(event=>socket.on(event,schedule));
  }
  schedule();
  // Verzögerte Fonts/Render-Berechnung einmal berücksichtigen.
  setTimeout(schedule,300);
})();


/* Der normale Runden-Code verwendet bereits #categoryCrystalPortal. 
   Falls der alte Client wegen eines Overlay-Konflikts keine Animation zeigt,
   sorgt dieser Sichtbarkeits-Fallback dafür, dass dieselbe Kristallbühne
   mit der vom Server vorgegebenen Kategorie angezeigt wird. */
(function repairCategoryCrystalVisibility(){
  let lastKey='', finishTimer=null, revealTimer=null;
  function ensurePortal(){
    const existing=document.getElementById('categoryCrystalPortal');
    if(existing)return existing;
    const portal=document.createElement('div');
    portal.id='categoryCrystalPortal';
    portal.className='round-crystal-portal';
    portal.setAttribute('aria-hidden','true');
    portal.innerHTML=`
      <div class="round-crystal-box">
        <span id="portalRoundLabel" class="round-crystal-round">RUNDE 1</span>
        <span class="round-crystal-kicker">✦ NEUE KATEGORIE WIRD GEWÄHLT ✦</span>
        <div class="battle-crystal-wrap">
          <div class="battle-crystal-orbit orbit-a" aria-hidden="true"><i>✦</i><i>◇</i><i>✧</i><i>◇</i></div>
          <div class="battle-crystal-orbit orbit-b" aria-hidden="true"></div>
          <div class="battle-crystal-halo" aria-hidden="true"></div>
          <div id="battleCategoryCrystal" class="battle-crystal">
            <i class="facet f1"></i><i class="facet f2"></i><i class="facet f3"></i><i class="facet f4"></i><i class="crystal-shine"></i>
          </div>
        </div>
        <div id="portalCrystalResult" class="round-crystal-result"><b id="portalCrystalIcon">✦</b><strong id="portalCrystalLabel">MAGIE</strong></div>
        <small>Der Kristall bestimmt die Kategorie …</small>
      </div>`;
    document.body.appendChild(portal);
    return portal;
  }
  function enrichPortal(portal){
    const wrap=portal.querySelector('.battle-crystal-wrap');
    if(!wrap||wrap.querySelector('.battle-crystal-orbit'))return;
    const orbitA=document.createElement('div');
    orbitA.className='battle-crystal-orbit orbit-a';orbitA.setAttribute('aria-hidden','true');
    orbitA.innerHTML='<i>✦</i><i>◇</i><i>✧</i><i>◇</i>';
    const orbitB=document.createElement('div');orbitB.className='battle-crystal-orbit orbit-b';orbitB.setAttribute('aria-hidden','true');
    const halo=document.createElement('div');halo.className='battle-crystal-halo';halo.setAttribute('aria-hidden','true');
    wrap.prepend(orbitA,orbitB,halo);
  }
  function play(e){
    if(!e || !e.category || !['strength','speed','energy','magic'].includes(e.category))return;
    if(e.until && e.until<Date.now()-800)return;
    const key=String(e.round||1)+':'+String(e.until||'');
    if(lastKey===key)return;
    const portal=ensurePortal();
    enrichPortal(portal);
    // Wenn der eigentliche Client den Kristall bereits abspielt, nichts doppeln.
    const crystal=portal.querySelector('#battleCategoryCrystal');
    if(portal.classList.contains('active')&&crystal?.classList.contains('spinning')){
      lastKey=key;return;
    }
    lastKey=key;
    clearTimeout(finishTimer);clearTimeout(revealTimer);
    const display={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']}[e.category];
    const round=portal.querySelector('#portalRoundLabel');if(round)round.textContent='RUNDE '+(e.round||1);
    const icon=portal.querySelector('#portalCrystalIcon');if(icon)icon.textContent=e.icon||display[0];
    const label=portal.querySelector('#portalCrystalLabel');if(label)label.textContent=e.label||display[1];
    const result=portal.querySelector('#portalCrystalResult');result?.classList.remove('show');
    crystal?.classList.remove('spinning');
    portal.classList.remove('leaving');
    portal.classList.add('active');
    portal.setAttribute('aria-hidden','false');
    void crystal?.offsetWidth;
    crystal?.classList.add('spinning');
    revealTimer=setTimeout(()=>{result?.classList.add('show')},2550);
    finishTimer=setTimeout(()=>{
      portal.classList.add('leaving');
      setTimeout(()=>{portal.classList.remove('active','leaving');portal.setAttribute('aria-hidden','true')},220);
    },3750);
  }
  function onState(s){if(s?.phase==='roundintro')play({round:s.round,category:s.category,until:s.roundIntroUntil});}
  if(typeof socket!=='undefined'){
    socket.on('roundIntro',play);
    socket.on('roomState',onState);
    socket.on('roundSync',e=>{if(e?.phase==='roundintro')onState(e)});
    socket.on('roundStart',()=>{clearTimeout(finishTimer);clearTimeout(revealTimer);const p=document.getElementById('categoryCrystalPortal');if(p){p.classList.remove('active','leaving');p.setAttribute('aria-hidden','true')}lastKey='';});
  }
})();

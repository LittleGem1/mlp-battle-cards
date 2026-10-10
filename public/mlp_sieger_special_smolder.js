/* MLP Battle Cards: zusätzliche VISUELLE Effekte. Keine bestehenden Eventlistener ersetzen.
   Verwendet NUR die vom Server bereits gesendeten Events und deren Informationen. */
(function installVictorySpecialSmolderV1(){
  if(window.__mlpVisualUpdateV1)return;
  window.__mlpVisualUpdateV1=true;
  const byId=id=>document.getElementById(id);
  const SFX_CLASSES=['fx-polish','fx-smolder-live'];
  let specialHide=null;
  function ensureSpecial(){
    let node=byId('fxSpecialPresentation');
    if(node)return node;
    node=document.createElement('div');
    node.id='fxSpecialPresentation';
    node.className='fx-special-presentation';
    node.setAttribute('aria-hidden','true');
    node.innerHTML=`<div class="fx-special-panel">
      <div class="fx-special-banner"><span class="fx-special-banner-gem">✦</span><strong id="fxSpecialHeadline"></strong></div>
      <div class="fx-special-content">
        <div class="fx-special-card-wrap"><span class="fx-special-orbit"></span><img id="fxSpecialCard" alt="Ausgespielte Spezialkarte"></div>
        <div class="fx-special-explain">
          <small class="fx-special-kicker">✦ EFFEKT AKTIV ✦</small>
          <h2 id="fxSpecialTitle"></h2>
          <div class="fx-special-name" id="fxSpecialName"></div>
          <p id="fxSpecialDescription"></p>
          <div class="fx-special-type" id="fxSpecialType"></div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(node);
    return node;
  }
  function showSpecial(e){
    if(!e?.card)return;
    const c=e.card;
    const node=ensureSpecial();
    byId('fxSpecialHeadline').textContent=`${e.name||'Ein Spieler'} nutzt eine Spezialkarte!`;
    byId('fxSpecialTitle').textContent=c.useLabel||c.name||'Spezialkarte';
    byId('fxSpecialName').textContent=c.name||'';
    byId('fxSpecialDescription').textContent=c.text||'Spezialeffekt aktiviert';
    byId('fxSpecialType').textContent=`${c.useIcon||'✦'} ${c.useLabel||'Spezialkarte'}`;
    const image=byId('fxSpecialCard');
    image.src=c.image||'';image.alt=c.name||'Spezialkarte';
    clearTimeout(specialHide);
    node.classList.remove('show','leaving');
    void node.offsetWidth;
    node.classList.add('show');
    node.setAttribute('aria-hidden','false');
    document.body.classList.add('fx-special-active');
    specialHide=setTimeout(()=>{
      node.classList.add('leaving');
      document.body.classList.remove('fx-special-active');
      setTimeout(()=>{
        if(!node.classList.contains('leaving'))return;
        node.classList.remove('show','leaving');
        node.setAttribute('aria-hidden','true');
      },360);
    },2700);
  }
  function enhanceWinner(e){
    const overlay=byId('finisherOverlay');
    if(!overlay?.classList.contains('active'))return;
    const winner=byId('finisherWinner');
    const headline=byId('finisherHeadline');
    if(!winner||!headline)return;
    const current=headline.textContent?.trim()||'FINISHER';
    const winName=e?.winnerName||winner.querySelector('.finisher-tag')?.textContent?.replace(/^🏆\s*/,'')||'Spieler';
    headline.replaceChildren();
    const banner=document.createElement('div');
    banner.className='fx-victory-banner';
    const trophy=document.createElement('span');trophy.textContent='🏆';
    const name=document.createElement('strong');name.textContent=`${winName} gewinnt die Runde!`;
    banner.append(trophy,name);
    const subtitle=document.createElement('small');subtitle.className='fx-finisher-subtitle';subtitle.textContent=current;
    headline.append(banner,subtitle);
    const plate=document.createElement('div');
    plate.className='fx-winner-nameplate';
    plate.textContent=winName;
    winner.prepend(plate);
    overlay.classList.add('fx-polish');
  }
  function decorateSmolder(){
    const overlay=byId('finisherOverlay');
    if(!overlay?.classList.contains('stage-smolder'))return;
    overlay.classList.add('fx-smolder-live');
    const layers=overlay.querySelectorAll('#finisherLosers .v4-overlay-effect');
    layers.forEach((layer,index)=>{
      if(layer.querySelector('.fx-smolder-fire'))return;
      const fire=document.createElement('span');
      fire.className='fx-smolder-fire';
      fire.innerHTML=`<i class="fx-fire-wave fx-fire-wave-outer"></i><i class="fx-fire-wave fx-fire-wave-inner"></i><i class="fx-fire-wave fx-fire-wave-core"></i><i class="fx-fire-heat"></i><i class="fx-fire-scorch"></i><i class="fx-fire-smoke"></i>`;
      layer.appendChild(fire);
      const sparks=document.createElement('span');
      sparks.className='fx-fire-sparks';
      for(let i=0;i<24;i++){
        const spark=document.createElement('i');
        spark.style.setProperty('--n',String(i));
        spark.style.setProperty('--d',`${(i%9)*.077}s`);
        spark.style.setProperty('--vy',`${-94+(i*37)%180}px`);
        spark.style.setProperty('--vx',`${-155-(i*43)%220}px`);
        spark.style.setProperty('--size',`${3+(i%3)*3}px`);
        sparks.appendChild(spark);
      }
      layer.appendChild(sparks);
    });
  }
  // Bestehende Handler bleiben unverändert; nach dem Rendern nur Darstellung ergänzen.
  if(typeof socket!=='undefined' && typeof socket.on==='function'){
    socket.on('specialPlayed',e=>{
      requestAnimationFrame(()=>showSpecial(e));
    });
    socket.on('roundWinner',e=>{
      // Originale Verliereranimation und Kartenfang bleiben aktiv.
      requestAnimationFrame(()=>{enhanceWinner(e);if(e?.finisher==='smolder')decorateSmolder();});
    });
  }
})();

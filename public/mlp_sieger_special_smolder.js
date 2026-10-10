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
  // Smolder: genau das von der Spielerin freigegebene GIF – keine neue Zeichnung.
  // Eine einzige animierte Smolder-Figur pro Finisher, auch in der 12er Vorschau.
  // Keine Änderungen an playFinisher, Karten oder Socket-Spielereignissen.
  function decorateSmolder(){
    const overlay=byId('finisherOverlay');
    if(!overlay)return;
    const active=overlay.classList.contains('active') && overlay.classList.contains('stage-smolder');
    const previous=byId('mlpSmolderOriginalGif');
    if(!active){
      if(previous?._hideTimer)clearTimeout(previous._hideTimer);
      previous?.remove();
      if(overlay.classList.contains('smolder-gif-ready'))overlay.classList.remove('smolder-gif-ready');
      return;
    }
    const stage=overlay.querySelector('.finisher-stage');
    if(!stage)return;
    let img=previous;
    if(!img || img.parentNode!==stage){
      previous?.remove();
      img=document.createElement('img');
      img.id='mlpSmolderOriginalGif';
      img.className='smolder-original-gif';
      img.alt='Smolder fliegt und speit einmal Feuer';
      img.setAttribute('aria-hidden','true');
      img.draggable=false;
      stage.appendChild(img);
    }
    img.classList.remove('smolder-finished');
    if(img._hideTimer)clearTimeout(img._hideTimer);
    // Langsamere Einmal-Animation; Cache-Buster startet die Frames bei jedem Finisher/Test neu.
    img.src='/assets/animations/smolder-original-once-slow.gif?v=' + Date.now();
    img._hideTimer=setTimeout(()=>img.classList.add('smolder-finished'),1950);
    if(!overlay.classList.contains('smolder-gif-ready'))overlay.classList.add('smolder-gif-ready');
  }

  // Beobachtet auch die lokale Vorschau "Alle 12 Animationen testen":
  // diese ruft playFinisher direkt auf und sendet KEIN roundWinner vom Server.
  function watchSmolderDemo(){
    const overlay=byId('finisherOverlay');
    if(!overlay || typeof MutationObserver==='undefined')return;
    const watcher=new MutationObserver(()=>decorateSmolder());
    watcher.observe(overlay,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    decorateSmolder();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchSmolderDemo,{once:true});
  else watchSmolderDemo();
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

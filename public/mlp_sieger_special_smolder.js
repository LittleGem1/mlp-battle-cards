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
  // Die Karte bekommt ein echtes Canvas: Flammen, glühende Brandkante,
  // sichtbares Wegbrennen der ORIGINALEN Karten-Grafik statt nur CSS-Blur.
  // Pure Darstellung, keine Karten-/Punkte-/Timer-/Socket-Eingriffe.
  let smolderBurnJobs=[];
  function stopSmolderBurn(){
    for(const job of smolderBurnJobs){job.cancelled=true;cancelAnimationFrame(job.frame||0);}
    smolderBurnJobs=[];
    document.querySelectorAll('#finisherLosers .mlp-smolder-card-burn').forEach(el=>el.remove());
    document.querySelectorAll('#finisherLosers .mlp-smolder-canvas-ready').forEach(el=>el.classList.remove('mlp-smolder-canvas-ready'));
  }
  function startSmolderBurn(overlay){
    stopSmolderBurn();
    const shells=[...overlay.querySelectorAll('#finisherLosers .loser-card')];
    const stamp=performance.now();
    shells.forEach((shell,index)=>{
      const image=shell.querySelector('img.finisher-card-image');
      if(!image)return;
      const canvas=document.createElement('canvas');
      canvas.className='mlp-smolder-card-burn';
      canvas.setAttribute('aria-hidden','true');
      canvas.width=360;canvas.height=502;
      shell.appendChild(canvas);
      const ctx=canvas.getContext('2d',{alpha:true});
      if(!ctx){canvas.remove();return;}
      const job={cancelled:false,frame:0};
      smolderBurnJobs.push(job);
      const w=canvas.width,h=canvas.height;
      let began=false;
      function frontier(x,p,ms){
        const wave=Math.sin(x*.048+ms*.004)*9+Math.sin(x*.108-ms*.007)*5;
        return h*(1-p)+wave;
      }
      function paint(now){
        if(job.cancelled||!shell.isConnected||!overlay.classList.contains('stage-smolder'))return;
        const ms=now-stamp-index*75;
        const burn=Math.min(1.13,Math.max(0,(ms-1120)/2350));
        ctx.clearRect(0,0,w,h);
        if(burn<.001){
          ctx.drawImage(image,0,0,w,h);
        } else if(burn<1.10){
          ctx.save();
          // Die noch nicht verbrannte Kartenhälfte mit gezackter Brandkante.
          ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);
          for(let x=w;x>=0;x-=4)ctx.lineTo(x,frontier(x,burn,ms));
          ctx.closePath();ctx.clip();
          ctx.drawImage(image,0,0,w,h);
          // Verkohlte Zone unmittelbar oberhalb der aufsteigenden Brandkante.
          const edge=frontier(w/2,burn,ms);
          const char=ctx.createLinearGradient(0,edge-70,0,edge+8);
          char.addColorStop(0,'rgba(32,15,6,0)');
          char.addColorStop(.54,'rgba(40,17,5,.12)');
          char.addColorStop(.86,'rgba(28,11,4,.83)');
          char.addColorStop(1,'rgba(6,3,2,.97)');
          ctx.fillStyle=char;ctx.fillRect(0,edge-85,w,105);
          ctx.restore();
          // Entlang der Kante entsteht zuerst Glut, dann eine lebendige Flamme.
          ctx.beginPath();
          for(let x=0;x<=w;x+=4){const y=frontier(x,burn,ms);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
          ctx.lineWidth=16;ctx.strokeStyle='rgba(250,70,6,.75)';ctx.shadowColor='#ff530f';ctx.shadowBlur=22;ctx.stroke();
          ctx.lineWidth=5;ctx.strokeStyle='rgba(255,224,97,.95)';ctx.shadowBlur=7;ctx.stroke();
          ctx.shadowBlur=0;
          // Flammenzungen schlagen über die echte Karte nach oben.
          for(let i=0;i<12;i++){
            const x=(i+.28)*w/12;
            const y=frontier(x,burn,ms);
            if(y<-45||y>h+35)continue;
            const flicker=Math.sin(ms*.014+i*2.47);
            const tall=58+((i*13)%48)+flicker*16;
            const size=17+((i*11)%20);
            const tip=x+Math.sin(ms*.007+i)*14;
            const flame=ctx.createLinearGradient(x,y-tall,x,y+6);
            flame.addColorStop(0,'rgba(255,240,151,.93)');
            flame.addColorStop(.25,'rgba(255,225,79,.98)');
            flame.addColorStop(.61,'rgba(255,114,18,.95)');
            flame.addColorStop(1,'rgba(205,37,0,.2)');
            ctx.beginPath();ctx.moveTo(x-size,y+8);
            ctx.quadraticCurveTo(x-size*.5,y-tall*.46,tip,y-tall);
            ctx.quadraticCurveTo(x+size*.8,y-tall*.50,x+size,y+8);
            ctx.closePath();ctx.fillStyle=flame;
            ctx.shadowColor='rgba(255,99,14,.78)';ctx.shadowBlur=13;
            ctx.fill();ctx.shadowBlur=0;
          }
          // Funken und Aschestückchen fliegen oberhalb der Brandkante.
          for(let i=0;i<22;i++){
            const x=(i*71+(ms*.028*(i%3+1)))%w;
            const y=frontier(x,burn,ms)-((ms*.09+i*13)%85);
            if(y<-8||y>h+8)continue;
            const r=1+(i%3);
            ctx.fillStyle=i%4===0?'rgba(255,239,178,.85)':i%3===0?'rgba(92,82,78,.55)':'rgba(255,130,27,.9)';
            ctx.beginPath();ctx.ellipse(x,y,r,r*1.5,i*.35,0,Math.PI*2);ctx.fill();
          }
        }
        if(ms<3900 && !job.cancelled){job.frame=requestAnimationFrame(paint)}
        else {ctx.clearRect(0,0,w,h);}
      }
      function begin(){
        if(began||job.cancelled||!shell.isConnected)return;
        began=true;
        shell.classList.add('mlp-smolder-canvas-ready');
        job.frame=requestAnimationFrame(paint);
      }
      if(image.complete&&image.naturalWidth)begin();
      else {
        image.addEventListener('load',begin,{once:true});
        // Lädt das Bild nicht, bleibt die bisherige CSS-Animation sichtbar.
      }
    });
  }

  // SMOLDER V4 — einmaliger Start pro Finisher, ohne Endlosschleife.
  // Die Teststeuerung bleibt vollständig beim vorhandenen playFinisher() im Spiel.
  let smolderEpisode=false;
  let smolderHideTimer=null;
  function decorateSmolder(){
    const overlay=byId('finisherOverlay');
    if(!overlay)return;
    const active=overlay.classList.contains('active') && overlay.classList.contains('stage-smolder');
    const stage=overlay.querySelector('.finisher-stage');
    if(!active){
      if(smolderHideTimer!==null){clearTimeout(smolderHideTimer);smolderHideTimer=null;}
      smolderEpisode=false;
      stopSmolderBurn();
      byId('mlpSmolderOriginalGif')?.remove();
      if(overlay.classList.contains('smolder-gif-ready'))overlay.classList.remove('smolder-gif-ready');
      return;
    }
    // Ein zweiter MutationObserver-Aufruf oder ein roundWinner-Event darf
    // weder das GIF noch den Countdown erneut starten.
    if(smolderEpisode)return;
    if(!stage)return;
    smolderEpisode=true;
    const old=byId('mlpSmolderOriginalGif');
    old?.remove();
    const img=document.createElement('img');
    img.id='mlpSmolderOriginalGif';
    img.className='smolder-original-gif';
    img.alt='Smolder spuckt einmal Feuer';
    img.setAttribute('aria-hidden','true');
    img.draggable=false;
    // GIF ohne Netscape-Loop-Extension: spielt genau EIN MAL.
    img.src='/assets/animations/smolder-original-once-slow.gif?v=smolder-one-shot-v4';
    stage.appendChild(img);
    overlay.classList.add('smolder-gif-ready');
    startSmolderBurn(overlay);
    // Nur visuell ausblenden; keine Overlay-/Klassenmutation,
    // die einen erneuten Start auslösen könnte.
    smolderHideTimer=setTimeout(()=>{
      if(img.isConnected && smolderEpisode){img.style.opacity='0';}
      smolderHideTimer=null;
    },2750);
  }

  // Nur den Klassenwechsel der HAUPT-Ebene beobachten, nicht alle
  // Unterelemente. Sonst lösten GIF- und Klassenänderungen sich selbst aus
  // und blockierten beim Demo-Test Animation 11 (Smolder).
  function watchSmolderDemo(){
    const overlay=byId('finisherOverlay');
    if(!overlay || typeof MutationObserver==='undefined')return;
    const observer=new MutationObserver(()=>decorateSmolder());
    observer.observe(overlay,{attributes:true,attributeFilter:['class']});
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

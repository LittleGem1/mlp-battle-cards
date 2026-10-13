/* Königin Chandra – native match visual, waits through the 2-second silent end-card hold.
   Assets (public): /assets/queen_chandra_storyboard.png, /assets/queen_chandra_magic.mp3,
   /assets/specials_new/101_Koenigin_Chandra.png
*/
(()=>{
  const INTRO_MS=2600, DURATION=8600, SPELL=6600, FRAME_PORTION=6000;
  let current=null;
  const css=document.createElement('style');
  css.textContent=`
  .qc-stage{position:fixed;inset:0;z-index:2147482500;display:grid;place-items:center;background:radial-gradient(ellipse at center,rgba(20,55,109,.97),rgba(3,9,28,.99));overflow:hidden;pointer-events:none;animation:qc-in .35s both}
  .qc-stage::before{content:"";position:absolute;width:90vmin;height:90vmin;border-radius:50%;border:3px solid #82dfff89;box-shadow:0 0 85px #3fb6ff;animation:qc-spin 5s linear infinite}
  .qc-stage::after{content:"";position:absolute;inset:0;background:radial-gradient(circle,#ffffff99 0 2px,transparent 3px) 0 0/95px 115px;opacity:.25;animation:qc-spark 6s linear infinite}
  .qc-frame{position:absolute;width:min(78vmin,720px);aspect-ratio:1;background-image:url('/assets/queen_chandra_storyboard.png');background-size:400% 400%;background-position:0% 0%;background-repeat:no-repeat;box-shadow:0 0 60px #82bfff55;border-radius:12px;opacity:1;transition:opacity .25s}
  .qc-card{position:absolute;height:min(90vh,860px);max-width:88vw;object-fit:contain;filter:drop-shadow(0 0 25px #7acaffaa);opacity:0;transform:scale(.83);transition:opacity .45s,transform .45s}
  .qc-stage.qc-reveal .qc-frame{opacity:0}
  .qc-stage.qc-reveal .qc-card{opacity:1;transform:scale(1)}
  .qc-glint{position:absolute;inset:0;opacity:0;background:#fff;pointer-events:none}
  .qc-stage.qc-reveal .qc-glint{animation:qc-flash .55s forwards}
  @keyframes qc-in{from{opacity:0}to{opacity:1}}
  @keyframes qc-flash{0%{opacity:0}30%{opacity:.85}100%{opacity:0}}
  @keyframes qc-spin{to{transform:rotate(360deg)}}
  @keyframes qc-spark{to{background-position:38px -130px}}
  `;
  document.head.append(css);
  function activate(e){
    if(e?.card?.effect!=='queen_chandra')return;
    if(current)current();
    setTimeout(()=>startTransformation(e), INTRO_MS);
  }
  function startTransformation(e){
    const stage=document.createElement('div');stage.className='qc-stage';
    stage.setAttribute('aria-label','Königin Chandra verwandelt sich');
    const panel=document.createElement('div');panel.className='qc-frame';
    const card=document.createElement('img');card.className='qc-card';card.alt='Königin Chandra';card.src='/assets/specials_new/101_Koenigin_Chandra_Final.png';card.onerror=()=>{card.src='/assets/specials_new/101_Koenigin_Chandra.png';};
    const glint=document.createElement('div');glint.className='qc-glint';
    stage.append(panel,card,glint);document.body.append(stage);
    const sound=new Audio('/assets/queen_chandra_magic.mp3');
    sound.volume=typeof window.battleSoundVolume==='number'?Math.max(0,Math.min(1,window.battleSoundVolume)):0.8;
    sound.play().catch(()=>{});
    let start=performance.now(),raf=0;
    let ended=false;
    const cleanup=()=>{if(ended)return;ended=true;cancelAnimationFrame(raf);sound.pause();stage.remove();if(current===cleanup)current=null;};
    current=cleanup;
    const tick=now=>{
      const elapsed=now-start;
      if(elapsed>=DURATION){cleanup();return;}
      if(elapsed>=SPELL-450)stage.classList.add('qc-reveal');
      else {
        const n=Math.min(15,Math.floor(elapsed/FRAME_PORTION*16));
        const x=n%4,y=Math.floor(n/4);
        panel.style.backgroundPosition=(x*100/3)+'% '+(y*100/3)+'%';
      }
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  function bind(){
    if(typeof socket!=='undefined'&&socket&&typeof socket.on==='function')socket.on('specialPlayed',activate);
    else setTimeout(bind,250);
  }
  bind();
})();
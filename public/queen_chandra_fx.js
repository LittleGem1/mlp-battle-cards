/* Königin Chandra – Spezialeffekt
Ablauf:
1) Standard-Spezialkarte wird wie üblich vom Spiel gezeigt.
2) Nach 2,5 s startet die Verwandlungsanimation.
3) Danach wird kurz die finale Chandra-Karte gezeigt.
4) Erst dann soll der Server die Auswahl EINER Spezialkarte öffnen.

Benötigte Assets:
- /assets/specials_new/101_Koenigin_Chandra.png
- /assets/specials_new/101_Koenigin_Chandra_Final.png
- /assets/queen_chandra_storyboard.png
- /assets/queen_chandra_magic.mp3
*/
(()=>{
  const INTRO_BURST_MS = 2500;   // Erst normale Special-Kartenanzeige wie bei allen anderen.
  const FRAME_TOTAL_MS = 5600;   // 16 Panels der Verwandlung.
  const FINAL_CARD_HOLD_MS = 1400; // Zweites Bild kurz sichtbar.

  const STORYBOARD = '/assets/queen_chandra_storyboard.png';
  const FINAL_CARD = '/assets/specials_new/101_Koenigin_Chandra_Final.png';
  const MAGIC_SOUND = '/assets/queen_chandra_magic.mp3';

  let activeCleanup = null;

  function ensureStyles(){
    if(document.getElementById('queen-chandra-fx-styles')) return;
    const style = document.createElement('style');
    style.id = 'queen-chandra-fx-styles';
    style.textContent = `
      .qcfx-overlay{position:fixed;inset:0;z-index:2147482600;display:grid;place-items:center;
        background:radial-gradient(circle at center, rgba(19,42,92,.96) 0%, rgba(5,10,28,.985) 72%, rgba(3,6,16,.995) 100%);
        overflow:hidden;pointer-events:none;opacity:0;animation:qcfxFadeIn .28s forwards;}
      .qcfx-overlay::before{content:"";position:absolute;width:84vmin;height:84vmin;border-radius:50%;
        border:3px solid rgba(101,214,255,.50);box-shadow:0 0 48px rgba(87,180,255,.38), inset 0 0 24px rgba(87,180,255,.12);
        animation:qcfxSpin 7s linear infinite;}
      .qcfx-overlay::after{content:"";position:absolute;inset:-15%;opacity:.32;
        background:
          radial-gradient(circle, rgba(255,255,255,.95) 0 1px, transparent 1.8px) 10% 15%/150px 150px,
          radial-gradient(circle, rgba(121,211,255,.95) 0 1.5px, transparent 2px) 70% 28%/175px 175px,
          radial-gradient(circle, rgba(255,226,145,.85) 0 1.25px, transparent 2px) 38% 72%/165px 165px;
        animation:qcfxDrift 10s linear infinite;}
      .qcfx-frame, .qcfx-final{position:absolute;object-fit:contain;border-radius:14px;}
      .qcfx-frame{width:min(76vmin, 720px);aspect-ratio:1;background-image:url('${STORYBOARD}');
        background-size:400% 400%;background-repeat:no-repeat;box-shadow:0 0 52px rgba(83,175,255,.22);}
      .qcfx-final{height:min(88vh, 980px);max-width:88vw;opacity:0;transform:scale(.86);
        filter:drop-shadow(0 0 26px rgba(100,198,255,.42));transition:opacity .42s ease, transform .42s cubic-bezier(.2,1.1,.32,1);}
      .qcfx-overlay.reveal .qcfx-frame{opacity:0;transition:opacity .28s ease;}
      .qcfx-overlay.reveal .qcfx-final{opacity:1;transform:scale(1);}
      .qcfx-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;}
      .qcfx-overlay.reveal .qcfx-flash{animation:qcfxFlash .55s ease forwards;}
      @keyframes qcfxFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes qcfxFlash{0%{opacity:0}32%{opacity:.82}100%{opacity:0}}
      @keyframes qcfxSpin{to{transform:rotate(360deg)}}
      @keyframes qcfxDrift{to{transform:translateY(24px)}}`;
    document.head.appendChild(style);
  }

  function runChandraEffect(){
    ensureStyles();
    if(activeCleanup) activeCleanup();

    const overlay = document.createElement('div');
    overlay.className = 'qcfx-overlay';

    const frame = document.createElement('div');
    frame.className = 'qcfx-frame';

    const finalCard = document.createElement('img');
    finalCard.className = 'qcfx-final';
    finalCard.src = FINAL_CARD;
    finalCard.alt = 'Königin Chandra';

    const flash = document.createElement('div');
    flash.className = 'qcfx-flash';

    overlay.append(frame, finalCard, flash);
    document.body.appendChild(overlay);

    const sound = new Audio(MAGIC_SOUND);
    try{
      const vol = (typeof window.battleSoundVolume === 'number') ? Math.max(0, Math.min(1, window.battleSoundVolume)) : 0.8;
      sound.volume = vol;
    }catch(err){}
    sound.play().catch(()=>{});

    let raf = 0;
    let ended = false;
    const startedAt = performance.now();

    activeCleanup = ()=>{
      if(ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      try{ sound.pause(); sound.currentTime = 0; }catch(err){}
      overlay.remove();
      if(activeCleanup === cleanup) activeCleanup = null;
    };
    const cleanup = activeCleanup;

    function tick(now){
      if(ended) return;
      const elapsed = now - startedAt;
      if(elapsed < FRAME_TOTAL_MS){
        const idx = Math.min(15, Math.floor((elapsed / FRAME_TOTAL_MS) * 16));
        const x = idx % 4;
        const y = Math.floor(idx / 4);
        frame.style.backgroundPosition = `${(x * 100 / 3).toFixed(4)}% ${(y * 100 / 3).toFixed(4)}%`;
      }else if(elapsed < FRAME_TOTAL_MS + FINAL_CARD_HOLD_MS){
        overlay.classList.add('reveal');
      }else{
        cleanup();
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  function onSpecialPlayed(e){
    if(!e || e.card?.effect !== 'queen_chandra') return;
    // Erst normale Standardanzeige der Karte abwarten.
    setTimeout(runChandraEffect, INTRO_BURST_MS);
  }

  function bind(){
    if(typeof socket !== 'undefined' && socket && typeof socket.on === 'function'){
      socket.on('specialPlayed', onSpecialPlayed);
      return;
    }
    setTimeout(bind, 250);
  }
  bind();

  // Export hilfreiche Zeiten für den Server, falls gebraucht.
  window.QUEEN_CHANDRA_SEQUENCE = {
    introBurstMs: INTRO_BURST_MS,
    frameTotalMs: FRAME_TOTAL_MS,
    finalCardHoldMs: FINAL_CARD_HOLD_MS,
    totalAfterPlayMs: INTRO_BURST_MS + FRAME_TOTAL_MS + FINAL_CARD_HOLD_MS
  };
})();

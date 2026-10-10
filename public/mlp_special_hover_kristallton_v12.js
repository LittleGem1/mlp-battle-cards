/* MLP Battle Cards – V12: präziser Hover für das V11-Dock und Sound synchron
   zur sichtbaren Kristalldrehung. Keine Spiel-Events werden ausgesendet. */
(function(){
  'use strict';
  if(window.__mlpSpecialCrystalV12)return;
  window.__mlpSpecialCrystalV12=true;
  const finePointer=()=>window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $=s=>document.querySelector(s);
  let hideTimer=null;
  let hoveredCard=null;
  let dockHovered=false;
  const isGame=()=>!!$('#game.screen.active');
  const getDock=()=>document.getElementById('mlpV11SpecialDock');
  const cardFrom=node=>node?.closest?.('#game #hand .hand-card.special')||null;
  const reveal=()=>{
    if(!isGame()||!finePointer())return;
    clearTimeout(hideTimer);
    const dock=getDock();
    if(dock)dock.classList.add('mlp-v12-hover-open');
  };
  const conceal=(delay=145)=>{
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>{
      if(dockHovered||hoveredCard)return;
      getDock()?.classList.remove('mlp-v12-hover-open');
    },delay);
  };
  const initHover=()=>{
    if(!finePointer())return;
    // Document delegation survives redraws of all cards/docks.
    document.addEventListener('pointerover',e=>{
      if(e.pointerType && e.pointerType!=='mouse' && e.pointerType!=='pen')return;
      const card=cardFrom(e.target);
      if(card){hoveredCard=card;reveal();return;}
      if(e.target?.closest?.('#mlpV11SpecialDock')){dockHovered=true;reveal();}
    });
    document.addEventListener('pointerout',e=>{
      if(e.pointerType && e.pointerType!=='mouse' && e.pointerType!=='pen')return;
      const card=cardFrom(e.target);
      if(card && !card.contains(e.relatedTarget)){
        hoveredCard=cardFrom(e.relatedTarget);
        if(!hoveredCard && !dockHovered)conceal();
      }
      const dock=getDock();
      if(dock?.contains(e.target) && !dock.contains(e.relatedTarget)){
        dockHovered=false;
        hoveredCard=cardFrom(e.relatedTarget);
        if(!hoveredCard)conceal();
      }
    });
    document.addEventListener('focusin',e=>{
      if(cardFrom(e.target)||e.target?.closest?.('#mlpV11SpecialDock')){
        hoveredCard=cardFrom(e.target);dockHovered=!!e.target.closest('#mlpV11SpecialDock');reveal();
      }
    });
    document.addEventListener('focusout',e=>{
      if(cardFrom(e.target)||e.target?.closest?.('#mlpV11SpecialDock')){
        hoveredCard=cardFrom(e.relatedTarget);dockHovered=!!e.relatedTarget?.closest?.('#mlpV11SpecialDock');
        if(!hoveredCard&&!dockHovered)conceal();
      }
    });
    window.addEventListener('blur',()=>{
      hoveredCard=null;dockHovered=false;conceal(0);
    });
  };

  const soundFile='/assets/sounds/mlp_kristall_drehung_v12.mp3';
  const sound=new Audio(soundFile);
  sound.preload='auto';sound.volume=.86;
  let crystalPlaying=false, soundFallbackStarted=false, soundTimer=null;
  let fallbackCtx=null;
  let lastStart=0;
  function synthFallback(){
    if(soundFallbackStarted)return;
    soundFallbackStarted=true;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      fallbackCtx ||= new AudioCtx();
      if(fallbackCtx.state==='suspended')fallbackCtx.resume().catch(()=>{});
      const now=fallbackCtx.currentTime;
      for(let i=0;i<9;i++){
        const osc=fallbackCtx.createOscillator();
        const gain=fallbackCtx.createGain();
        osc.type='sine';
        const start=now+i*.2;
        osc.frequency.setValueAtTime(520+i*77,start);
        osc.frequency.exponentialRampToValueAtTime(620+i*77,start+.26);
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.055,start+.04);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.37);
        osc.connect(gain);gain.connect(fallbackCtx.destination);
        osc.start(start);osc.stop(start+.4);
      }
    }catch(_){}
  }
  function startSound(){
    if(crystalPlaying||Date.now()-lastStart<350)return;
    crystalPlaying=true;lastStart=Date.now();soundFallbackStarted=false;
    clearTimeout(soundTimer);
    try{
      sound.pause();sound.currentTime=0;
      const promise=sound.play();
      if(promise?.catch)promise.catch(()=>{
        // Browser dürfen Ton vor der ersten Interaktion blockieren.
        // Synthetischer Klang ist nur ein Fallback, keine Garantie dagegen.
        if(crystalPlaying)synthFallback();
      });
    }catch(_){synthFallback()}
    soundTimer=setTimeout(stopSound,2850);
  }
  function stopSound(){
    crystalPlaying=false;clearTimeout(soundTimer);
    sound.pause();try{sound.currentTime=0}catch(_){}
  }
  const observeCrystal=()=>{
    const big=document.getElementById('mlpCrystalV11');
    if(!big)return false;
    const read=()=>{
      const opened=big.classList.contains('v11-open')&&big.getAttribute('aria-hidden')!=='true';
      const revealed=big.querySelector('.v11-result')?.classList.contains('revealed');
      if(opened&&!revealed)startSound();
      else if(crystalPlaying)stopSound();
    };
    new MutationObserver(read).observe(big,{attributes:true,attributeFilter:['class','aria-hidden']});
    const result=big.querySelector('.v11-result');
    if(result)new MutationObserver(read).observe(result,{attributes:true,attributeFilter:['class']});
    read();return true;
  };
  const initSound=()=>{
    // Beginnt den Klang nur, wenn die große, tatsächlich sichtbare
    // Kristallanimation startet (nicht bei jedem roomState-Event).
    if(observeCrystal())return;
    const mountWatcher=new MutationObserver(()=>{
      if(observeCrystal())mountWatcher.disconnect();
    });
    mountWatcher.observe(document.body,{childList:true,subtree:true});
  };
  function initDiagnostic(){
    if(new URLSearchParams(location.search).get('fixcheck')!=='1')return;
    const box=document.createElement('div');
    box.id='mlpV12FixCheck';
    box.style.cssText='position:fixed;top:12px;left:12px;z-index:2147483647;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 25px);padding:8px 11px;border:1px solid #a8e9ff;border-radius:10px;background:#172645;color:white;font:700 12px system-ui;box-shadow:0 4px 14px #0009';
    const text=document.createElement('span');text.textContent='✓ V12 geladen';
    const button=document.createElement('button');button.type='button';button.textContent='Kristallton testen';
    button.style.cssText='border:1px solid #a8e9ff;background:#3b398e;color:white;padding:5px;border-radius:6px;cursor:pointer';
    button.addEventListener('click',()=>{
      stopSound();
      sound.currentTime=0;
      const result=sound.play();
      text.textContent='♪ Ton gestartet';
      if(result?.catch)result.catch(()=>{text.textContent='Ton vom Browser blockiert';});
      setTimeout(()=>{sound.pause();try{sound.currentTime=0}catch(_){}},2800);
    });
    box.append(text,button);document.body.append(box);
  }
  const start=()=>{initHover();initSound();initDiagnostic();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();

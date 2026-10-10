/* MLP Battle Cards – Kristall V10, unabhängig von alten Overlay-Implementierungen.
   Lesezugriff auf Spielereignisse; keine socket.emit, Regeln, Timer oder Arena-Mutationen. */
(function installCrystalV10(){
  'use strict';
  if(window.__mlpCrystalV10Installed)return;
  window.__mlpCrystalV10Installed=true;
  const byId=id=>document.getElementById(id);
  const cats={strength:['🏋️','STÄRKE'],speed:['⚡','SCHNELLIGKEIT'],energy:['🔋','ENERGIE'],magic:['⭐','MAGIE']};
  const testMode=new URLSearchParams(location.search).get('kristalltest')==='1';
  let shownKey='',activeKey='',timerReveal=0,timerClose=0;
  let overlay=null;
  function create(){
    if(overlay)return overlay;
    overlay=document.createElement('section');
    overlay.id='mlpCrystalV10';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="mlpc-box" role="status" aria-live="polite">
      <div class="mlpc-round" id="mlpcRound">RUNDE 1</div>
      <div class="mlpc-subtitle">✦ NEUE KATEGORIE WIRD GEWÄHLT ✦</div>
      <div class="mlpc-orbit-area"><div class="mlpc-orbit"><i>✦</i><i>◇</i><i>✧</i><i>◇</i></div>
        <div class="mlpc-gem" aria-label="Drehender Kristall"><i></i><i></i><i></i><i></i></div></div>
      <div class="mlpc-result" id="mlpcResult"><span class="mlpc-symbol" id="mlpcIcon">⭐</span><strong id="mlpcLabel">MAGIE</strong></div>
    </div><div class="mlpc-diagnostic">💎 Kristall V10 geladen
      <button type="button" id="mlpcReplay">Noch einmal testen</button></div>`;
    document.body.appendChild(overlay);
    if(testMode){
      overlay.classList.add('mlp-crystal-v10-test');
      byId('mlpcReplay').addEventListener('click',()=>show({round:1,category:'magic'},true));
    }
    return overlay;
  }
  function close(){
    clearTimeout(timerReveal);clearTimeout(timerClose);
    if(overlay){overlay.classList.remove('mlp-crystal-v10-visible');overlay.setAttribute('aria-hidden','true');}
    activeKey='';
  }
  function show(e,force=false){
    const cat=String(e?.category||'').toLowerCase();
    const ui=cats[cat];
    if(!ui)return;
    if(!force && e.until && e.until<Date.now()-300)return;
    const game=byId('game');
    if(!force && (!game?.classList.contains('active') || !document.body.classList.contains('scene-game')))return;
    const k=String(e?.round||1)+'|'+cat+'|'+String(e?.until||'');
    if(!force && (k===shownKey || k===activeKey))return;
    close();
    shownKey=k;activeKey=k;
    const el=create();
    byId('mlpcRound').textContent='RUNDE '+(e?.round||1);
    byId('mlpcIcon').textContent=e?.icon||ui[0];
    byId('mlpcLabel').textContent=e?.label||ui[1];
    const result=byId('mlpcResult');result.classList.remove('mlpc-revealed');
    // Neustart der Drehung – ausschließlich ein CSS-Effekt dieser Anzeige.
    const gem=el.querySelector('.mlpc-gem');gem.style.animation='none';void gem.offsetWidth;gem.style.animation='';
    el.classList.add('mlp-crystal-v10-visible');el.setAttribute('aria-hidden','false');
    timerReveal=setTimeout(()=>{if(activeKey===k)result.classList.add('mlpc-revealed')},2450);
    if(!testMode)timerClose=setTimeout(()=>{if(activeKey===k)close()},3900);
  }
  function fromState(e){
    if(e?.phase==='roundintro'){
      show({round:e.round,category:e.category,until:e.roundIntroUntil});
    }else if(e && ['select','reveal','tie','result','rewardchoice','lobby','gameover'].includes(e.phase)){
      if(activeKey)close();
    }
  }
  function install(){
    create();
    if(typeof socket!=='undefined' && socket && typeof socket.on==='function'){
      socket.on('roundIntro', e=>show(e));
      socket.on('roomState',fromState);
      socket.on('roundSync',fromState);
      socket.on('roundStart',()=>close());
      socket.on('roomLeft',()=>close());
    }
    // Sicherheitsnetz: auch nach einem Reconnect, wenn das einzelne Ereignis
    // verpasst wurde; benötigt keine Änderung an der Spielmechanik.
    setInterval(()=>{
      if(testMode)return;
      try{
        if(typeof state!=='undefined'&&state?.phase==='roundintro')
          show({round:state.round,category:state.category,until:state.roundIntroUntil});
      }catch(_){}
    },500);
    if(testMode){setTimeout(()=>show({round:1,category:'magic'},true),350)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

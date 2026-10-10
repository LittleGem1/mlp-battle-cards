/* MLP Battle Cards – Kategorie-Kristall V3
   Das ist ein rein visueller Client-Zusatz: KEINE Änderungen an Karten, Zeiten,
   Gegnern, Server, Gewinnerlogik oder Spielregeln.
   Eine Bühne, ein Event-Ablauf. Frühere konkurrierende Portale werden ausgeblendet.
*/
(function installMLPCrystalV3(){
  'use strict';
  if(window.__mlpCrystalV3Installed)return;
  window.__mlpCrystalV3Installed=true;
  const CATEGORIES={
    strength:{label:'STÄRKE',icon:'🏋️',color:'#ffb1a3'},
    speed:{label:'SCHNELLIGKEIT',icon:'⚡',color:'#ffe69b'},
    energy:{label:'ENERGIE',icon:'🔋',color:'#89ffd0'},
    magic:{label:'MAGIE',icon:'⭐',color:'#e0adff'}
  };
  let activeKey=null,activeRound=0,endedKeys=new Set(),timers=[],preview=false,latestPhase=null;
  const clearTimers=()=>{for(const t of timers)clearTimeout(t);timers=[]};
  const later=(fn,ms)=>timers.push(setTimeout(fn,Math.max(0,ms)));
  function makeView(){
    let el=document.getElementById('mlpCrystalV3');
    if(el)return el;
    el=document.createElement('div');
    el.id='mlpCrystalV3';el.className='mlp-crystal-v3';
    el.setAttribute('aria-hidden','true');
    el.innerHTML=`
      <section class="mv3-stage" aria-label="Die nächste Kategorie wird ausgewählt">
        <div class="mv3-above" id="mv3Round">RUNDE 1</div>
        <div class="mv3-kicker">✦ NEUE KATEGORIE WIRD GEWÄHLT ✦</div>
        <div class="mv3-display" aria-hidden="true">
          <div class="mv3-rune mv3-rune-a">✧</div><div class="mv3-rune mv3-rune-b">✦</div>
          <div class="mv3-ring mv3-ring-a"></div><div class="mv3-ring mv3-ring-b"></div>
          <div class="mv3-aura"></div>
          <div class="mv3-gem-shell"><div class="mv3-gem">
            <div class="mv3-facet mv3-facet-a"></div><div class="mv3-facet mv3-facet-b"></div>
            <div class="mv3-facet mv3-facet-c"></div><div class="mv3-facet mv3-facet-d"></div>
            <div class="mv3-facet mv3-facet-e"></div><div class="mv3-core"></div>
          </div></div>
        </div>
        <div class="mv3-result" id="mv3Result">
          <span class="mv3-result-kicker">NÄCHSTE KATEGORIE</span>
          <div><span class="mv3-icon" id="mv3Icon">⭐</span><strong id="mv3Label">MAGIE</strong></div>
        </div>
        <small class="mv3-footer">Der Kristall hat entschieden</small>
      </section>`;
    document.body.appendChild(el);
    document.body.classList.add('mlp-crystal-v3-ready');
    return el;
  }
  function close(key){
    if(key!==undefined && key!==activeKey)return;
    clearTimers();
    const el=document.getElementById('mlpCrystalV3');
    if(el){el.classList.remove('is-visible','is-revealed','is-demo');el.setAttribute('aria-hidden','true');}
    if(activeKey!==null)endedKeys.add(activeKey);
    activeKey=null;preview=false;
  }
  function show(input,options={}){
    const category=String(input?.category||'').toLowerCase();
    if(!Object.hasOwn(CATEGORIES,category))return;
    const round=Number(input?.round||1);
    if(!options.preview && round<activeRound)return;
    const until=Number(input?.until??input?.roundIntroUntil??0);
    const now=Date.now();
    if(!options.preview && until && now>=until-200)return;
    // roomState und roundIntro vom Server dürfen nur EINE Animation ergeben.
    const key=options.preview?`demo:${now}`:`${round}:${until||'no-until'}`;
    if(!options.preview && (activeKey===key || endedKeys.has(key)))return;
    if(!options.preview && latestPhase==='select' && activeRound===round)return;
    close();
    const cat=CATEGORIES[category],el=makeView();
    activeKey=key;activeRound=options.preview?activeRound:Math.max(activeRound,round);
    preview=!!options.preview;
    const remaining=options.preview?4100:(until?Math.max(650,until-now):4000);
    const revealAt=Math.min(2350,Math.max(450,remaining-1250));
    const finishAt=Math.min(4100,Math.max(revealAt+520,remaining-130));
    el.style.setProperty('--mv3-color',cat.color);
    document.getElementById('mv3Round').textContent=options.preview?'VORSCHAU · KRISTALLTEST':`RUNDE ${round}`;
    document.getElementById('mv3Icon').textContent=input.icon||cat.icon;
    document.getElementById('mv3Label').textContent=input.label||cat.label;
    el.classList.remove('is-visible','is-revealed');
    // Neustart der CSS-Keyframes auch bei gleichen Kategorien in zwei Runden.
    void el.offsetWidth;
    el.classList.add('is-visible');if(preview)el.classList.add('is-demo');
    el.setAttribute('aria-hidden','false');
    later(()=>{if(activeKey===key)el.classList.add('is-revealed')},revealAt);
    later(()=>close(key),finishAt);
  }
  function fromState(s){
    if(!s || typeof s!=='object')return;
    const phase=s.phase;
    if(phase==='roundintro'){
      latestPhase='roundintro';
      show({category:s.category,round:s.round,until:s.roundIntroUntil});
    }else if(phase==='select' || phase==='reveal' || phase==='tie' || phase==='result' || phase==='rewardchoice' || phase==='gameover' || phase==='lobby'){
      latestPhase=phase;
      activeRound=Math.max(activeRound,Number(s.round||0));
      if(!preview)close();
    }
  }
  makeView();
  const sock=typeof socket!=='undefined' ? socket : null;
  if(sock && typeof sock.on==='function'){
    // Socket-Events sind vom Server vorgegeben. Keine eigenen Nachrichten senden.
    sock.on('roundIntro',e=>{latestPhase='roundintro';show(e)});
    sock.on('roomState',fromState);
    sock.on('roundSync',e=>{
      if(e?.phase==='roundintro')fromState(e);
      else if(e?.phase==='select')fromState(e);
    });
    sock.on('roundStart',e=>{latestPhase='select';activeRound=Math.max(activeRound,Number(e?.round||0));if(!preview)close()});
    sock.on('backToLobby',()=>{latestPhase='lobby';if(!preview)close()});
  } else console.warn('[MLP Kristall V3] Socket noch nicht erreichbar.');
  // Sicherer Sichttest ohne tatsächlichen Spielzug: ?kristalltest=1.
  // Die URL bleibt dieselbe. Beim Test werden KEINE Socket-Nachrichten ausgelöst.
  try{
    const q=new URLSearchParams(location.search);
    if(q.get('kristalltest')==='1'){
      const run=()=>show({category:'magic',round:1,icon:'⭐',label:'MAGIE'},{preview:true});
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250),{once:true});
      else setTimeout(run,250);
    }
  }catch{}
  window.MLPCrystalV3={preview:(category='magic')=>show({category,round:1},{preview:true}),hide:()=>close()};
})();

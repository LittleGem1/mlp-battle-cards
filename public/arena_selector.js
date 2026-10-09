/* MLP Battle Cards – Arena-Testauswahl (nur Lobby, keine Spiel- oder Stil-Dateien ersetzen). */
(() => {
  'use strict';
  const OPTIONS = [
    ['random', '🎲 Zufällig', 'Standard: Eine von vier Arenen wird zufällig ausgewählt.'],
    ['jade_palace', '🏯 Chinesischer Jadepalast', 'Arena 1'],
    ['whispering_forest', '🌲 Magischer Wald', 'Arena 2'],
    ['steampunk_works', '⚙️ Steampunk-Maschinenhalle', 'Arena 3'],
    ['witchs_table', '🧪 Hexen- und Zaubertisch', 'Arena 4']
  ];
  const names=Object.fromEntries(OPTIONS.map(x=>[x[0],x[1]]));
  const actions=document.querySelector('#lobby .lobby-actions');
  if(!actions || typeof socket === 'undefined')return;

  const style=document.createElement('style');
  style.textContent=`
    #arenaSelectStatus{flex:1 1 100%;color:#e7ddff;font-size:13px;font-weight:700;text-align:center;margin:3px 0 4px;text-shadow:0 2px 5px #171034}
    #arenaSelectButton{white-space:normal;min-width:175px}
    #arenaSelectDialog{z-index:2147483000;max-width:min(460px,calc(100vw - 28px));width:450px;max-height:86vh;overflow:auto;box-sizing:border-box;padding:23px;color:#f4f2ff;border-radius:22px;border:1px solid #ad9bed;background:linear-gradient(155deg,#222653,#101528);box-shadow:0 24px 70px #020515dd}
    #arenaSelectDialog::backdrop{background:rgba(4,6,22,.75)}
    #arenaSelectDialog h3{font-size:23px;margin:0 0 8px}
    #arenaSelectDialog p{font-size:14px;line-height:1.5;margin:0 0 16px;color:#d3d3ef}
    #arenaSelectOptions{display:grid;gap:9px}
    #arenaSelectOptions button{display:block;width:100%;padding:13px 12px;border-radius:12px;border:1px solid #7c7eaf;text-align:left;background:#33395e;color:white;font:inherit;cursor:pointer;transition:background .15s,border-color .15s}
    #arenaSelectOptions button:hover,#arenaSelectOptions button:focus-visible{background:#484b86;border-color:#d7b9ff;outline-offset:2px}
    #arenaSelectOptions button[aria-pressed="true"]{border:2px solid #f8dc83;background:#514078}
    #arenaSelectOptions button strong{display:block;font-size:15px;margin-bottom:3px}
    #arenaSelectOptions button small{color:#c9cce9;font-size:12px}
    #arenaSelectClose{margin-top:18px;width:100%}
  `;
  document.head.append(style);

  const btn=document.createElement('button');
  btn.id='arenaSelectButton';btn.className='soft-btn';btn.type='button';
  btn.textContent='🏞️ Arena auswählen';
  const status=document.createElement('div');
  status.id='arenaSelectStatus';status.setAttribute('aria-live','polite');
  actions.insertBefore(btn,actions.querySelector('#lobbyAccessoryBtn'));
  actions.append(status);

  const dialog=document.createElement('dialog');
  dialog.id='arenaSelectDialog';
  const heading=document.createElement('h3');heading.textContent='🏞️ Arena für das nächste Match';
  const info=document.createElement('p');info.textContent='Für unsere Tests kannst du eine Arena festlegen. Nach dem Match wird wieder zufällig ausgewählt.';
  const grid=document.createElement('div');grid.id='arenaSelectOptions';
  const close=document.createElement('button');close.id='arenaSelectClose';close.className='soft-btn';close.type='button';close.textContent='Schließen';
  dialog.append(heading,info,grid,close);document.body.append(dialog);

  function isHostInLobby(s){return !!s&&s.phase==='lobby'&&s.hostId===socket.id;}
  function render(s){
    const inLobby=!!s && s.phase==='lobby';
    btn.style.display=isHostInLobby(s)?'inline-block':'none';
    status.style.display=inLobby?'block':'none';
    if(!inLobby){if(dialog.open)dialog.close();return;}
    const selected=names[s.arenaSelection] ? s.arenaSelection : 'random';
    status.textContent='Nächste Arena: '+names[selected]+(selected==='random'?'':' · nur für das nächste Match');
    for(const option of grid.querySelectorAll('button[data-arena]')){
      option.setAttribute('aria-pressed',String(option.dataset.arena===selected));
    }
    if(!isHostInLobby(s) && dialog.open) dialog.close();
  }
  for(const [id,title,desc] of OPTIONS){
    const option=document.createElement('button');
    option.type='button';option.dataset.arena=id;
    const strong=document.createElement('strong');strong.textContent=title;
    const small=document.createElement('small');small.textContent=desc;
    option.append(strong,small);
    option.addEventListener('click',()=>{
      if(!isHostInLobby(typeof state!=='undefined'?state:null))return;
      socket.emit('setNextArena',{arenaId:id});
      dialog.close();
    });
    grid.append(option);
  }
  btn.addEventListener('click',()=>{
    if(!isHostInLobby(typeof state!=='undefined'?state:null))return;
    render(state);
    if(typeof dialog.showModal==='function')dialog.showModal();
  });
  close.addEventListener('click',()=>dialog.close());
  socket.on('roomState',render);
  socket.on('roomLeft',()=>render(null));
  if(typeof state!=='undefined' && state)render(state);
  else render(null);
})();

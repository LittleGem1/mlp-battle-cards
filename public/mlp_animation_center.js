/* MLP Battle Cards – Animations-Testzentrum: ausschließlich lokale Vorschau, keine Socket-Befehle */
(()=>{'use strict';
  if(window.MLPAnimationCenterInstalled)return;
  window.MLPAnimationCenterInstalled=true;
  const definitions=[
    {id:'shadow',title:'Diabolo · Schattengestalt',module:'ShadowFormFX',desc:'Schattenwesen verschlingt ein Artefakt'},
    {id:'steal',title:'Zauberklau',module:'ArtifactMagicFX',desc:'Magieketten entreißen ein Artefakt'},
    {id:'copy',title:'Zauberkopierer',module:'ArtifactMagicFX',desc:'Ritual erstellt eine Artefaktkopie'},
    {id:'swarm',title:'Changeling · Schwarmruf',module:'ChangelingSwarmFX',desc:'Erst Dunkelheit, dann Augen und Changeling-Schwarm'},
    {id:'wind',title:'Windchaos',module:'WindchaosFX',desc:'Ein mächtiger Tornado'},
    {id:'cockatrice',title:'Cockatrice',module:'CockatriceEffect',desc:'Eine Karte wird versteinert'}
  ];
  const doc=document;
  let overlay=null, activeId=null;
  const cardImg='/assets/artifacts/01_Elemente_der_Harmonie.png';
  function isAvailable(f){return !!(window[f.module]&&typeof window[f.module].play==='function');}
  function clearEffects(){
    try{window.ShadowFormFX?.isPlaying?.()&&document.querySelector('.shadowform-overlay')?.remove();}catch(_){}
    try{window.ArtifactMagicFX?.stop?.();}catch(_){}
    try{window.ChangelingSwarmFX?.stop?.();}catch(_){}
    try{window.CockatriceEffect?.stop?.();}catch(_){}
  }
  function stop(){clearEffects();activeId=null;if(overlay)overlay.querySelector('#animCenterState').textContent='Bereit · Wähle eine Animation';}
  function doPlay(id){
    const f=definitions.find(d=>d.id===id);if(!f)return;
    if(!isAvailable(f)){state('Nicht verfügbar – Effekt-Skript wurde nicht geladen');return;}
    stop();activeId=id;
    state('Spielt ab: '+f.title+' · Vorschau ohne Einfluss auf das Spiel');
    const common={preview:true,casterName:'Vorschau',targetName:'Gegner',duration:4200,
      artifact:{id:'a01',name:'Elemente der Harmonie',image:cardImg}};
    try{
      switch(id){
        case 'shadow':window.ShadowFormFX.play(common);break;
        case 'steal':window.ArtifactMagicFX.play({...common,action:'artifactsteal'});break;
        case 'copy':window.ArtifactMagicFX.play({...common,action:'artifactcopy'});break;
        case 'swarm':window.ChangelingSwarmFX.play(common);break;
        case 'wind':window.WindchaosFX.play({isPreview:true});break;
        case 'cockatrice':window.CockatriceEffect.play({targetName:'Vorschau-Gegner',cardImage:cardImg,sound:true});break;
      }
    }catch(e){state('Fehler beim Starten: '+(e?.message||'unbekannt'));}
  }
  function state(str){const el=overlay?.querySelector('#animCenterState');if(el)el.textContent=str;}
  function close(){stop();overlay?.remove();overlay=null;}
  function open(){
    if(overlay){close();return;}
    overlay=doc.createElement('div');overlay.className='mlp-anim-center-backdrop';
    const panel=doc.createElement('section');panel.className='mlp-anim-center';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Animations-Testzentrum');
    panel.innerHTML='<header><div><h2>✨ Animations-Testzentrum</h2><p>Effekte mit Sound direkt ansehen – ohne Karten zu spielen oder eine Runde zu verändern.</p></div><button class="mlp-anim-close" aria-label="Schließen" type="button">✕</button></header><div class="mlp-anim-list"></div><footer><span id="animCenterState">Bereit · Wähle eine Animation</span><button class="mlp-anim-stop" type="button">⏹ Stoppen</button></footer>';
    overlay.appendChild(panel);
    panel.querySelector('.mlp-anim-close').addEventListener('click',close);
    panel.querySelector('.mlp-anim-stop').addEventListener('click',stop);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    const list=panel.querySelector('.mlp-anim-list');
    definitions.forEach(f=>{
      const row=doc.createElement('div');row.className='mlp-anim-row';
      const info=doc.createElement('div');info.className='mlp-anim-info';
      const name=doc.createElement('strong');name.textContent=f.title;
      const desc=doc.createElement('small');desc.textContent=f.desc;
      const available=doc.createElement('small');available.className=isAvailable(f)?'mlp-anim-yes':'mlp-anim-no';available.textContent=isAvailable(f)?'● Skript geladen':'● Skript fehlt';
      info.append(name,desc,available);
      const button=doc.createElement('button');button.type='button';button.className='mlp-anim-play';button.textContent='▶ Ansehen';button.disabled=!isAvailable(f);
      button.addEventListener('click',()=>doPlay(f.id));row.append(info,button);list.appendChild(row);
    });
    doc.body.appendChild(overlay);
  }
  function insertButtons(){
    const targets=['#lobby .lobby-actions','#game'];
    for(const selector of targets){
      const host=doc.querySelector(selector);if(!host)continue;
      const key=selector.includes('lobby')?'lobby':'arena';
      if(doc.getElementById('mlpAnimCenter_'+key))continue;
      const button=doc.createElement('button');button.id='mlpAnimCenter_'+key;button.type='button';
      button.className='mlp-anim-open soft-btn';button.textContent='✨ Animationen ansehen';
      button.addEventListener('click',open);
      if(key==='arena'){button.classList.add('mlp-anim-arena-launch');host.appendChild(button);}
      else{const gallery=host.querySelector('#hostCardGalleryBtn');gallery?.after(button);if(!gallery)host.appendChild(button);}
    }
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',insertButtons,{once:true});else insertButtons();
  window.MLPAnimationCenter={open,close,play:doPlay};
})();
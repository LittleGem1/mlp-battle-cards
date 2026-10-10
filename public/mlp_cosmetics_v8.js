/* MLP Battle Cards – Items/Rahmen V8.
   Read-only Darstellung: ändert keine Kartenwerte, Freischaltungen, Server-Events
   oder vorhandene Spiellogik. */
(function cosmeticsV8(){
  'use strict';
  if(window.__mlpCosmeticsV8)return;
  window.__mlpCosmeticsV8=true;

  const knownItems=new Set(('changeling balloon candy crystalhorn crown halo angelwings batwings magicflames orbitcrystals bow scarf goggles gears flowercrown butterflies bandages potions collar bell cape cards techwings moon item_apple item_hourglass item_rainbow_potion item_speed_potion item_moon_potion item_sun_potion item_mirror item_storm item_grimoire item_friendship_crown').split(' '));
  const wings=new Set(['changeling','angelwings','batwings','techwings']);
  const aura=new Set(['magicflames','orbitcrystals','gears','butterflies']);
  const head=new Set(['crystalhorn','crown','halo','flowercrown','goggles','item_friendship_crown']);
  const left=new Set(['potions','cards']);
  const bottom=new Set(['collar','bell']);
  const tall=new Set(['moon','item_storm']);

  const portrait=(key)=> {
    try {return typeof ITEMS!=='undefined' ? ITEMS[key]?.image : null;}catch{return null;}
  };
  const frameImage=(key)=>{
    try{return typeof FRAMES!=='undefined' ? FRAMES[key]?.image : null;}catch{return null;}
  };
  function assignImage(img,canonical){
    if(!img||!canonical)return;
    const current=img.getAttribute('src');
    if(current!==canonical && current?.split('?')[0]!==canonical){
      img.src=canonical;
    }
    if(!img.dataset.cosmeticErrorHandler){
      img.dataset.cosmeticErrorHandler='1';
      img.addEventListener('error',()=>{
        // Noch ein Versuch bei veralteten Browsercache-/Dateireferenzen.
        if(img.dataset.cosmeticRetried==='1')return;
        img.dataset.cosmeticRetried='1';
        const path=canonical||img.getAttribute('src')||'';
        if(path.startsWith('/assets/'))img.src=path+'?cosmetic_asset_retry=1';
      });
    }
  }
  function setBox(el,role,small){
    let x='97%',y='50%',w=small?48:64,h=w;
    if(role==='wings'){x='50%';y='50%';w=small?188:242;h=small?82:106;}
    if(role==='aura'){x='50%';y='50%';w=small?174:230;h=small?80:108;}
    if(role==='cape'){x='50%';y='57%';w=small?150:200;h=small?80:105;}
    if(role==='head'){x='50%';y='-5%';w=small?65:90;h=small?54:74;}
    if(role==='left'){x='4%';y='58%';w=small?48:64;h=w;}
    if(role==='bottom'){x='51%';y='92%';w=small?58:74;h=small?42:54;}
    if(role==='tall'){x='96%';y='20%';w=small?50:65;h=w;}
    if(role==='balloon'){x='98%';y='21%';w=small?60:78;h=w;}
    if(role==='candy'){x='96%';y='80%';w=small?48:65;h=w;}
    for(const [key,value] of Object.entries({'--cosmetic-x':x,'--cosmetic-y':y,'--cosmetic-w':w+'px','--cosmetic-h':h+'px'})){
      if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);
    }
  }
  function paint(plate){
    const key=[...plate.classList].find(c=>knownItems.has(c));
    if(!key)return;
    const small=plate.classList.contains('nameplate-small');
    let role='side';
    if(wings.has(key))role='wings';
    else if(aura.has(key))role='aura';
    else if(head.has(key))role='head';
    else if(left.has(key))role='left';
    else if(bottom.has(key))role='bottom';
    else if(tall.has(key))role='tall';
    else if(key==='cape')role='cape';
    else if(key==='balloon')role='balloon';
    else if(key==='candy')role='candy';

    // Avoid redundant writes so DOM changes don't trigger repeated work.
    if(plate.dataset.cosmeticRenderedKey!==key || plate.dataset.cosmeticRenderedSmall!==String(small)){
      plate.dataset.cosmeticRenderedKey=key;
      plate.dataset.cosmeticRenderedSmall=String(small);
      plate.dataset.cosmeticRole=role;
      setBox(plate,role,small);
    }
    if(!plate.classList.contains('mlp-cosmetics-fixed'))plate.classList.add('mlp-cosmetics-fixed');
    const img=plate.querySelector('.decor img');
    assignImage(img,portrait(key));
    const frame=[...plate.classList].find(c=>c.startsWith('frame-'))?.slice(6);
    if(frame)assignImage(plate.querySelector('.name-frame'),frameImage(frame));
  }
  function refresh(){
    document.querySelectorAll('#app .nameplate, #accessoryDialog .nameplate').forEach(paint);
  }
  let pending=false;
  function schedule(){
    if(pending)return;
    pending=true;
    requestAnimationFrame(()=>{pending=false;refresh();});
  }
  function init(){
    const root=document.getElementById('app');
    if(!root)return;
    const watcher=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='childList' && (m.addedNodes.length||m.removedNodes.length)))schedule();
    });
    watcher.observe(root,{childList:true,subtree:true});
    const dialog=document.getElementById('accessoryDialog');
    if(dialog)watcher.observe(dialog,{childList:true,subtree:true});
    schedule();
    // Eine Kontrollmöglichkeit ohne Änderung am Spielablauf.
    if(new URLSearchParams(location.search).has('itemtest')){
      const badge=document.createElement('div');
      badge.textContent='✓ Items & Rahmen V8 geladen';
      badge.style.cssText='position:fixed;bottom:8px;right:8px;background:#172044;color:#eafff7;border:1px solid #a0e3c5;border-radius:9px;padding:7px 12px;z-index:999999;font:700 12px system-ui;pointer-events:none';
      document.body.appendChild(badge);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();

/* Ausschließlich visueller Schnelltest: ?kristalltest=1
   Im normalen Spiel tut diese Datei überhaupt nichts. */
(function(){
  if(new URLSearchParams(location.search).get('kristalltest')!=='1')return;
  function test(){
    // Bestehendes Portal der originalen Client-Logik verwenden; nichts duplizieren.
    if(typeof categoryCrystalPortal!=='function')return;
    const p=categoryCrystalPortal();
    if(!p)return;
    const round=document.getElementById('portalRoundLabel');
    const icon=document.getElementById('portalCrystalIcon');
    const label=document.getElementById('portalCrystalLabel');
    const gem=document.getElementById('battleCategoryCrystal');
    const result=document.getElementById('portalCrystalResult');
    if(round)round.textContent='RUNDE 1';
    if(icon)icon.textContent='⭐';
    if(label)label.textContent='MAGIE';
    result?.classList.remove('show');
    gem?.classList.remove('spinning');
    p.classList.remove('leaving');
    p.classList.add('active');
    p.setAttribute('aria-hidden','false');
    void gem?.offsetWidth;
    gem?.classList.add('spinning');
    setTimeout(()=>result?.classList.add('show'),2600);
    setTimeout(()=>{
      p.classList.add('leaving');
      setTimeout(()=>{
        p.classList.remove('active','leaving');
        p.setAttribute('aria-hidden','true');
      },250);
    },4200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(test,450),{once:true});
  else setTimeout(test,450);
})();

/* Diabolo – Schattengestalt: echter In-Game-Effekt.
   Artefaktverlust ausschließlich auf dem Server. Diese Datei ist nur Animation.
   Auslöser: socket.on('shadowformAnimation') nach echter Special-Auswahl.
*/
(()=>{
  'use strict';
  if(!document.querySelector('link[data-shadowform-css]')){
    const link=document.createElement('link');link.rel='stylesheet';
    link.href='/shadowform_fx.css?v=diabolo-shadow-v2';link.dataset.shadowformCss='1';
    document.head.appendChild(link);
  }
  let active=null;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const mix=(a,b,t)=>a+(b-a)*t;
  const ease=t=>1-Math.pow(1-clamp(t),3);
  const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
  const safeCardImage=(value)=>typeof value==='string'&&/^\/assets\/(?:artifacts|cards|cards_new)\/[a-z0-9_.-]+\.(?:webp|png|jpg)$/i.test(value)
    ?value:'/assets/artifacts/01_Elemente_der_Harmonie.png';
  function findShelfSource(artifact){
    const imgs=Array.from(document.querySelectorAll('#artifactShelf .artifact-slot.found img'));
    return imgs.find(img=>img.getAttribute('src')===artifact.image)||null;
  }
  function play({targetId=null,targetName='Gegner',artifact={id:'a01',name:'Elemente der Harmonie',image:'/assets/artifacts/01_Elemente_der_Harmonie.png'},duration=3600,preview=false}={}){
    // Neustart/überlappende Specials: alte Darstellung sicher beenden.
    if(active)active.cancel();
    if(!preview && !document.querySelector('#game.screen.active'))return null;
    // Die Tonspur beginnt erst beim tatsächlichen Erscheinen des Schattens,
    // niemals schon während der 2,5-s-Karteneinblendung.
    if(!preview){
      try{
        const sound=new Audio('/assets/sounds/diabolo_shadowform.mp3?v=diabolo-v17');
        sound.volume=0.64;
        sound.play().catch(()=>{});
      }catch(_err){}
    }
    const root=document.createElement('div');root.className='shadowform-overlay';
    root.setAttribute('aria-label','Schattengestalt verschlingt ein Artefakt');
    const darkness=document.createElement('div');darkness.className='shadowform-darkness';root.appendChild(darkness);
    const title=document.createElement('div');title.className='shadowform-title';
    const heading=document.createElement('strong');heading.textContent='SCHATTENGESTALT';
    const caption=document.createElement('small');caption.textContent=`${targetName} verliert ein Artefakt!`;
    title.append(heading,caption);root.appendChild(title);
    const creature=document.createElement('div');creature.className='shadowform-creature';
    const sprite=document.createElement('div');sprite.className='shadowform-silhouette';sprite.setAttribute('aria-hidden','true');
    const maw=document.createElement('div');maw.className='shadowform-maw';creature.append(sprite,maw);root.appendChild(creature);
    const card=document.createElement('img');card.className='shadowform-card';card.alt='Artefakt wird von Schattengestalt verschlungen';
    card.src=safeCardImage(artifact?.image);root.appendChild(card);
    const wisps=[];
    for(let k=0;k<18;k++){const w=document.createElement('span');w.className='shadowform-wisp';root.appendChild(w);wisps.push(w);}
    document.body.appendChild(root);
    document.body.classList.add('shadowform-running');
    requestAnimationFrame(()=>root.classList.add('visible'));
    let d=clamp(Number(duration)||3600,2300,6000);
    const source=(typeof myId!=='undefined'&&targetId===myId)?findShelfSource(artifact):null;
    const rect=source?.getBoundingClientRect();
    const vw=()=>innerWidth, vh=()=>innerHeight;
    const startX=rect?.width>4?rect.left+rect.width/2:vw()*.78;
    const startY=rect?.height>4?rect.top+rect.height/2:vh()*.64;
    let frame=0,done=false,started=performance.now();
    const cancel=()=>{if(done)return;done=true;cancelAnimationFrame(frame);root.remove();document.body.classList.remove('shadowform-running');if(active?.cancel===cancel)active=null;};
    active={cancel};
    function tick(now){
      if(done)return;
      if(!preview && !document.querySelector('#game.screen.active'))return cancel();
      const t=clamp((now-started)/d);
      const w=creature.offsetWidth||Math.min(690,vw()*.52);
      const h=w*710/526;
      // Gestalt kommt rechts aus dem Schatten, beugt den Rachen zur Karte.
      const enter=ease(clamp(t/.27));const depart=smooth(clamp((t-.79)/.21));
      const centerX=mix(vw()*1.18, vw()*.59, enter)+depart*vw()*.27;
      const centerY=vh()*.43-15*Math.sin(t*Math.PI);
      const left=centerX-w*.54, top=centerY-h*.35;
      const fade=clamp(t*9)*(1-depart);
      creature.style.transform=`translate3d(${left}px,${top}px,0) scale(${.75+.25*enter+.1*depart}) rotate(${mix(7,-5,enter)+depart*8}deg)`;
      creature.style.opacity=String(fade);
      // Der leuchtende Rachen liegt im oberen linken Teil des Schattens.
      const mouthX=left+w*.14,mouthY=top+h*.39;
      if(t>.28&&t<.84)root.classList.add('devour');else root.classList.remove('devour');
      const grab=smooth(clamp((t-.36)/.44));
      const arc=Math.sin(grab*Math.PI)*Math.min(100,vh()*.15);
      const cardX=mix(startX,mouthX,grab),cardY=mix(startY,mouthY,grab)-arc;
      const scale=mix(1,.04,grab);
      const angle=grab*880;
      card.style.transform=`translate3d(${cardX-card.offsetWidth/2}px,${cardY-card.offsetHeight/2}px,0) rotate(${angle}deg) scale(${scale})`;
      card.style.opacity=String(clamp((t-.18)*12)*(1-smooth(clamp((grab-.78)/.22))));
      for(let k=0;k<wisps.length;k++){
        const p=wisps[k],a=k*2.399+now*.0016*(k%2?1:-1);
        const radius=(40+(k%6)*25)*(1+Math.sin(t*8+k)*.16);
        const wx=mouthX+Math.cos(a)*radius,wy=mouthY+Math.sin(a)*radius*.65;
        p.style.transform=`translate3d(${wx}px,${wy}px,0) rotate(${a*57.2958}deg) scale(${.55+.5*(1-grab)})`;
        p.style.opacity=String(clamp(t*9)*(1-depart)*.8);
      }
      if(t>=1)return cancel();
      frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return active;
  }
  window.ShadowFormFX={play,isPlaying:()=>!!active};
  // Keine Arena-Animation, solange die normale 2,5-s-Special-Karte sichtbar ist.
  // Auch bei langsamen Geräten wird auf das tatsächliche Entfernen des Popups
  // gewartet. Keine Änderung an Karten, Timer, Socket-Events oder Spielregeln.
  function afterCardReveal(callback,minimumDelay=0){
    const started=performance.now();
    const step=()=>{
      if(!document.querySelector('#game.screen.active'))return;
      const elapsed=performance.now()-started;
      const popup=document.querySelector('.special-burst');
      if(elapsed<minimumDelay || (popup && elapsed<6500)){
        setTimeout(step,50);
        return;
      }
      requestAnimationFrame(()=>{
        if(document.querySelector('#game.screen.active'))callback();
      });
    };
    step();
  }
  if(typeof socket!=='undefined'&&socket&&typeof socket.on==='function'){
    socket.on('shadowformAnimation',evt=>{
      // Zielwahl kann während oder nach der Karteneinblendung beendet werden.
      // In beiden Fällen beginnt die Schattenanimation erst NACH dem Popup.
      afterCardReveal(()=>play(evt||{}));
    });
  }
})();

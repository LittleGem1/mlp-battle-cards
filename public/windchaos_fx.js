/* Windchaos V1 – visueller Effekt, keine Kartenlogik im Browser.
 * Echte neue Karten kommen nur vom Server durch normale 'hand'-Events.
 */
(()=>{
  'use strict';
  if(!document.querySelector('link[href*="windchaos_fx.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/windchaos_fx.css?v=1';css.dataset.windchaosCss='1';document.head.appendChild(css);}
  const DURATION=4400;
  const RENDER=document;
  let running=false;
  let oldAudio=null;
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
  const ease=v=>1-Math.pow(1-clamp(v),3);
  const random=(a,b)=>a+Math.random()*(b-a);

  function drawTornado(ctx,x,y,scale,time,alpha){
    ctx.save(); ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha*=alpha;
    // Funnel cone: heavy dark storm core with emerald rims, wide upper opening.
    const grad=ctx.createLinearGradient(-110,0,140,0);
    grad.addColorStop(0,'rgba(31,242,216,.02)');grad.addColorStop(.22,'rgba(55,205,220,.44)');
    grad.addColorStop(.42,'rgba(24,52,77,.85)');grad.addColorStop(.6,'rgba(9,37,58,.93)');
    grad.addColorStop(.79,'rgba(64,248,198,.38)');grad.addColorStop(1,'rgba(227,255,247,.02)');
    ctx.fillStyle=grad;
    ctx.beginPath();ctx.moveTo(-110,-182);
    ctx.bezierCurveTo(-85,-95,-35,-64,-20,85);
    ctx.quadraticCurveTo(0,125,13,85);
    ctx.bezierCurveTo(45,-45,102,-107,112,-182);
    ctx.closePath();ctx.fill();
    // Layered curved rings with animated offsets; swirl shape, not a static cartoon funnel.
    for(let i=0;i<25;i++){
      const yy=-165+i*11;
      const t=(yy+165)/270;
      const width=9+(1-t)*104;
      const h=5+(1-t)*15;
      const wobble=Math.sin(time*5+i*.71)*Math.min(19,width*.27);
      const phase=(time*5.1+i*1.7)%(Math.PI*2);
      ctx.beginPath();
      ctx.ellipse(wobble,yy,width,h,Math.sin(time*2+i)*.14,phase,phase+Math.PI*1.15);
      ctx.strokeStyle=i%4===0?'rgba(222,255,250,.83)':(i%3===0?'rgba(71,255,190,.76)':'rgba(110,219,239,.45)');
      ctx.lineWidth=i%3===0?3.7:2.1;ctx.shadowColor='rgba(50,255,203,.66)';ctx.shadowBlur= i%3===0?14:5;
      ctx.stroke();
    }
    ctx.shadowBlur=0;
    // Ground spray
    for(let i=0;i<17;i++){
      const a=i*2.39996+time*5;const r=12+((i*13+time*80)%95);
      ctx.fillStyle=i%2?'rgba(162,255,226,.38)':'rgba(236,255,255,.34)';
      ctx.beginPath();ctx.ellipse(Math.cos(a)*r,98+Math.sin(a)*12,random(1,4),random(2,5),a,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  function pickCardImages(isCaster){
    const found=[];
    if(!isCaster)found.push(...RENDER.querySelectorAll('#hand .hand-card > img, #hand .hand-card img'));
    found.push(...RENDER.querySelectorAll('#opponents .back-fan img, #tableCards .played-card img'));
    // Only visible elements. Duplicates are deduplicated by DOM identity.
    const seen=new Set();
    return found.filter(el=>{if(seen.has(el))return false;seen.add(el);const r=el.getBoundingClientRect();return r.width>12&&r.height>12&&r.right>0&&r.left<innerWidth}).slice(0,19);
  }

  function addSnapshot(container,img,idx){
    const rect=img.getBoundingClientRect();
    const copy=document.createElement('img');copy.className='windchaos-card-fly';
    copy.src=img.currentSrc||img.src;copy.alt='';copy.draggable=false;
    let w=clamp(rect.width,34,120),h=w*(rect.height/Math.max(1,rect.width));
    copy.style.width=w+'px';copy.style.height=h+'px';container.appendChild(copy);
    return {node:copy,x:rect.left+(rect.width-w)/2,y:rect.top+(rect.height-h)/2,w,h,
      delay:Math.min(.23,idx*.012),angle:random(-15,15),speed:random(1.3,2.1)};
  }

  function play({casterId=null,isPreview=false,onComplete=null}={}){
    if(running)return;
    const arena=RENDER.querySelector('#game .arena')||RENDER.querySelector('.preview-arena')||RENDER.body;
    const box=arena.getBoundingClientRect();
    if(!isPreview && (!RENDER.querySelector('#game.screen.active')||box.width<20))return;
    running=true;
    const isCaster=!isPreview&&typeof myId!=='undefined'&&myId===casterId;
    const overlay=RENDER.createElement('div');overlay.className='windchaos-overlay';overlay.setAttribute('aria-label','Windchaos Spezialanimation');
    const canvas=RENDER.createElement('canvas');canvas.className='windchaos-canvas';overlay.appendChild(canvas);
    const title=RENDER.createElement('div');title.className='windchaos-title';title.innerHTML='<strong>🌪 WINDCHAOS</strong><small>Alle gegnerischen Karten werden fortgerissen!</small>';
    overlay.appendChild(title);
    const cardLayer=RENDER.createElement('div');cardLayer.className='windchaos-card-layer';overlay.appendChild(cardLayer);
    RENDER.body.appendChild(overlay);RENDER.body.classList.add('windchaos-running');
    if(!isCaster)RENDER.body.classList.add('windchaos-targeted');
    const imgEls=pickCardImages(isCaster);
    const flyers=imgEls.map((el,idx)=>addSnapshot(cardLayer,el,idx));
    // For screens with few back-face images, visual echo cards make the effect understandable.
    if(flyers.length<6){
      const sample=imgEls[0];
      for(let j=flyers.length;j<7;j++){
        const im=RENDER.createElement('img');im.src=sample?.src||'/assets/card_back.webp';im.style.cssText='display:none';
        const f=addSnapshot(cardLayer,im,j);f.x=(.12+j*.11)*innerWidth;f.y=innerHeight*.60;flyers.push(f);im.remove();
      }
    }
    let audio=null;
    try{
      audio=new Audio(isPreview?'preview_assets/windchaos_tornado.mp3':'/assets/sounds/windchaos_tornado.mp3');
      audio.volume=.83;audio.play().catch(()=>{});oldAudio=audio;
    }catch(err){}
    const ctx=canvas.getContext('2d');
    let start=performance.now(),raf=0,disposed=false;
    function render(now){
      if(disposed)return;
      const elapsed=now-start,progress=clamp(elapsed/DURATION);
      const width=innerWidth,height=innerHeight;
      const dpr=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      const visible=clamp(Math.min(progress*8,(1-progress)*9));
      const tornadoX=width*(-.24+progress*1.52),tornadoY=clamp(box.top+box.height*.65,height*.35,height*.86);
      const scale=clamp(Math.min(width/980,height/680),.47,1.75)*1.65;
      ctx.fillStyle=`rgba(4,17,27,${.20*visible})`;ctx.fillRect(0,0,width,height);
      drawTornado(ctx,tornadoX,tornadoY,scale,elapsed/1000,visible);
      // Flecks and leaves in turbulent rings around the moving funnel.
      for(let k=0;k<42;k++){
        const a=k*2.399+elapsed*.004*(k%2?1:-1);
        const radius=20+(k%13)*9*scale;
        const px=tornadoX+Math.cos(a)*radius;
        const py=tornadoY-95*scale+Math.sin(a)*radius*.82;
        ctx.save();ctx.translate(px,py);ctx.rotate(a);
        ctx.fillStyle=k%4===0?'rgba(182,255,239,.85)':(k%3===0?'rgba(67,232,183,.72)':'rgba(140,195,123,.77)');
        ctx.globalAlpha=visible*.82;
        ctx.fillRect(-3,-1.5,8,3);ctx.restore();
      }
      for(const f of flyers){
        const t=clamp((progress-f.delay)/(.69-f.delay));
        const sucked=ease(t);
        const spin=sucked*(680+f.speed*470)+Math.sin(elapsed*.007+f.x)*8;
        const wx=tornadoX-20*scale+Math.sin(t*10+f.x*.1)*36*scale;
        const wy=tornadoY-85*scale+Math.cos(t*9+f.y*.01)*36*scale;
        const nx=f.x+(wx-f.x)*sucked,ny=f.y+(wy-f.y)*sucked;
        const shrink=1-.88*sucked;
        f.node.style.transform=`translate3d(${nx}px,${ny}px,0) rotate(${f.angle+spin}deg) scale(${shrink})`;
        f.node.style.opacity=String(clamp((1-progress)*7)*(1-.8*Math.max(0,sucked-.6)));
      }
      if(progress<1)raf=requestAnimationFrame(render);
      else finish();
    }
    function finish(){
      if(disposed)return;disposed=true;cancelAnimationFrame(raf);
      try{audio?.pause();if(audio)audio.currentTime=0;}catch(err){}
      if(oldAudio===audio)oldAudio=null;
      overlay.remove();RENDER.body.classList.remove('windchaos-running','windchaos-targeted');running=false;
      if(typeof onComplete==='function')onComplete();
    }
    raf=requestAnimationFrame(render);
    return {finish};
  }

  window.WindchaosFX={play,isRunning:()=>running};
  if(typeof socket!=='undefined'&&socket&&typeof socket.on==='function'){
    socket.on('windchaosAnimation',event=>play({casterId:event?.casterId}));
  }
})();

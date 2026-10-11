(()=>{
  'use strict';
  const SPRITES = [
    '/assets/fx/changelings/changeling_1.png',
    '/assets/fx/changelings/changeling_2.png',
    '/assets/fx/changelings/changeling_3.png'
  ];
  const LAYOUT = [
    {img:0,left:7, top:40, scale:1.28, z:5},
    {img:1,left:23, top:53, scale:1.12, z:6},
    {img:2,left:39, top:49, scale:1.22, z:7},
    {img:0,left:58, top:54, scale:1.08, z:6},
    {img:2,left:74, top:43, scale:1.20, z:5},
    {img:1,left:86, top:51, scale:1.14, z:5},
    {img:0,left:8, top:10, scale:0.56, z:3},
    {img:2,left:16, top:21, scale:0.52, z:3},
    {img:1,left:28, top:15, scale:0.48, z:3},
    {img:0,left:74, top:16, scale:0.54, z:3},
    {img:2,left:84, top:8, scale:0.58, z:3},
    {img:1,left:90, top:22, scale:0.52, z:3},
    {img:0,left:67, top:23, scale:0.46, z:3},
    {img:2,left:34, top:8, scale:0.42, z:3}
  ];
  const EYES = [
    {left:11, top:48, scale:1.0}, {left:27, top:61, scale:0.86}, {left:43, top:58, scale:0.95},
    {left:62, top:62, scale:0.82}, {left:78, top:50, scale:0.90}, {left:90, top:58, scale:0.86},
    {left:11, top:18, scale:0.48}, {left:19, top:29, scale:0.44}, {left:31, top:22, scale:0.40},
    {left:77, top:22, scale:0.46}, {left:87, top:14, scale:0.50}, {left:92, top:28, scale:0.44},
    {left:70, top:30, scale:0.36}, {left:36, top:16, scale:0.34}
  ];

  const ensureCss = ()=>{
    if(document.querySelector('link[data-changeling-wunsch-css]')) return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/changeling_swarm_fx.css?v=wunsch-v2';
    link.dataset.changelingWunschCss='1';
    document.head.appendChild(link);
  };

  let active=null, audio=null, timers=[];
  const clearTimers=()=>{ timers.forEach(clearTimeout); timers=[]; };
  const stop=()=>{
    clearTimers();
    active?.remove(); active=null;
    document.body.classList.remove('changeling-swarm-running');
    if(audio){ try{ audio.pause(); audio.currentTime=0; }catch(e){} audio=null; }
  };
  const later=(ms,fn)=> timers.push(setTimeout(fn,ms));

  function play(evt={}){
    ensureCss();
    stop();
    const overlay=document.createElement('div');
    overlay.className='changeling-wunsch-overlay';
    overlay.innerHTML=`
      <div class="cw-dark"></div>
      <div class="cw-reveal"></div>
      <div class="cw-title"><strong>SCHWARMRUF</strong><small>${evt.casterName||'Changeling'} ruft den Schwarm – 2 zusätzliche Spezialkarten werden aktiviert.</small></div>
      <div class="cw-bonus-card one"><span>+1</span><small>Spezial</small></div>
      <div class="cw-bonus-card two"><span>+1</span><small>Spezial</small></div>
    `;

    const stage=document.createElement('div');
    stage.className='cw-stage';
    overlay.appendChild(stage);

    LAYOUT.forEach((cfg,i)=>{
      const el=document.createElement('div');
      el.className='cw-changeling';
      el.style.left=cfg.left+'%';
      el.style.top=cfg.top+'%';
      el.style.setProperty('--s',cfg.scale);
      el.style.zIndex=String(cfg.z);
      const img=document.createElement('img');
      img.src=SPRITES[cfg.img];
      img.alt='';
      el.appendChild(img);
      stage.appendChild(el);
    });

    EYES.forEach((cfg,i)=>{
      const eye=document.createElement('div');
      eye.className='cw-eyes';
      eye.style.left=cfg.left+'%';
      eye.style.top=cfg.top+'%';
      eye.style.setProperty('--s',cfg.scale);
      eye.style.animationDelay=(0.18 + i*0.11)+'s';
      stage.appendChild(eye);
    });

    for(let i=0;i<36;i++){
      const mote=document.createElement('i');
      mote.className='cw-mote';
      mote.style.left=(8+Math.random()*84)+'%';
      mote.style.top=(14+Math.random()*68)+'%';
      mote.style.animationDelay=(0.4+Math.random()*2.4)+'s';
      mote.style.setProperty('--dx', ((Math.random()-.5)*90).toFixed(1)+'px');
      mote.style.setProperty('--dy', (-30-Math.random()*80).toFixed(1)+'px');
      stage.appendChild(mote);
    }

    document.body.appendChild(overlay);
    active=overlay;
    document.body.classList.add('changeling-swarm-running');

    audio=new Audio('/assets/sounds/changeling_swarmruf_mix.mp3?v=wunsch-v2');
    audio.volume=0.88;
    audio.play().catch(()=>{});

    requestAnimationFrame(()=>overlay.classList.add('show'));
    later(1700,()=>overlay.classList.add('reveal-on'));
    later(2200,()=>overlay.classList.add('bonus-on'));
    later(Math.max(3600, Number(evt.duration)||4200), stop);
    return {stop};
  }

  function afterCardReveal(evt){
    const preview = !!evt.preview;
    if(preview){ play(evt); return; }
    const started=performance.now();
    const poll=()=>{
      if(!document.querySelector('#game.screen.active')) return;
      if(document.querySelector('.special-burst') && performance.now()-started<6500){ setTimeout(poll,55); return; }
      requestAnimationFrame(()=>play(evt));
    };
    poll();
  }

  if(typeof socket!=='undefined' && socket?.on){
    socket.on('changelingSwarmAnimation', afterCardReveal);
  }
  window.ChangelingSwarmFX={play,stop};
})();

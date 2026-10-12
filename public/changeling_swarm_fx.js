(()=>{
  'use strict';
  const SPRITES=[
    '/assets/fx/changelings/changeling_1.png',
    '/assets/fx/changelings/changeling_2.png',
    '/assets/fx/changelings/changeling_3.png'
  ];
  const LAYOUT=[
    {img:0,left:9, top:40, scale:1.24, z:5},
    {img:1,left:25, top:53, scale:1.08, z:6},
    {img:2,left:41, top:49, scale:1.18, z:7},
    {img:0,left:59, top:54, scale:1.03, z:6},
    {img:2,left:76, top:43, scale:1.16, z:5},
    {img:1,left:88, top:51, scale:1.08, z:5},
    {img:0,left:9, top:12, scale:0.54, z:3},
    {img:2,left:18, top:23, scale:0.50, z:3},
    {img:1,left:31, top:16, scale:0.46, z:3},
    {img:0,left:76, top:18, scale:0.52, z:3},
    {img:2,left:86, top:10, scale:0.56, z:3},
    {img:1,left:92, top:24, scale:0.50, z:3}
  ];
  const EYES=[
    {left:13, top:47, scale:1.0}, {left:29, top:60, scale:0.86}, {left:45, top:57, scale:0.93},
    {left:63, top:61, scale:0.82}, {left:79, top:50, scale:0.88}, {left:91, top:58, scale:0.84},
    {left:13, top:19, scale:0.46}, {left:21, top:30, scale:0.42}, {left:34, top:23, scale:0.38},
    {left:79, top:23, scale:0.44}, {left:89, top:15, scale:0.48}, {left:94, top:29, scale:0.42}
  ];
  let active=null,audio=null,timers=[];
  function later(ms,fn){timers.push(setTimeout(fn,ms));}
  function stop(){
    timers.forEach(clearTimeout); timers=[];
    if(audio){ try{audio.pause();audio.currentTime=0;}catch(e){} audio=null; }
    active?.remove(); active=null;
    document.body.classList.remove('changeling-swarm-running');
  }
  function ensureCss(){
    if(document.getElementById('changeling-swarm-fx-css')) return;
    const link=document.createElement('link');
    link.id='changeling-swarm-fx-css'; link.rel='stylesheet'; link.href='/changeling_swarm_fx.css?v=20261012-fx1';
    document.head.appendChild(link);
  }
  function play(evt={}){
    ensureCss(); stop();
    const overlay=document.createElement('div');
    overlay.className='changeling-wunsch-overlay';
    overlay.innerHTML=`<div class="cw-dark"></div><div class="cw-reveal"></div>
      <div class="cw-title"><strong>SCHWARMRUF</strong><small>${evt.casterName||'Changeling'} ruft den Schwarm – du darfst diese Runde 1 weitere Spezialkarte spielen.</small></div>
      <div class="cw-bonus-card one"><span>+1</span><small>Spezial</small></div>
      <div class="cw-bonus-card two"><span>🎁</span><small>Bonus-Gold</small></div>`;
    const stage=document.createElement('div'); stage.className='cw-stage'; overlay.appendChild(stage);
    LAYOUT.forEach(cfg=>{
      const el=document.createElement('div'); el.className='cw-changeling';
      el.style.left=cfg.left+'%'; el.style.top=cfg.top+'%'; el.style.setProperty('--s',cfg.scale); el.style.zIndex=cfg.z;
      const img=document.createElement('img'); img.src=SPRITES[cfg.img]; img.alt=''; el.appendChild(img); stage.appendChild(el);
    });
    EYES.forEach((cfg,i)=>{
      const eye=document.createElement('div'); eye.className='cw-eyes';
      eye.style.left=cfg.left+'%'; eye.style.top=cfg.top+'%'; eye.style.setProperty('--s',cfg.scale); eye.style.animationDelay=(0.18+i*0.11)+'s';
      stage.appendChild(eye);
    });
    for(let i=0;i<34;i++){
      const mote=document.createElement('i'); mote.className='cw-mote';
      mote.style.left=(8+Math.random()*84)+'%'; mote.style.top=(16+Math.random()*66)+'%';
      mote.style.animationDelay=(0.5+Math.random()*2.1)+'s';
      mote.style.setProperty('--dx',((Math.random()-.5)*90).toFixed(1)+'px');
      mote.style.setProperty('--dy',(-30-Math.random()*80).toFixed(1)+'px');
      stage.appendChild(mote);
    }
    document.body.appendChild(overlay); active=overlay; document.body.classList.add('changeling-swarm-running');
    try{ audio=new Audio('/assets/sounds/changeling_swarmruf_mix.mp3?v=wunsch-restore-20261012'); audio.volume=0.9; audio.play().catch(()=>{});}catch(e){}
    requestAnimationFrame(()=>overlay.classList.add('show'));
    later(1600,()=>overlay.classList.add('reveal-on'));
    later(2140,()=>overlay.classList.add('bonus-on'));
    later(Math.max(3700, Number(evt.duration)||4300), stop);
    return {stop};
  }
  if(typeof socket!=='undefined' && socket?.on){ socket.on('changelingSwarmAnimation',play); }
  window.ChangelingSwarmFX={play,stop};
})();

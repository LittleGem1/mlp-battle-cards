(function installDiscordChaos(){
  'use strict';
  let playing=false;
  const playedTokens=new Set();
  let voiceContext=null;
  const categories={strength:['🏋️','Stärke'],speed:['⚡','Schnelligkeit'],magic:['⭐','Magie'],energy:['🔋','Energie']};
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
  function sfx(freq=930){
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      const ctx=new AudioContext();
      const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
      const vol=Math.max(0,Math.min(1,Number(localStorage.getItem('mlp_sfx_volume')??0.55)));
      osc.type='square';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(180,t+.25);
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,vol*.13),t+.025);
      gain.gain.exponentialRampToValueAtTime(.0001,t+.28);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.29);
      setTimeout(()=>ctx.close().catch(()=>{}),900);
    }catch(e){}
  }

  // Freigegebene Vorschau: Originalspruch, dann ab 0,8 s "Discord Revealed".
  const MUSIC_URL='/assets/MLPFiM%20BGM%20Discord%20Revealed.mp3';
  const MUSIC_OFFSET=0.8;
  const SCENE_SECONDS=11.52;
  const FADE_SECONDS=1.6;
  let soundtrackBytesPromise=null;
  function soundtrackBytes(){
    if(!soundtrackBytesPromise){
      soundtrackBytesPromise=fetch(MUSIC_URL).then(res=>{
        if(!res.ok)throw new Error('Discord-Soundtrack HTTP '+res.status);
        return res.arrayBuffer();
      }).catch(err=>{soundtrackBytesPromise=null;throw err;});
    }
    return soundtrackBytesPromise;
  }
  function detectLightningBeats(buffer){
    // Identical transient/onset analysis to the approved standalone preview.
    const sr=buffer.sampleRate,channel=buffer.getChannelData(0);
    const other=buffer.numberOfChannels>1?buffer.getChannelData(1):null;
    const hop=Math.round(sr*.025);
    const from=Math.round(MUSIC_OFFSET*sr);
    const until=Math.min(channel.length,Math.floor((MUSIC_OFFSET+SCENE_SECONDS)*sr));
    const frames=[];
    for(let pos=from;pos+hop<until;pos+=hop){
      let pow=0,sharp=0,last=0,n=0;
      for(let i=pos;i<pos+hop;i+=2){
        const v=other?(channel[i]+other[i])*.5:channel[i];
        pow+=v*v;sharp+=Math.abs(v-last);last=v;n++;
      }
      frames.push({t:pos/sr-MUSIC_OFFSET,energy:Math.sqrt(pow/n),sharp:sharp/n});
    }
    if(!frames.length)return [];
    const energies=frames.map(x=>x.energy).sort((a,b)=>a-b);
    const median=energies[Math.floor(energies.length*.5)]||.005;
    const candidates=[];
    for(let i=8;i<frames.length-3;i++){
      const now=frames[i],recent=frames.slice(i-8,i);
      const prevEnergy=recent.reduce((n,f)=>n+f.energy,0)/recent.length;
      const prevSharp=recent.reduce((n,f)=>n+f.sharp,0)/recent.length;
      const onset=(now.energy-prevEnergy)/(prevEnergy+.006);
      const attack=(now.sharp-prevSharp)/(prevSharp+.003);
      const score=Math.max(0,onset)*1.6+Math.max(0,attack)*.8;
      if(now.energy>median*.65&&score>.26&&now.energy>=frames[i+1].energy*.87){
        candidates.push({t:now.t,score:score*now.energy/(median+.015)});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    const picked=[];
    for(const beat of candidates){
      if(picked.length>=14)break;
      if(picked.every(otherBeat=>Math.abs(beat.t-otherBeat.t)>.52))picked.push(beat);
    }
    return picked.sort((a,b)=>a.t-b.t);
  }
  async function prepareDiscordMusic(){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    const ctx=new AC();
    try{
      const bytes=await soundtrackBytes();
      const buffer=await ctx.decodeAudioData(bytes.slice(0));
      if(buffer.duration<=MUSIC_OFFSET)throw new Error('Discord-Soundtrack ist zu kurz.');
      return {ctx,buffer,beats:detectLightningBeats(buffer)};
    }catch(err){
      ctx.close().catch(()=>{});
      console.warn('[Discord] Soundtrack-Analyse nicht verfügbar:',err);
      return null;
    }
  }
  function strikeLightning(root,strength=1){
    if(!root?.isConnected)return;
    const container=root.querySelector('.discord-chaos-lightning-layer');
    const flash=root.querySelector('.discord-chaos-lightning-flash');
    if(!container||!flash)return;
    let x=15+Math.random()*70,y=-6;
    let d='M '+x.toFixed(1)+' '+y;
    const branches=[];
    for(let i=0;i<10;i++){
      x+=(Math.random()-.5)*15;
      y+=11+Math.random()*3;
      d+=' L '+x.toFixed(1)+' '+y.toFixed(1);
      if(i===4||i===7)branches.push('M '+x.toFixed(1)+' '+y.toFixed(1)+' l '+(Math.random()>.5?15:-15)+' 17');
    }
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 100 125');
    function path(shape,width,color){
      const element=document.createElementNS(ns,'path');
      element.setAttribute('d',shape);
      element.setAttribute('fill','none');
      element.setAttribute('stroke',color);
      element.setAttribute('stroke-width',String(width));
      element.setAttribute('stroke-linejoin','round');
      return element;
    }
    svg.append(path(d,4,'#9750ff'),path(d,1.5,'#fff5ff'));
    for(const branch of branches)svg.append(path(branch,1.1,'#d4afff'));
    container.append(svg);
    flash.style.opacity=String(Math.min(.63,.13+strength*.25));
    setTimeout(()=>{if(root.isConnected)flash.style.opacity='0';},85);
    setTimeout(()=>svg.remove(),320);
  }
  async function startDiscordSoundtrack(prepared,userVolume){
    // Gameplay volume settings still apply. 0 is always silent.
    const loudness=userVolume===0?0:Math.min(1,.77*userVolume/.55);
    if(prepared){
      const ctx=prepared.ctx;
      const resumed=await Promise.race([
        ctx.resume().then(()=>ctx.state==='running').catch(()=>false),
        sleep(450).then(()=>false)
      ]);
      if(resumed){
        const source=ctx.createBufferSource();
        const gain=ctx.createGain();
        const compressor=ctx.createDynamicsCompressor();
        compressor.threshold.value=-8;
        compressor.ratio.value=7;
        compressor.attack.value=.003;
        compressor.release.value=.2;
        source.buffer=prepared.buffer;
        source.connect(gain);gain.connect(compressor);compressor.connect(ctx.destination);
        const start=ctx.currentTime+.04;
        const duration=Math.min(SCENE_SECONDS,prepared.buffer.duration-MUSIC_OFFSET);
        gain.gain.setValueAtTime(loudness,start);
        gain.gain.setValueAtTime(loudness,start+Math.max(0,duration-FADE_SECONDS));
        gain.gain.linearRampToValueAtTime(.0001,start+duration);
        source.start(start,MUSIC_OFFSET,duration);
        return {stop(){try{source.stop()}catch(e){}}};
      }
    }
    // Some devices block AudioContext. An HTMLAudioElement is a best-effort fallback.
    const media=new Audio(MUSIC_URL);
    media.preload='auto';
    media.volume=loudness;
    try{media.currentTime=MUSIC_OFFSET;media.play().catch(err=>console.warn('[Discord] Musik vom Browser blockiert:',err));}
    catch(err){console.warn('[Discord] Audio-Fallback:',err);}
    let fade=null;
    const timer=setTimeout(()=>{
      const started=Date.now(),originalVolume=media.volume;
      fade=setInterval(()=>{
        const fraction=Math.min(1,(Date.now()-started)/(FADE_SECONDS*1000));
        media.volume=originalVolume*(1-fraction);
        if(fraction>=1)clearInterval(fade);
      },50);
    },(SCENE_SECONDS-FADE_SECONDS)*1000);
    return {stop(){clearTimeout(timer);if(fade)clearInterval(fade);media.pause();media.removeAttribute('src');}};
  }

  async function play(event){
    const key=String(event?.animationPauseToken||event?.round||'');
    if(key&&playedTokens.has(key))return;
    if(playing)return;
    if(key){playedTokens.add(key);if(playedTokens.size>80)playedTokens.delete(playedTokens.values().next().value);}
    playing=true;
    let root=null,audio=null,spin=null,sourceNode=null,voiceGain=null;
    let music=null,preparedMusic=null;
    const lightningTimers=[];
    try{
      // Prepare/decode during the voice line, not after it, to avoid dead air.
      const musicTask=prepareDiscordMusic();
      // The original spoken quote must finish BEFORE any visual effect starts.
      audio=new Audio('/assets/discord_chaos_voice.mp3');
      audio.preload='auto';
      // Give the voice more presence without overriding the player's mute setting.
      const configured=Math.max(0,Math.min(1,Number(localStorage.getItem('mlp_sfx_volume')??0.55)));
      audio.volume=configured===0?0:1;
      // Audio element volume caps at 1. WebAudio gain makes Discord genuinely
      // louder than the music, with a compressor protecting against clipping.
      if(configured>0){
        try{
          const AC=window.AudioContext||window.webkitAudioContext;
          if(AC){
            voiceContext=new AC();
            sourceNode=voiceContext.createMediaElementSource(audio);
            voiceGain=voiceContext.createGain();
            const limiter=voiceContext.createDynamicsCompressor();
            limiter.threshold.value=-10;limiter.knee.value=8;limiter.ratio.value=9;
            limiter.attack.value=.003;limiter.release.value=.22;
            voiceGain.gain.value=2.35*configured;
            sourceNode.connect(voiceGain);voiceGain.connect(limiter);limiter.connect(voiceContext.destination);
            voiceContext.resume().catch(()=>{});
          }
        }catch(err){console.warn('[Discord] Audio boost fallback',err);audio.volume=Math.min(1,configured);}
      }
      window.setDiscordVoiceDucking?.(true);
      await new Promise(resolve=>{
        let done=false;
        const finish=()=>{if(done)return;done=true;resolve();};
        const safety=setTimeout(finish,5550);
        audio.onended=()=>{clearTimeout(safety);finish();};
        audio.onerror=()=>{clearTimeout(safety);setTimeout(finish,4400);};
        const attempt=audio.play();
        if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{clearTimeout(safety);setTimeout(finish,4441);});
      });
      // Silence the voice before beginning the soundtrack, including when its
      // browser audio event never arrived.
      audio.pause();
      // Slow downloads must not swallow the animation or the server pause.
      let musicLoadTimer;
      preparedMusic=await Promise.race([
        musicTask,
        new Promise(resolve=>{musicLoadTimer=setTimeout(()=>resolve(null),2500);})
      ]);
      clearTimeout(musicLoadTimer);
      // If preparation timed out, release the context when it eventually loads.
      if(!preparedMusic)musicTask.then(late=>{
        if(late?.ctx)late.ctx.close().catch(()=>{});
      }).catch(()=>{});
      const data=categories[event?.category]||categories.magic;
      root=document.createElement('div');
      root.id='discordChaosOverlay';
      root.setAttribute('aria-live','polite');
      root.innerHTML=`
        <div class="discord-chaos-vignette"></div>
        <div class="discord-chaos-burst"></div>
        <img class="discord-chaos-card" src="/assets/specials_new/102_Discord.webp" alt="Discord – Umgekehrte Welt">
        <img class="discord-chaos-figure" src="/assets/discord_chaos_figure.webp" alt="Discord grinst über der Arena">
        <div class="discord-chaos-spell">Willkommen in meiner Welt!</div>
        <div class="discord-chaos-rule">DIE REGELN SIND JETZT UMGEKEHRT!</div>
        <div class="discord-chaos-dice"><span class="discord-chaos-symbol">🎲</span><b class="discord-chaos-label">???</b></div>
        <div class="discord-chaos-last">🙃 DER KLEINSTE WERT GEWINNT!</div>
        <div class="discord-chaos-lightning-flash"></div>
        <div class="discord-chaos-lightning-layer"></div>
      `;
      document.body.append(root);
      document.body.classList.add('discord-chaos-active');
      music=await startDiscordSoundtrack(preparedMusic,configured);
      for(const beat of (preparedMusic?.beats||[])){
        lightningTimers.push(setTimeout(()=>{
          strikeLightning(root,.7+Math.min(1.4,beat.score*.20));
        },Math.max(0,beat.t*1000+40)));
      }
      // Discord appears first, just like the approved standalone preview.
      root.classList.add('discord-chaos-visible');
      await sleep(1250);
      root.classList.add('discord-chaos-snap');
      strikeLightning(root,1.7);
      await sleep(880);
      document.body.classList.add('discord-chaos-flipped');
      root.classList.add('discord-chaos-turn');
      await sleep(1480);
      root.classList.add('discord-chaos-title');
      await sleep(1210);
      root.classList.add('discord-chaos-subtitle');
      await sleep(980);
      root.classList.add('discord-chaos-roll');
      const sym=root.querySelector('.discord-chaos-symbol'),lbl=root.querySelector('.discord-chaos-label');
      const values=Object.values(categories);
      let i=0;spin=setInterval(()=>{const c=values[i++%values.length];sym.textContent=c[0];lbl.textContent=c[1];},95);
      await sleep(1900);
      clearInterval(spin);spin=null;
      sym.textContent=data[0];lbl.textContent=data[1];
      root.classList.add('discord-chaos-roll-ended');
      await sleep(900);
      root.classList.add('discord-chaos-low');
      await sleep(2070);
      root.classList.add('discord-chaos-done');
      document.body.classList.remove('discord-chaos-flipped');
      await sleep(850);
    }catch(err){
      console.error('[Discord Chaos]',err);
    }finally{
      window.setDiscordVoiceDucking?.(false);
      if(spin)clearInterval(spin);
      lightningTimers.forEach(clearTimeout);
      music?.stop();
      if(preparedMusic?.ctx)preparedMusic.ctx.close().catch(()=>{});
      if(audio){audio.pause();audio.src='';}
      if(voiceContext){voiceContext.close().catch(()=>{});voiceContext=null;}
      document.body.classList.remove('discord-chaos-flipped','discord-chaos-active');
      root?.remove();
      playing=false;
    }
  }
  window.DiscordChaosFX={play};
})();

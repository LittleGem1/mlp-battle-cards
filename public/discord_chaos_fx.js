(function installDiscordChaos(){
  'use strict';
  let playing=false;
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
  async function play(event){
    if(playing)return;
    playing=true;
    let root=null,audio=null,spin=null;
    try{
      // The original spoken quote must finish BEFORE any visual effect starts.
      audio=new Audio('/assets/discord_chaos_voice.mp3');
      audio.preload='auto';
      audio.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('mlp_sfx_volume')??0.55)));
      await new Promise(resolve=>{
        let done=false;
        const finish=()=>{if(done)return;done=true;resolve();};
        const safety=setTimeout(finish,5550);
        audio.onended=()=>{clearTimeout(safety);finish();};
        audio.onerror=()=>{clearTimeout(safety);setTimeout(finish,4400);};
        const attempt=audio.play();
        if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{clearTimeout(safety);setTimeout(finish,4441);});
      });
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
      `;
      document.body.append(root);
      // Discord appears first, just like the approved standalone preview.
      root.classList.add('discord-chaos-visible');
      await sleep(1250);
      root.classList.add('discord-chaos-snap');
      sfx(980);
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
      sfx(660);
      await sleep(900);
      root.classList.add('discord-chaos-low');
      await sleep(2070);
      root.classList.add('discord-chaos-done');
      document.body.classList.remove('discord-chaos-flipped');
      await sleep(850);
    }catch(err){
      console.error('[Discord Chaos]',err);
    }finally{
      if(spin)clearInterval(spin);
      if(audio){audio.pause();audio.src='';}
      document.body.classList.remove('discord-chaos-flipped');
      root?.remove();
      playing=false;
    }
  }
  window.DiscordChaosFX={play};
})();

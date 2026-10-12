/**
 * Sweetie Bot animation for a browser client, as a standalone ES module.
 * Sound is played FIRST to completion, then the shots and UI effects.
 * Gameplay authority and networking remain in the game's server.
 */
const DEFAULT_VOICE = '/assets/sweetie-bot-voice.mp3';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const point = (el, x=.5, y=.5) => {const r=el.getBoundingClientRect();return {x:r.left+r.width*x,y:r.top+r.height*y};};
function animate(el, frames, options) { return el.animate(frames, {fill:'forwards',...options}); }

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.sourceElement the Sweetie Bot card displayed in the arena
 * @param {HTMLElement} opts.targetElement the chosen opponent's played card
 * @param {string} [opts.voiceUrl] public URL of the uploaded voice line
 * @param {boolean} [opts.muted] player's local mute setting
 * @param {number} [opts.oldValue] server-reported value before effect
 * @param {number} [opts.newValue] server-reported final value after effect
 * @param {Function} [opts.onValueReveal] update the UI at the end of the firing sequence; does not change server game state
 * @returns {Promise<void>}
 */
export async function playSweetieBotAnimation({sourceElement,targetElement,voiceUrl=DEFAULT_VOICE,muted=false,oldValue,newValue,onValueReveal=()=>{}}) {
  if (!(sourceElement instanceof Element) || !(targetElement instanceof Element)) throw new Error('Sweetie Bot: sourceElement und targetElement müssen DOM-Elemente sein.');
  const layer=document.createElement('div');layer.className='sb-fx-layer';document.body.appendChild(layer);
  const flash=document.createElement('div');flash.className='sb-flash';layer.appendChild(flash);
  const title=document.createElement('div');title.className='sb-announcement';title.textContent='TOTAL ELIMINATION PROTOCOL';layer.appendChild(title);
  let audioContext;
  const blip=()=>{if(muted)return;try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();const o=audioContext.createOscillator(),g=audioContext.createGain(),t=audioContext.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(130,t);o.frequency.exponentialRampToValueAtTime(50,t+.13);g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(g).connect(audioContext.destination);o.start(t);o.stop(t+.15);}catch{}};
  const effectNodes=[];
  function impact(x,y){const el=document.createElement('div');el.className='sb-impact';el.style.left=`${x}px`;el.style.top=`${y}px`;el.innerHTML='<svg viewBox="0 0 180 180"><g stroke="#e2ddff" fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M90 90L93 0 M90 90L180 48 M90 90L167 170 M90 90L46 180 M90 90L3 120 M90 90L15 12 M90 90L135 22"/><path d="M93 33L66 17M147 63L156 29M132 128L173 119M69 133L32 156M47 96L23 73M108 62L124 48M98 154L113 175"/><path d="M90 90L61 59L44 67 M90 90L126 78L133 91 M90 90L84 131L64 142"/></g></svg><div class="sb-hole"></div>';layer.append(el);effectNodes.push(el);animate(el,[{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.15)',offset:.25},{opacity:.9,transform:'translate(-50%,-50%) scale(1)'}],{duration:350});}
 
function shot(src,dst){
  blip();
  const beam=document.createElement('div');
  beam.className='sb-shot';
  const dx=dst.x-src.x,dy=dst.y-src.y;
  beam.style.cssText=`left:${src.x}px;top:${src.y}px;width:${Math.hypot(dx,dy)}px;transform:rotate(${Math.atan2(dy,dx)}rad)`;
  layer.appendChild(beam);
  animate(beam,[
    {opacity:0,clipPath:'inset(0 100% 0 0)'},
    {opacity:1,clipPath:'inset(0 0 0 0)'},
    {opacity:0}
  ],{duration:210});
  setTimeout(()=>beam.remove(),210);
  impact(dst.x,dst.y);
  animate(flash,[{opacity:.32},{opacity:0}],{duration:180});
}

  try {
    // Crucial ordering: let the actual recorded voice line finish before firing.
    if (!muted) {
      const voice=new Audio(voiceUrl);voice.preload='auto';voice.volume=Math.max(0,Math.min(1,Number(localStorage.getItem('mlp_sfx_volume')??.55)));
      await new Promise(resolve=>{
        let resolved=false;
        const finish=()=>{if(resolved)return;resolved=true;voice.removeEventListener('ended',finish);voice.removeEventListener('error',finish);resolve();};
        voice.addEventListener('ended',finish,{once:true});voice.addEventListener('error',finish,{once:true});
        voice.play().catch(finish);
      });
    }
    if (!document.body.contains(targetElement)) return;
    const target=point(targetElement),reticle=document.createElement('div');reticle.className='sb-reticle';reticle.style.left=target.x+'px';reticle.style.top=target.y+'px';layer.append(reticle);
    animate(reticle,[{opacity:0,transform:'translate(-50%,-50%) scale(2)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:700});await wait(720);
    animate(title,[{opacity:0},{opacity:1,offset:.15},{opacity:1,offset:.8},{opacity:0}],{duration:1600});await wait(420);
    const src=point(sourceElement,.73,.38);targetElement.classList.add('sb-hit-shake');
    for(let i=0;i<8;i++){const r=targetElement.getBoundingClientRect();shot(src,{x:r.left+r.width*(.15+Math.random()*.7),y:r.top+r.height*(.15+Math.random()*.7)});await wait(145);}
    await wait(480);targetElement.classList.remove('sb-hit-shake');
    onValueReveal();
    if(Number.isFinite(oldValue)&&Number.isFinite(newValue)){
      const tag=document.createElement('div');tag.className='sb-half';tag.textContent=`${oldValue} → ${newValue}`;layer.append(tag);animate(tag,[{opacity:0,transform:'translateX(-50%) scale(1.5)'},{opacity:1,transform:'translateX(-50%) scale(1)'},{opacity:0,offset:1}],{duration:1700});
    }
    await wait(1750);for(const el of effectNodes)animate(el,[{opacity:.9},{opacity:0}],{duration:600});await wait(650);
  } finally {targetElement.classList.remove('sb-hit-shake');layer.remove();if(audioContext)audioContext.close().catch(()=>{});}
}

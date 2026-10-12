/**
 * Helements of Armory animation for browser clients.
 * Earthquake + falling stones, then fart cloud and a missing artifact appears in the player's deck.
 * Server remains authoritative for which artifact is granted.
 */
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const point = (el, x=.5, y=.5) => { const r = el.getBoundingClientRect(); return { x:r.left + r.width*x, y:r.top + r.height*y, rect:r }; };
function animate(el, frames, options){ return el.animate(frames,{ fill:'forwards', easing:'ease', ...options }); }
const DEFAULT_RUMBLE = '/assets/helements-rumble.mp3';
const DEFAULT_FART = '/assets/helements-fart.mp3';

function ensureAudio(url, volume=1){ const a = new Audio(url); a.preload='auto'; a.volume=volume; return a; }
function playMaybe(audio, muted){ if(muted) return Promise.resolve(); return audio.play().catch(()=>{}); }
function removeLater(node, ms=0){ setTimeout(()=>node?.remove(), ms); }

function makeStone(layer, x, size=1, rotation=0){
  const el = document.createElement('div');
  el.className = Math.random() < .72 ? 'hoa-stone' : 'hoa-debris';
  const w = el.className === 'hoa-stone' ? 26*size : 12*size;
  const h = el.className === 'hoa-stone' ? 20*size : 8*size;
  el.style.left = `${x}px`; el.style.top = `-40px`; el.style.width = `${w}px`; el.style.height = `${h}px`; el.style.transform = `rotate(${rotation}deg)`;
  layer.appendChild(el);
  const drift = (Math.random()*220)-110;
  const endY = window.innerHeight + 60;
  animate(el,[
    { transform:`translate(0,0) rotate(${rotation}deg)`, opacity:.95 },
    { transform:`translate(${drift*0.45}px,${endY*0.55}px) rotate(${rotation+220}deg)`, opacity:.88, offset:.55 },
    { transform:`translate(${drift}px,${endY}px) rotate(${rotation+520}deg)`, opacity:0 }
  ],{ duration: 1800 + Math.random()*1200, easing:'cubic-bezier(.18,.62,.35,1)' });
  removeLater(el, 3400);
}

function spawnCrack(layer){
  const el = document.createElement('div');
  el.className='hoa-crack';
  const cx = 18 + Math.random()*64, cy = 12 + Math.random()*62;
  el.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none"><g stroke="rgba(255,243,248,.78)" stroke-width="0.65" fill="none" stroke-linecap="round"><path d="M${cx} ${cy} L${cx+8} ${cy-20} L${cx+2} ${cy-31} M${cx} ${cy} L${cx+22} ${cy+10} L${cx+33} ${cy+7} M${cx} ${cy} L${cx-16} ${cy+18} L${cx-24} ${cy+30} M${cx} ${cy} L${cx-20} ${cy-12} L${cx-29} ${cy-24} M${cx} ${cy} L${cx+4} ${cy+20} L${cx+14} ${cy+34}"/><path d="M${cx+7} ${cy-16} L${cx+16} ${cy-24} M${cx+18} ${cy+8} L${cx+28} ${cy+14} M${cx-13} ${cy+13} L${cx-20} ${cy+21} M${cx+5} ${cy+16} L${cx+9} ${cy+28}"/></g></svg>`;
  layer.appendChild(el);
  animate(el,[{opacity:0},{opacity:1,offset:.15},{opacity:.7,offset:.75},{opacity:0}],{duration:2000});
  removeLater(el,2050);
}

function makeCloud(layer, center){
  const cloud=document.createElement('div'); cloud.className='hoa-cloud'; cloud.style.left=`${center.x}px`; cloud.style.top=`${center.y}px`;
  cloud.innerHTML='<i></i><i></i><i></i>';
  layer.appendChild(cloud);
  animate(cloud,[
    {opacity:0, transform:'translate(-50%,-50%) scale(.25)'},
    {opacity:1, transform:'translate(-50%,-50%) scale(1.05)', offset:.35},
    {opacity:.92, transform:'translate(-50%,-50%) scale(1)', offset:.6},
    {opacity:0, transform:'translate(-50%,-60%) scale(1.26)'}
  ],{duration:1500,easing:'cubic-bezier(.17,.84,.44,1)'});
  removeLater(cloud,1600);
}

function makeArtifactCard(layer, {artifactName='Zufalls-Artefakt', artifactIcon='✦', artifactImageUrl=''}){
  const card=document.createElement('div'); card.className='hoa-artifact-card';
  const imageArea=document.createElement('div'); imageArea.className='hoa-artifact-img';
  if(artifactImageUrl){const img=document.createElement('img');img.src=artifactImageUrl;img.alt='';imageArea.appendChild(img);}
  const icon=document.createElement('div');icon.className='hoa-artifact-icon';icon.textContent=artifactIcon;imageArea.appendChild(icon);
  const label=document.createElement('div');label.className='hoa-artifact-name';label.textContent=artifactName;
  card.append(imageArea,label);
  layer.appendChild(card); return card;
}

function launchGlow(layer, from, to){
  const line=document.createElement('div'); line.className='hoa-glow-line';
  const dx=to.x-from.x, dy=to.y-from.y, len=Math.hypot(dx,dy);
  line.style.left=`${from.x}px`; line.style.top=`${from.y}px`; line.style.width=`${len}px`; line.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;
  layer.appendChild(line);
  animate(line,[{opacity:0,clipPath:'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0 0 0 0)',offset:.35},{opacity:0}],{duration:520,easing:'ease-out'});
  removeLater(line,560);
}

/**
 * @param {Object} opts
 * @param {HTMLElement} opts.sourceElement card currently activating the effect
 * @param {HTMLElement} opts.deckElement player's deck UI element that receives the new artifact
 * @param {HTMLElement} [opts.arenaElement] element to shake (defaults to document.body)
 * @param {string} [opts.rumbleUrl] public URL of stone crumble / landslide SFX
 * @param {string} [opts.fartUrl] public URL of dramatic fart SFX
 * @param {boolean} [opts.muted] local mute setting
 * @param {string} [opts.artifactName] already server-selected missing artifact name
 * @param {string} [opts.artifactIcon] simple icon or emoji for previewing the granted artifact
 * @param {string} [opts.artifactImageUrl] optional image shown on spawned artifact card
 * @param {number} [opts.deckCountBefore] deck count before card enters
 * @param {number} [opts.deckCountAfter] deck count after card enters
 * @param {Function} [opts.onArtifactGranted] callback after visual grant moment for UI update only
 */
export async function playHelementsOfArmoryAnimation({
  sourceElement,
  deckElement,
  arenaElement=document.body,
  rumbleUrl=DEFAULT_RUMBLE,
  fartUrl=DEFAULT_FART,
  muted=false,
  artifactName='Zufälliges Artefakt',
  artifactIcon='✦',
  artifactImageUrl='',
  deckCountBefore,
  deckCountAfter,
  onArtifactGranted=()=>{}
}) {
  if(!(sourceElement instanceof Element) || !(deckElement instanceof Element)) throw new Error('Helements of Armory: sourceElement und deckElement müssen DOM-Elemente sein.');
  const layer=document.createElement('div'); layer.className='hoa-fx-layer'; document.body.appendChild(layer);
  const dust=document.createElement('div'); dust.className='hoa-dust'; layer.appendChild(dust);
  const title=document.createElement('div'); title.className='hoa-announcement'; title.textContent='HELEMENTS OF ARMORY'; layer.appendChild(title);
  let counterTag, stoneTimer;

  const rumble=ensureAudio(rumbleUrl, .9);
  const fart=ensureAudio(fartUrl, 1);
  const arena = arenaElement instanceof Element ? arenaElement : document.body;
  arena.classList.add('hoa-shake-target','hoa-earthquake');
  animate(title,[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.85},{opacity:0}],{duration:4200,easing:'ease-out'});
  animate(dust,[{opacity:0},{opacity:.95,offset:.5},{opacity:.55,offset:.86},{opacity:0}],{duration:6200,easing:'linear'});

  try {
    // Beide vorhandenen Tonspuren starten im selben Moment und überlagern sich.
    // Der Furz steckt bereits in der zweiten Datei und wird NICHT erneut abgespielt.
    const playToEnd = audio => new Promise(resolve => {
      let finished=false;
      const finish=()=>{
        if(finished)return;
        finished=true;
        clearTimeout(timeout);
        audio.removeEventListener('ended',finish);
        audio.removeEventListener('error',finish);
        resolve();
      };
      const timeout=setTimeout(finish,25000);
      audio.addEventListener('ended',finish);
      audio.addEventListener('error',finish);
      audio.play().catch(finish);
    });
    // Furz sitzt am Ende der Furz-Tonspur: die Wolke erscheint bereits
    // während des Schlussgeräuschs und nicht nach dem Ende beider Dateien.
    const fartMoment = muted ? wait(4900) : new Promise(resolve=>{
      let done=false;
      const finish=()=>{
        if(done)return;
        done=true;
        clearInterval(checkTimer);
        clearTimeout(fallback);
        fart.removeEventListener('ended',finish);
        resolve();
      };
      const checkTimer=setInterval(()=>{
        if(Number.isFinite(fart.duration) && fart.duration>0 &&
           fart.currentTime >= Math.max(0,fart.duration-0.85))finish();
      },40);
      const fallback=setTimeout(finish,15000);
      fart.addEventListener('ended',finish,{once:true});
    });
    if(!muted){
      // Start gleichzeitig, aber NICHT bis zum Ende des Rumpel-Sounds warten.
      void playToEnd(rumble);
      void fart.play().catch(()=>{});
    }

    stoneTimer=setInterval(()=>{
      for(let i=0;i<2+Math.floor(Math.random()*4);i++)
        makeStone(layer,Math.random()*window.innerWidth,.8+Math.random()*1.35,Math.random()*360);
      if(Math.random()<.6)spawnCrack(layer);
    },180);

    // Steine und Erdbeben laufen, solange die zwei Tonspuren gemeinsam spielen.
    await fartMoment;
    clearInterval(stoneTimer);
    rumble.pause();
    arena.classList.remove('hoa-earthquake');

    // Jetzt erst: Furzwolke, das serverseitig gewählte fehlende Artefakt
    // und dessen Flug in die Sammlung. Kein zweiter Furz-Sound.
    const source=point(sourceElement,.5,.5);
    const deck=point(deckElement,.5,.5);
    const burstCenter={x:(source.x+deck.x)/2, y:Math.min(source.y, deck.y)-50};
    makeCloud(layer, burstCenter);
    // Die Tonspur läuft am Furz-Moment weiter: kein zweites Abspielen.
    await wait(200);

    const art = makeArtifactCard(layer,{artifactName, artifactIcon, artifactImageUrl});
    art.style.left = `${burstCenter.x}px`; art.style.top = `${burstCenter.y}px`;
    animate(art,[
      {opacity:0, transform:'translate(-50%,-50%) scale(.4) rotate(-13deg)'},
      {opacity:1, transform:'translate(-50%,-50%) scale(1.06) rotate(4deg)', offset:.35},
      {opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(0deg)', offset:.55}
    ],{duration:520,easing:'cubic-bezier(.16,.88,.4,1)'});
    await wait(680);

    if(Number.isFinite(deckCountBefore) && Number.isFinite(deckCountAfter)){
      counterTag=document.createElement('div'); counterTag.className='hoa-counter-pop'; counterTag.textContent=`${deckCountBefore} → ${deckCountAfter}`; layer.appendChild(counterTag);
      counterTag.style.left = `${deck.rect.right - 6}px`; counterTag.style.top = `${deck.rect.top - 10}px`;
    }
    launchGlow(layer, burstCenter, deck);
    animate(art,[
      {opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(0deg)', left:`${burstCenter.x}px`, top:`${burstCenter.y}px`},
      {opacity:1, transform:'translate(-50%,-50%) scale(.74) rotate(8deg)', left:`${burstCenter.x + (deck.x-burstCenter.x)*0.45}px`, top:`${burstCenter.y + (deck.y-burstCenter.y)*0.45}px`, offset:.45},
      {opacity:0, transform:'translate(-50%,-50%) scale(.18) rotate(14deg)', left:`${deck.x}px`, top:`${deck.y}px`}
    ],{duration:820,easing:'cubic-bezier(.15,.86,.35,1)'});
    if(counterTag){ animate(counterTag,[{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1.05)',offset:.35},{opacity:1,transform:'scale(1)'},{opacity:0}],{duration:1600,easing:'ease-out'}); }
    deckElement.classList.add('hoa-deck-pulse');
    await wait(350);
    onArtifactGranted();
    await wait(1400);
  } finally {
    clearInterval(stoneTimer);
    try{rumble.pause();fart.pause();}catch{}
    arena.classList.remove('hoa-earthquake');
    arena.classList.remove('hoa-shake-target');
    deckElement.classList.remove('hoa-deck-pulse');
    removeLater(layer, 10);
  }
}

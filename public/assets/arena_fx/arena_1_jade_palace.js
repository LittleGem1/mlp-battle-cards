/* Arena 1 – Chinesischer Jadepalast */
function buildJadePalaceArenaVfx(root){
  if(!root) return;
  root.innerHTML = '';
  root.classList.add('vfx-jade_palace');
  for(let i=0;i<16;i++){
    const leaf = document.createElement('img');
    leaf.className = 'jade-leaf';
    leaf.src = '/assets/backgrounds/arena_1_leaf.png';
    leaf.alt = '';
    leaf.style.left = `${3 + ((i * 17) % 94)}%`;
    leaf.style.top = `${-12 - (i % 5) * 8}%`;
    leaf.style.setProperty('--size', `${24 + (i % 5) * 8}px`);
    leaf.style.setProperty('--dur', `${10 + (i % 6) * 1.4}s`);
    leaf.style.setProperty('--delay', `${-(i % 7) * 1.15}s`);
    leaf.style.setProperty('--driftX', `${-100 + ((i * 29) % 220)}px`);
    leaf.style.setProperty('--spin', `${160 + ((i * 43) % 220)}deg`);
    root.appendChild(leaf);
  }
}

/* Beispiel-Aufruf:
const arenaVfx = document.getElementById('arenaVfx');
buildJadePalaceArenaVfx(arenaVfx);
*/

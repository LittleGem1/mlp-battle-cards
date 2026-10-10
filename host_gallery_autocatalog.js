/* MLP Battle Cards – nur für die Host-Kartengalerie.
   Bereits spielbare Karten: unverändert aus cards.js.
   Zusätzliche Bilder: automatisch aus public/assets/... auflisten,
   aber NICHT spielbar machen, solange sie nicht in cards.js stehen. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, 'public', 'assets');
const DIRS = [
  {dir:'cards',type:'normal',prefix:'n'},
  {dir:'cards_new',type:'normal',prefix:'n'},
  {dir:'specials',type:'special',prefix:'s'},
  {dir:'specials_new',type:'special',prefix:'s'},
  {dir:'artifacts',type:'artifact',prefix:'a'}
];
const SAFE_IMAGE = /^(\d{1,4})_(.+)\.(webp|png|jpg|jpeg)$/i;
const SHOW = ['id','type','name','image','strength','speed','magic','energy','text','useIcon','useLabel'];

function galleryCards(normal, specials, artifacts) {
  const byId = new Map();
  for (const c of [...normal,...specials,...artifacts]) {
    if (!c?.id) continue;
    const row = Object.fromEntries(SHOW.filter(key => Object.prototype.hasOwnProperty.call(c, key))
      .map(key => [key,c[key]]));
    row.previewOnly = false;
    byId.set(row.id, row);
  }
  // Files are read at each host request, never cached in a static copy.
  for (const {dir,type,prefix} of DIRS) {
    const folder = path.join(ROOT, dir);
    let files;
    try { files = fs.readdirSync(folder, {withFileTypes:true}); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    for (const entry of files) {
      if (!entry.isFile()) continue;
      const m = SAFE_IMAGE.exec(entry.name);
      if (!m) continue;
      const num = Number(m[1]);
      if (!Number.isInteger(num) || num < 1 || num > 9999) continue;
      const id = `${prefix}${String(num).padStart(2,'0')}`;
      if (byId.has(id)) continue;
      const name = m[2].replace(/_/g,' ').replace(/\s+/g,' ').trim();
      byId.set(id, {
        id,type,name,
        image:`/assets/${dir}/${entry.name}`,
        previewOnly:true
      });
    }
  }
  return Array.from(byId.values()).sort((a,b)=> {
    const types = {normal:0,special:1,artifact:2};
    return (types[a.type]-types[b.type]) ||
      (Number(a.id.slice(1))-Number(b.id.slice(1))) || a.name.localeCompare(b.name,'de');
  });
}
module.exports={galleryCards};

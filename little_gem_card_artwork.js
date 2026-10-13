'use strict';
const fs=require('fs');
const path=require('path');

// Fully self-contained SVG card artwork. The original WebP is the background,
// and the obsolete printed Magic 8 is covered by the new printed 9 in the
// SAME parchment number panel. Browsers receive the completed artwork as one
// image, including in card galleries, hands and 3D inspection.
let cardSvg;
module.exports=function serveLittleGemMagic9(req,res){
  try{
    if(!cardSvg){
      const original=fs.readFileSync(path.join(__dirname,'public/assets/cards_new/095_Little_Gem.webp')).toString('base64');
      cardSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="1484" viewBox="0 0 1060 1484">
<title>Little Gem - Magie 9</title>
<defs>
 <linearGradient id="paper" x1="0" y1="0" x2=".6" y2="1">
  <stop stop-color="#fff8cf"/><stop offset=".46" stop-color="#fff0bd"/><stop offset="1" stop-color="#ffe6ae"/>
 </linearGradient>
</defs>
<image href="data:image/webp;base64,${original}" x="0" y="0" width="1060" height="1484"/>
<!-- The old printed 8 is completely concealed by matching paper artwork. -->
<path d="M210 1252 Q257 1240 298 1253 L299 1360 Q260 1372 211 1362Z" fill="url(#paper)"/>
<text x="254" y="1348" font-family="Georgia,'Times New Roman',serif" font-size="99" font-weight="bold" fill="#591508" text-anchor="middle">9</text>
</svg>`;
    }
    res.set('Content-Type','image/svg+xml; charset=utf-8');
    res.set('Cache-Control','public, max-age=3600');
    res.send(cardSvg);
  }catch(err){
    console.error('[MLP] Little-Gem-Kartenbild:',err);
    res.status(500).type('text/plain').send('Kartenbild nicht verfügbar');
  }
};

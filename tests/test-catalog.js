'use strict';
const fs=require('fs');const path=require('path');const assert=require('assert');
const code=fs.readFileSync(path.join(__dirname,'../public/client.js'),'utf8');
const server=fs.readFileSync(path.join(__dirname,'../server.js'),'utf8');
const {ITEMS,FRAMES,STARTER_ITEMS,STARTER_FRAMES}=require('../player_profiles.js');
const extract=(prefix,end)=>{let start=code.indexOf(prefix);assert(start>=0,prefix);start+=prefix.length;let finish=code.indexOf(end,start);assert(finish>=0,end);return Function('return ('+code.slice(start,finish).trim()+')')()};
const accessories=extract('const ACCESSORIES=',';\n\nconst NEW_ITEMS=');
const newItems=extract('const NEW_ITEMS=',';\nconst ITEMS=');
const frames=extract('const FRAMES=',';\nconst FRAME_KEYS=');
assert.deepStrictEqual(new Set(ITEMS),new Set([...Object.keys(accessories),...Object.keys(newItems).map(x=>'item_'+x)]));
assert.deepStrictEqual(new Set(FRAMES),new Set(Object.keys(frames)));
for(const k of STARTER_ITEMS)assert(ITEMS.includes(k));
for(const k of STARTER_FRAMES)assert(FRAMES.includes(k));
for(const fragment of ["source.effect==='chrysalis'","cockatrice","finishRoundCycle","startRound"])
  assert(server.includes(fragment),'Existing game element should remain: '+fragment);
console.log('OK: 3 Sammlungs-Checks; Chrysalis/Cockatrice und Spielablauf in den Sourcen erhalten');

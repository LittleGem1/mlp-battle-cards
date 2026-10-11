'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'server.js'),'utf8');
const {normal,specials,artifacts,byId}=require(path.join(root,'cards.js'));
function functionSource(name){
  const needle='function '+name+'(';let start=src.indexOf(needle);
  assert.ok(start>=0,'Funktion fehlt: '+name);
  const brace=src.indexOf('{',start);let depth=0,finish=0;
  for(let i=brace;i<src.length;i++){
    if(src[i]==='{')depth++;
    if(src[i]==='}'&&!--depth){finish=i;break;}
  }
  assert.ok(finish>brace,'Funktionskörper unvollständig');
  return src.slice(start,finish+1);
}
const events=[];
const io={to(code){return {emit(name,data){events.push({code,name,data})}}}};
const sandbox={io,byId,roomPlayers:r=>[...r.players.values()],console};
const names=['availableTargets','artifactMagicOptions','applyArtifactMagic'];
for(const name of names) vm.runInNewContext(functionSource(name),sandbox);
assert.equal(normal.length,75);
assert.equal(specials.length,37);
assert.equal(artifacts.length,3);
assert.equal(specials.filter(x=>x.effect==='artifactcopy').length,1);
assert.equal(specials.filter(x=>x.effect==='artifactsteal').length,1);
assert.ok(byId.s95?.effect==='shadowform');
const person=(id,owned=[])=>({id,name:id,hand:['n01'],artifacts:[...owned],surrendered:false});
const game=(caster,target)=>({code:'TEST',players:new Map([[caster.id,caster],[target.id,target]])});
// Copy: both keep artifact – no physical transfer, one new copy.
{
 const p=person('owner'),t=person('opponent',['a01','a02']),r=game(p,t);
 assert.equal(sandbox.availableTargets(r,p,'artifact_new').length,1);
 assert.equal(sandbox.applyArtifactMagic(r,p,t,'a01','artifactcopy'),true);
 assert.deepEqual(p.artifacts,['a01']);
 assert.deepEqual(t.artifacts,['a01','a02']);
 assert.equal(events.at(-1).name,'artifactMagicAnimation');
 assert.equal(events.at(-1).data.action,'artifactcopy');
 // Duplicates strictly forbidden
 assert.equal(sandbox.applyArtifactMagic(r,p,t,'a01','artifactcopy'),false);
}
// Steal: receiver gets one, donor loses one, unrelated state untouched.
{
 const p=person('owner',['a01']),t=person('opponent',['a02','a03']),r=game(p,t);
 assert.equal(sandbox.applyArtifactMagic(r,p,t,'a03','artifactsteal'),true);
 assert.deepEqual(p.artifacts,['a01','a03']);
 assert.deepEqual(t.artifacts,['a02']);
 assert.deepEqual(p.hand,['n01']);assert.deepEqual(t.hand,['n01']);
 assert.equal(events.at(-1).data.action,'artifactsteal');
 assert.equal(events.at(-1).data.artifact.id,'a03');
}
// Invalid targets / owned artifacts cannot create or remove cards.
{
 const p=person('owner',['a01','a02']),t=person('opponent',['a01']),r=game(p,t);
 assert.equal(sandbox.availableTargets(r,p,'artifact_new').length,0);
 assert.equal(sandbox.applyArtifactMagic(r,p,t,'a01','artifactsteal'),false);
 assert.equal(sandbox.applyArtifactMagic(r,p,p,'a03','artifactsteal'),false);
 assert.deepEqual(t.artifacts,['a01']);
}
// Winner condition is based on all distinct known artifacts (existing server logic).
{
 const p=person('owner',['a01','a02']),t=person('opponent',['a03']),r=game(p,t);
 assert.equal(sandbox.applyArtifactMagic(r,p,t,'a03','artifactcopy'),true);
 assert.equal(new Set(p.artifacts).size,artifacts.length);
}
// The 2nd selection server-side validates both choice list and actual ownership.
assert.match(src,/pending\.choices\?\.includes\(cardId\)\|\|!applyArtifactMagic/);
assert.match(src,/socket\.on\('specialCardChoice'/);
assert.match(src,/if\(action==='artifactmagic-card'\)/);
console.log('✔ Zauberkopierer, Zauberklau, Zielwahl, Duplikatschutz und Kartendaten getestet');

'use strict';
const assert=require('assert');
const Module=require('module');
const path=require('path');
const actualLoad=Module._load;
let staticConfig;
Module._load=function(name, parent, isMain){
  if(name==='express') return {static:(root, options)=>{staticConfig={root,options}; return ()=>{};}};
  return actualLoad.apply(this,arguments);
};
let setup;
try{setup=require('./asset_bandwidth_optimization.js');}
finally{Module._load=actualLoad;}
const routes=[];
setup({use:(url,fn)=>routes.push({url,fn})});
assert.equal(routes.length,2);
assert.equal(routes[0].url,'/assets');
assert.equal(routes[1].url,'/assets');
assert.equal(staticConfig.options.maxAge,'3h');
function doReq(uri,accept,method='GET'){
 const result={method,uri,accept,headers:{},calledNext:false,served:false,kind:null,options:null};
 const req={path:uri,method,headers:{accept}};
 const res={
   headersSent:false,
   vary(value){result.headers['Vary']=value;},
   type(value){result.kind=value;},
   setHeader(n,v){result.headers[n]=v;},
   sendFile(file,options,cb){result.served=true;result.file=file;result.options=options;},
 };
 routes[0].fn(req,res,()=>{result.calledNext=true;});
 return result;
}
const modern=doReq('/backgrounds/arena_2_forest.png','image/avif,image/webp,image/apng,image/*,*/*');
assert(modern.served); assert(modern.file.endsWith('arena_2_forest.png.webp'));
assert(modern.headers['Vary']==='Accept');
assert(modern.headers['Cache-Control'].includes('10800'));
assert(modern.options.maxAge==='3h');
assert(modern.kind==='webp');
const oldBrowser=doReq('/backgrounds/arena_2_forest.png','image/png');
assert(oldBrowser.calledNext && !oldBrowser.served);
assert(oldBrowser.headers['Vary']==='Accept');
const notConverted=doReq('/backgrounds/arena_2_blaetter_overlay.webp','image/webp');
assert(notConverted.calledNext && !notConverted.served);
const missing=doReq('/new_collection/108_Test.png','image/webp');
assert(missing.calledNext && !missing.served);
const traversal=doReq('/../../file.png','image/webp');
assert(traversal.calledNext && !traversal.served);
const post=doReq('/backgrounds/arena_2_forest.png','image/webp','POST');
assert(post.calledNext && !post.served);
console.log('PASS: modern WebP, PNG fallback, existing animations, missing variants, path traversal, POST, MIME/Vary/cache, 3-hour TTL');

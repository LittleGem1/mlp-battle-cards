(()=>{'use strict';
const FILE='/assets/new_specials/helements_ingame.html';let current=null,queued=new Map(),last=null;
function display(e){current?.remove();const root=document.createElement('div');root.id='armory-original-overlay';const iframe=document.createElement('iframe');iframe.title='Helements Originalanimation';iframe.src=FILE;iframe.setAttribute('allow','autoplay');root.append(iframe);document.body.append(root);current=root;last={playerId:e.playerId,iframe};
iframe.addEventListener('load',()=>iframe.contentWindow?.postMessage({type:'armory-start',artifact:queued.get(e.playerId)||null},location.origin),{once:true});
setTimeout(()=>{if(current===root){root.remove();current=null}},11000)}
function attach(){if(typeof socket==='undefined'||!socket?.on){setTimeout(attach,250);return;}
socket.on('helementsArtifactGranted',e=>{queued.set(e.playerId,e.artifact);if(last?.playerId===e.playerId)last.iframe.contentWindow?.postMessage({type:'armory-artifact',artifact:e.artifact},location.origin)});
socket.on('specialPlayed',e=>{if(e?.card?.effect==='helementsarmory')display(e)});
}attach();window.previewHelementsOriginal=()=>display({playerId:'preview'});
})();
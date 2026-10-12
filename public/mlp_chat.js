(()=>{
'use strict';
if(typeof socket==='undefined'||!socket?.on)return;
const dock=document.createElement('div');dock.id='mlpChatDock';dock.hidden=true;
dock.innerHTML=`<section id="mlpChatPanel" role="region" aria-label="Spielerchat"><div id="mlpChatHeader"><span>💬 Spielerchat</span><button id="mlpChatClose" type="button" aria-label="Chat schließen">×</button></div><div id="mlpChatMessages" role="log" aria-live="polite"></div><form id="mlpChatForm"><input id="mlpChatInput" maxlength="300" placeholder="Nachricht schreiben …" autocomplete="off" aria-label="Chatnachricht"><button id="mlpChatSend" type="submit">Senden</button></form><div id="mlpChatError"></div></section><button id="mlpChatToggle" type="button" aria-expanded="false">💬 Chat <span id="mlpChatBadge">0</span></button>`;
document.body.appendChild(dock);
const $=sel=>dock.querySelector(sel), panel=$('#mlpChatPanel'), log=$('#mlpChatMessages'), form=$('#mlpChatForm'), input=$('#mlpChatInput'), error=$('#mlpChatError');
let code=null,unread=0,me=null; const shown=new Set();
function close(){dock.classList.remove('open');$('#mlpChatToggle').setAttribute('aria-expanded','false')}
function open(){dock.classList.add('open');$('#mlpChatToggle').setAttribute('aria-expanded','true');unread=0;badge();input.focus();log.scrollTop=log.scrollHeight}
function badge(){dock.classList.toggle('unread',unread>0);$('#mlpChatBadge').textContent=unread>99?'99+':String(unread)}
function reset(){code=null;me=null;dock.hidden=true;close();log.replaceChildren();shown.clear();unread=0;badge()}
function showMessage(m){if(!code||!m||typeof m.text!=='string'||!m.id||shown.has(m.id))return;
 shown.add(m.id);const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80;
 const el=document.createElement('div');el.className='mlp-chat-entry'+(m.playerId===me?' self':'');
 const who=document.createElement('div');who.className='who';who.textContent=m.name||'Spieler';
 const when=document.createElement('span');when.className='when';when.textContent=new Date(m.at).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});who.appendChild(when);
 const body=document.createElement('div');body.textContent=m.text;el.append(who,body);log.appendChild(el);
 while(log.children.length>40)log.firstElementChild.remove();
 if(dock.classList.contains('open')||nearBottom)log.scrollTop=log.scrollHeight;
 if(!dock.classList.contains('open')&&m.playerId!==me){unread++;badge()}
}
$('#mlpChatToggle').addEventListener('click',()=>dock.classList.contains('open')?close():open());
$('#mlpChatClose').addEventListener('click',close);
form.addEventListener('submit',e=>{e.preventDefault();const text=input.value.trim();if(!text||!code)return;socket.emit('chatSend',{text});input.value='';error.textContent=''});
socket.on('roomState',s=>{
 if(!s?.code){reset();return}
 if(code!==s.code){code=s.code;log.replaceChildren();shown.clear();unread=0;badge();socket.emit('chatHistoryRequest')}
 dock.hidden=false; me=socket.id;
});
socket.on('chatHistory',data=>{if(!data||data.code!==code)return;for(const m of data.messages||[])showMessage(m);unread=0;badge()});
socket.on('chatMessage',showMessage);
socket.on('chatError',message=>{error.textContent=String(message||'Nachricht konnte nicht gesendet werden.')});
socket.on('roomLeft',reset);
socket.on('roomTakenOver',reset);
socket.on('disconnect',()=>{error.textContent='Verbindung unterbrochen – bitte warten.'});
socket.on('connect',()=>{error.textContent='';if(code)socket.emit('chatHistoryRequest')});
})();

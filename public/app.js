import {CATALOG} from '/shared/catalog.js';
import {WEAPONS} from '/shared/weapons.js';
import {render} from './renderer.js';
import {bindUI,updateUI,toast} from './ui.js';
import {updateProfileUI} from './profile-ui.js';
import {createAudio} from './audio.js';
const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d');
const storage={getItem(key){try{return localStorage.getItem(key);}catch{return null;}},setItem(key,value){try{localStorage.setItem(key,value);}catch{}},removeItem(key){try{localStorage.removeItem(key);}catch{}}};
const audio=createAudio({storage});
let socket,state=null,previous=null,received=0,retryTimer=null,retries=0,session=null,pendingBuild=null,profile=null;
const ui={playerId:null,selectedType:null,selectedId:null,selectionVersion:0,pointer:null,effects:Number(storage.getItem('outpost-effects')??1),filter:'all'};
let zoom=1,pan={x:0,y:0},gesture=null;
const roomId=new URL(location.href).searchParams.get('room');
function readSession(id){try{return JSON.parse(storage.getItem(`outpost:${id}`)||sessionStorage.getItem(`outpost:${id}`));}catch{return null;}}
function setConnection(connected){$('connection').replaceChildren();const dot=document.createElement('i');$('connection').append(dot,connected?' 연결됨':' 재연결 중…');}
function raw(message){if(socket?.readyState!==WebSocket.OPEN){toast('서버 연결을 확인해 주세요. npm start 창을 켜두세요.');return false;}socket.send(JSON.stringify(message));return true;}
function send(action){if(!ui.playerId){toast('먼저 방에 입장해 주세요.');return;}raw({type:'action',action});}
function applyProfile(p){if(profile&&p.owned.length>profile.owned.length)audio.play('purchase');profile=p;updateProfileUI(p,!!state&&!state.outcome);}
function refresh(){if(state){updateUI(state,ui);updateProfileUI(profile,!state.outcome);}}
function showLobby(){if(session?.roomId)storage.removeItem(`outpost:${session.roomId}`);session=null;state=null;previous=null;pendingBuild=null;ui.playerId=null;ui.selectedType=null;ui.selectedId=null;$('lobby').hidden=false;$('game').hidden=true;document.body.classList.remove('in-game');const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);$('room-code').value='';$('join-error').textContent='';$('join-button').disabled=false;updateProfileUI(profile,false);void audio.suspend();}
async function enableAudio(){const enabled=await audio.unlock();$('sound-enable').textContent=enabled?'소리 활성':'소리 다시 켜기';return enabled;}
function connect(info=null){
 clearTimeout(retryTimer);if(socket){socket.onclose=null;socket.onmessage=null;socket.close();}session=info;if(info){$('join-button').disabled=true;$('join-error').textContent='';}
 const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);socket=ws;let joinSent=false;
 ws.onopen=()=>raw({type:'hello',profileToken:storage.getItem('outpost-profile-token')||undefined});
 ws.onmessage=event=>{if(socket!==ws)return;let m;try{m=JSON.parse(event.data);}catch{return;}
  if(m.type==='profile'){
   if(m.token)storage.setItem('outpost-profile-token',m.token);applyProfile(m.profile);$('reset-profile').hidden=true;
   if(info&&!joinSent){joinSent=true;raw({type:'join',nickname:info.nickname,roomId:info.roomId||undefined,token:info.token||undefined});}
  }else if(m.type==='joined'){
   ui.playerId=m.playerId;session={...info,autoStart:false,roomId:m.roomId,token:m.token,roomCode:m.roomCode};if(m.roomCode)storage.setItem(`outpost-code:${m.roomCode}`,m.roomId);$('room-code-display').textContent=m.roomCode||'1인';storage.setItem(`outpost:${m.roomId}`,JSON.stringify(session));storage.setItem('outpost-name',info.nickname);
   const url=new URL(location.href);url.searchParams.set('room',m.roomId);history.replaceState(null,'',url);$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add('in-game');retries=0;setConnection(true);resize();if(info.autoStart)send({type:'start'});
  }else if(m.type==='state'){
   if(!ui.playerId)return;const first=!state;previous=state;state=m.state;received=performance.now();audio.update(state,first);
   if(pendingBuild){const f=state.facilities.find(f=>f.owner===ui.playerId&&Math.hypot(f.x-pendingBuild.x,f.y-pendingBuild.y)<2);if(f){if(ui.selectionVersion===pendingBuild.version){ui.selectedId=f.id;ui.selectedType=null;}pendingBuild=null;}}
   if(ui.selectedId&&!state.facilities.some(f=>f.id===ui.selectedId))ui.selectedId=null;refresh();
  }else if(m.type==='error'){
   pendingBuild=null;$('join-button').disabled=false;
   if(m.scope==='profile'){$('join-error').textContent=m.message;$('reset-profile').hidden=false;return;}
   if(!ui.playerId){$('join-error').textContent=m.message;
    if(info?.token&&m.message.includes('이미 접속')&&retries++<5){ws.onclose=null;ws.close();retryTimer=setTimeout(()=>connect(info),700);return;}
    if(info?.token&&!m.message.includes('이미 접속')){storage.removeItem(`outpost:${info.roomId}`);sessionStorage.removeItem(`outpost:${info.roomId}`);ws.onclose=null;ws.close();showLobby();$('join-error').textContent=m.message;return;}
   }toast(m.message);
  }
 };
 ws.onclose=()=>{if(socket!==ws)return;setConnection(false);$('join-button').disabled=false;if(session?.token&&!$('game').hidden){ui.playerId=null;retryTimer=setTimeout(()=>connect(session),Math.min(5000,500+retries++*500));}};
 ws.onerror=()=>{$('join-error').textContent='서버에 연결할 수 없습니다. npm start 창을 켜둔 뒤 다시 시작해 주세요.';$('join-button').disabled=false;};
}
$('nickname').value=storage.getItem('outpost-name')||'';
if(roomId)$('join-note').textContent='초대받은 방입니다. 참가하려면 작전 시작, 새 게임은 혼자 새 방 시작을 누르세요.';
$('join-form').onsubmit=e=>{e.preventDefault();const nickname=$('nickname').value.trim();if(!nickname)return;void enableAudio();const target=$('room-code').value.trim()||new URL(location.href).searchParams.get('room')||undefined,canonical=target?(storage.getItem(`outpost-code:${target}`)||target):null,saved=canonical?readSession(canonical):null;connect({nickname,roomId:saved?.roomId||target,token:saved?.token||undefined});};
$('open-guide-lobby').onclick=()=>$('guide-dialog').showModal();$('open-guide').onclick=()=>$('guide-dialog').showModal();$('close-guide').onclick=()=>$('guide-dialog').close();
$('weapon-upgrade').onclick=()=>send({type:'upgradeWeapon'});
$('new-solo').onclick=()=>{const nickname=$('nickname').value.trim();if(!nickname){$('join-error').textContent='닉네임을 먼저 입력해 주세요.';$('nickname').focus();return;}void enableAudio();const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);$('room-code').value='';connect({nickname,autoStart:true});};
$('reset-profile').onclick=()=>{storage.removeItem('outpost-profile-token');connect();};
$('return-lobby').onclick=()=>{raw({type:'leave'});showLobby();};
for(const id of ['open-shop','open-shop-game'])$(id).onclick=()=>{updateProfileUI(profile,!!state&&!state.outcome);$('profile-dialog').showModal();};
$('close-shop').onclick=()=>$('profile-dialog').close();
$('inventory-list').onclick=e=>{void enableAudio();const purchase=e.target.closest('[data-purchase]'),equip=e.target.closest('[data-equip]');if(purchase&&!purchase.disabled)raw({type:'purchase',tower:purchase.dataset.purchase});if(equip&&!equip.disabled&&profile){const id=equip.dataset.equip,ids=profile.equipped.includes(id)?profile.equipped.filter(v=>v!==id):[...profile.equipped,id];raw({type:'equip',ids});}};
bindUI({send,onSelection:selection=>{ui.selectionVersion++;ui.selectedType=selection.type;ui.selectedId=null;refresh();},onEffects:value=>{ui.effects=value;storage.setItem('outpost-effects',value);},onFilter:value=>{ui.filter=value;refresh();}});
$('effects').value=String(ui.effects);
for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>send({type:'speed',value:Number(b.dataset.speed)});
$('weapon-choice').onchange=()=>refresh();
$('weapon-buy').onclick=()=>{const weapon=$('weapon-choice').value,me=state?.players.find(p=>p.id===ui.playerId);send({type:me?.weapons.includes(weapon)?'selectWeapon':'buyWeapon',weapon});};
$('fire-toggle').onclick=()=>send({type:'toggleFire'});
$('nuke').onclick=()=>$('nuke-confirm').hidden=!$('nuke-confirm').hidden;
$('nuke-confirm').onclick=()=>{send({type:'nuke'});$('nuke-confirm').hidden=true;};
function audioControls(){$('music-volume').value=Math.round(audio.settings.music*100);$('sfx-volume').value=Math.round(audio.settings.effects*100);$('mute-sound').textContent=audio.settings.muted?'소리 복원':'음소거';$('mute-sound').setAttribute('aria-pressed',String(audio.settings.muted));}
$('music-volume').oninput=$('sfx-volume').oninput=()=>{audio.setVolumes(Number($('music-volume').value)/100,Number($('sfx-volume').value)/100);};
$('mute-sound').onclick=()=>{audio.setMuted(!audio.settings.muted);audioControls();};$('sound-enable').onclick=()=>void enableAudio();audioControls();
document.addEventListener('visibilitychange',()=>{if(document.hidden)void audio.suspend();else if(audio.state==='suspended'&&!audio.settings.muted)void enableAudio();});
addEventListener('pagehide',()=>void audio.dispose());
function resize(){const box=$('battlefield').getBoundingClientRect(),scale=Math.min(box.width/1200,box.height/720),w=1200*scale*zoom,h=720*scale*zoom;pan.x=Math.max(-Math.max(0,(w-box.width)/2),Math.min(Math.max(0,(w-box.width)/2),pan.x));pan.y=Math.max(-Math.max(0,(h-box.height)/2),Math.min(Math.max(0,(h-box.height)/2),pan.y));canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.style.flexShrink='0';canvas.style.transform=`translate(${pan.x}px,${pan.y}px)`;}
new ResizeObserver(resize).observe($('battlefield'));
function point(event){const b=canvas.getBoundingClientRect();return {x:(event.clientX-b.left)*1200/b.width,y:(event.clientY-b.top)*720/b.height};}
canvas.addEventListener('pointermove',e=>{ui.pointer=point(e);if(gesture&&e.pointerId===gesture.id){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)>6)gesture.moved=true;if(gesture.moved){pan.x=gesture.panX+dx;pan.y=gesture.panY+dy;resize();}}});
canvas.addEventListener('pointerleave',()=>{ui.pointer=null;});
canvas.addEventListener('pointerdown',e=>{if(!state||state.outcome)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y,moved:false};});
canvas.addEventListener('pointercancel',()=>{gesture=null;});
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const moved=gesture.moved;gesture=null;if(moved||!state||state.outcome)return;send({type:'gather'});const p=point(e),f=state.facilities.find(f=>Math.hypot(p.x-f.x,p.y-f.y)<25);
 if(f){ui.selectionVersion++;ui.selectedId=f.id;ui.selectedType=null;refresh();}else if(ui.selectedType){pendingBuild={...p,version:ui.selectionVersion};send({type:'build',facility:ui.selectedType,...p});}else{ui.selectionVersion++;ui.selectedId=null;refresh();}
});
$('zoom-in').onclick=()=>{zoom=Math.min(3,zoom+.5);resize();};$('zoom-out').onclick=()=>{zoom=Math.max(1,zoom-.5);resize();};$('zoom-reset').onclick=()=>{zoom=1;pan={x:0,y:0};resize();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.selectionVersion++;ui.selectedType=null;ui.selectedId=null;refresh();}});
$('room-copy').onclick=async()=>{const code=$('room-code-display').textContent;try{await navigator.clipboard.writeText(code);toast(`방 코드 ${code}를 복사했습니다.`);}catch{toast(`친구에게 방 코드 ${code}를 알려주세요.`);}};
$('share').onclick=async()=>{const url=location.href;try{if(navigator.share&&!navigator.webdriver){await navigator.share({title:'LAST OUTPOST · 좀비 협동 디펜스',text:`같이 방어선을 지켜줘! 최대 4인 협동 · 방 코드 ${session?.roomCode||''}`,url});toast('방 링크를 공유했습니다.');}else if(navigator.clipboard){await navigator.clipboard.writeText(`LAST OUTPOST · 방 코드 ${session?.roomCode||''}\n${url}`);toast('방 링크를 복사했습니다. 카톡에 붙여넣으세요.');}else toast(`방 링크: ${url}`);}catch(e){if(e.name!=='AbortError')toast(`주소창의 방 링크를 복사해 주세요: ${url}`);}};
function frame(now){if(state)render(ctx,state,previous,Math.min(1,(now-received)/100),ui);requestAnimationFrame(frame);}requestAnimationFrame(frame);
const saved=roomId?readSession(roomId):null;connect(saved?.token?saved:null);

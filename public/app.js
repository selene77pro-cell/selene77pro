import {CATALOG} from '/shared/catalog.js';
import {render} from './renderer.js';
import {bindUI,updateUI,toast} from './ui.js';
const $=id=>document.getElementById(id),canvas=$('battle'),ctx=canvas.getContext('2d');
let socket,state=null,previous=null,received=0,retryTimer=null,retries=0,session=null,pendingBuild=null;
const ui={playerId:null,selectedType:null,selectedId:null,pointer:null,effects:Number(localStorage.getItem('outpost-effects')??1),filter:'all'};
let zoom=1,pan={x:0,y:0},gesture=null;
const roomId=new URL(location.href).searchParams.get('room');
function readSession(id){try{return JSON.parse(sessionStorage.getItem(`outpost:${id}`));}catch{return null;}}
function setConnection(connected){$('connection').replaceChildren();const dot=document.createElement('i');$('connection').append(dot,connected?' 연결됨':' 재연결 중…');$('connection').classList.toggle('offline',!connected);}
function send(action){if(socket?.readyState!==WebSocket.OPEN||!ui.playerId){toast('연결을 확인하고 다시 시도해 주세요.');return;}socket.send(JSON.stringify({type:'action',action}));}
function connect(info){
 clearTimeout(retryTimer);session=info;$('join-button').disabled=true;$('join-error').textContent='';
 socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
 socket.onopen=()=>socket.send(JSON.stringify({type:'join',nickname:info.nickname,roomId:info.roomId||undefined,token:info.token||undefined}));
 socket.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}
  if(m.type==='joined'){
   ui.playerId=m.playerId;session={...info,roomId:m.roomId,token:m.token};sessionStorage.setItem(`outpost:${m.roomId}`,JSON.stringify(session));localStorage.setItem('outpost-name',info.nickname);
   const url=new URL(location.href);url.searchParams.set('room',m.roomId);history.replaceState(null,'',url);$('lobby').hidden=true;$('game').hidden=false;document.body.classList.add('in-game');retries=0;setConnection(true);resize();
  }else if(m.type==='state'){
   previous=state;state=m.state;received=performance.now();
   if(pendingBuild){const f=state.facilities.find(f=>f.owner===ui.playerId&&Math.hypot(f.x-pendingBuild.x,f.y-pendingBuild.y)<2);if(f){ui.selectedId=f.id;ui.selectedType=null;pendingBuild=null;}}
   if(ui.selectedId&&!state.facilities.some(f=>f.id===ui.selectedId))ui.selectedId=null;
   updateUI(state,ui);
  }else if(m.type==='error'){
   pendingBuild=null;
   if(!ui.playerId){$('join-button').disabled=false;$('join-error').textContent=m.message;
    if(info.token&&m.message.includes('이미 접속')&&retries++<5){socket.close();retryTimer=setTimeout(()=>connect(info),700);return;}
    if(info.token&&!m.message.includes('이미 접속')){sessionStorage.removeItem(`outpost:${info.roomId}`);session={roomId:info.roomId,nickname:info.nickname};socket.onclose=null;socket.close();$('lobby').hidden=false;$('game').hidden=true;document.body.classList.remove('in-game');return;}
   }toast(m.message);
  }
 };
 socket.onclose=()=>{setConnection(false);$('join-button').disabled=false;if(session?.token){ui.playerId=null;retryTimer=setTimeout(()=>connect(session),Math.min(5000,500+retries++*500));}};
 socket.onerror=()=>{$('join-error').textContent='서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';};
}
$('nickname').value=localStorage.getItem('outpost-name')||'';
if(roomId)$('join-note').textContent='초대받은 방입니다. 닉네임을 입력하면 함께 합류합니다.';
$('join-form').onsubmit=e=>{e.preventDefault();const nickname=$('nickname').value.trim();if(!nickname)return;socket?.close();connect({nickname,roomId:new URL(location.href).searchParams.get('room')||undefined});};
bindUI({send,onSelection:selection=>{ui.selectedType=selection.type;ui.selectedId=null;updateUI(state,ui);},onEffects:value=>{ui.effects=value;localStorage.setItem('outpost-effects',value);},onFilter:value=>{ui.filter=value;if(state)updateUI(state,ui);}});
$('effects').value=String(ui.effects);
function resize(){const box=$('battlefield').getBoundingClientRect(),scale=Math.min(box.width/1200,box.height/720);const w=1200*scale*zoom,h=720*scale*zoom;pan.x=Math.max(-Math.max(0,(w-box.width)/2),Math.min(Math.max(0,(w-box.width)/2),pan.x));pan.y=Math.max(-Math.max(0,(h-box.height)/2),Math.min(Math.max(0,(h-box.height)/2),pan.y));canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.style.flexShrink='0';canvas.style.transform=`translate(${pan.x}px,${pan.y}px)`;}
new ResizeObserver(resize).observe($('battlefield'));
function point(event){const b=canvas.getBoundingClientRect();return {x:(event.clientX-b.left)*1200/b.width,y:(event.clientY-b.top)*720/b.height};}
canvas.addEventListener('pointermove',e=>{ui.pointer=point(e);if(gesture&&e.pointerId===gesture.id){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)>6)gesture.moved=true;if(gesture.moved){pan.x=gesture.panX+dx;pan.y=gesture.panY+dy;resize();}}});
canvas.addEventListener('pointerleave',()=>{ui.pointer=null;});
canvas.addEventListener('pointerdown',e=>{if(!state||state.phase==='over')return;e.preventDefault();canvas.setPointerCapture(e.pointerId);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,panX:pan.x,panY:pan.y,moved:false};});
canvas.addEventListener('pointercancel',()=>{gesture=null;});
canvas.addEventListener('pointerup',e=>{if(!gesture||gesture.id!==e.pointerId)return;const moved=gesture.moved;gesture=null;if(moved||!state)return;const p=point(e),f=state.facilities.find(f=>Math.hypot(p.x-f.x,p.y-f.y)<25);
 if(f){ui.selectedId=f.id;ui.selectedType=null;updateUI(state,ui);}else if(ui.selectedType){pendingBuild=p;send({type:'build',facility:ui.selectedType,...p});}else{ui.selectedId=null;updateUI(state,ui);}
});
$('zoom-in').onclick=()=>{zoom=Math.min(3,zoom+.5);resize();};
$('zoom-out').onclick=()=>{zoom=Math.max(1,zoom-.5);resize();};
$('zoom-reset').onclick=()=>{zoom=1;pan={x:0,y:0};resize();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){ui.selectedType=null;ui.selectedId=null;if(state)updateUI(state,ui);}});
$('share').onclick=async()=>{const url=location.href;try{if(navigator.share&&!navigator.webdriver){await navigator.share({title:'LAST OUTPOST · 좀비 협동 디펜스',text:'같이 방어선을 지켜줘! 최대 4인 협동',url});toast('방 링크를 공유했습니다.');}else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast('방 링크를 복사했습니다. 카톡에 붙여넣으세요.');}else{toast(`방 링크: ${url}`);}}catch(e){if(e.name!=='AbortError')toast(`주소창의 방 링크를 복사해 주세요: ${url}`);}};
function frame(now){if(state)render(ctx,state,previous,Math.min(1,(now-received)/100),ui);requestAnimationFrame(frame);}requestAnimationFrame(frame);
if(roomId){const saved=readSession(roomId);if(saved?.token)connect(saved);}

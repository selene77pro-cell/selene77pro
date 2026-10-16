import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {WebSocketServer,WebSocket} from 'ws';
import {RoomManager} from './rooms.js';
import {command,snapshot} from './game.js';
import {advance} from './combat.js';
import {ProfileStore} from './profiles.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export function settlePending(room,store){for(const e of room.game.rewardEvents){if(e.status==='saved')continue;const token=Object.keys(store.records).find(key=>store.records[key].id===e.profileId);if(!token){e.error='프로필을 찾을 수 없습니다.';continue;}const result=store.settle(token,e.id,{pp:e.pp,clearedTier:e.clearedTier});if(result.ok){e.status='saved';delete e.error;}else e.error=result.error;}}
export function createServer({dataDirectory=null,profileStore,roomManager,port=Number(process.env.PORT)||3000,host=process.env.HOST||'0.0.0.0'}={}){
 const rooms=roomManager||new RoomManager(),profiles=profileStore||new ProfileStore({directory:dataDirectory});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self' ws: wss:; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let path;try{path=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch{res.writeHead(400);res.end();return;}
  if(path==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
  const dir=path.startsWith('/shared/')?'shared':'public',base=resolve(root,dir),relative=dir==='shared'?path.slice(8):path==='/'?'index.html':path.slice(1),file=resolve(base,relative);
  if(!file.startsWith(base+sep)){res.writeHead(404);res.end();return;}
  try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('Not found');}
 });
 const wss=new WebSocketServer({server,maxPayload:4096});wss.on('error',()=>{});const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<500000)ws.send(JSON.stringify(data));};
 wss.on('connection',(ws,req)=>{
  // Same-origin browsers only; native clients without Origin remain useful for integration checks.
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host){ws.close(1008,'Origin rejected');return;}}catch{ws.close(1008);return;}}
  let auth=null,joined=null,windowStart=Date.now(),messages=0,alive=true;const joinDeadline=setTimeout(()=>{if(!joined&&!auth)ws.close(1008,'Join timeout');},15000);joinDeadline.unref();
  ws.on('pong',()=>{alive=true;});ws.checkAlive=()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();};
  ws.on('error',()=>{});
  ws.on('message',raw=>{if(Date.now()-windowStart>1000){windowStart=Date.now();messages=0;}if(++messages>25){ws.close(1008,'Too many requests');return;}
   let m;try{m=JSON.parse(raw);}catch{send(ws,{type:'error',message:'요청 형식이 잘못되었습니다.'});return;}
   if(!m||typeof m!=='object'){send(ws,{type:'error',message:'잘못된 요청입니다.'});return;}
   if(m.type==='hello'&&!joined){try{auth=profiles.open(m.profileToken);ws.profileId=auth.profile.id;send(ws,{type:'profile',...auth});}catch(e){send(ws,{type:'error',scope:'profile',message:e.message});}return;}
   if(['purchase','equip'].includes(m.type)){
    if(!auth){send(ws,{type:'error',message:'프로필 연결을 먼저 확인해 주세요.'});return;}
    if(m.type==='equip'&&[...rooms.rooms.values()].some(r=>!r.game.outcome&&Object.values(r.game.players).some(p=>p.profileId===auth.profile.id))){send(ws,{type:'error',message:'장착 변경은 전투 종료 후 다음 게임에 적용할 수 있습니다.'});return;}
    const result=m.type==='purchase'?profiles.purchase(auth.token,m.tower):profiles.equip(auth.token,m.ids);if(result.ok){auth.profile=result.profile;send(ws,{type:'profile',profile:result.profile});}else send(ws,{type:'error',message:result.error});return;
   }
   if(m.type==='join'&&!joined){
    try{if(!auth){const old=[...rooms.rooms.values()].find(r=>(r.id===m.roomId||r.code===m.roomId)&&r.sessions.has(m.token));const oldToken=old?.sessions.get(m.token)?.profileToken;auth=profiles.open(oldToken);ws.profileId=auth.profile.id;send(ws,{type:'profile',...auth});}else auth=profiles.open(auth.token);}catch(e){send(ws,{type:'error',scope:'profile',message:e.message});return;}
    if(m.token){const old=[...rooms.rooms.values()].find(r=>(r.id===m.roomId||r.code===m.roomId)&&r.sessions.has(m.token));const oldSession=old?.sessions.get(m.token);if(oldSession?.profileToken&&oldSession.profileToken!==auth.token){send(ws,{type:'error',message:'이 프로필의 재접속 정보가 아닙니다.'});return;}}
    const result=rooms.join({...m,profile:auth.profile});if(!result.ok){send(ws,{type:'error',message:result.error});return;}joined=result;result.room.sessions.get(result.token).profileToken=auth.token;ws.roomId=result.room.id;clearTimeout(joinDeadline);send(ws,{type:'joined',roomId:result.room.id,roomCode:result.room.code,playerId:result.playerId,token:result.token});send(ws,{type:'state',state:snapshot(result.room.game)});
   }
   else if(m.type==='action'&&joined){const result=command(joined.room.game,joined.playerId,m.action);if(!result.ok)send(ws,{type:'error',message:result.error});}
   else send(ws,{type:'error',message:'먼저 방에 입장해 주세요.'});
  });
  ws.on('close',()=>{clearTimeout(joinDeadline);if(joined)rooms.disconnect(joined.room.id,joined.playerId);});
 });
 let frame=0;const loop=setInterval(()=>{rooms.sweep();for(const r of rooms.rooms.values()){if(Object.values(r.game.players).some(p=>p.connected))advance(r.game,.05);if(!r.nextSettleRetry||Date.now()>=r.nextSettleRetry){const pending=r.game.rewardEvents.filter(e=>e.status!=='saved');if(pending.length){settlePending(r,profiles);r.nextSettleRetry=Date.now()+1000;for(const ws of wss.clients){if(ws.profileId&&pending.some(e=>e.profileId===ws.profileId)){const token=Object.keys(profiles.records).find(key=>profiles.records[key].id===ws.profileId);if(token)send(ws,{type:'profile',profile:profiles.open(token).profile});}}}}}if(++frame%2===0){for(const ws of wss.clients){const r=rooms.rooms.get(ws.roomId);if(r)send(ws,{type:'state',state:snapshot(r.game)});}}},50);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients)ws.checkAlive?.();},30000);heartbeat.unref();
 return {listen:()=>new Promise((r,j)=>{server.once('error',j);server.listen(port,host,()=>{server.removeListener('error',j);r();});}),address:()=>server.address(),close:()=>new Promise(r=>{clearInterval(loop);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close();server.close(r);server.closeAllConnections();})};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const app=createServer({dataDirectory:process.env.OUTPOST_DATA_DIR||resolve(root,'data')});app.listen().then(()=>console.log(`LAST OUTPOST listening on port ${app.address().port}`)).catch(e=>{console.error(e.message);process.exitCode=1;});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));}

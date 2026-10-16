import {test} from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import {createServer} from '../server/index.js';
import {RoomManager} from '../server/rooms.js';
function inbox(ws){const queue=[],waiters=[];ws.on('message',raw=>{const m=JSON.parse(raw);queue.push(m);for(const w of [...waiters])if(w.p(m)){clearTimeout(w.t);waiters.splice(waiters.indexOf(w),1);w.resolve(m);}});return p=>{const existing=queue.find(p);if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const w={p,resolve,t:setTimeout(()=>reject(Error('message timeout')),3000)};waiters.push(w);});};}
async function client(url){const ws=new WebSocket(url),wait=inbox(ws);await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});return {ws,wait,send:m=>ws.send(JSON.stringify(m))};}
test('real clients play solo, share state, reject foreign upgrade and reconnect',async t=>{
 const server=createServer({port:0,host:'127.0.0.1'});await server.listen();t.after(()=>server.close());
 const url=`ws://127.0.0.1:${server.address().port}`,a=await client(url);a.send({type:'join',nickname:'하나'});
 const joined=await a.wait(m=>m.type==='joined');assert.ok(joined.token);
 a.send({type:'action',action:{type:'build',facility:'gun',x:100,y:100}});a.send({type:'action',action:{type:'start'}});
 const first=await a.wait(m=>m.type==='state'&&m.state.phase==='prep'&&m.state.facilities.length===1);assert.equal(first.state.players[0].money,550);
 const b=await client(url);b.send({type:'join',roomId:joined.roomId,nickname:'둘'});await b.wait(m=>m.type==='joined');
 const state=await b.wait(m=>m.type==='state'&&m.state.players.length===2);assert.equal(state.state.facilities[0].owner,joined.playerId);assert.ok(!JSON.stringify(state).includes(joined.token));
 b.send({type:'action',action:{type:'upgrade',id:state.state.facilities[0].id}});await b.wait(m=>m.type==='error');
 a.ws.close();await new Promise(r=>a.ws.once('close',r));
 const c=await client(url);c.send({type:'join',roomId:joined.roomId,nickname:'재접속',token:joined.token});
 const resumed=await c.wait(m=>m.type==='joined');assert.equal(resumed.playerId,joined.playerId);const restored=await c.wait(m=>m.type==='state');assert.equal(restored.state.players.find(p=>p.id===joined.playerId).money,550);
 b.ws.close();c.ws.close();
});
test('room capacity, expiring reconnect, invalid token and snapshot privacy',()=>{
 let now=0;const rm=new RoomManager({now:()=>now});const a=rm.join({nickname:'a'});assert.ok(a.ok);
 assert.equal(rm.join({roomId:a.room.id,nickname:'x',token:'fake'}).ok,false);
 for(let i=0;i<3;i++)assert.equal(rm.join({roomId:a.room.id,nickname:String(i)}).ok,true);
 assert.equal(rm.join({roomId:a.room.id,nickname:'5'}).ok,false);
 rm.disconnect(a.room.id,a.playerId);now=120001;rm.sweep();assert.equal(rm.join({roomId:a.room.id,nickname:'a',token:a.token}).ok,false);
 assert.equal(rm.join({roomId:a.room.id,nickname:'new'}).ok,true);
});
test('HTTP static boundaries and malformed / oversized socket messages',async t=>{
 const s=createServer({port:0,host:'127.0.0.1'});await s.listen();t.after(()=>s.close());const port=s.address().port;
 assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status,200);
 assert.equal((await fetch(`http://127.0.0.1:${port}/server/game.js`)).status,404);
 const a=await client(`ws://127.0.0.1:${port}`);a.ws.send('{');await a.wait(m=>m.type==='error');a.send({type:'join',nickname:'정상'});await a.wait(m=>m.type==='joined');
 const closed=new Promise(r=>a.ws.once('close',r));a.ws.send('x'.repeat(5000));await closed;
});

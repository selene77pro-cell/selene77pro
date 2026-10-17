import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,addPlayer,command,snapshot} from '../server/game.js';
import {tick,spawnEnemy,damageEnemy,finishWave} from '../server/combat.js';
import {statsFor} from '../shared/catalog.js';
function setup(){let g=createGame();addPlayer(g,'a','가');addPlayer(g,'b','나');g.phase='wave';g.wave=1;g.pending=99;g.spawnTimer=1000;return g;}
test('damage rewards actual contributing players and counts kills',()=>{
 const g=setup(),e=spawnEnemy(g);e.hp=e.maxHp=100;const a=g.players.a.money,b=g.players.b.money;
 damageEnemy(g,e,25,'a');damageEnemy(g,e,75,'b');assert.equal(e.hp,0);assert.equal(g.kills,1);
 assert.ok(g.players.a.money>a);assert.ok(g.players.b.money-b>g.players.a.money-a);
 damageEnemy(g,e,100,'a');assert.equal(g.kills,1);
});
test('escaped enemies reduce shared health and zero ends game',()=>{
 const g=setup();g.baseHp=1;const e=spawnEnemy(g);e.progress=100000;tick(g,.1);assert.equal(g.baseHp,0);assert.equal(g.phase,'over');
});
test('bank pays owner once on wave completion and unlocks after milestone',()=>{
 const g=setup();g.wave=5;command(g,'a',{type:'build',facility:'bank',x:100,y:100});
 const a=g.players.a.money,b=g.players.b.money;finishWave(g);
 assert.equal(g.players.a.money-a-(g.players.b.money-b),statsFor(g.facilities[0]).income);
 const after=g.players.a.money;finishWave(g);assert.equal(g.players.a.money,after);
 assert.equal(g.completedWave,5);assert.equal(command(g,'b',{type:'build',facility:'frost',x:180,y:100}).ok,true);
});
test('map boss every ten waves, distinct abilities and exact one-time refund',()=>{
 const g=setup();g.wave=6;g.players.a.money=10000;
 command(g,'a',{type:'build',facility:'gun',x:100,y:100});const f=g.facilities[0];command(g,'a',{type:'upgrade',id:f.id});
 const invested=f.invested,cash=g.players.a.money,other=g.players.b.money;
 const boss=spawnEnemy(g,true);assert.equal(boss.boss,true);assert.ok(boss.ability);
 g.enemies=[];g.soldiers=[{id:'s'}];finishWave(g);
 assert.equal(g.mapIndex,1);assert.equal(g.completedWave,6);assert.equal(g.wave,6);
 assert.equal(g.players.a.money-cash-(g.players.b.money-other),invested);
 assert.equal(g.facilities.length,0);assert.equal(g.soldiers.length,0);
 const money=g.players.a.money;finishWave(g);assert.equal(g.players.a.money,money);
 const n=setup();n.wave=10;n.phase='prep';n.timer=0;tick(n,.1);assert.equal(n.enemies.filter(e=>e.boss).length,0);
 // wave 11 is not a boss; entering wave 10 is.
 n.phase='prep';n.wave=9;n.timer=0;tick(n,.1);assert.equal(n.enemies.filter(e=>e.boss).length,1);
});
test('soldiers spawn automatically with per-facility cap and upgraded health',()=>{
 const g=setup();command(g,'a',{type:'build',facility:'barracks',x:100,y:100});
 for(let i=0;i<10;i++){g.facilities[0].cooldown=0;tick(g,.1);}assert.ok(g.soldiers.length>0);assert.ok(g.soldiers.length<=4);
 assert.ok(g.soldiers[0].hp>0);assert.ok(!JSON.stringify(snapshot(g)).includes('contributions'));
});
test('support bonuses do not stack and medic heals soldiers',()=>{
 const g=setup();g.completedWave=30;g.players.a.money=10000;
 for(const [facility,x,y] of [['gun',100,100],['supply',160,100],['supply',100,160],['medic',160,160]])assert.equal(command(g,'a',{type:'build',facility,x,y}).ok,true);
 const e=spawnEnemy(g);e.x=130;e.y=110;e.progress=0;e.hp=e.maxHp=1000;e.speed=0;e.attackCooldown=100;
 g.soldiers.push({id:'unit',facility:'none',owner:'a',type:'barracks',level:1,x:110,y:100,hp:10,maxHp:100,damage:0,range:0,interval:1,cooldown:100});
 tick(g,.1);assert.ok(e.hp<1000);assert.ok(1000-e.hp<=statsFor(g.facilities[0]).damage*1.25*2);assert.ok(g.soldiers[0].hp>10);
});
test('wave starts with countdown, spawns enemies and repeats after clear',()=>{
 const g=createGame();addPlayer(g,'a','가');command(g,'a',{type:'start'});g.timer=0;tick(g,.1);
 assert.equal(g.wave,1);assert.equal(g.phase,'wave');tick(g,.1);assert.ok(g.enemies.length>0);
 g.pending=0;g.enemies=[];tick(g,.1);assert.equal(g.phase,'prep');assert.equal(g.completedWave,1);
});

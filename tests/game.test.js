import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG, statsFor, upgradeCost} from '../shared/catalog.js';
import {MAPS, canBuild} from '../shared/maps.js';
import {createGame, addPlayer, command} from '../server/game.js';

function setup(){const g=createGame();addPlayer(g,'a','가');addPlayer(g,'b','나');return g;}
test('catalog has eighteen facilities, five maps, four upgrade stages',()=>{
 assert.equal(Object.keys(CATALOG).length,18);assert.equal(MAPS.length,5);
 assert.ok(statsFor({type:'gun',level:4}).damage>statsFor({type:'gun',level:1}).damage);
});
test('build charges catalog cost, rejects overlap and path without spending',()=>{
 const g=setup();assert.equal(command(g,'a',{type:'build',facility:'gun',x:100,y:100}).ok,true);
 assert.equal(g.players.a.money,650-CATALOG.gun.cost);
 const cash=g.players.a.money;
 assert.equal(command(g,'a',{type:'build',facility:'gun',x:100,y:100}).ok,false);
 const [x,y]=MAPS[0].path[1];assert.equal(canBuild(0,x,y),false);
 assert.equal(command(g,'a',{type:'build',facility:'gun',x,y}).ok,false);
 assert.equal(g.players.a.money,cash);
});
test('locked, unknown, nonfinite, off-map requests rejected',()=>{
 const g=setup();for(const action of [
 {type:'build',facility:'rail',x:100,y:100},{type:'build',facility:'__proto__',x:100,y:100},
 {type:'build',facility:'gun',x:NaN,y:100},{type:'build',facility:'gun',x:-100,y:100},null,
 ])assert.equal(command(g,'a',action).ok,false);
 assert.equal(g.players.a.money,650);
});
test('only owner upgrades and sells; four stages and exact investment ledger',()=>{
 const g=setup();g.players.a.money=10000;command(g,'a',{type:'build',facility:'gun',x:100,y:100});
 const f=g.facilities[0];assert.equal(command(g,'b',{type:'upgrade',id:f.id}).ok,false);
 assert.equal(command(g,'b',{type:'sell',id:f.id}).ok,false);
 let invested=CATALOG.gun.cost;for(let i=1;i<4;i++){invested+=upgradeCost(f);assert.equal(command(g,'a',{type:'upgrade',id:f.id}).ok,true);}
 assert.equal(f.level,4);assert.equal(f.invested,invested);
 assert.equal(command(g,'a',{type:'upgrade',id:f.id}).ok,false);
 const before=g.players.a.money;command(g,'a',{type:'sell',id:f.id});assert.equal(g.players.a.money,before+Math.floor(invested*.75));
});
test('duplicate requests never overspend and room has facility cap',()=>{
 const g=setup();g.players.a.money=CATALOG.gun.cost;
 command(g,'a',{type:'build',facility:'gun',x:100,y:100});
 assert.equal(command(g,'a',{type:'build',facility:'gun',x:180,y:100}).ok,false);assert.equal(g.players.a.money,0);
 g.players.a.money=100000;g.facilities=Array.from({length:100},(_,i)=>({id:String(i),x:100,y:100}));
 assert.equal(command(g,'a',{type:'build',facility:'gun',x:180,y:100}).ok,false);
});
test('one player can start and late joins get catch-up funds',()=>{
 const g=createGame();addPlayer(g,'a','가');assert.equal(command(g,'a',{type:'start'}).ok,true);
 assert.equal(g.phase,'prep');g.wave=25;addPlayer(g,'b','나');assert.ok(g.players.b.money>650);
});

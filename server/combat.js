import {CATALOG,statsFor} from '../shared/catalog.js';
import {pathPoint,nearestPath} from '../shared/maps.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export {spawnEnemy,damageEnemy} from './enemies.js';
import {spawnEnemy,damageEnemy,flushChildren} from './enemies.js';
import {effect} from './effects.js';
import {DIFFICULTIES} from '../shared/progression.js';
export function finishWave(g){
 if(g.phase!=='wave'||g.completedWave>=g.wave)return;
 g.completedWave=g.wave;for(const p of Object.values(g.players))p.money+=55+g.wave*5;
 for(const f of g.facilities)if(CATALOG[f.type].kind==='bank'&&g.players[f.owner])g.players[f.owner].money+=statsFor(f).income;
 g.phase='prep';g.timer=12;g.soldiers=[];
 if(g.wave%10===0){for(const f of g.facilities)if(g.players[f.owner])g.players[f.owner].money+=f.invested;g.facilities=[];g.mapIndex=(g.mapIndex+1)%5;g.timer=30;effect(g,{kind:'notice',text:'지역 이동 · 건설·강화비 전액 환급'});}
}
function shoot(g,source,s,target,multiplier=1){
 const critical=(s.crit||0)>0&&Math.random()<s.crit,amount=s.damage*multiplier*(critical?2:1);
 source.angle=Math.atan2(target.y-source.y,target.x-source.x);
 effect(g,{kind:s.burn?'flame':s.chain?'chain':s.splash?'blast':s.slow?'ice':s.pierce?'rail':'shot',x:source.x,y:source.y,tx:target.x,ty:target.y,color:s.color});
 let targets=[target];if(s.splash)targets=g.enemies.filter(e=>e.hp>0&&distance(e,target)<s.splash);
 if(s.chain)targets=[target,...g.enemies.filter(e=>e!==target&&e.hp>0&&distance(e,target)<150).slice(0,s.chain-1)];
 for(const e of targets){if(s.chain&&e!==target)effect(g,{kind:'chain',x:target.x,y:target.y,tx:e.x,ty:e.y,color:s.color});damageEnemy(g,e,amount,source.owner,{critical,pierce:s.pierce,element:s.burn?'fire':s.chain?'electric':undefined});if(s.slow){e.slowUntil=g.time+1.5;e.slowFactor=e.element==='ice'?1-(1-s.slow)/2:s.slow;}if(s.burn){e.burnUntil=g.time+2;e.burn=s.burn*source.level;e.burnOwner=source.owner;}}
}
function facilities(g,dt){
 const supports=g.facilities.filter(f=>CATALOG[f.type].kind==='support');
 for(const f of g.facilities){const s=statsFor(f);f.cooldown=Math.max(0,f.cooldown-dt);
  if(s.kind==='support'&&s.heal){for(const soldier of g.soldiers){if(distance(f,soldier)<s.range){const strongest=Math.max(...supports.filter(v=>CATALOG[v.type].heal&&distance(v,soldier)<statsFor(v).range).map(v=>statsFor(v).heal));if(s.heal===strongest&&supports.find(v=>CATALOG[v.type].heal&&distance(v,soldier)<statsFor(v).range&&statsFor(v).heal===strongest)===f)soldier.hp=Math.min(soldier.maxHp,soldier.hp+s.heal*dt);}}}
  if(f.cooldown>0)continue;
  if(s.kind==='spawn'){
   if(g.soldiers.filter(v=>v.facility===f.id).length>=4)continue;
   g.soldiers.push({id:String(g.nextId++),facility:f.id,owner:f.owner,type:f.type,level:f.level,x:f.x,y:f.y,progress:nearestPath(g.mapIndex,f.x,f.y),hp:s.hp,maxHp:s.hp,damage:s.damage,range:s.range,interval:.85,cooldown:0,angle:0});f.cooldown=s.interval;effect(g,{kind:'spawn',x:f.x,y:f.y,color:s.color});
  }else if(s.kind==='attack'){
   const target=g.enemies.filter(e=>e.hp>0&&distance(f,e)<s.range).sort((a,b)=>b.progress-a.progress)[0];if(!target)continue;
   const buff=Math.max(1,...supports.filter(v=>CATALOG[v.type].buff&&distance(v,f)<statsFor(v).range).map(v=>statsFor(v).buff));shoot(g,f,s,target,buff);f.cooldown=s.interval;
  }
 }
}
function soldiers(g,dt){
 for(const s of g.soldiers){if(s.hp<=0)continue;s.cooldown=Math.max(0,s.cooldown-dt);const e=g.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(s,a)-distance(s,b))[0];
  if(e&&distance(s,e)<s.range){if(s.cooldown<=0){if(CATALOG[s.type].melee){damageEnemy(g,e,s.damage,s.owner);effect(g,{kind:'claw',x:e.x,y:e.y,color:'#b6d6a0'});}else shoot(g,s,{...statsFor(s),damage:s.damage},e);s.cooldown=s.interval;}}
  else {const target=e||pathPoint(g.mapIndex,s.progress),len=distance(s,target);if(len>4){const step=Math.min(len,dt*(s.type==='tank'?32:62));s.angle=Math.atan2(target.y-s.y,target.x-s.x);s.x+=(target.x-s.x)/len*step;s.y+=(target.y-s.y)/len*step;}}
 }
}
function enemies(g,dt){
 for(const e of [...g.enemies]){if(e.hp<=0)continue;if((e.variant==='regen'||e.ability==='재생')&&e.burnUntil<=g.time)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*(e.variant==='regen'?.01:.004)*dt);if(e.burnUntil>g.time)damageEnemy(g,e,e.burn*dt,e.burnOwner,{element:'fire'});if(e.hp<=0)continue;
  const blocker=g.soldiers.find(s=>s.hp>0&&distance(s,e)<Math.max(20,14*(e.size||1)+12));e.attackCooldown-=dt;
  if(blocker){if(e.attackCooldown<=0){blocker.hp-=e.boss?35:9+g.wave*.8;e.attackCooldown=.8;effect(g,{kind:'claw',x:blocker.x,y:blocker.y,color:'#ee766c'});}}
  else{e.progress+=e.speed*dt*(e.slowUntil>g.time?e.slowFactor:1)*(e.ability==='돌진'&&Math.sin(g.time*1.5)>.5?2:1);Object.assign(e,pathPoint(g.mapIndex,e.progress));}
  if(e.boss){e.skillCooldown-=dt;if(e.skillCooldown<=0){e.skillCooldown=7;if(e.ability==='증원'&&g.enemies.length<195){for(let i=0;i<3;i++){const v=spawnEnemy(g);if(!v)break;v.progress=Math.max(0,e.progress-30*i);Object.assign(v,pathPoint(g.mapIndex,v.progress));}}if(e.ability==='오염'){for(const s of g.soldiers)if(distance(e,s)<160)s.hp-=30;effect(g,{kind:'blast',x:e.x,y:e.y,tx:e.x,ty:e.y,color:'#b688ef'});}}}
  if(e.end){g.baseHp=Math.max(0,g.baseHp-e.damage);e.hp=0;effect(g,{kind:'breach',x:e.x,y:e.y});}
 }
 g.enemies=g.enemies.filter(e=>e.hp>0);flushChildren(g);g.soldiers=g.soldiers.filter(s=>s.hp>0);
}
export function tick(g,dt){
 dt=Math.min(.1,Math.max(0,dt));if(!Number.isFinite(dt))return;g.time+=dt;g.effects=g.effects.filter(e=>g.time-e.born<1.3);
 if(g.phase==='lobby'||['over','victory'].includes(g.phase))return;
 if(g.phase==='prep'){g.timer=Math.max(0,g.timer-dt);if(g.timer>0)return;g.wave++;g.phase='wave';g.pending=Math.min(160,Math.round((8+(g.wave%50)*2+Math.max(0,Object.values(g.players).filter(p=>p.connected).length-1)*3)*DIFFICULTIES[g.difficulty].count));g.spawnTimer=0;if(g.wave%10===0)spawnEnemy(g,true);return;}
 g.spawnTimer-=dt;if(g.pending>0&&g.spawnTimer<=0&&g.enemies.length<200){spawnEnemy(g);g.pending--;g.spawnTimer=Math.max(.18,.9-g.wave*.008);}
 facilities(g,dt);soldiers(g,dt);enemies(g,dt);
 if(g.baseHp<=0){g.phase='over';return;}
 if(g.pending===0&&g.enemies.length===0&&g.pendingChildren.length===0)finishWave(g);
}

export function advance(g,wallDt){if(!Number.isFinite(wallDt)||wallDt<0)return;let remaining=Math.min(.25,wallDt)*(g.speed||1);while(remaining>1e-9){const step=Math.min(.05,remaining);tick(g,step);remaining-=step;}}

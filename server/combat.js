import {CATALOG,statsFor} from '../shared/catalog.js';
import {pathPoint,nearestPath} from '../shared/maps.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const abilities=['장갑','재생','돌진','증원','오염'];
export function effect(g,e){g.effects.push({id:String(g.nextId++),born:g.time,...e});if(g.effects.length>180)g.effects.splice(0,g.effects.length-180);}
export function spawnEnemy(g,boss=false){
 const count=Math.max(1,Object.values(g.players).filter(p=>p.connected).length),scale=(1+g.wave*.22)*Math.pow(1.035,g.wave)*(1+(count-1)*.4);
 const variant=boss?'boss':g.nextId%9===0?'brute':g.nextId%4===0?'runner':'walker';
 const maxHp=Math.round(38*scale*(boss?18:variant==='brute'?3:variant==='runner'?.65:1));
 const e={id:String(g.nextId++),...pathPoint(g.mapIndex,0),progress:0,hp:maxHp,maxHp,speed:boss?25:variant==='runner'?74:variant==='brute'?28:42,boss,variant,ability:boss?abilities[g.mapIndex]:null,damage:boss?20:variant==='brute'?3:1,reward:boss?200+g.wave*5:12+Math.floor(g.wave/3),attackCooldown:0,skillCooldown:7,contributions:{},slowUntil:0,burnUntil:0};
 g.enemies.push(e);return e;
}
export function damageEnemy(g,e,amount,owner,critical=false,pierce=false){
 if(e.hp<=0)return;const armor=e.ability==='장갑'&&!pierce?.65:1,actual=Math.min(e.hp,amount*armor);e.hp=Math.max(0,e.hp-actual);
 if(owner)e.contributions[owner]=(e.contributions[owner]||0)+actual;
 effect(g,{kind:'damage',x:e.x,y:e.y,value:Math.round(actual),critical});
 if(e.hp===0){g.kills++;const sum=Object.values(e.contributions).reduce((a,b)=>a+b,0);for(const [id,d]of Object.entries(e.contributions)){if(g.players[id])g.players[id].money+=Math.max(1,Math.floor(e.reward*d/sum));}if(g.players[owner])g.players[owner].kills++;effect(g,{kind:'death',x:e.x,y:e.y,color:e.boss?'#e6aa68':'#a9c98b'});}
}
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
 for(const e of targets){if(s.chain&&e!==target)effect(g,{kind:'chain',x:target.x,y:target.y,tx:e.x,ty:e.y,color:s.color});damageEnemy(g,e,amount,source.owner,critical,s.pierce);if(s.slow){e.slowUntil=g.time+1.5;e.slowFactor=s.slow;}if(s.burn){e.burnUntil=g.time+2;e.burn=s.burn*source.level;e.burnOwner=source.owner;}}
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
  if(e&&distance(s,e)<s.range){if(s.cooldown<=0){shoot(g,s,{...statsFor(s),damage:s.damage},e);s.cooldown=s.interval;}}
  else {const target=e||pathPoint(g.mapIndex,s.progress),len=distance(s,target);if(len>4){const step=Math.min(len,dt*(s.type==='tank'?32:62));s.angle=Math.atan2(target.y-s.y,target.x-s.x);s.x+=(target.x-s.x)/len*step;s.y+=(target.y-s.y)/len*step;}}
 }
}
function enemies(g,dt){
 for(const e of [...g.enemies]){if(e.hp<=0)continue;if(e.burnUntil>g.time)damageEnemy(g,e,e.burn*dt,e.burnOwner);if(e.hp<=0)continue;
  const blocker=g.soldiers.find(s=>s.hp>0&&distance(s,e)<28);e.attackCooldown-=dt;
  if(blocker){if(e.attackCooldown<=0){blocker.hp-=e.boss?35:9+g.wave*.8;e.attackCooldown=.8;effect(g,{kind:'claw',x:blocker.x,y:blocker.y,color:'#ee766c'});}}
  else{e.progress+=e.speed*dt*(e.slowUntil>g.time?e.slowFactor:1)*(e.ability==='돌진'&&Math.sin(g.time*1.5)>.5?2:1);Object.assign(e,pathPoint(g.mapIndex,e.progress));}
  if(e.boss){e.skillCooldown-=dt;if(e.ability==='재생')e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.004*dt);if(e.skillCooldown<=0){e.skillCooldown=7;if(e.ability==='증원'&&g.enemies.length<150){for(let i=0;i<3;i++){const v=spawnEnemy(g);v.progress=Math.max(0,e.progress-30*i);Object.assign(v,pathPoint(g.mapIndex,v.progress));}}if(e.ability==='오염'){for(const s of g.soldiers)if(distance(e,s)<160)s.hp-=30;effect(g,{kind:'blast',x:e.x,y:e.y,tx:e.x,ty:e.y,color:'#b688ef'});}}}
  if(e.end){g.baseHp=Math.max(0,g.baseHp-e.damage);e.hp=0;effect(g,{kind:'breach',x:e.x,y:e.y});}
 }
 g.enemies=g.enemies.filter(e=>e.hp>0);g.soldiers=g.soldiers.filter(s=>s.hp>0);
}
export function tick(g,dt){
 dt=Math.min(.1,Math.max(0,dt));if(!Number.isFinite(dt))return;g.time+=dt;g.effects=g.effects.filter(e=>g.time-e.born<1.3);
 if(g.phase==='lobby'||g.phase==='over')return;
 if(g.phase==='prep'){g.timer=Math.max(0,g.timer-dt);if(g.timer>0)return;g.wave++;g.phase='wave';g.pending=Math.min(160,8+g.wave*2+Math.max(0,Object.values(g.players).filter(p=>p.connected).length-1)*3);g.spawnTimer=0;if(g.wave%10===0)spawnEnemy(g,true);return;}
 g.spawnTimer-=dt;if(g.pending>0&&g.spawnTimer<=0){spawnEnemy(g);g.pending--;g.spawnTimer=Math.max(.18,.9-g.wave*.008);}
 facilities(g,dt);soldiers(g,dt);enemies(g,dt);
 if(g.baseHp<=0){g.phase='over';return;}
 if(g.pending===0&&g.enemies.length===0)finishWave(g);
}

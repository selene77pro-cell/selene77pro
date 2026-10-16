import {ENEMY_TYPES} from '../shared/enemies.js';import {DIFFICULTIES} from '../shared/progression.js';import {pathPoint} from '../shared/maps.js';import {effect} from './effects.js';
const abilities=['장갑','재생','돌진','증원','오염'];
export function spawnEnemy(g,boss=false,overrides={}){
 if(g.enemies.filter(e=>e.hp>0).length>=200)return null;
 const count=Math.max(1,Object.values(g.players).filter(p=>p.connected).length),d=DIFFICULTIES[g.difficulty||0];
 const available=['walker','runner',...(g.mapIndex>=1?['giant']:[]),...(g.mapIndex>=2?['armored']:[]),...(g.mapIndex>=3?['splitter']:[]),...(g.mapIndex>=4?['regen']:[])];
 const variant=overrides.variant||(boss?'boss':available[g.nextId%available.length]),v=ENEMY_TYPES[variant]||ENEMY_TYPES.walker;
 const scale=(1+(Math.max(0,g.wave-1)%50+1)*.18)*(1+(count-1)*.4)*d.hp,maxHp=overrides.maxHp||Math.round(38*scale*(boss?18:v.hp));
 const progress=overrides.progress||0,element=overrides.element??((g.difficulty||0)>0&&!boss?['fire','ice','electric',null][g.nextId%4]:null);
 const e={id:String(g.nextId++),...pathPoint(g.mapIndex,progress),progress,hp:maxHp,maxHp,speed:boss?25:42*v.speed,size:boss?2.2:v.size,boss,variant,element,ability:boss?abilities[g.mapIndex]:null,damage:(boss?20:variant==='giant'?3:1)*d.attack,reward:boss?200+g.wave*5:12+Math.floor(g.wave/3),attackCooldown:0,skillCooldown:7,contributions:{},slowUntil:0,burnUntil:0,...overrides};
 g.enemies.push(e);return e;
}
function pay(g,e,owner){const entries=Object.entries(e.contributions),sum=entries.reduce((a,[,v])=>a+v,0),budget=Math.max(0,Math.floor(e.reward));if(sum>0){const shares=entries.map(([id,v])=>({id,n:Math.floor(budget*v/sum),remainder:budget*v/sum%1})).sort((a,b)=>b.remainder-a.remainder);let left=budget-shares.reduce((s,v)=>s+v.n,0);for(const s of shares){if(left>0){s.n++;left--;}if(g.players[s.id])g.players[s.id].money+=s.n;}}if(g.players[owner])g.players[owner].kills++;}
export function damageEnemy(g,e,amount,owner,options={},legacyPierce=false){
 if(!e||e.hp<=0||!Number.isFinite(amount)||amount<=0)return;if(typeof options==='boolean')options={critical:options,pierce:legacyPierce};
 const armor=(e.variant==='armored'||e.ability==='장갑')&&!options.pierce?.65:1;
 const resistance=e.element===options.element&&['fire','electric'].includes(e.element)?.5:1;
 const actual=Math.min(e.hp,amount*armor*resistance);e.hp=Math.max(0,e.hp-actual);if(owner)e.contributions[owner]=(e.contributions[owner]||0)+actual;
 effect(g,{kind:'damage',x:e.x,y:e.y,value:Math.round(actual),critical:options.critical});
 if(e.hp===0){g.kills++;if(e.variant==='splitter'&&!options.suppressSplit){const reward=Math.floor(e.reward),base=Math.floor(reward/3);for(let i=0;i<3;i++)g.pendingChildren.push({variant:'child',progress:e.progress,maxHp:Math.max(1,Math.round(e.maxHp*.25)),speed:42*1.3,size:.55,reward:base+(i<reward%3?1:0),element:e.element});}
 else pay(g,e,owner);effect(g,{kind:'death',x:e.x,y:e.y,color:e.boss?'#e6aa68':'#a9c98b'});}
}
export function flushChildren(g){while(g.pendingChildren.length&&g.enemies.filter(e=>e.hp>0).length<200)spawnEnemy(g,false,g.pendingChildren.shift());}

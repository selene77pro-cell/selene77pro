import {WEAPONS} from '../shared/weapons.js';import {safeKey} from '../shared/progression.js';import {MAPS,pathPoint} from '../shared/maps.js';import {damageEnemy} from './enemies.js';import {effect} from './effects.js';
const fail=error=>({ok:false,error});
export function weaponCommand(g,id,a){const p=g.players[id];
 if(a.type==='gather'){p.money++;effect(g,{kind:'gather',owner:id,value:1});return {ok:true};}
 if(a.type==='buyWeapon'){if(!safeKey(WEAPONS,a.weapon)||a.weapon==='nuke')return fail('구매할 수 없는 총입니다.');if(p.weapons.includes(a.weapon))return {ok:true};const w=WEAPONS[a.weapon];if(p.money<w.price)return fail('찌가 부족합니다.');p.money-=w.price;p.weapons.push(a.weapon);p.weaponLevels[a.weapon]=1;p.weapon=a.weapon;p.firing=false;effect(g,{kind:'purchase',owner:id});return {ok:true};}
 if(a.type==='upgradeWeapon'){if(!p.weapon)return fail('총을 먼저 구매하세요.');const level=p.weaponLevels[p.weapon]||1;if(level>=10)return fail('최종 강화입니다.');const cost=Math.round(WEAPONS[p.weapon].price*.5*level);if(p.money<cost)return fail('찌가 부족합니다.');p.money-=cost;p.weaponLevels[p.weapon]=level+1;effect(g,{kind:'upgrade',owner:id});return {ok:true};}
 if(a.type==='selectWeapon'){if(!p.weapons.includes(a.weapon))return fail('소유한 무기만 선택할 수 있습니다.');p.weapon=a.weapon;return {ok:true};}
 if(a.type==='toggleFire'){if(!p.weapon)return fail('총을 먼저 구매하세요.');p.firing=!p.firing;return {ok:true};}
 if(a.type==='nuke')return detonate(g,id);return null;
}
export function detonate(g,id){const p=g.players[id],targets=g.enemies.filter(e=>e.hp>0&&!e.boss);if(g.nukeCooldown>0)return fail('핵폭탄 재사용 대기 중입니다.');if(!targets.length&&!g.pendingChildren.length)return fail('보스 외에 제거할 좀비가 없습니다.');if(p.money<WEAPONS.nuke.price)return fail('찌가 부족합니다.');p.money-=WEAPONS.nuke.price;g.nukeCooldown=30;
 for(const e of targets)damageEnemy(g,e,e.hp,id,{pierce:true,suppressSplit:true});for(const child of g.pendingChildren.splice(0)){const hp=child.maxHp;damageEnemy(g,{...child,...pathPoint(g.mapIndex,child.progress,child.route,child.medium),id:String(g.nextId++),hp,maxHp:hp,contributions:{}},hp,id,{pierce:true,suppressSplit:true});}effect(g,{kind:'nuke',owner:id});return {ok:true};}
export function tickWeapons(g,dt){if(g.phase!=='wave')return;const base=MAPS[g.mapIndex].path.at(-1);
 for(const p of Object.values(g.players)){p.weaponCooldown=Math.max(0,p.weaponCooldown-dt);if(!p.firing||!p.weapon||p.weaponCooldown>1e-8)continue;const w=WEAPONS[p.weapon],enemies=g.enemies.filter(e=>e.hp>0).sort((a,b)=>b.progress-a.progress),target=enemies[0];if(!target)continue;let targets=w.targets?enemies.slice(0,w.targets):w.splash?enemies.filter(e=>Math.hypot(e.x-target.x,e.y-target.y)<w.splash):[target];for(const e of targets)damageEnemy(g,e,w.damage*(1+((p.weaponLevels[p.weapon]||1)-1)*.35)*(1+((p.level||1)-1)*.04),p.id,{pierce:w.pierce});effect(g,{kind:w.splash?'blast':w.pierce?'rail':'playerShot',owner:p.id,x:base[0]-18,y:base[1],tx:target.x,ty:target.y,color:w.color});p.weaponCooldown=w.interval;
 }
}

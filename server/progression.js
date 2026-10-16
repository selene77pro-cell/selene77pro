import {CATALOG,statsFor} from '../shared/catalog.js';import {DIFFICULTIES,failureReward} from '../shared/progression.js';import {effect} from './effects.js';
export {failureReward};
function awards(g,key,pp,clearedTier){for(const p of Object.values(g.players)){const id=`${g.runId}:${key}:${p.profileId}`;if(!g.rewardEvents.some(e=>e.id===id))g.rewardEvents.push({id,playerId:p.id,profileId:p.profileId,pp,...(clearedTier===undefined?{}:{clearedTier}),status:'pending'});}}
export function finishRun(g,outcome){if(g.outcome)return;g.outcome=outcome;g.phase=outcome==='victory'?'victory':'over';if(outcome==='defeat')awards(g,'defeat',failureReward(g.difficulty,Math.max(0,g.completedWave-g.difficulty*50)));for(const p of Object.values(g.players))p.firing=false;effect(g,{kind:outcome==='victory'?'victory':'defeat'});}
export function finishWave(g){
 if(g.phase!=='wave'||g.completedWave>=g.wave||g.pendingChildren.length||g.enemies.some(e=>e.hp>0))return;
 g.completedWave=g.wave;const income=55+g.wave*5;for(const p of Object.values(g.players))p.money+=income;
 for(const f of g.facilities)if(CATALOG[f.type].kind==='bank'&&g.players[f.owner])g.players[f.owner].money+=statsFor(f).income;
 effect(g,{kind:'waveClear',text:`웨이브 완료 · +${income}찌`,value:income});g.phase='prep';g.timer=12;g.soldiers=[];
 if(g.wave%10===0){for(const f of g.facilities)if(g.players[f.owner])g.players[f.owner].money+=f.invested;g.facilities=[];g.mapsCleared++;g.mapIndex=g.mapsCleared===20?4:g.mapsCleared%5;g.timer=30;effect(g,{kind:'notice',text:'지역 이동 · 건설·강화비 전액 환급'});
  if(g.mapsCleared%5===0){awards(g,`clear:${g.difficulty}`,DIFFICULTIES[g.difficulty].clearReward,g.difficulty);if(g.mapsCleared===20){finishRun(g,'victory');return;}g.difficulty++;g.baseHp=100;effect(g,{kind:'tier',text:`${DIFFICULTIES[g.difficulty].name} 진입`});}
 }
}

import {CATALOG,statsFor} from '../shared/catalog.js';import {failureReward} from '../shared/progression.js';import {effect} from './effects.js';
export {failureReward};
function awards(g,key,pp,clearedTier){for(const p of Object.values(g.players)){const id=`${g.runId}:${key}:${p.profileId}`;if(!g.rewardEvents.some(e=>e.id===id))g.rewardEvents.push({id,playerId:p.id,profileId:p.profileId,pp,...(clearedTier===undefined?{}:{clearedTier}),status:'pending'});}}
export function finishRun(g,outcome){if(g.outcome)return;g.outcome=outcome;g.phase=outcome==='victory'?'victory':'over';if(outcome==='defeat')awards(g,'defeat',5+g.completedWave*3);for(const p of Object.values(g.players))p.firing=false;effect(g,{kind:outcome==='victory'?'victory':'defeat'});}
export function finishWave(g){
 if(g.phase!=='wave'||g.completedWave>=g.wave||g.pendingChildren.length||g.enemies.some(e=>e.hp>0))return;
 g.completedWave=g.wave;const income=100+g.wave*15;for(const p of Object.values(g.players)){p.money+=income;p.level=Math.min(30,g.wave+1);}
 for(const f of g.facilities)if(CATALOG[f.type].kind==='bank'&&g.players[f.owner])g.players[f.owner].money+=statsFor(f).income;
 effect(g,{kind:'waveClear',text:`스테이지 ${g.wave} 완료 · +${income}찌 · 레벨 상승`,value:income});g.phase='prep';g.timer=8;g.soldiers=[];
 if(g.wave%10===0)awards(g,`boss:${g.wave}`,{10:200,20:400,30:1600}[g.wave],g.wave===30?3:g.wave/10-1);
 if(g.wave>=30){finishRun(g,'victory');return;}
 const nextMap=Math.min(4,Math.floor(g.wave/6));if(nextMap!==g.mapIndex){for(const f of g.facilities)if(g.players[f.owner])g.players[f.owner].money+=f.invested;g.facilities=[];g.mapIndex=nextMap;g.mapsCleared=nextMap;g.timer=15;effect(g,{kind:'notice',text:'도시 구역 이동 · 건설·강화비 전액 환급'});}
}

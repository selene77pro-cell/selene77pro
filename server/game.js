import {CATALOG,BASE_FACILITIES,statsFor,upgradeCost,unlocked} from '../shared/catalog.js';
import {weaponCommand} from './player-weapons.js';
import {effect} from './effects.js';
import {canBuild} from '../shared/maps.js';
export function createGame(){return {runId:crypto.randomUUID(),difficulty:0,mapsCleared:0,speed:1,hostId:null,pendingChildren:[],rewardEvents:[],nukeCooldown:0,outcome:null,players:{},facilities:[],soldiers:[],enemies:[],effects:[],wave:0,completedWave:0,mapIndex:0,phase:'lobby',baseHp:100,timer:0,nextId:1,time:0,kills:0,pending:0,spawnTimer:0,bossSpawned:false};}
export function addPlayer(g,id,name,profile){if(Object.keys(g.players).length>=4)return false;g.players[id]={id,name,money:650+Math.max(g.completedWave,g.wave-1)*35,connected:true,kills:0,profileId:profile?.id||id,loadout:[...(profile?.equipped||BASE_FACILITIES)],weapons:[],weapon:null,firing:false,weaponCooldown:0};if(!g.hostId)g.hostId=id;return g.players[id];}
const fail=error=>({ok:false,error});
export function command(g,id,a){
 const p=g.players[id];if(!p||!a||typeof a!=='object')return fail('잘못된 요청입니다.');
 if(a.type==='start'){if(g.phase!=='lobby')return fail('이미 진행 중입니다.');g.phase='prep';g.timer=15;return {ok:true};}
 if(['over','victory'].includes(g.phase))return fail('게임이 종료되었습니다.');
 const weapon=weaponCommand(g,id,a);if(weapon)return weapon;
 if(a.type==='speed'){if(id!==g.hostId||![1,2,3].includes(a.value))return fail('방장만 1~3배속을 선택할 수 있습니다.');g.speed=a.value;return {ok:true};}
 if(a.type==='build'){
  if(!unlocked(g.completedWave,a.facility)||!p.loadout.includes(a.facility))return fail('아직 해금되지 않은 시설입니다.');
  if(!canBuild(g.mapIndex,a.x,a.y)||g.facilities.some(f=>Math.hypot(f.x-a.x,f.y-a.y)<48))return fail('이곳에는 건설할 수 없습니다.');
  if(g.facilities.length>=100)return fail('시설은 최대 100개입니다.');const c=CATALOG[a.facility];if(p.money<c.cost)return fail('찌가 부족합니다.');
  p.money-=c.cost;g.facilities.push({id:String(g.nextId++),owner:id,type:a.facility,x:a.x,y:a.y,level:1,invested:c.cost,cooldown:0,angle:0});effect(g,{kind:'build',owner:id,x:a.x,y:a.y});return {ok:true};
 }
 const f=g.facilities.find(f=>f.id===a.id);if(!f||f.owner!==id)return fail('자신의 시설을 선택해 주세요.');
 if(a.type==='upgrade'){if(f.level>=4)return fail('최종 단계입니다.');const cost=upgradeCost(f);if(p.money<cost)return fail('찌가 부족합니다.');p.money-=cost;f.invested+=cost;f.level++;effect(g,{kind:'upgrade',owner:id,x:f.x,y:f.y});return {ok:true};}
 if(a.type==='sell'){p.money+=Math.floor(f.invested*.75);g.facilities=g.facilities.filter(v=>v!==f);g.soldiers=g.soldiers.filter(s=>s.facility!==f.id);return {ok:true};}
 return fail('알 수 없는 명령입니다.');
}
export function snapshot(g){return {players:Object.values(g.players).map(p=>({...p})),facilities:g.facilities.map(f=>({...f,stats:statsFor(f)})),soldiers:g.soldiers,enemies:g.enemies.map(({contributions,...e})=>e),effects:g.effects,wave:g.wave,completedWave:g.completedWave,mapIndex:g.mapIndex,phase:g.phase,baseHp:g.baseHp,timer:g.timer,time:g.time,kills:g.kills,pending:g.pending,difficulty:g.difficulty,mapsCleared:g.mapsCleared,speed:g.speed,hostId:g.hostId,nukeCooldown:g.nukeCooldown,outcome:g.outcome,rewards:g.rewardEvents.map(({profileId,...e})=>e),pendingChildren:g.pendingChildren.length};}

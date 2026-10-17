import {randomId} from './ids.js';
import {BASE_FACILITIES,CATALOG} from './catalog.js';
import {BONUS_TOWERS,STARTERS,safeKey} from './progression.js';
export class MemoryProfiles{
 constructor(){this.records={};}
 persist(_records){}
 public(p){const {receipts,...publicData}=p;return structuredClone(publicData);}
 open(token){if(token){if(typeof token!=='string'||!Object.hasOwn(this.records,token))throw Error('프로필을 찾을 수 없습니다. 새 프로필로 시작해 주세요.');return {token,profile:this.public(this.records[token])};}
  if(Object.keys(this.records).length>=10000)throw Error('프로필 저장 공간이 가득 찼습니다.');token=randomId()+randomId();const records=structuredClone(this.records),p={id:randomId(),pp:0,clearedTiers:[],owned:[...BASE_FACILITIES],equipped:[...BASE_FACILITIES],receipts:[]};records[token]=p;this.persist(records);this.records=records;return {token,profile:this.public(p)};
 }
 transact(token,operation){if(typeof token!=='string'||!Object.hasOwn(this.records,token))return {ok:false,error:'프로필 인증이 필요합니다.'};const records=structuredClone(this.records),p=records[token];try{const error=operation(p);if(error)return {ok:false,error};this.persist(records);this.records=records;return {ok:true,profile:this.public(p)};}catch{return {ok:false,error:'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'};}}
 purchase(token,id){return this.transact(token,p=>{if(!safeKey(BONUS_TOWERS,id))return '구매할 수 없는 타워입니다.';if(p.owned.includes(id))return;const c=BONUS_TOWERS[id];if(!p.clearedTiers.includes(c.unlockTier))return '해당 보스 스테이지를 먼저 클리어하세요.';if(p.pp<c.ppCost)return '뿌가 부족합니다.';p.pp-=c.ppCost;p.owned.push(id);p.equipped.push(id);});}
 equip(token,ids){return this.transact(token,p=>{if(!Array.isArray(ids)||ids.length>22||ids.some(id=>!safeKey(CATALOG,id)||!p.owned.includes(id)))return '소유한 타워만 장착할 수 있습니다.';p.equipped=[...new Set([...STARTERS,...ids])];});}
 settle(token,id,{pp,clearedTier}={}){return this.transact(token,p=>{if(typeof id!=='string'||id.length>200||!Number.isSafeInteger(pp)||pp<0||pp>100000||clearedTier!==undefined&&(!Number.isInteger(clearedTier)||clearedTier<0||clearedTier>3))return '잘못된 보상입니다.';if(p.receipts.includes(id))return;if(p.receipts.length>=100000)throw Error('receipt limit');p.pp+=pp;p.receipts.push(id);if(clearedTier!==undefined&&!p.clearedTiers.includes(clearedTier))p.clearedTiers.push(clearedTier);});}
}

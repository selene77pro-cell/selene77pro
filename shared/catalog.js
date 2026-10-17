const entry=(name,kind,unlockWave,cost,color,extra={})=>({name,kind,unlockWave,cost,color,damage:12,range:170,interval:.65,...extra});
export const CATALOG=Object.freeze({
 gun:entry('기관총','attack',0,100,'#e7bd78',{damage:13,interval:.5}),
 barracks:entry('보병 막사','spawn',0,180,'#8fbd91',{damage:9,hp:65,interval:7,range:28,melee:true,unit:'보병'}),
 bank:entry('은행','bank',0,220,'#f2cb69',{income:65,damage:0,range:0}),
 shotgun:entry('광역공격 타워','attack',5,350,'#b6612d',{damage:60,range:230,interval:1.1,splash:110,description:'폭발 중심 반경 110 안의 모든 적을 함께 공격합니다.'}),
 frost:entry('냉각탑','attack',5,240,'#85d6ef',{damage:8,slow:.48,interval:.8}),
 sniper:entry('저격탑','attack',10,310,'#b8c5dd',{damage:95,range:340,interval:2.1,crit:.25}),
 assault:entry('돌격병 기지','spawn',10,320,'#82c8ae',{damage:18,hp:110,interval:7,range:28,melee:true,unit:'돌격병'}),
 mortar:entry('박격포','attack',15,400,'#e9ab78',{damage:65,range:250,interval:2.3,splash:85}),
 supply:entry('보급소','support',15,330,'#c6bd86',{range:160,buff:1.25,damage:0}),
 flame:entry('화염탑','attack',20,440,'#ff8b61',{damage:15,range:135,interval:.45,splash:45,burn:7}),
 heavy:entry('중화기 기지','spawn',20,500,'#aaaf8e',{damage:38,hp:200,interval:9,range:140,unit:'중화기병'}),
 tesla:entry('전기탑','attack',25,560,'#b59cff',{damage:45,range:180,interval:1.1,chain:4}),
 medic:entry('의무소','support',25,400,'#7ee3bf',{range:185,heal:14,damage:0}),
 missile:entry('미사일탑','attack',30,660,'#f8bd8b',{damage:125,range:270,interval:2.5,splash:95}),
 drone:entry('드론 기지','spawn',30,680,'#8bd5d6',{damage:36,hp:130,interval:6,range:170,unit:'드론'}),
 rail:entry('관통 타워','attack',15,1200,'#287b9e',{damage:260,range:500,interval:1.8,pierce:true,linePierce:true,description:'일직선 위의 여러 적과 장갑을 관통합니다.'}),
 plasma:entry('밸런스 붕괴 타워','attack',20,29000,'#9b3264',{damage:5000,range:1200,interval:.35,splash:220,pierce:true,description:'29,000찌. 초광역 관통 폭발로 일반 적과 보스에게 강력한 피해를 줍니다.'}),
 shield:entry('방패병 기지','spawn',0,300,'#b9d59c',{damage:18,hp:400,interval:8,range:32,melee:true,unit:'방패병'}),
 gravity:entry('중력탑','attack',0,600,'#c8a4ee',{damage:45,range:200,interval:.6,splash:80,slow:.35}),
 orbital:entry('궤도포','attack',0,1000,'#f8ce87',{damage:650,range:480,interval:4,splash:140,pierce:true}),
 mech:entry('워메크 기지','spawn',0,1600,'#8ee4d1',{damage:220,hp:1200,interval:12,range:190,splash:65,unit:'워메크'}),
 tank:entry('전차 기지','spawn',40,1100,'#b5c883',{damage:110,hp:550,interval:13,range:160,splash:60,unit:'전차'}),
});
for(const c of Object.values(CATALOG))c.unlockWave=Math.min(25,c.unlockWave);
export const BASE_FACILITIES=Object.keys(CATALOG).filter(id=>!['shield','gravity','orbital','mech'].includes(id));
export const LEVELS=['기본형','강화형','정예형','최종형'];
export function upgradeCost(f){return Math.floor(CATALOG[f.type].cost*(.8+f.level*.65));}
export function statsFor(f){const c=CATALOG[f.type],s=f.level-1;return {...c,damage:Math.round(c.damage*(1+s*.8)),hp:Math.round((c.hp||0)*(1+s*.85)),range:c.range*(1+s*.08),interval:c.interval/(1+s*.14),income:Math.round((c.income||0)*(1+s*.8)),heal:(c.heal||0)*(1+s*.6),buff:c.buff?c.buff+s*.1:0};}
export const unlocked=(completedWave,type)=>typeof type==='string'&&Object.hasOwn(CATALOG,type)&&CATALOG[type].unlockWave<=completedWave;

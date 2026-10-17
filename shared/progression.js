export const DIFFICULTIES=[
 {name:'보통',hp:1,attack:1,count:1,clearReward:200},
 {name:'어려움',hp:2,attack:1.5,count:1.15,clearReward:400},
 {name:'지옥',hp:4,attack:2,count:1.3,clearReward:800},
 {name:'불가능',hp:8,attack:3,count:1.5,clearReward:1600},
];
export const BONUS_TOWERS={shield:{unlockTier:0,ppCost:200},gravity:{unlockTier:1,ppCost:400},orbital:{unlockTier:3,ppCost:800},mech:{unlockTier:3,ppCost:1600}};
export const STARTERS=['gun','barracks','bank'];
export const failureReward=(tier,n)=>(5+2*Math.max(0,Math.floor(n)))*[1,2,4,8][Math.min(3,Math.max(0,tier))];
export const safeKey=(object,key)=>typeof key==='string'&&Object.hasOwn(object,key);

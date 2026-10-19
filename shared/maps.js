export const WIDTH=1200,HEIGHT=720;
export const MAPS=[
 {name:'폐허 도시',subtitle:'THE FALLEN CITY',color:'#19282b',accent:'#b89c70',path:[[0,310],[260,310],[260,510],[600,510],[600,220],[920,220],[920,400],[1200,400]],blocked:[[480,100,150,80],[760,590,160,70]]},
 {name:'폐쇄 공장',subtitle:'IRONWORKS',color:'#2a2425',accent:'#d19463',path:[[0,190],[360,190],[360,530],[780,530],[780,270],[1200,270]],blocked:[[70,500,140,110],[870,90,170,70]]},
 {name:'군사기지',subtitle:'SECTOR 03',color:'#242d25',accent:'#a5b87b',path:[[0,370],[200,370],[200,170],[570,170],[570,540],[990,540],[990,350],[1200,350]],blocked:[[720,100,150,100],[340,590,160,70]]},
 {name:'검역 항만',subtitle:'DEADWATER DOCKS',color:'#192b34',accent:'#82a8b7',path:[[0,540],[300,540],[300,230],[720,230],[720,470],[1000,470],[1000,160],[1200,160]],blocked:[[60,90,140,130],[820,590,210,70]]},
 {name:'오염 연구소',subtitle:'GROUND ZERO',color:'#272438',accent:'#b6a0d3',path:[[0,250],[250,250],[250,500],[520,500],[520,170],[850,170],[850,480],[1200,480]],blocked:[[60,570,100,70],[1000,70,130,140]]},
];
// All districts belong to one daylight ruined city. Routes share the same base.
const districtNames=['폐허 도심','무너진 상가','붕괴된 주거지','폐허 항구','도시 최후 방어선'];
MAPS.forEach((m,i)=>{m.name=districtNames[i];m.color=['#b4bdad','#c2b9a5','#b0bdad','#a9bdc1','#bfb4a7'][i];m.accent='#536f61';const end=m.path.at(-1);m.routes=[m.path,[[0,20],[1080,20],[1080,end[1]],end],[[0,650],[1040,650],[1040,end[1]],end]];m.airPath=[[0,40],[600,120],end];});
export function routePath(mapIndex,route=0,medium='ground'){const m=MAPS[mapIndex%MAPS.length];return medium==='air'?m.airPath:m.routes[route%m.routes.length];}
export function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);}
export function canBuild(mapIndex,x,y){if(!Number.isFinite(x)||!Number.isFinite(y)||x<35||y<35||x>WIDTH-35||y>HEIGHT-35)return false;const m=MAPS[mapIndex%MAPS.length];if(m.routes.some(path=>path.slice(1).some((b,i)=>segmentDistance(x,y,path[i],b)<48)))return false;return !m.blocked.some(([bx,by,w,h])=>x>bx-24&&x<bx+w+24&&y>by-24&&y<by+h+24);}
export function pathPoint(mapIndex,distance,route=0,medium='ground'){const path=routePath(mapIndex,route,medium);for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=len)return {x:a[0]+(b[0]-a[0])*distance/len,y:a[1]+(b[1]-a[1])*distance/len,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),end:false};distance-=len;}const p=path.at(-1);return {x:p[0],y:p[1],angle:0,end:true};}
export function nearestPath(mapIndex,x,y,route=0){let best={distance:Infinity,progress:0},progress=0;const path=routePath(mapIndex,route);for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(len*len))),distance=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);if(distance<best.distance)best={distance,progress:progress+t*len};progress+=len;}return best.progress;}

export function nearestRoad(mapIndex,x,y){return [0,1].map(route=>{const progress=nearestPath(mapIndex,x,y,route),p=pathPoint(mapIndex,progress,route);return {route,progress,distance:Math.hypot(x-p.x,y-p.y)};}).sort((a,b)=>a.distance-b.distance)[0];}

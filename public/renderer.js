import {ELEMENTS,ENEMY_TYPES} from '/shared/enemies.js';
import {CATALOG,statsFor} from '/shared/catalog.js';
import {MAPS,canBuild} from '/shared/maps.js';
const colors=['#eaba78','#91b9de','#c6a5e1','#8ad1b1'];
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function line(c,x,y,tx,ty,color,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function text(c,value,x,y,color,size=11,align='left'){c.fillStyle=color;c.font=`${size}px monospace`;c.textAlign=align;c.fillText(value,x,y);}
function health(c,e,width,y){if(e.hp>=e.maxHp&&!e.boss)return;const x=e.x-width/2;c.fillStyle='#101711';c.fillRect(x,y,width,5);c.fillStyle=e.boss?'#e99b76':e.owner?'#92c2dd':'#b5c28c';c.fillRect(x,y,width*Math.max(0,e.hp/e.maxHp),5);}
function polygon(c,points,fill,stroke){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
let terrainCache=null,terrainMap=-1;
function terrain(index){
 if(terrainMap===index&&terrainCache)return terrainCache;
 const off=document.createElement('canvas');off.width=1200;off.height=720;const c=off.getContext('2d'),m=MAPS[index];c.fillStyle=m.color;c.fillRect(0,0,1200,720);
 // Deterministic rubble and grid keep texture stable between network updates.
 let seed=17+index;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<1000;i++){const x=random()*1200,y=random()*720;c.fillStyle=random()>.5?'#89937809':'#030b0b18';c.fillRect(x,y,random()*5+1,random()*3+1);}
 c.lineWidth=1;for(let x=0;x<1200;x+=40)line(c,x,0,x,720,'#9fb08608');for(let y=0;y<720;y+=40)line(c,0,y,1200,y,'#9fb08608');
 for(const [r,points]of m.routes.entries()){
 const path=()=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));};
 c.lineJoin='round';path();c.lineWidth=76;c.strokeStyle=r===2?'#aacbd0':'#afb6a6';c.stroke();path();c.lineWidth=62;c.strokeStyle=r===2?'#95c6d5':'#c9c7b8';c.stroke();path();c.lineWidth=2;c.strokeStyle=r===2?'#e7f8ff':'#faf5d6';c.setLineDash([12,18]);c.stroke();c.setLineDash([]);
 const start=points[0];text(c,r===2?'해상 침입':'지상 경로 '+(r+1),start[0]+20,start[1]-44,'#385954',13);
 }
 c.beginPath();m.airPath.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.setLineDash([6,14]);c.strokeStyle='#729cbd';c.lineWidth=2;c.stroke();c.setLineDash([]);text(c,'공중 침입',650,100,'#3d7099',14);
 for(const [x,y,w,h]of m.blocked){c.fillStyle='#070c0e70';c.fillRect(x+8,y+10,w,h);c.fillStyle=index===3?'#a4bcc3':index===4?'#b7ad9f':'#b2b4a0';c.fillRect(x,y,w,h);c.strokeStyle='#65715b';c.lineWidth=2;c.strokeRect(x,y,w,h);c.strokeStyle='#141d16';c.strokeRect(x+8,y+8,w-16,h-16);for(let xx=x+15;xx<x+w-12;xx+=22){c.fillStyle='#151e19';c.fillRect(xx,y+12,12,5);c.fillRect(xx,y+h-19,12,5);}line(c,x+12,y+30,x+w-12,y+30,'#6f796442',2);text(c,'RUINS',x+w/2,y+h/2+5,'#465141',9,'center');}
 for(let i=0;i<25;i++){const x=35+random()*1130,y=35+random()*650;if(!canBuild(index,x,y))continue;c.save();c.translate(x,y);c.rotate(random()*6);c.fillStyle='#72816a28';c.fillRect(-7,-4,14,8);line(c,-5,0,5,0,'#080e0c',1);c.restore();}
 // Entry and fortified end point.
 const start=m.path[0],end=m.path.at(-1);text(c,'⚠ INFECTED ZONE',start[0]+12,start[1]-52,'#bd9d70',10);c.fillStyle='#809474';c.fillRect(end[0]-24,end[1]-45,20,90);c.fillStyle='#d3b16e';for(let y=end[1]-42;y<end[1]+42;y+=15)c.fillRect(end[0]-22,y,16,6);text(c,'BASE',end[0]-30,end[1]-58,'#d4c797',11,'right');
 text(c,`SECTOR 0${index+1} / ${m.subtitle}`,35,675,'#81917355',13);terrainCache=off;terrainMap=index;return off;
}
function facility(c,f,color,time){
 const s=statsFor(f);c.save();c.translate(f.x,f.y);const tier=f.level-1;
 circle(c,3,7,25,'#060c0c70');polygon(c,[[-20,-16],[12,-22],[23,-7],[20,18],[-15,22],[-24,8]],'#333e31','#69785b');
 c.lineWidth=2;circle(c,0,0,20,'#263229',color+'80');for(let i=0;i<f.level;i++){c.fillStyle=color;c.fillRect(-14+i*8,21,5,3);}
 if(s.kind==='bank'){
  c.fillStyle='#777254';c.fillRect(-15,-15,30,29);c.fillStyle='#b1a479';c.fillRect(-18,-18,36,6);c.fillStyle='#29342a';c.fillRect(-5,-3,10,17);for(let i=-1;i<=1;i+=2){c.fillStyle=s.color;c.fillRect(i*11-2,-8,4,5);}text(c,'찌',0,-1,s.color,14,'center');if(tier>1){c.fillStyle='#c5b477';c.fillRect(-19,-24,38,4);}if(tier>2){line(c,15,-20,15,-34,s.color,2);circle(c,15,-36,3,s.color);}
 }else if(s.kind==='spawn'){
  c.fillStyle='#65785d';c.fillRect(-18,-15,36,32);polygon(c,[[-22,-15],[0,-28],[22,-15]],'#92a27b','#c7c49c');c.fillStyle='#14241d';c.fillRect(-9,-2,18,19);c.fillStyle=s.color;c.fillRect(-4,-17,8,8);line(c,-7,-13,7,-13,'#23372a',2);for(let i=0;i<tier;i++){c.fillStyle=s.color;c.fillRect(-21+i*14,-24,7,3);}if(f.type==='tank'){c.fillStyle='#8d9e72';c.fillRect(-17,-7,34,13);line(c,0,-6,21,-16,'#bccfa1',5);}if(f.type==='drone'){circle(c,-14,-20,6,null,s.color);circle(c,14,-20,6,null,s.color);}
 }else if(s.kind==='support'){
  c.fillStyle='#627b65';c.fillRect(-15,-15,30,30);c.fillStyle='#c3d2af';c.fillRect(-12,-12,24,24);if(f.type==='medic'){c.fillStyle='#729f8e';c.fillRect(-4,-11,8,22);c.fillRect(-11,-4,22,8);}else{polygon(c,[[-10,-4],[0,-11],[10,-4],[10,9],[-10,9]],'#586b4a',s.color);line(c,0,-10,0,9,s.color,2);}if(tier>1)circle(c,0,0,25,null,s.color+'70');
 }else{
  c.rotate((f.angle||0)+Math.PI/2);
  if(['tesla','frost','plasma','gravity'].includes(f.type)){circle(c,0,0,13,'#576760',s.color);line(c,0,-3,0,-22,s.color,5);circle(c,0,-23,7+tier,s.color+'40',s.color);circle(c,0,-23,3,s.color);if(tier>1){circle(c,-13,-10,4,s.color);circle(c,13,-10,4,s.color);}}
  else if(['mortar','missile'].includes(f.type)){c.fillStyle='#8a8b70';c.fillRect(-13,-16,26,28);for(let i=0;i<2+Math.floor(tier/2);i++){const x=-8+i*8;c.fillStyle='#3d4b3d';c.fillRect(x-3,-24,6,26);c.fillStyle=s.color;c.fillRect(x-2,-27,4,8);}}
  else {c.fillStyle='#8c9b7b';c.fillRect(-12-tier,-11,24+tier*2,24);c.fillStyle='#4c604d';c.fillRect(-9,-8,18,17);for(let i=0;i<(tier>1?2:1);i++){const x=tier>1?(i===0?-6:6):0;line(c,x,-4,x,-29-tier*3,'#1b2924',7);line(c,x,-7,x,-30-tier*3,s.color,3);}if(tier===3){c.fillStyle=s.color;c.fillRect(-17,2,6,12);c.fillRect(11,2,6,12);}}
 }
 c.restore();
}
function enemy(c,e,time){
 c.save();c.translate(e.x,e.y);const walk=Math.sin(time*(e.variant==='runner'?18:10)+Number(e.id))*3,size=e.size||(e.boss?2.2:1);c.scale(size,size);circle(c,2,7,12,'#02090666');c.rotate(e.angle||0);line(c,-3,-6,-9,-7+walk,'#738468',5);line(c,-3,6,-9,7-walk,'#738468',5);c.fillStyle=e.boss?'#665944':e.variant==='runner'?'#7d8970':'#535f4c';c.fillRect(-7,-6,15,12);line(c,6,-5,14,-8+walk,'#a7b18b',4);line(c,6,5,14,8-walk,'#a7b18b',4);circle(c,8,0,6,e.boss?'#b99b79':'#a5b48a');circle(c,12,-2,1.2,'#ed7f64');circle(c,12,2,1.2,'#ed7f64');if(e.boss){c.strokeStyle='#c6a068';c.lineWidth=2;c.strokeRect(-7,-7,16,14);polygon(c,[[-5,-10],[-2,-16],[2,-10]],'#ae8d65');}c.restore();
 if(e.medium==='air'){line(c,e.x-22,e.y,e.x+22,e.y,'#416a98',4);text(c,'공중',e.x,e.y-28*size,'#285e8d',10,'center');}if(e.medium==='sea'){circle(c,e.x,e.y,20*size,null,'#2487a6');text(c,'해상',e.x,e.y-28*size,'#246e88',10,'center');}if(e.ranged)text(c,'원거리',e.x,e.y+30*size,'#853269',10,'center');
 if(e.element){circle(c,e.x,e.y,15*size,null,ELEMENTS[e.element].color);text(c,ELEMENTS[e.element].icon,e.x+15*size,e.y-12*size,ELEMENTS[e.element].color,11,'center');}if(['armored','regen','splitter'].includes(e.variant))text(c,{armored:'甲',regen:'＋',splitter:'◇'}[e.variant],e.x,e.y+24*size,'#d6dfae',10,'center');
 if(e.slowUntil>time)circle(c,e.x,e.y,16*size,null,'#91d9e3');if(e.burnUntil>time){circle(c,e.x-5,e.y-4,6,'#ffaf6855');circle(c,e.x+6,e.y-8,4,'#ff783b88');}health(c,e,e.boss?65:25*size,e.y-(e.boss?40:21*size));
}
function soldier(c,s,color,time){c.save();c.translate(s.x,s.y);circle(c,2,6,['tank','mech'].includes(s.type)?16:9,'#020b0d66');c.rotate(s.angle||0);const d=Math.sin(time*12+Number(s.id))*2;
 if(['tank','mech'].includes(s.type)){c.fillStyle='#26382a';c.fillRect(-19,-14,38,28);c.fillStyle='#8fa476';c.fillRect(-15,-10,30,20);circle(c,0,0,8,'#b1bd8a');line(c,2,0,29,0,'#263e2c',7);line(c,3,0,29,0,color,3);}else if(s.type==='drone'){for(const [x,y]of [[-10,-10],[10,-10],[-10,10],[10,10]]){line(c,0,0,x,y,'#98b2a2',2);circle(c,x,y,5,null,color);}circle(c,0,0,6,'#8ba6a2',color);}else{line(c,-2,-4,-8,-5+d,'#526d57',4);line(c,-2,4,-8,5-d,'#526d57',4);c.fillStyle=s.level>2?'#9aab87':'#718c6c';c.fillRect(-6,-6,13,12);circle(c,4,0,6,'#c2bf96');circle(c,2,0,6,'#557651');line(c,5,5,19+s.level*2,5,'#17291d',4);line(c,8,5,20+s.level*2,5,color,1);if(s.level>1){c.fillStyle=color;c.fillRect(-4,-5,3,10);}}
 c.restore();health(c,s,22,s.y-20);
}
export function render(c,state,previous,interpolation,ui){
 const t=state.time+interpolation*.1*(state.speed||1);c.clearRect(0,0,1200,720);c.drawImage(terrain(state.mapIndex),0,0);
 const playerColor=id=>colors[Math.max(0,state.players.findIndex(p=>p.id===id))%4];
 const selected=state.facilities.find(f=>f.id===ui.selectedId);
 if(selected){const s=statsFor(selected);circle(c,selected.x,selected.y,s.range,'#cbb17d0c','#bfa66b50');circle(c,selected.x,selected.y,29,null,playerColor(selected.owner));}
 if(ui.selectedType&&ui.pointer){const p=ui.pointer,valid=canBuild(state.mapIndex,p.x,p.y)&&!state.facilities.some(f=>Math.hypot(f.x-p.x,f.y-p.y)<48),color=valid?'#aace8c':'#d88777',s=statsFor({type:ui.selectedType,level:1});circle(c,p.x,p.y,s.range,color+'0d',color+'60');circle(c,p.x,p.y,25,color+'40',color);c.globalAlpha=.6;facility(c,{type:ui.selectedType,level:1,x:p.x,y:p.y,angle:0},color,t);c.globalAlpha=1;}
 for(const f of state.facilities){facility(c,f,playerColor(f.owner),t);health(c,f,34,f.y-34);}
 const prev=new Map((previous?.mapIndex===state.mapIndex?previous.enemies:[]||[]).map(e=>[e.id,e]));
 for(const e of state.enemies){const p=prev.get(e.id),v=p?{...e,x:p.x+(e.x-p.x)*interpolation,y:p.y+(e.y-p.y)*interpolation}:e;enemy(c,v,t);}
 for(const s of state.soldiers)soldier(c,s,playerColor(s.owner),t);
 if(ui.effects>0){for(const [i,e]of state.effects.entries()){if(ui.effects<1&&i%3!==0)continue;const age=t-e.born;if(age<0||age>1.2)continue;c.save();c.globalAlpha=Math.max(0,1-age/(e.kind==='damage'?1.1:.5));
  if(e.kind==='damage'){text(c,`${e.critical?'! ':''}${e.value}`,e.x,e.y-23-age*25,e.critical?'#a7440f':'#243c24',e.critical?19:13,'center');}
  else if(e.kind==='playerShot'||e.kind==='shot'||e.kind==='rail'||e.kind==='ice'){line(c,e.x,e.y,e.tx,e.ty,e.color||'#f7d997',e.kind==='rail'?4:1.5);circle(c,e.x,e.y,6,e.color+'90');circle(c,e.tx,e.ty,4,'#f3e0ab');}
  else if(e.kind==='chain'){c.beginPath();c.moveTo(e.x,e.y);for(let k=1;k<=6;k++){const ratio=k/6;c.lineTo(e.x+(e.tx-e.x)*ratio+(k<6?Math.sin(k*17)*10:0),e.y+(e.ty-e.y)*ratio+(k<6?Math.cos(k*11)*10:0));}c.strokeStyle=e.color;c.lineWidth=3;c.stroke();}
  else if(e.kind==='blast'){line(c,e.x,e.y,e.tx,e.ty,e.color,2);circle(c,e.tx,e.ty,8+age*95,e.color+'60',e.color);circle(c,e.tx,e.ty,4+age*55,'#ffd5a080');}
  else if(e.kind==='flame'){line(c,e.x,e.y,e.tx,e.ty,'#ff8b4e70',12);circle(c,e.tx,e.ty,10+age*20,'#ffb45e60');}
  else if(e.kind==='death'){for(let k=0;k<5;k++){const a=k*1.25;circle(c,e.x+Math.cos(a)*age*30,e.y+Math.sin(a)*age*30,3,e.color);}}
  else if(e.kind==='nuke'){circle(c,600,360,40+age*1000,null,'#f8d68a');circle(c,600,360,25+age*750,'#e4ad4b16','#f9bb85');text(c,'핵폭탄 · 보스 제외 전장 정리',600,90,'#f7dcb1',22,'center');}
  else if(e.kind==='spawn')circle(c,e.x,e.y,10+age*40,null,e.color);
  else if(e.kind==='claw')line(c,e.x-7,e.y-7,e.x+7,e.y+7,e.color,3);
  c.restore();}}
 c.textAlign='left';c.globalAlpha=1;
}

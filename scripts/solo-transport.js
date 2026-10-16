// Downloadable offline practice uses the same rules with an in-memory profile.
import {createGame,addPlayer,command,snapshot} from '../server/game.js';
import {advance} from '../server/combat.js';
import {MemoryProfiles} from '../shared/profiles.js';
const values=new Map(),profiles=new MemoryProfiles();
export const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
export const sessionStorage=localStorage;
export class WebSocket{
 static OPEN=1;
 constructor(){this.readyState=1;this.game=createGame();this.frame=0;this.timer=null;this.auth=null;this.joined=false;queueMicrotask(()=>this.onopen?.());}
 emit(message){this.onmessage?.({data:JSON.stringify(message)});}
 settle(){for(const e of this.game.rewardEvents)if(e.status!=='saved'){const r=profiles.settle(this.auth.token,e.id,e);if(r.ok){e.status='saved';this.emit({type:'profile',profile:r.profile});}}}
 send(raw){const m=JSON.parse(raw);
  if(m.type==='hello'){this.auth=profiles.open(this.auth?.token||m.profileToken);this.emit({type:'profile',...this.auth});}
  else if(m.type==='join'){this.auth=profiles.open(this.auth?.token);addPlayer(this.game,'solo',m.nickname,this.auth.profile);this.joined=true;this.emit({type:'joined',roomId:'solo',playerId:'solo',token:''});this.emit({type:'state',state:snapshot(this.game)});this.timer=setInterval(()=>{advance(this.game,.05);this.settle();if(++this.frame%2===0)this.emit({type:'state',state:snapshot(this.game)});},50);}
  else if(m.type==='action'){const result=command(this.game,'solo',m.action);if(!result.ok)this.emit({type:'error',message:result.error});this.settle();this.emit({type:'state',state:snapshot(this.game)});}
  else if(m.type==='leave'){clearInterval(this.timer);this.joined=false;this.game=createGame();this.emit({type:'left'});this.emit({type:'profile',profile:profiles.open(this.auth.token).profile});}
  else if(['purchase','equip'].includes(m.type)){if(m.type==='equip'&&this.joined&&!this.game.outcome){this.emit({type:'error',message:'장착은 전투 종료 후 변경하세요.'});return;}const r=m.type==='purchase'?profiles.purchase(this.auth.token,m.tower):profiles.equip(this.auth.token,m.ids);this.emit(r.ok?{type:'profile',profile:r.profile}:{type:'error',message:r.error});}
 }
 close(){clearInterval(this.timer);this.readyState=3;this.onclose?.();}
}

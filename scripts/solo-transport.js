// Use the same game rules in the browser for the downloadable solo edition.
import {createGame,addPlayer,command,snapshot} from '../server/game.js';
import {tick} from '../server/combat.js';
const values=new Map();
export const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
export const sessionStorage=localStorage;
export class WebSocket{
 static OPEN=1;
 constructor(){this.readyState=1;this.game=createGame();this.frame=0;this.timer=null;queueMicrotask(()=>this.onopen?.());}
 emit(message){this.onmessage?.({data:JSON.stringify(message)});}
 send(raw){const m=JSON.parse(raw);
  if(m.type==='join'){addPlayer(this.game,'solo',m.nickname);this.emit({type:'joined',roomId:'solo',playerId:'solo',token:''});this.emit({type:'state',state:snapshot(this.game)});
   this.timer=setInterval(()=>{tick(this.game,.05);if(++this.frame%2===0)this.emit({type:'state',state:snapshot(this.game)});},50);
  }else if(m.type==='action'){const result=command(this.game,'solo',m.action);if(!result.ok)this.emit({type:'error',message:result.error});this.emit({type:'state',state:snapshot(this.game)});}
 }
 close(){clearInterval(this.timer);this.readyState=3;this.onclose?.();}
}

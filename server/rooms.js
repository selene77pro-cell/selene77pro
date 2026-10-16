import {randomBytes,randomInt} from 'node:crypto';
import {createGame,addPlayer} from './game.js';
const random=()=>randomBytes(18).toString('hex');
export class RoomManager{
 constructor({now=()=>Date.now()}={}){this.rooms=new Map();this.now=now;}
 join({roomId,nickname,token}={}){
  if(typeof nickname!=='string'||!nickname.trim()||nickname.trim().length>16)return {ok:false,error:'닉네임은 1~16자로 입력해 주세요.'};
  this.sweep();let room;
  if(roomId){if(typeof roomId!=='string')return {ok:false,error:'잘못된 방 코드입니다.'};roomId=roomId.trim();if(!/^(?:[a-f0-9]{12}|[0-9]{6})$/.test(roomId))return {ok:false,error:'방 코드는 6자리 숫자입니다.'};room=this.rooms.get(roomId)||[...this.rooms.values()].find(r=>r.code===roomId);if(!room)return {ok:false,error:'방이 없거나 종료되었습니다. 새 방을 만들어 주세요.'};}
  else {if(token)return {ok:false,error:'방 정보가 필요합니다.'};if(this.rooms.size>=100)return {ok:false,error:'방이 가득 찼습니다. 잠시 후 다시 시도해 주세요.'};let code;do{code=String(randomInt(100000,1000000));}while([...this.rooms.values()].some(r=>r.code===code));room={id:randomBytes(6).toString('hex'),code,game:createGame(),sessions:new Map(),touched:this.now()};this.rooms.set(room.id,room);}
  if(token){const session=room.sessions.get(token);if(!session||session.disconnectedAt!==null&&this.now()-session.disconnectedAt>120000)return {ok:false,error:'재접속 시간이 지났습니다. 새로 입장해 주세요.'};if(session.disconnectedAt===null)return {ok:false,error:'이미 접속한 플레이어입니다.'};session.disconnectedAt=null;room.game.players[session.id].connected=true;return {ok:true,room,playerId:session.id,token};}
  if(Object.keys(room.game.players).length>=4)return {ok:false,error:'최대 4명까지 입장할 수 있습니다.'};
  const playerId=randomBytes(6).toString('hex');token=random();addPlayer(room.game,playerId,nickname.trim());room.sessions.set(token,{id:playerId,disconnectedAt:null});room.touched=this.now();return {ok:true,room,playerId,token};
 }
 disconnect(roomId,playerId){const room=this.rooms.get(roomId);if(!room)return;for(const s of room.sessions.values())if(s.id===playerId){s.disconnectedAt=this.now();if(room.game.players[playerId])room.game.players[playerId].connected=false;}room.touched=this.now();}
 sweep(){for(const [id,r]of this.rooms){for(const [token,s]of r.sessions){if(s.disconnectedAt!==null&&this.now()-s.disconnectedAt>120000){delete r.game.players[s.id];r.game.facilities=r.game.facilities.filter(f=>f.owner!==s.id);r.game.soldiers=r.game.soldiers.filter(v=>v.owner!==s.id);r.sessions.delete(token);}}if(!r.sessions.size&&this.now()-r.touched>120000)this.rooms.delete(id);}}
}

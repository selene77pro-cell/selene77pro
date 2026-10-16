import {randomBytes,randomInt} from 'node:crypto';
import {createGame,addPlayer} from './game.js';
const random=()=>randomBytes(18).toString('hex');
export class RoomManager{
 constructor({now=()=>Date.now()}={}){this.rooms=new Map();this.now=now;}
 join({roomId,nickname,token,profile}={}){
  if(typeof nickname!=='string'||!nickname.trim()||nickname.trim().length>16)return {ok:false,error:'닉네임은 1~16자로 입력해 주세요.'};
  this.sweep();let room;
  if(roomId){if(typeof roomId!=='string')return {ok:false,error:'잘못된 방 코드입니다.'};roomId=roomId.trim();if(!/^(?:[a-f0-9]{12}|[0-9]{6})$/.test(roomId))return {ok:false,error:'방 코드는 6자리 숫자입니다.'};room=this.rooms.get(roomId)||[...this.rooms.values()].find(r=>r.code===roomId);if(!room)return {ok:false,error:'방이 없거나 종료되었습니다. 새 방을 만들어 주세요.'};}
  else {if(token)return {ok:false,error:'방 정보가 필요합니다.'};if(this.rooms.size>=100)return {ok:false,error:'방이 가득 찼습니다. 잠시 후 다시 시도해 주세요.'};let code;do{code=String(randomInt(100000,1000000));}while([...this.rooms.values()].some(r=>r.code===code));room={id:randomBytes(6).toString('hex'),code,game:createGame(),sessions:new Map(),touched:this.now()};this.rooms.set(room.id,room);}
  if(token){const session=room.sessions.get(token);if(!session||session.disconnectedAt!==null&&this.now()-session.disconnectedAt>120000)return {ok:false,error:'재접속 시간이 지났습니다. 새로 입장해 주세요.'};if(session.disconnectedAt===null)return {ok:false,error:'이미 접속한 플레이어입니다.'};session.disconnectedAt=null;room.game.players[session.id].connected=true;if(!room.game.players[room.game.hostId]?.connected)room.game.hostId=session.id;return {ok:true,room,playerId:session.id,token};}
  if(Object.keys(room.game.players).length>=4)return {ok:false,error:'최대 4명까지 입장할 수 있습니다.'};
  if(profile&&Object.values(room.game.players).some(p=>p.profileId===profile.id))return {ok:false,error:'같은 프로필이 이미 이 방에 있습니다. 기존 방 링크로 재접속해 주세요.'};
  const playerId=randomBytes(6).toString('hex');token=random();addPlayer(room.game,playerId,nickname.trim(),profile);if(!room.game.players[room.game.hostId]?.connected)room.game.hostId=playerId;room.sessions.set(token,{id:playerId,disconnectedAt:null});room.touched=this.now();return {ok:true,room,playerId,token};
 }
 disconnect(roomId,playerId){const room=this.rooms.get(roomId);if(!room)return;for(const s of room.sessions.values())if(s.id===playerId){s.disconnectedAt=this.now();if(room.game.players[playerId])room.game.players[playerId].connected=false;}if(room.game.hostId===playerId)room.game.hostId=Object.values(room.game.players).find(p=>p.connected)?.id||playerId;room.touched=this.now();}
 leave(roomId,playerId){const r=this.rooms.get(roomId);if(!r)return;delete r.game.players[playerId];r.game.facilities=r.game.facilities.filter(f=>f.owner!==playerId);r.game.soldiers=r.game.soldiers.filter(s=>s.owner!==playerId);for(const [key,s]of r.sessions)if(s.id===playerId)r.sessions.delete(key);r.game.hostId=Object.values(r.game.players).find(p=>p.connected)?.id||null;r.touched=this.now();}
 sweep(){for(const [id,r]of this.rooms){for(const [token,s]of r.sessions){if(s.disconnectedAt!==null&&this.now()-s.disconnectedAt>120000){delete r.game.players[s.id];r.game.facilities=r.game.facilities.filter(f=>f.owner!==s.id);r.game.soldiers=r.game.soldiers.filter(v=>v.owner!==s.id);r.sessions.delete(token);}}if(!r.sessions.size&&this.now()-r.touched>120000)this.rooms.delete(id);}}
}

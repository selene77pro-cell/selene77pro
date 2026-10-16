import {mkdirSync,readFileSync,existsSync,writeFileSync,renameSync} from 'node:fs';import {join} from 'node:path';
import {MemoryProfiles} from '../shared/profiles.js';
export class ProfileStore extends MemoryProfiles{
 constructor({directory=null}={}){super();this.directory=directory;if(!directory)return;mkdirSync(directory,{recursive:true});this.file=join(directory,'profiles.json');if(existsSync(this.file)){try{const raw=readFileSync(this.file,'utf8');if(raw.length>16000000)throw Error('size');const records=JSON.parse(raw);if(!records||Array.isArray(records)||typeof records!=='object')throw Error('shape');for(const p of Object.values(records))if(typeof p.id!=='string'||!Number.isSafeInteger(p.pp)||p.pp<0||!['owned','equipped','receipts','clearedTiers'].every(k=>Array.isArray(p[k])))throw Error('profile');this.records=records;}catch{throw Error('프로필 저장 파일을 읽을 수 없습니다. 기존 파일을 보존하고 복구하세요.');}}}
 persist(records){if(!this.directory)return;const data=JSON.stringify(records);if(data.length>16000000)throw Error('profile size');writeFileSync(this.file+'.tmp',data,{mode:0o600});renameSync(this.file+'.tmp',this.file);}
}

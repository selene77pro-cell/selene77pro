import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const result=await build({absWorkingDir:root,entryPoints:['public/app.js'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022',inject:[resolve(root,'scripts/solo-transport.js')],plugins:[{name:'shared-browser-path',setup(b){b.onResolve({filter:/^\/shared\//},args=>({path:resolve(root,args.path.slice(1))}));}}]});
let html=await readFile(resolve(root,'public/index.html'),'utf8');
const css=(await readFile(resolve(root,'public/styles.css'),'utf8')).replace("@import url('/fonts.css');",'');
html=html.replace('<link rel="stylesheet" href="/styles.css">',`<style>${css}</style>`)
 .replace('<link rel="icon" href="/icon.svg" type="image/svg+xml">','')
 .replace('<script type="module" src="/app.js"></script>',`<script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`)
 .replaceAll('href="/"','href="?"')
 .replace('id="room-copy"','id="room-copy" disabled')
 .replace('id="room-code"','id="room-code" disabled')
 .replace('id="share" class="outline"','id="share" class="outline" disabled')
 .replace('↗ 친구 초대','1인 체험판')
 .replace('01—04 생존자','1인 플레이')
 .replace('실시간 협동','오프라인 체험')
 .replace('도시는 무너졌다. 아직, 우리는 남아 있다.','다운로드해서 바로 플레이하는 1인 체험판.')
 .replace('기지를 세우고 동료를 모아 몰려오는 감염자를 막아라.','기지를 세우고 몰려오는 감염자를 막아라.')
 .replace('방 코드를 비우면 새 방 생성 · 친구 코드를 입력하면 같은 방 입장','서버·설치 없이 실행됩니다. 창을 닫으면 진행은 초기화됩니다.')
 .replace('방어 시스템 온라인','1인 오프라인 체험판');
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/last-outpost-solo.html'),html);
await writeFile(resolve(root,'play-solo.html'),html);
console.log('Built dist/last-outpost-solo.html (self-contained offline solo game)');

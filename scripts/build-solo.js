import {build} from 'esbuild';
import {soloZip} from './solo-zip.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const result=await build({absWorkingDir:root,entryPoints:['public/app.js'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2020',inject:[resolve(root,'scripts/solo-transport.js')],plugins:[{name:'shared-browser-path',setup(b){b.onResolve({filter:/^\/shared\//},args=>({path:resolve(root,args.path.slice(1))}));}}]});
let html=await readFile(resolve(root,'public/index.html'),'utf8');
const iconData='data:image/png;base64,'+(await readFile(resolve(root,'public/qqu-icon.png'))).toString('base64');
const css=(await readFile(resolve(root,'public/styles.css'),'utf8')).replace("@import url('/fonts.css');",'').replace("url('/qqu-icon.png')",()=>`url('${iconData}')`);
html=html.replace('<link rel="stylesheet" href="/styles.css">',`<style>${css}</style>`)
 .replace('<link rel="icon" href="/qqu-icon.png" type="image/png">','')
 .replace('<script type="module" src="/app.js"></script>',`<script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`)
 .replaceAll('href="/"','href="?"')
 .replace('id="room-copy"','id="room-copy" disabled')
 .replace('id="room-code"','id="room-code" disabled')
 .replace('id="share" class="outline"','id="share" class="outline" disabled')
 .replace('카톡으로 초대','1인 체험판')
 .replace('01—04 생존자','1인 플레이')
 .replace('실시간 협동','오프라인 체험')
 .replace('도시는 무너졌다. 아직, 우리는 남아 있다.','다운로드해서 바로 플레이하는 1인 체험판.')
 .replace('기지를 세우고 동료를 모아 몰려오는 감염자를 막아라.','기지를 세우고 몰려오는 감염자를 막아라.')
 .replace('방 코드를 비우면 새 방 생성 · 친구 코드를 입력하면 같은 방 입장','서버·설치 없이 실행됩니다. 창을 닫으면 진행은 초기화됩니다.')
 .replace('방어 시스템 온라인','1인 오프라인 체험판');
html=html.replace(/<title>[^<]*<\/title>/,'<title>뀨겜1 · 휴대폰 수정판</title>')
 .replaceAll('<small>최후의 방어선</small>','<small>최후의 방어선 <b class="color-version">색상 수정판 V2</b></small>')
 .replace('30스테이지 성장','30스테이지 성장 · 색상 수정판 V2');
html=html.replace('</style>','\n.color-version{display:inline-block;background:#526c43;color:#fff4d4;padding:3px 6px;border-radius:3px;font:bold 11px Arial;letter-spacing:0;margin-left:5px}@media(max-width:900px){.brand .color-version{font-size:9px;padding:2px 4px}}\n</style>');
// A readable status stays visible when the viewer blocks scripts entirely.
const bootstrap=await readFile(resolve(root,'scripts/offline-bootstrap.js'),'utf8');
html=html.replace('<script>',()=>`<script>${bootstrap}</script><script>`)
 .replace('<p id="join-error"', '<p id="offline-status" role="status" class="offline-status">게임 실행 확인 중 · 이 문구가 계속 보이고 실행되지 않으면 파일 보기 앱에서 스크립트 실행이 차단됐을 수 있습니다. Chrome이나 삼성 인터넷으로 열어 주세요.</p><noscript><p class="offline-status error">이 앱은 JavaScript 실행을 꺼두어 게임을 시작할 수 없습니다. 브라우저로 열어 주세요.</p></noscript><p id="join-error"')
 .replaceAll('색상 수정판 V2','뀨겜1 · 휴대폰 수정판')
 .replace('</style>','\n.offline-status{font-size:13px;line-height:1.7;padding:10px;background:#dce5d0;color:#284427;border:1px solid #7e946b;border-radius:4px}.offline-status.error{background:#f1d5c1;color:#762c20;border-color:#b76548}\n</style>');
await writeFile(resolve(root,'뀨겜1.html'),html);
await writeFile(resolve(root,'뀨겜1.zip'),soloZip('뀨겜1.html',html));
await writeFile(resolve(root,'play-solo-color-v2.html'),html);
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/last-outpost-solo.html'),html);
await writeFile(resolve(root,'play-solo.html'),html);
console.log('Built dist/last-outpost-solo.html (self-contained offline solo game)');

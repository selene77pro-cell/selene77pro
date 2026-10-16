import {CATALOG,LEVELS,statsFor,upgradeCost,unlocked} from '/shared/catalog.js';
import {DIFFICULTIES} from '/shared/progression.js';
import {WEAPONS} from '/shared/weapons.js';
import {MAPS} from '/shared/maps.js';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions={attack:'접근하는 감염자를 자동으로 공격합니다.',spawn:'군인이 자동 출격해 적을 추격하고 전투합니다.',bank:'웨이브 완료 시 소유자에게 찌를 지급합니다.',support:'주변 아군의 전투를 지원합니다.'};
export function facilityIcon(type,level=1){const c=CATALOG[type],barrel=level>2?'M23 18V3M17 18V5M29 18V5':'M23 18V3';let shape;
 if(c.kind==='bank')shape='<path d="M6 17 23 5 40 17ZM9 37h28M12 19v14m11-14v14m11-14v14"/><text x="23" y="28" text-anchor="middle" font-size="12" fill="currentColor" stroke="none">찌</text>';
 else if(c.kind==='spawn')shape='<path d="M6 36V18L23 7l17 11v18ZM17 36V22h13v14M8 17h30"/><path d="M23 12v7M19 15h8"/>';
 else if(type==='medic')shape='<path d="M6 12h34v26H6zM18 18h10v5h5v9h-5v5H18v-5h-5v-9h5z"/>';
 else if(type==='supply')shape='<path d="M5 15 23 6l18 9v22H5ZM5 15h36M23 15v22M15 20h16"/>';
 else if(type==='tesla'||type==='plasma'||type==='frost')shape='<path d="M10 37h27L30 24H17ZM23 23V8"/><circle cx="23" cy="10" r="7"/><path d="m19 7 6-4-3 6 5 1-7 8 2-7-5-1"/>';
 else if(type==='mortar'||type==='missile')shape='<path d="M9 37h29L32 26H15ZM19 27 10 9l9-5 12 21ZM27 24 21 9l9-4 8 20Z"/>';
 else shape=`<path d="M8 37h30l-3-10H11ZM15 27V17h16v10"/><path d="${barrel}"/>`;
 return `<svg viewBox="0 0 46 44" aria-hidden="true" fill="none" stroke="${c.color}" stroke-width="2.4" stroke-linecap="square">${shape}</svg>`;
}
let toastTimer;
export function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
export function bindUI({send,onSelection,onEffects,onFilter}){
 $('start-wave').onclick=()=>send({type:'start'});
 $('effects').onchange=e=>onEffects(Number(e.target.value));
 $('filters').onclick=e=>{const button=e.target.closest('[data-filter]');if(!button)return;for(const b of $('filters').children)b.classList.toggle('active',b===button);onFilter(button.dataset.filter);};
 $('build-list').onclick=e=>{const b=e.target.closest('[data-facility]');if(b&&!b.disabled)onSelection({type:b.dataset.facility});};
 $('detail').onclick=e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)send({type:b.dataset.action,id:b.dataset.id});};
}
export function updateUI(state,ui){
 const me=state.players.find(p=>p.id===ui.playerId);if(!me)return;
 $('map-name').textContent=MAPS[state.mapIndex].name;$('sector-label').textContent=`SECTOR ${String(state.mapIndex+1).padStart(2,'0')} / ${MAPS[state.mapIndex].subtitle}`;
 $('money').textContent=`${me.money.toLocaleString('ko-KR')} 찌`;$('wave').textContent=String(state.wave).padStart(2,'0');
 $('phase').textContent={lobby:'대기',prep:'준비',wave:'방어',over:'종료',victory:'승리'}[state.phase];$('base-number').textContent=`${state.baseHp}%`;$('base-fill').style.width=`${state.baseHp}%`;
 $('members').textContent=`${state.players.length} / 4`;$('facility-count').textContent=`${state.facilities.length} / 100 시설`;
 const playerHTML=state.players.map((p,i)=>`<div class="player ${p.connected?'':'offline'}"><span class="avatar">0${i+1}</span><span class="player-name">${esc(p.name)}<small>${p.connected?'작전 수행 중':'재접속 대기'}</small></span>${p.id===ui.playerId?'<span class="you">YOU</span>':''}<span class="muted">${p.kills} K</span></div>`).join('');
 if($('players').innerHTML!==playerHTML)$('players').innerHTML=playerHTML;
 const boss=state.enemies.find(e=>e.boss);$('boss-bar').hidden=!boss;if(boss){$('boss-name').textContent=`${MAPS[state.mapIndex].name} · ${boss.ability} 보스`;$('boss-health').textContent=`${Math.ceil(boss.hp)} / ${boss.maxHp}`;$('boss-fill').style.width=`${boss.hp/boss.maxHp*100}%`;}
 $('wave-banner').hidden=!['lobby','prep'].includes(state.phase);$('wave-banner').classList.toggle('prep',state.phase==='prep');$('banner-title').textContent=state.phase==='prep'?`WAVE ${state.wave+1} · ${Math.ceil(state.timer)}초 후 시작`:'작전 준비';$('start-wave').hidden=state.phase!=='lobby';
 $('game-over').hidden=!state.outcome;$('outcome-title').textContent=state.outcome==='victory'?'전 난이도 정복':'방어선 붕괴';const rewards=(state.rewards||[]).filter(e=>e.playerId===ui.playerId);$('reward-result').textContent=rewards.length?`이번 보상 ${rewards.reduce((s,e)=>s+e.pp,0)}뿌 · ${rewards.some(e=>e.error)?'저장 실패 · 재시도 중, 서버를 켜두세요':rewards.some(e=>e.status!=='saved')?'저장 중…':'저장 완료'}`:'';$('final-score').textContent=`${state.wave} 웨이브 도달 · 감염자 ${state.kills} 처치`;
 $('placement-hint').textContent=ui.selectedType?`${CATALOG[ui.selectedType].name} · 빈 공간을 눌러 건설`:'시설 선택 → 빈 공간에 배치';
 const cards=Object.entries(CATALOG).filter(([id])=>me.loadout.includes(id)).filter(([id,c])=>ui.filter==='all'||(ui.filter==='economy'?['bank','support'].includes(c.kind):c.kind===ui.filter)).map(([id,c])=>{
  const locked=!unlocked(state.completedWave,id);return `<button class="build-card ${ui.selectedType===id?'selected':''}" data-facility="${id}" ${locked?'disabled':''} title="${esc(c.name)} · ${c.cost} 찌${locked?' · '+c.unlockWave+'웨이브 클리어 해금':''}"><span class="facility-icon">${facilityIcon(id)}</span><strong>${c.name}</strong><span class="price">${c.cost.toLocaleString()} 찌</span>${locked?`<span class="unlock">🔒 W${c.unlockWave}</span>`:''}</button>`;
 }).join('');
 if($('build-list').innerHTML!==cards){const x=$('build-list').scrollLeft;$('build-list').innerHTML=cards;$('build-list').scrollLeft=x;}
 $('intel-text').textContent=['일반·질주: 빠른 적은 연사로 막으세요.','거대: 체력이 높아 저격·집중 공격이 유리합니다.','장갑: 피해를 줄여 받습니다. 관통 공격이 유리합니다.','분열: 죽으면 작은 좀비 3마리가 나옵니다. 범위 공격을 준비하세요.','재생: 체력을 회복합니다. 화염으로 회복을 억제하세요.'][state.mapIndex]+(state.difficulty>0?' 화염·냉기·전기 아이콘은 해당 저항을 나타냅니다.':'');
 $('difficulty').textContent=DIFFICULTIES[state.difficulty||0].name;$('region-progress').textContent=`지역 ${state.outcome==='victory'?5:(state.mapsCleared||0)%5+1} / 5`;
 for(const b of document.querySelectorAll('[data-speed]')){b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===state.speed));b.disabled=state.hostId!==ui.playerId||!!state.outcome;}
 const selectedWeapon=$('weapon-choice').value,w=WEAPONS[selectedWeapon],owned=me.weapons.includes(selectedWeapon);$('weapon-buy').dataset.buyWeapon=selectedWeapon;$('weapon-buy').textContent=owned?'보유 무기 장착':`구매 · ${w.price.toLocaleString()}찌`;$('weapon-buy').disabled=!!state.outcome||(!owned&&me.money<w.price);
 $('fire-toggle').textContent=me.firing?'발사 중지':`발사 시작${me.weapon?' · '+WEAPONS[me.weapon].name:''}`;$('fire-toggle').disabled=!me.weapon||!!state.outcome;$('fire-toggle').classList.toggle('firing',me.firing);
 $('nuke').textContent=state.nukeCooldown>0?`핵폭탄 · ${Math.ceil(state.nukeCooldown)}초 대기`:'핵폭탄 · 5000찌';$('nuke').disabled=me.money<5000||state.nukeCooldown>0||!!state.outcome;
 const notice=[...(state.effects||[])].reverse().find(e=>['waveClear','tier','notice'].includes(e.kind));$('wave-notice').hidden=!notice;if(notice)$('wave-notice').textContent=notice.text;
 const f=state.facilities.find(f=>f.id===ui.selectedId),type=f?.type||ui.selectedType;
 if(!type){if(!$('detail').querySelector('.empty-detail'))$('detail').innerHTML='<div class="empty-detail"><span>⌖</span><h3>방어선을 설계하세요</h3><p>아래에서 시설을 선택해 배치하거나<br>건설한 시설을 눌러 강화하세요.</p></div>';return;}
 const c=CATALOG[type],s=f?statsFor(f):statsFor({type,level:1}),mine=!f||f.owner===ui.playerId,next=f&&f.level<4?statsFor({...f,level:f.level+1}):null;
 const row=(label,a,b)=>`<div class="stat-row"><span>${label}</span><b>${a}${b?` <span>→ ${b}</span>`:''}</b></div>`;
 let stats=c.kind==='bank'?row('웨이브 수익',`${s.income} 찌`,next?`${next.income} 찌`:null):c.kind==='support'?row(c.heal?'초당 회복':'공격력 지원',c.heal?s.heal.toFixed(0):`${Math.round((s.buff-1)*100)}%`,next?(c.heal?next.heal.toFixed(0):`${Math.round((next.buff-1)*100)}%`):null):row('공격력',s.damage,next?.damage)+row(c.kind==='spawn'?'병사 체력':'사거리',c.kind==='spawn'?s.hp:Math.round(s.range),next?(c.kind==='spawn'?next.hp:Math.round(next.range)):null);
 const html=`<div class="detail-icon">${facilityIcon(type,f?.level)}</div><span class="level">${f?`LEVEL 0${f.level} / ${LEVELS[f.level-1]}`:'시설 배치'}</span><h3>${c.name}</h3><p class="desc">${descriptions[c.kind]}</p>${stats}${f?(mine?(next?`<button class="primary" data-action="upgrade" data-id="${f.id}" ${me.money<upgradeCost(f)?'disabled':''}>강화 · ${upgradeCost(f).toLocaleString()} 찌 <span>↑</span></button>`:'<p class="level">최종 강화 완료</p>')+`<button class="sell" data-action="sell" data-id="${f.id}">판매 · ${Math.floor(f.invested*.75).toLocaleString()} 찌 반환</button>`:'<p class="level">친구의 시설</p>'):`<p class="level">건설 비용 ${c.cost.toLocaleString()} 찌</p><p class="tiny">전장의 빈 공간을 눌러 배치하세요.<br>경로와 건물 위에는 건설할 수 없습니다.</p>`}`;
 if($('detail').innerHTML!==html)$('detail').innerHTML=html;
}

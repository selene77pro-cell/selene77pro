# Progression and Player Weapons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 1~4인 게임에 난이도·보상·인벤토리와 직접 무기 조작, 좀비 다양성, 배속, 음향을 통합한다.

**Architecture:** 기존 Node/WebSocket 서버의 판정을 유지하고 공유 데이터·전투·영구 프로필·브라우저 UI를 분리한다. 단일 서버의 원자적 파일 저장으로 보상과 구매를 검증하며 기존 방 코드·재접속은 유지한다.

**Tech Stack:** Node.js 24+, JavaScript ES modules, ws, Canvas, Web Audio, node:test, Playwright, esbuild.

**Spec:** `docs/superpowers/specs/2026-10-16-progression-design.md`

## Global Constraints

- 기존 격리 체크아웃과 work 브랜치를 사용한다. 새 worktree는 만들지 않는다.
- 1~4인, 별명·6자리 방 코드, 2분 실제 시간 재접속, 개인 소유 시설·찌를 유지한다.
- 전투 돈은 찌, 영구 클리어·실패 보상은 뿌. 클릭당 1찌, 뿌 전환 금지.
- 총은 1000찌부터, 별도 발사 시작/중지, 게임 시간 1초 간격. 핵폭탄은 5000찌, 보스 제외 즉사, 30게임초 공동 대기.
- 기본 18종 시설·4단계 강화 유지, 난이도별 추가 4종, 설치 총 100개, 병사 시설당 4명.
- 난이도 4개 × 맵 5개 × 10웨이브, 마지막 전체 승리. 적 최대 200개와 대기 분열 출생을 구분한다.
- 1/2/3배속, 화염·냉기·전기 저항과 6종 좀비. 완전 원소 면역과 무한 재분열 금지.
- 음악 25%, 효과음 50%, 동시 효과음 최대 12개. 오디오 불가도 입장·전투를 막지 않는다.
- 기존 사용자 PC의 작전 시작 오류는 미진단이다. 로컬 브라우저 검증 성공을 해당 PC의 해결로 표현하지 않는다.
- Sites 게시 도구 없음. 코드·ZIP·GitHub 게시와 실제 공개 게임 배포를 구분한다.

## Review Focus

- 빠른 중복 구매·동시 핵폭탄·중복 결과 이벤트가 잔액을 두 번 차감·지급하지 않는가: Tasks 2, 4, 5, 6.
- 서버 재시작·저장 실패·손상 파일에서 뿌와 구매 기록을 잃거나 성공으로 오인하지 않는가: Task 2.
- 3배속과 다중 분열 시 상한·지속 피해·웨이브 종료·보스 제외가 유지되는가: Tasks 3–5.
- 전장 클릭은 드래그/버튼과 구분되고 빠른 시설 선택을 덮어쓰지 않는가: Task 7.
- 오디오 차단·새로고침·옛 방 링크·네 명 접속에서 1인 시작과 기존 자리 복원이 가능한가: Tasks 6–8.

## Task 1: 성장·무기·좀비 공유 데이터

**Files:** create `shared/progression.js`, `shared/weapons.js`, `shared/enemies.js`, `tests/catalogs.test.js`; modify `shared/catalog.js`, `tests/game.test.js`.

**Interfaces:** `DIFFICULTIES` has name, hp/attack/count multipliers and clearReward; `BONUS_TOWERS` has unlockTier and ppCost; `WEAPONS` has price, damage, interval, attack kind; `ENEMY_TYPES` and `ELEMENTS` define size/hp/speed and resistance. `BASE_FACILITIES` is the original 18 IDs, independent of total CATALOG length. Existing `statsFor`/`upgradeCost` remain compatible.

- [ ] Write tests asserting the exact spec tables, 18 base/22 total facilities, all four upgrade stages and price units, 1-second gun intervals, and no prototype-key lookups.
- [ ] Run `node --test --test-isolation=none tests/catalogs.test.js`; confirm missing implementation fails.
- [ ] Implement the three catalogs, bonus facilities and safe identifier helpers. Keep base facility tests about the original set rather than pretending no expansion occurred.
- [ ] Run `npm test`; require green, then commit.

## Task 2: 원자적 영구 프로필·상점·장착

**Files:** create `server/profiles.js`, `tests/profiles.test.js`; modify `.gitignore`, `Dockerfile`.

**Interfaces:** `new ProfileStore({directory})`; `open(token?) -> {token, profile}`; `purchase(token, towerId) -> {ok, profile, error?}`; `equip(token, ids) -> {ok, profile, error?}`; `settle(token, eventId, {pp, clearedTier?}) -> {ok, profile, error?}`. Public profile contains id, pp, clearedTiers, owned, equipped; never includes token. Core store operations are synchronous transactions using write-temp/rename before publishing in-memory changes.

- [ ] Write tests for 0 starting 뿌; guarded tier purchases at 200/400/800/1600; duplicate purchase no double charge; mandatory starter facilities; unknown IDs and negative amounts rejected; eventId idempotency; concurrent sequential operations; disk failure leaves prior wallet unchanged; reopening store restores all data; corrupt existing JSON raises a clear error and is not overwritten; no token in public output.
- [ ] Run the profile tests and observe RED.
- [ ] Implement store and size bounds, random opaque tokens, persistent event receipts, file mode 0600, default `data/` (ignored), configurable `OUTPOST_DATA_DIR`. Prepare a writable `/app/data` directory owned by node in Docker. Do not introduce a service account or external DB.
- [ ] Run `npm test`; require green, then commit.

## Task 3: 근접 병사·배속·좀비 속성·분열

**Files:** modify `server/combat.js`, `server/game.js`, `public/renderer.js`; create `server/enemies.js`, `tests/enemies.test.js`; extend `tests/combat.test.js`.

**Interfaces:** `spawnEnemy(game, boss=false, overrides={})`; `damageEnemy(game, enemy, amount, owner, options={element, critical, pierce, suppressSplit})`; `advance(game, wallDt)` loops fixed simulation substeps using game.speed; existing `tick(game, dt)` remains an unscaled substep. `game.pendingChildren` stores deferred spawns with original progress and bounded depth. `command(...,{type:'speed',value})` validates host and 1/2/3 only.

- [ ] Write tests for exact size/hp/speed multipliers, armor/pierce and independent elemental resistance, fire preventing regeneration, one-generation split with unchanged path progress and conserved total reward, 200 live cap, deferred children blocking completion. Test barracks soldiers walk into contact before damage while heavy/drone/tank remain ranged; death and upgraded spawn stats remain correct.
- [ ] Write tests that one second at 3× advances three seconds with no skipped attacks, spawn events or burn ticks, and that speed does not alter click value or wall-clock reconnect timers. Host fallback after disconnect must authorize one connected player.
- [ ] Run targeted tests and confirm RED.
- [ ] Implement safe substeps, typed attacks and close-combat effects. Renderer uses enemy size and element icon/text, and keeps existing healthbars and damage effects.
- [ ] Run `npm test`; require green, then commit.

## Task 4: 난이도 진행과 중복 없는 정산

**Files:** create `server/progression.js`, `tests/progression.test.js`; modify `server/game.js`, `server/combat.js`.

**Interfaces:** `finishWave(game)` increments mapsCleared and difficulty, issues `game.rewardEvents` entries `{id, playerId, pp, clearedTier?}`; `finishRun(game, outcome)` idempotently switches to over/victory. `failureReward(difficulty, completedInTier)` returns `(5+2n)*[1,2,4,8][tier]`. game has unique runId, mapsCleared, difficulty, speed, hostId and per-run reward receipts.

- [ ] Test each five-map boundary at waves 50/100/150/200, shared boss/map completion, retained full facility refund and money, 200/400/800/1600 clear rewards, `(5+2n)` failure scaling, zero-wave failure, late/reserved participants, no double clear/failure events, no transition with split children outstanding, final victory. Confirm new difficulty scaling replaces the unbounded old global exponential rather than multiplying it again.
- [ ] Run tests to RED.
- [ ] Implement progression and reward outbox without filesystem calls in simulation. Update snapshots with difficulty/region/speed/outcome and pending award status.
- [ ] Run `npm test`; require green, then commit.

## Task 5: 전장 클릭 수입·총·핵폭탄

**Files:** create `server/player-weapons.js`, `tests/weapons.test.js`; modify `server/game.js`, `server/combat.js`.

**Interfaces:** command types `gather`, `buyWeapon {weapon}`, `selectWeapon {weapon}`, `toggleFire`, `nuke`. `tickWeapons(game, dt)` handles each player's selected weapon, firing, cooldown and purchases. `detonate(game, playerId)` uses the common damage lifecycle with split suppression and preserved boss health. Snapshot exposes owned weapons, equipped weapon, firing and room nuke cooldown, never profile tokens.

- [ ] Write tests for +1 only to caller, ignored forged income, no gain after outcome, own 1000찌 purchase, insufficient funds, duplicate purchase, owned selection only, precisely 1-second firing/start/stop, no effect without enemies, advanced weapon damage and pierce.
- [ ] Write tests for 5000찌 nuke cost, all live nonboss and deferred split children removed, boss hp unchanged, no further split or duplicate rewards, future wave spawns retained, shared 30-second cooldown, single charge on simultaneous requests and no charge with only bosses/empty field.
- [ ] Run tests and confirm RED.
- [ ] Implement data-driven server weapons, game-time cooldowns and shots from the map base using player colors. Reuse typed damage/effect helpers from Task 3; do not add a second reward path.
- [ ] Run `npm test`; require green, then commit.

## Task 6: 프로필과 게임 서버 연결

**Files:** modify `server/index.js`, `server/rooms.js`, `tests/network.test.js`; create `tests/progression-network.test.js`.

**Interfaces:** WebSocket `hello {profileToken?}` yields `profile {token?,profile}` only to caller. `purchase {tower}`, `equip {ids}` yield private profile updates. `join` associates the authenticated profile with its room slot and freezes its loadout. Existing join-only clients get a new profile automatically for compatibility. `settlePending(room, store)` persists simulation rewardEvents once, leaves failed awards pending and reports retryable status.

- [ ] Test real clients restoring profile after server recreation using same data directory, tier purchase and next-game equipment, unauthorized profile/room mutations, no token leakage, duplicate settlement after reconnect, failed storage reported and retried without fake success, 4-player shared speed/guns/nuke and code re-entry. Reject equip changes in an active room while allowing result/lobby changes for the next game.
- [ ] Run tests to RED.
- [ ] Connect persistent store to server lifecycle, safe hello/shop validation and per-connection auth. Respect existing payload/rate limits. Idle lobby sessions and auth errors must not crash or leak intervals. Reconnect time uses the injected real clock.
- [ ] Run `npm test`; require green, then commit.

## Task 7: 실행 화면·상점·무기 조작·음악

**Files:** modify `public/index.html`, `public/styles.css`, `public/app.js`, `public/ui.js`, `public/renderer.js`; create `public/profile-ui.js`, `public/audio.js`, `tests/audio.test.js`; extend `tests/browser.spec.js`.

**Interfaces:** `createAudio({contextFactory, storage}) -> {unlock, setVolumes, setMuted, update, suspend, dispose}`. `update(state, isFirstSnapshot)` deduplicates effect IDs and detects phase/boss changes. Profile UI consumes only private profile snapshots. Main app sends `gather` once on a completed non-drag canvas click, independently of selection/build; UI buttons never send gather. Existing selectionVersion protection stays intact.

- [ ] Add failing browser tests for explicit solo/new-room entry clearing stale invitation state; 4-player speed sharing; actual +1 from canvas but not buttons/drag; 1000찌 gun and separate fire toggle; purchase/result/inventory UI; audio blocked without blocking entry. Update exact money expectations in existing placement tests to account for the requested click income.
- [ ] Add audio lifecycle tests for user-gesture unlock, 25/50 defaults, separately persisted volumes, mute, duplicate/old event suppression, 12-voice cap, boss pattern and dispose/suspend. Inject context factory for graph lifecycle only; verify real browser AudioContext activation separately.
- [ ] Run targeted suites to RED.
- [ ] Implement responsive shop/inventory/results panels and difficulty/speed/찌/뿌 HUD. Introduce one unambiguous solo button and room-code join action; error text must be visible beside the relevant input. Add distinct player weapon UI and a nuke confirmation button with price/cooldown. Effects and audio follow actual server events. Browser sound denial is a recoverable status.
- [ ] Run `npm test` and `npm run test:browser`. Inspect desktop/mobile screenshots and verify fire/damage and cash changes in real state snapshots. Record whether real listening was possible; do not claim listening from an audio mock. Commit.

## Task 8: 패키징·문서·최종 검증과 게시

**Files:** modify `README.md`, `Dockerfile`, `scripts/solo-transport.js`, `scripts/build-solo.js`, `tests/solo.spec.js`, `docs/implementation-record.md`; add a tested packaging command only if needed.

- [ ] Keep downloadable solo packaging explicitly practice-only, reusing the same rules with an in-memory profile adapter. Avoid node:fs in browser bundles. Verify existing `npm run test:solo` still makes no external requests and does not pretend to provide multiplayer.
- [ ] Document click controls, all weapon costs and nuke/boss rule, two currencies, tier rewards, loadout timing, persistent data/backups, browser identity limits and public hosting requirements. Include the already-established Windows Node/PATH commands and exact extracted-folder handling; do not ask the user to repeat installation unnecessarily.
- [ ] Run frozen `npm ci`, `npm test`, full browser tests and solo regression. Start server, verify health and actual solo start. Run a fresh-context final review via requesting-code-review as required by executing-plans; fix important findings with RED→GREEN tests.
- [ ] Commit final changes. User authorization to update this existing GitHub project persists; inspect remote and push fast-forward only after verification. Preserve any new remote work; do not force push. Confirm remote SHA, then provide actual GitHub ZIP URL and explain replacing/restarting the user's old extracted copy. Exclude profiles/tokens/data from source ZIP.
- [ ] Save any changed cloud startup requirements, note `OUTPOST_DATA_DIR`, and distinguish saved config, local execution, GitHub publication and unavailable Sites deployment.

## Execution handoff

Preserve the user's already-selected direct execution in this session. Tasks are coupled through the existing simulation and profile contracts; implement sequentially and request one whole-branch review at the end. Written-plan review is the next prerequisite; do not start product changes until that review is received.

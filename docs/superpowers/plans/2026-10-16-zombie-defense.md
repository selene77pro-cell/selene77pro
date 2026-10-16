# Zombie Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 1인 및 최대 4인이 함께 즐기는 좀비 디펜스 웹게임을 구현한다.

**Architecture:** Node.js 서버가 방별 전투와 자금을 판정하고 WebSocket으로 상태를 전송한다. 브라우저는 Canvas 전장과 한국어 조작 패널을 제공한다. 시설 및 맵 데이터와 시뮬레이션을 분리한다.

**Tech Stack:** Node.js 24, JavaScript ES modules, ws, HTML/CSS/Canvas, node:test, Playwright browser checks.

**Spec:** `docs/superpowers/specs/2026-10-16-zombie-defense-design.md`

## Global Constraints

- 닉네임 입장, 1~4인, 가로 화면, 화폐 `찌`, 각자 자금, 팀 공동 기지 체력.
- 시설 18종, 4단계 강화, 웨이브 해금, 자동 병사 출격, 은행 웨이브 수익.
- 무한 웨이브, 매 10웨이브 지역 보스, 5종 지도 순환, 이동 시 건설·강화비 전액 환급.
- 중도 합류, 재접속 2분 보존, 방 링크 공유. 서버 재시작 복원 제외.
- 피해 숫자, 체력바, 보스 체력바, 단계별 외형과 공격 효과, 효과 강도 설정.
- 기존 체크아웃에서 작업하며 별도 worktree를 만들지 않는다.
- 공개 HTTPS/WebSocket 배포와 서비스 계정 생성은 구현 검증과 구분한다.

## Review Focus

- 같은 프레임의 중복 건설·강화 요청도 잔액을 음수로 만들지 않는다: Task 1.
- 맵 전환 환급은 시설별 실제 지출을 한 번만 반환한다: Task 2.
- 재접속 시 소유권을 복원하며 만료된 토큰으로 다른 사람 자리를 가져가지 못한다: Task 3.
- 변조된 메시지, 과대 입력, 5번째 접속과 타인 시설 조작을 거부한다: Tasks 1, 3.
- 작은 가로 화면에서 터치 좌표와 Canvas 좌표가 일치하고 패널이 전투 조작을 막지 않는다: Task 4.

## Task 1: 시설 데이터와 자금·건설 규칙

**Files:** `package.json`, `package-lock.json`, `.gitignore`, `shared/catalog.js`, `shared/maps.js`, `server/game.js`, `tests/game.test.js`.

**Interfaces:** `CATALOG` is keyed by facility ID; entries contain name, kind, unlockWave, cost, color and combat stats. `MAPS` contains five named maps with paths and blocked cells. `createGame()` returns mutable room simulation state. `addPlayer(game, id, name)` registers a player. `command(game, playerId, action)` returns `{ok, error?}`; action types are build, upgrade, sell and start.

- [x] Write failing node:test cases: 18 catalog entries; 5 maps; build debits exact catalog cost; overlapping/path placement fails without spending; locked facility fails; levels stop at 4; only owner may upgrade/sell; sequential duplicate actions cannot overspend; unknown and nonfinite coordinates fail.
- [x] Run `node --test tests/game.test.js` and confirm failures for missing implementation.
- [x] Implement data, deterministic command validation, per-player balances, spending ledger, facility cap 100 and 4-stage statistics. Initial balance 650; sale returns 75% of actual investment. Configure `npm test` and `npm start`.
- [x] Run the tests to completion; commit the data and rules.

## Task 2: 전투와 무한 진행

**Files:** extend `server/game.js`; create `server/combat.js`, `tests/combat.test.js`.

**Interfaces:** `tick(game, dt)` advances simulation with seconds capped at 0.1 per tick. `snapshot(game)` returns serializable authoritative state with players, facilities, soldiers, enemies, effects, wave, mapIndex, phase, baseHp and timers. `statsFor(facility)` derives upgraded stats from catalog and level.

- [x] Write failing cases for damage/kill contribution rewards, escaped enemies reducing shared health, zero health ending game, banks paying only owner once per completed wave, automatic capped soldiers, support effects not stacking, unlock after milestone completion, boss every tenth wave, transition preserving global wave/unlocks and refunding exact investment only once.
- [x] Run `node --test tests/combat.test.js` and verify intended failures.
- [x] Implement fixed-step movement along paths, gun/splash/slow/burn/chain attacks, soldier approach/combat, healing and buffs. Bosses differ by region through armor, speed, regeneration or summons. Complete waves only after every spawn and enemy is resolved. Give preparation time before each wave and map transition. Scale only newly spawned enemies using active player count; retain bounded soldier/effect counts.
- [x] Run `npm test`; commit verified simulation.

## Task 3: WebSocket 서버와 방

**Files:** `server/index.js`, `server/rooms.js`, `tests/network.test.js`.

**Interfaces:** `createServer({port, host})` returns `{listen, close, address}` for ephemeral-port tests. Client messages: join `{roomId?, nickname, token?}`, action `{action}`. Server messages: joined `{roomId, playerId, token}`, state `{state}`, error `{message}`. Room IDs and reconnect tokens use crypto randomness.

- [x] Write failing integration tests using real ws clients: solo room/start; second client joins and sees matching state; reconnect restores player/balance; four seats and rejection of fifth; 120-second slot expiry using injected room clock; invalid token cannot steal identity; malformed/oversized messages handled; opponent upgrade rejected.
- [x] Run `node --test tests/network.test.js` and confirm missing-server failures.
- [x] Implement static serving restricted to public/shared files, health endpoint, host/port environment overrides, 20 Hz simulation and 10 Hz broadcasts, 4 KiB message limit, action rate limits, empty-room cleanup and shutdown. Bind to `0.0.0.0`; default port 3000. Tokens are sent only to their owner, never in shared snapshots or URLs.
- [x] Run `npm test`; commit server and integration tests.

## Task 4: 플레이 가능한 화면

**Files:** `public/index.html`, `public/styles.css`, `public/app.js`, `public/renderer.js`, `public/ui.js`, `tests/browser.spec.js`, `playwright.config.js`.

**Interfaces:** `render(ctx, state, previousState, interpolation, ui)` draws logical 1200×720 battlefield. `bindUI({send, onSelection, onEffects})` wires panels. `app.js` owns WebSocket, per-room session token storage, snapshot interpolation, pointer-to-world conversion and selected facility.

- [x] Write browser checks for nickname entry, solo start, correct 찌 display, building/upgrade selection, disabled locked towers, copied URL preserving room, damage/health indicators, disconnected state, and viewport-scaled pointer placement. Assert the app has no uncaught browser errors.
- [x] Run browser suite against server and confirm failures before UI implementation.
- [x] Implement dark military lobby and HUD, touch-friendly build carousel with all 18 facilities and unlock labels, stats/upgrade/sell panel, responsive Canvas, map-specific terrain, facility silhouettes by type and level, moving soldiers, zombies and bosses. Render healthbars, capped damage numbers, flash/projectile/explosion/fire/lightning effects and effects intensity selector. Provide restart after defeat; copying/sharing uses same-origin room link and does not promise a public local address.
- [x] Run browser checks including a mobile landscape viewport and inspect screenshot. Run `npm test`; commit UI.

## Task 5: 完成検証と実行手順

**Files:** `README.md`, optional `Dockerfile` and `.dockerignore` for reproducible single-process hosting.

- [x] Document `npm ci`, `npm start`, `npm test`, browser checks, HOST/PORT, controls, full catalog unlock schedule, resource limits and reconnect behavior. Explain HTTPS/WSS reverse proxy support and in-memory room loss on server restart.
- [x] Run fresh `npm ci`, all unit/integration tests and browser checks. Verify `/health`, static assets and an actual solo game, plus two-client shared action flow. Separate passed tests from unrun public deployment checks.
- [x] Save necessary cloud install/start instructions using environment configuration tools; startup instructions use existing checkout and include health verification. Do not claim draft persistence unless tool confirms it.
- [x] Review final diff and git status, resolve regressions, commit final documentation, and report run instructions and remaining public-hosting step.

## Execution method

Recommend direct execution in the current session: the tasks share one simulation contract and do not require separate agents. User reviews this plan before implementation, as required by the planning skill.

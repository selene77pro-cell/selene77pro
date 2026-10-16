# SDD ledger — plan: docs/superpowers/plans/2026-10-16-zombie-defense.md

Spec and plan approved. Existing isolated cloud checkout, branch work.
Pre-flight: Task 1 game commands -> Task 2 simulation -> Task 3 snapshots -> Task 4 browser: shared serializable state and IDs consistent.
Ruling: skill helper shell scripts are cloud resources, not local executables; maintain briefs and completion evidence in this ledger directly — same task gates, no external script dependency — cost: manual bookkeeping.
Task 1: complete — missing modules RED, 6/6 tests GREEN, building and upgrades committed.
Ruling: run node:test with --test-isolation=none because the sandbox child test runner suppresses diagnostics; direct tests demonstrate assertion output — cost: tests share process and must clean resources.
Task 2 brief: implement tick/snapshot combat, rewards, bank, capped soldiers, support, boss and exact map refunds.
Task 2: complete — missing combat RED, 13/13 suite GREEN. Heal test isolated enemy retaliation using existing cooldown so its assertion measures healing, not net combat health. Commit recorded.
Task 3 brief: real WebSocket integration, max four, secure reconnect, bounded inputs, safe static files, cleanup.
Task 3: complete — server absent RED, 16/16 full suite GREEN with local-network permission. Same-origin browser checks, safe files, tokens, four-seat expiry verified. npm registry install required network escalation; successful.
Task 4 brief: Canvas battlefield, eighteen choices, upgrades, touch controls, share/reconnect, effects; browser checks before UI.
Task 4: complete — missing UI RED; desktop/mobile and two-browser interaction suite 4/4 GREEN. Inspected desktop and 844x390 screenshots. Added zoom/pan for small map view, verified logical coordinate preservation after zoom.
Task 5 brief: reproducible install, health and scripts, documentation, deployment boundary, final review.
Task 5: complete — npm ci succeeded, full node suite 16/16 and browser suite 4/4 passed; install/start configuration saved. No public deployment or paid service authorized/performed. Final whole-branch review next.
Final review (fresh gpt-6-astra reviewer): Critical structured facility identifier coercion crashes server; Important sessionStorage-only reconnect loses device ownership across tab closure. Both enter one fix pass. Minor deferred: startup listen failure should close timers and handle forwarded WebSocket error. No additional concrete important combat/mobile issue established.
Final: Ruling: retain the existing isolated checkout and local branch; no merge/push or public deployment — original repository has no main commit and user requested implementation — cost: code is not yet on GitHub or publicly reachable.
Final fix pass: structured identifier test RED→GREEN and real WebSocket malformed action rejected, suite 17/17. Device tab-reopen test RED→GREEN using localStorage per room, retaining active-session collision checks. Supplementary live combat check found delayed build acknowledgement can reset a newer selection; deterministic WebSocket delay regression RED, selectionVersion fix applied. Full browser rerun in progress.
Final: minor (deferred): binding an occupied port has rough error reporting and should shut down failed-listen timers; production invocation uses one process on its configured port.
Final: fixed structured facility crash — structured facility identifiers RED→GREEN, node suite 17/17.
Final: fixed device reconnect — close/reopen browser test RED→GREEN, browser suite 7/7.
Final: fixed delayed placement selection — delayed-ack regression RED→GREEN, browser suite 7/7. Supplementary live-combat test also passed.
Final verification: npm ci successful; npm test 17/17; npm run test:browser 7/7; GET /health {ok:true}; git diff --check clean. Latest server is running from npm start. install_script/start_skill draft saved; publication and public game deployment not performed. Work remains on local work branch; no remote main commit exists.

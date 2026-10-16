import {test} from 'node:test';import assert from 'node:assert/strict';
import {CATALOG,BASE_FACILITIES} from '../shared/catalog.js';
import {DIFFICULTIES,BONUS_TOWERS,failureReward} from '../shared/progression.js';
import {WEAPONS} from '../shared/weapons.js';import {ENEMY_TYPES,ELEMENTS} from '../shared/enemies.js';
test('progression catalogs match currencies, tiers and weapon timing',()=>{
 assert.equal(BASE_FACILITIES.length,18);assert.equal(Object.keys(CATALOG).length,22);
 assert.deepEqual(DIFFICULTIES.map(x=>x.name),['보통','어려움','지옥','불가능']);assert.deepEqual(DIFFICULTIES.map(x=>x.clearReward),[200,400,800,1600]);
 assert.deepEqual(Object.values(BONUS_TOWERS).map(x=>x.ppCost),[200,400,800,1600]);assert.equal(failureReward(2,3),44);
 assert.equal(WEAPONS.pistol.price,1000);assert.equal(WEAPONS.nuke.price,5000);for(const w of Object.values(WEAPONS).filter(w=>w.damage))assert.equal(w.interval,1);
 assert.equal(ENEMY_TYPES.runner.size,.65);assert.equal(ENEMY_TYPES.giant.hp,4);assert.equal(ENEMY_TYPES.splitter.children,3);assert.equal(Object.keys(ELEMENTS).length,3);
});

import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test('downloaded HTML plays offline without server or external requests',async({page})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:|^wss?:/.test(r.url()))requests.push(r.url());});
 await page.setContent(await readFile(resolve('dist/last-outpost-solo.html'),'utf8'));
 await page.getByLabel('닉네임').fill('체험자');await page.getByRole('button',{name:'작전 시작',exact:true}).click();
 await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#money')).toContainText('650');
 await expect(page.locator('#share')).toBeDisabled();await expect(page.locator('.build-card')).toHaveCount(18);
 const canvas=page.locator('canvas'),box=await canvas.boundingBox();await page.locator('[data-facility="gun"]').click();await canvas.click({position:{x:box.width*100/1200,y:box.height*260/720}});
 await expect(page.locator('#money')).toContainText('550');await page.getByRole('button',{name:/강화 ·/}).click();await expect(page.locator('#money')).toContainText('405');
 await page.locator('#start-wave').click();await expect(page.locator('#wave')).toContainText('01',{timeout:20000});await expect(page.locator('#phase')).toContainText('방어');
 await page.screenshot({path:'test-results/solo-offline.png'});expect(errors).toEqual([]);expect(requests).toEqual([]);
});

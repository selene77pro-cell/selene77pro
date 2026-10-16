import {test,expect} from '@playwright/test';
async function enter(page){await page.goto('/');await page.getByLabel('닉네임').fill('생존자');await page.getByRole('button',{name:'작전 시작',exact:true}).click();await expect(page.locator('#game')).toBeVisible();}
test('solo build upgrade start and rendered battlefield',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await enter(page);
 await expect(page.locator('#money')).toContainText('650');await expect(page.locator('#money')).toContainText('찌');
 await expect(page.locator('.build-card')).toHaveCount(18);await expect(page.locator('[data-facility="rail"]')).toBeDisabled();
 await page.locator('[data-facility="gun"]').click();const canvas=page.locator('canvas'),box=await canvas.boundingBox();await canvas.click({position:{x:box.width*100/1200,y:box.height*100/720}});
 await expect(page.locator('#money')).toContainText('550');await expect(page.locator('#detail')).toContainText('기관총');
 await page.getByRole('button',{name:/강화 ·/}).click();await expect(page.locator('#detail')).toContainText('강화형');await expect(page.locator('#money')).toContainText('405');
 await page.locator('#start-wave').click();await expect(page.locator('#phase')).toContainText('준비');
 await expect(page.locator('#wave')).toContainText('01',{timeout:20000});await expect(page.locator('#phase')).toContainText('방어');
 await page.screenshot({path:'test-results/last-outpost-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('mobile landscape pointer mapping, sharing URL and reconnect',async({page})=>{
 await page.setViewportSize({width:844,height:390});await enter(page);
 await expect(page.locator('#rotate')).toBeHidden();await expect(page.locator('#start-wave')).toBeInViewport();
 await page.locator('[data-facility="bank"]').click();const canvas=page.locator('canvas'),box=await canvas.boundingBox();
 await canvas.click({position:{x:box.width*100/1200,y:box.height*100/720}});await expect(page.locator('#money')).toContainText('430');
 await expect(page).toHaveURL(/room=[a-f0-9]{12}/);await page.locator('#share').click();await expect(page.locator('#toast')).toContainText(/복사|공유|링크/);
 await page.reload();await expect(page.locator('#game')).toBeVisible();await expect(page.locator('#money')).toContainText('430');
 await page.screenshot({path:'test-results/last-outpost-mobile.png',fullPage:true});
});
test('second browser joins same room and sees shared facility',async({browser})=>{
 const a=await browser.newContext(),b=await browser.newContext();const p=await a.newPage(),q=await b.newPage();
 try{await enter(p);await q.goto(p.url());await q.getByLabel('닉네임').fill('친구');await q.getByRole('button',{name:'작전 시작',exact:true}).click();await expect(q.locator('#members')).toContainText('2 / 4');
 await p.locator('[data-facility="barracks"]').click();const box=await p.locator('canvas').boundingBox();await p.locator('canvas').click({position:{x:box.width*100/1200,y:box.height*100/720}});await expect(q.locator('#facility-count')).toContainText('1 / 100');
 await q.locator('canvas').click({position:{x:box.width*100/1200,y:box.height*100/720}});await expect(q.locator('#detail')).toContainText('친구의 시설');
 }finally{await a.close();await b.close();}
});
test('mobile battlefield zoom and pan preserve placement coordinates',async({page})=>{
 await page.setViewportSize({width:844,height:390});await enter(page);
 await page.locator('#start-wave').click();
 const canvas=page.locator('canvas'),before=await canvas.boundingBox();
 await page.getByRole('button',{name:'전장 확대',exact:true}).click();
 const after=await canvas.boundingBox();expect(after.width).toBeGreaterThan(before.width);
 await page.locator('[data-facility="gun"]').click();
 await page.mouse.click(after.x+after.width*700/1200,after.y+after.height*360/720);
 await expect(page.locator('#money')).toContainText('550');
 await page.getByRole('button',{name:'전장 전체 보기'}).click();
 await expect.poll(async()=>Math.round((await canvas.boundingBox()).width)).toBe(Math.round(before.width));
});

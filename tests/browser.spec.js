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
test('live combat sends soldiers damage effects and injured health',async({page})=>{
 const observations={soldiers:false,damage:false,shots:false,injured:false},errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const m=JSON.parse(String(payload));if(m.type!=='state')return;const s=m.state;observations.soldiers ||=s.soldiers.length>0;observations.damage ||=s.effects.some(e=>e.kind==='damage');observations.shots ||=s.effects.some(e=>e.kind==='shot');observations.injured ||=s.enemies.some(e=>e.hp<e.maxHp);}));
 await enter(page);
 const canvas=page.locator('canvas'),box=await canvas.boundingBox();
 for(const [type,x,y] of [['gun',100,260],['barracks',100,200]]){await page.locator(`[data-facility="${type}"]`).click();await canvas.click({position:{x:box.width*x/1200,y:box.height*y/720}});}
 await page.locator('#start-wave').click();
 await expect.poll(()=>Object.values(observations).every(Boolean),{timeout:24000}).toBe(true);
 await page.screenshot({path:'test-results/last-outpost-combat.png',fullPage:true});expect(errors).toEqual([]);
});
test('closing and reopening a tab restores device money and ownership',async({context,page})=>{
 await enter(page);await page.locator('[data-facility="bank"]').click();
 const box=await page.locator('canvas').boundingBox();await page.locator('canvas').click({position:{x:box.width*100/1200,y:box.height*100/720}});
 await expect(page.locator('#money')).toContainText('430');const url=page.url();await page.close();
 const reopened=await context.newPage();await reopened.goto(url);await expect(reopened.locator('#game')).toBeVisible();await expect(reopened.locator('#money')).toContainText('430');await expect(reopened.locator('#members')).toContainText('1 / 4');
 const again=await reopened.locator('canvas').boundingBox();await reopened.locator('canvas').click({position:{x:again.width*100/1200,y:again.height*100/720}});await expect(reopened.locator('#detail')).toContainText('강화 ·');
});
test('delayed build acknowledgement preserves the next facility selection',async({page})=>{
 let held=[],holding=true,release;
 await page.routeWebSocket('**',ws=>{const server=ws.connectToServer();server.onMessage(message=>{const m=JSON.parse(String(message));if(holding&&m.type==='state'&&m.state.facilities.length===1)held.push(message);else ws.send(message);});release=()=>{holding=false;for(const message of held)ws.send(message);held=[];};});
 await enter(page);await page.locator('[data-facility="gun"]').click();const box=await page.locator('canvas').boundingBox();await page.locator('canvas').click({position:{x:box.width*100/1200,y:box.height*260/720}});
 await page.locator('[data-facility="barracks"]').click();await expect.poll(()=>held.length).toBeGreaterThan(0);release();
 await expect(page.locator('#money')).toContainText('550');await expect(page.locator('[data-facility="barracks"]')).toHaveClass(/selected/);
});

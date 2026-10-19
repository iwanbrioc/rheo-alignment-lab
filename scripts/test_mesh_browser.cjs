/** Integration QA; requires an existing Playwright + Chromium installation. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.RHEO_PLAYWRIGHT || 'playwright');
const base = process.env.RHEO_TEST_URL || 'http://127.0.0.1:8080/app/v03.html';
async function ready(page) { await page.goto(base); await page.waitForFunction(() => document.querySelector('#fingerprint').textContent.length > 20); }
async function create(page, title, visibility = 'shared') {
  await page.getByRole('button', {name:'Add a possibility'}).click();
  const form = page.locator('#offer-form');
  for (const [name, value] of Object.entries({title,description:'An opportunity to learn and belong',steward:'Test circle',place:'Test place',lat:'52.04',lon:'-4.31',conditions:'Arrange access with the circle',care:'Replenish shared materials',purpose:'Build practical confidence'})) await form.locator(`[name=${name}]`).fill(value);
  await form.locator('[name=visibility]').selectOption(visibility); await form.locator('[name=access]').selectOption('open');
  await form.getByRole('button',{name:'Save possibility'}).click();
  await page.locator('#detail-dialog[open]').waitFor();
  assert.equal(await page.locator('#offer-error').textContent(),'');
  await page.locator('#detail-dialog [data-close]').click();
}
(async () => {
  const browser = await chromium.launch({ executablePath:process.env.RHEO_CHROMIUM || '/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
  const errors = [], ctxA = await browser.newContext({viewport:{width:1440,height:1000}}), ctxB = await browser.newContext({viewport:{width:390,height:844}});
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  for (const page of [a,b]) page.on('pageerror',error=>errors.push(error.message));
  try {
    await ready(a); await ready(b);
    const identity = await a.locator('#fingerprint').textContent();
    await a.getByRole('button',{name:'Explore an illustrative map'}).click(); assert.equal(await a.locator('.offer-card').count(),6);
    await a.screenshot({path:'docs/rheo-v03-desktop.png',fullPage:true});
    await b.getByRole('button',{name:'Explore an illustrative map'}).click(); await b.screenshot({path:'docs/rheo-v03-mobile.png',fullPage:true});
    assert.equal(await b.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true,'mobile fits viewport');
    await a.getByRole('button',{name:'Return to my map'}).click(); await b.getByRole('button',{name:'Return to my map'}).click();
    await create(a,'Repair together'); await create(a,'Private gathering','private');
    assert.equal(await a.locator('.offer-card').count(),2);
    await a.reload(); await a.waitForFunction(()=>document.querySelectorAll('.offer-card').length===2);
    assert.equal(await a.locator('#fingerprint').textContent(),identity,'identity survives reload');
    const tab = await ctxA.newPage(); await ready(tab); assert.equal(await tab.locator('#fingerprint').textContent(),identity,'tabs share identity');
    await a.getByRole('button',{name:'Mesh & trust',exact:true}).click();
    const download = a.waitForEvent('download'); await a.getByRole('button',{name:'Export shared records'}).click();
    const file = await download, fs = require('node:fs'); const packet = fs.readFileSync(await file.path(),'utf8');
    const json = JSON.parse(packet); assert.equal(json.events.length,1); assert.ok(!packet.includes('Private gathering'));
    await b.getByRole('button',{name:'Mesh & trust',exact:true}).click(); await b.locator('#import').setInputFiles({name:'rheo.json',mimeType:'application/json',buffer:Buffer.from(packet)});
    await b.waitForFunction(()=>document.querySelector('#exchange-count').textContent.startsWith('1 signed'));
    await b.getByRole('button',{name:'Explore',exact:true}).click(); assert.equal(await b.locator('.offer-card').count(),1);
    await b.locator('.offer-card').click(); await b.getByRole('button',{name:'Add a trust record'}).click();
    await b.locator('#record-form [name=note]').fill('I saw the tools at this place today.'); await b.getByRole('button',{name:'Save signed record'}).click();
    await b.waitForFunction(()=>!document.querySelector('#record-dialog').open); await b.locator('#detail-dialog [data-close]').click();
    await b.getByRole('button',{name:'Mesh & trust',exact:true}).click(); const backDownload = b.waitForEvent('download'); await b.getByRole('button',{name:'Export shared records'}).click();
    const returned = fs.readFileSync(await (await backDownload).path(),'utf8');
    await a.locator('#import').setInputFiles({name:'rheo-back.json',mimeType:'application/json',buffer:Buffer.from(returned)});
    await a.waitForFunction(()=>document.querySelector('#exchange-count').textContent.startsWith('2 signed'));
    await a.getByRole('button',{name:'Explore',exact:true}).click(); await a.locator('.offer-card').filter({hasText:'Repair together'}).click();
    assert.match(await a.locator('#detail-content').textContent(),/Another device has confirmed availability/);
    await a.getByRole('button',{name:'Recognise / trust this author in context'}).click();
    await a.locator('#relationship-form [name=name]').fill('Neighbour I recognise'); await a.getByRole('button',{name:'Save local relationship'}).click();
    await a.waitForFunction(()=>!document.querySelector('#relationship-dialog').open);
    assert.match(await a.locator('#detail-content').textContent(),/You trust this author in this context/);
    await a.getByRole('button',{name:'Edit / renew'}).click(); await a.locator('#offer-form [name=title]').fill('Repair together this weekend'); await a.getByRole('button',{name:'Save possibility'}).click();
    await a.waitForFunction(()=>!document.querySelector('#offer-dialog').open);
    assert.match(await a.locator('#detail-content').textContent(),/Earlier revision; not current evidence/);
    await a.locator('#detail-dialog [data-close]').click();
    await a.getByRole('button',{name:'Mesh & trust',exact:true}).click();
    const bad = JSON.parse(returned); bad.events[0].body.title = 'Tampered';
    await a.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Signature verification failed'));
    assert.match(await a.locator('#exchange-count').textContent(),/3 signed shared records/);
    // A complete cached application and data must survive an offline reload.
    await a.waitForFunction(()=>navigator.serviceWorker.controller !== null); await ctxA.setOffline(true); await a.reload();
    await a.waitForFunction(()=>document.querySelectorAll('.offer-card').length===2); assert.equal(await a.locator('#fingerprint').textContent(),identity);
    await ctxA.setOffline(false);
    // Preserved baseline must still open and load its existing scripts.
    await tab.goto(new URL('guide/index.html',base).href); await tab.getByRole('button',{name:'Load example',exact:true}).click(); assert.ok((await tab.locator('#openingContext').inputValue()).length>20);
    assert.deepEqual(errors,[]);
    console.log('PASS desktop and mobile layout; local creation; reload and tab identity; private exclusion; two-device exchange; trust revision expiry; tamper rejection; offline reload; preserved guide.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});

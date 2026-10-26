import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const cwd=process.cwd();
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4183','--strictPort'],{cwd,stdio:['ignore','pipe','pipe']});
let browser;
try{
 let reachable=false;
 for(let i=0;i<50;i++){
  try{const r=await fetch('http://127.0.0.1:4183/');if(r.ok){reachable=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 assert.ok(reachable,'Vite preview did not start');
 browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':undefined,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 await page.goto('http://127.0.0.1:4183/',{waitUntil:'networkidle'});
 await page.locator('#dev-grid').waitFor({timeout:15000});
 assert.equal(await page.locator('#gridSwitch').getAttribute('aria-checked'),'true');
 await page.locator('#gridSwitch').click();
 assert.equal(await page.locator('#gridSwitch').getAttribute('aria-checked'),'false');
 assert.ok((await page.locator('#kHome').textContent()).trim().length>0);
 await page.locator('#gridSwitch').click();
 await page.locator('[data-scenario="outage"]').click();
 assert.equal((await page.locator('#kHome').textContent()).trim(),'ИНВЕРТОР');
 await page.locator('[data-scenario="lowbat"]').click();
 assert.equal((await page.locator('#kHome').textContent()).trim(),'НЕТ СВЕТА');
 await page.locator('[data-scenario="normal"]').click();
 await page.locator('#genSwitch').click();
 const fan=await page.locator('.generator-fan .spinner').evaluate(el=>getComputedStyle(el).animationName);
 assert.equal(fan,'generator-local-spin');
 await page.locator('#genSwitch').click();
 await page.locator('#themeToggle').click();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
 await page.locator('#themeToggle').click();
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
 await page.locator('#zoomIn').click();
 assert.match(await page.locator('#zoomLabel').textContent(),/\d+%/);
 const priorZoom=await page.locator('#zoomLabel').textContent();
 await page.setViewportSize({width:1650,height:930});
 await page.locator('#fullscreenDiagram').click();
 await page.waitForTimeout(450);
 assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
 const frame=await page.evaluate(()=>{const stage=document.querySelector('#diagramStage').getBoundingClientRect(),svg=document.querySelector('#diagram').getBoundingClientRect();return {stageWidth:stage.width,stageHeight:stage.height,svgWidth:svg.width,svgHeight:svg.height,leftSpace:svg.left-stage.left,rightSpace:stage.right-svg.right,topSpace:svg.top-stage.top,bottomSpace:stage.bottom-svg.bottom}});
 console.log('Fullscreen coverage:',JSON.stringify(frame));
 assert.ok(frame.svgWidth/frame.stageWidth>.88,'Fullscreen must occupy most viewport width');
 assert.ok(frame.svgHeight/frame.stageHeight>.72,'Fullscreen must occupy most viewport height');
 assert.ok(Math.abs(frame.leftSpace-frame.rightSpace)<45,'Diagram must be horizontally centered');
 assert.ok(Math.abs(frame.topSpace-frame.bottomSpace)<90,'Diagram must be vertically centered');
 const count=await page.locator('.current-particles.on circle').count();
 assert.ok(count>=20,'Active conductors should display moving electricity pulses');
 const pulseAt=()=>page.locator('.current-particles.on circle').first().evaluate(el=>{const m=el.getCTM();return {x:m.e,y:m.f,visible:getComputedStyle(el.parentElement).opacity}});
 const firstPulse=await pulseAt();await page.waitForTimeout(520);const nextPulse=await pulseAt();
 assert.ok(Math.hypot(nextPulse.x-firstPulse.x,nextPulse.y-firstPulse.y)>1,'Current pulses must visibly move along conductors');
 assert.ok(Number(nextPulse.visible)>.9,'Current pulses should not be invisible');
 await page.locator('#exitFullscreen').click();await page.waitForTimeout(180);
 assert.equal(await page.locator('#zoomLabel').textContent(),priorZoom,'Zoom must restore after fullscreen');
 const blocks=await page.locator('.device .main').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.parentElement?.getAttribute('data-device'),x:r.x,y:r.y,w:r.width,h:r.height}}));
 const overlaps=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const a=blocks[i],b=blocks[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>4&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>4)overlaps.push(a.id+' vs '+b.id);}
 const gaps=[];for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){const a=blocks[i],b=blocks[j];const dx=Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w);const dy=Math.max(0,a.y-b.y-b.h,b.y-a.y-a.h);gaps.push({pair:a.id+' / '+b.id,distance:Math.round(Math.hypot(dx,dy)*10)/10});}gaps.sort((a,b)=>a.distance-b.distance);console.log('Closest devices:',JSON.stringify(gaps.slice(0,5)));assert.ok(gaps[0].distance>20,'Device blocks must remain visually separated');
 console.log('Diagram device overlaps:',JSON.stringify(overlaps));
 assert.deepEqual(overlaps,[],'Device cards should not overlap');
 const dev=page.locator('#dev-grid .main');const r=await dev.boundingBox();const before=await page.locator('#dev-grid').getAttribute('transform');
 await page.mouse.move(r.x+r.width/2,r.y+r.height*.58);await page.mouse.down();await page.mouse.move(r.x+r.width/2+75,r.y+r.height*.58+25,{steps:8});await page.mouse.up();
 let after=await page.locator('#dev-grid').getAttribute('transform');
 if(after===before){await page.locator('#dev-grid').focus();await page.keyboard.press('ArrowRight');after=await page.locator('#dev-grid').getAttribute('transform');}
 assert.notEqual(after,before,'Diagram blocks must be movable by pointer or keyboard');
 await page.locator('#resetLayout').click();
 await page.screenshot({path:'artifacts/powerlab-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await page.locator('#dev-grid').waitFor();
 const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:document.documentElement.clientWidth,stageWidth:document.getElementById('diagramStage')?.getBoundingClientRect().width}));
 console.log('Mobile viewport:',JSON.stringify(metrics));
 await page.screenshot({path:'artifacts/powerlab-mobile.png',fullPage:true});
 assert.ok(metrics.documentWidth<=metrics.viewportWidth+10,'Unexpected document overflow on mobile');
 assert.deepEqual(errors,[],'Unexpected browser errors');
 console.log('PASS: initialization, power scenarios, fan, themes, zoom, dragging, fullscreen, device spacing, mobile and zero errors');
} finally {if(browser)await browser.close();server.kill();}

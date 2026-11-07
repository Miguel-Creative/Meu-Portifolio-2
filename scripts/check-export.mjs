/**
 * Browser regression test for the real Swarm blueprint engine and the static
 * Next.js export. Run after npm run build, with Chrome/Chrome Headless Shell.
 * CHROME_PATH=<binary> node scripts/check-export.mjs
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const out = path.join(process.cwd(),"out");
if(!fs.existsSync(path.join(out,"index.html")))throw Error("Missing static export: out/index.html");
if(!fs.existsSync(path.join(out,"swarm-rebuild.js")))throw Error("Missing Swarm asset in static export");
const exportedHtml=fs.readFileSync(path.join(out,"index.html"),"utf8");
if(!exportedHtml.includes("swarm-first-paint")||!exportedHtml.includes("swarm-preboot"))
  throw Error("Critical first-paint hiding tags were not rendered in the HTML head");
if(exportedHtml.indexOf("swarm-preboot")>exportedHtml.indexOf('id="__next"'))
  throw Error("The preboot script must precede the React content in initial HTML");

const browser = [process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/chromium","/usr/bin/google-chrome"].find(p=>p&&fs.existsSync(p));
if(!browser)throw Error("Set CHROME_PATH to Chrome or Chrome Headless Shell");

const port=39000+Math.floor(Math.random()*700), debugPort=19000+Math.floor(Math.random()*700);
const address="http://127.0.0.1:"+port;
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".css":"text/css",
  ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
  ".jpg":"image/jpeg",".webp":"image/webp",".woff":"font/woff",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,address).pathname)}catch{res.writeHead(400);res.end();return}
  const file=path.resolve(out,"."+pathname);
  if(file!==out && !file.startsWith(out+path.sep)){res.writeHead(403);res.end();return}
  const candidates=[file,path.join(file,"index.html"),file+".html"];
  const hit=candidates.find(f=>{try{return fs.statSync(f).isFile()}catch{return false}});
  if(!hit){res.writeHead(404);res.end();return}
  res.writeHead(200,{"Content-Type":types[path.extname(hit)]||"application/octet-stream"});
  fs.createReadStream(hit).pipe(res);
});
const poll=async (fn,tries=110,ms=180)=>{
  for(let i=0;i<tries;i++){try{const result=await fn();if(result)return result}catch{}await sleep(ms)}
  throw Error("Browser never reached expected state");
};
let child,ws;
const report={};
try{
  await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
  child=spawn(browser,[
    "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
    "--disable-extensions","--no-first-run","--no-default-browser-check",
    "--window-size=1440,900","--remote-debugging-port="+debugPort,
    "--user-data-dir="+path.join(os.tmpdir(),"swarm-chrome-"+process.pid),address
  ],{stdio:"ignore",windowsHide:true});
  const tab=await poll(async()=>{
    const result=await fetch("http://127.0.0.1:"+debugPort+"/json/list");
    return (await result.json()).find(t=>t.type==="page"&&t.url.startsWith(address));
  });
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;setTimeout(()=>reject(Error("websocket timeout")),5000)});
  let id=0;
  const pending=new Map(),errors=[];
  ws.onmessage=e=>{
    const msg=JSON.parse(e.data);
    if(msg.method==="Runtime.exceptionThrown")errors.push(msg.params.exceptionDetails?.text||"Runtime exception");
    if(msg.method==="Runtime.consoleAPICalled"&&msg.params.type==="error")errors.push(msg.params.args.map(a=>a.value||a.description||"").join(" "));
    if(pending.has(msg.id)){pending.get(msg.id)(msg);pending.delete(msg.id)}
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const n=++id;
    pending.set(n,msg=>{
      if(msg.error||msg.result?.exceptionDetails)reject(Error(JSON.stringify(msg.error||msg.result.exceptionDetails)));
      else resolve(msg.result);
    });
    ws.send(JSON.stringify({id:n,method,params}));
    setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(Error("CDP timeout "+method))}},9000);
  });
  const ev=async expression=>(await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true})).result?.value;
  await send("Runtime.enable");
  // Optional Android-size viewport; reload to capture the responsive layout.
  if(process.env.SWARM_MOBILE_TEST === "1") {
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:3,mobile:true});
    await send("Page.reload",{ignoreCache:true});
  }
  const stats="(()=>{const app=window.__swarmRebuild?.app,eng=app?.engine,root=document.querySelector('swarm-rebuild');return{ready:!!eng?.ready,started:!!eng?.started,done:eng?.doneCount||0,total:eng?.tasks?.length||0,items:eng?.items?.length||0,paused:!!eng?.scrollPaused,flocking:!!eng?.flocking,frontier:eng?.frontier||0,y:scrollY,root:!!root,oldUI:!!document.querySelector('#swarm-construction-layer'),allSections:document.querySelectorAll('main').length,docHeight:document.documentElement.scrollHeight}})()";
  await poll(async()=>await ev("!!window.__swarmRebuild?.app?.engine?.ready"),130,220);
  await sleep(2400);
  report.initial=await ev(stats);
  report.identity=await ev("(()=>{const a=window.__swarmRebuild.app;const photo=document.querySelector('img[alt*=Israel]');const imgBox=photo?.closest('.img');return {soundEnabled:a.sfx?.on||false,volume:a.sfx?.out?.gain?.value||0,speed:a.engine?.speed,hudDisplay:getComputedStyle(a.view.hud).display,photo:photo?.getAttribute('src')||null,portraitBackground:imgBox?getComputedStyle(imgBox).backgroundColor:null,siteBackground:getComputedStyle(document.querySelector('main')).backgroundColor,name:document.querySelector('header h3')?.textContent||'',mainName:document.querySelector('.type-string')?.textContent||'',screenWidth:innerWidth,screenHeight:innerHeight}})()");
  // No wheel, touch or scroll event here: prove the first screen builds on load.
  await sleep(2700);
  report.autostart=await ev(stats);
  if(report.initial.y!==0 || report.autostart.y!==0)
    throw Error("The startup test unexpectedly scrolled the page");
  if(!report.initial.started || !report.autostart.started || report.autostart.done<report.initial.done)
    throw Error("The first viewport did not build automatically");
  await poll(async()=>await ev("window.__swarmRebuild.app.revealUntil>=innerHeight-3"),90,160);
  report.reveal=await ev("(()=>{const a=window.__swarmRebuild.app;return {until:a.revealUntil,clip:a.view.bg.style.clipPath,cursorsClip:a.view.cursorsEl.style.clipPath,pending:a.engine.tasks.filter(t=>t.state!=='done'&&t.layer==='world'&&t.y<innerHeight).length,scrollY:scrollY,firstViewportBoost:a.engine.firstViewportBoost}})()");
  if(report.reveal.scrollY!==0||report.reveal.pending!==0||report.reveal.firstViewportBoost||report.reveal.cursorsClip)
    throw Error("First screen not fully revealed as native DOM while stationary: "+JSON.stringify(report.reveal));
  if(!report.reveal.clip.startsWith("inset("))throw Error("No progressive reveal clip was applied");
  await ev("window.scrollTo(0,1200);true");
  await sleep(2300);
  report.down=await ev(stats);
  await ev("window.scrollTo(0,160);true");
  await sleep(550);
  report.up=await ev(stats);
  await sleep(400);
  report.upStable=await ev(stats);
  await ev("window.scrollTo(0,2500);true");
  await sleep(2600);
  report.resume=await ev(stats);
  if(process.env.SWARM_LOCALE_TEST === "1") {
    // A real Chrome mouse event (not element.click) is required for Web Audio
    // user activation. The selector must also refresh the visible Swarm model.
    report.beforeLanguage=await ev("(()=>{const a=window.__swarmRebuild.app;return{locale:document.documentElement.lang,soundState:a.sfx.ctx?.state,sessionStart:a.t0,started:a.engine.started}})()");
    const target=await ev("(()=>{const els=[...document.querySelectorAll('header label.switch')];const el=els.find(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=0&&r.bottom<=innerHeight});if(!el)return null;const r=el.getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    if(!target)throw Error("Visible language control not found");
    await send("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.x,y:target.y});
    await send("Input.dispatchMouseEvent",{type:"mousePressed",x:target.x,y:target.y,button:"left",clickCount:1});
    await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:target.x,y:target.y,button:"left",clickCount:1});
    await poll(async()=>await ev("document.documentElement.lang==='en' && document.querySelector('header')?.textContent?.includes('SERVICES')"),75,120);
    await poll(async()=>await ev("window.__swarmRebuild.app?.engine?.ready && window.__swarmRebuild.app?.t0!=="+report.beforeLanguage.sessionStart),100,180);
    report.afterLanguage=await ev("(()=>{const a=window.__swarmRebuild.app;return {locale:document.documentElement.lang,soundState:a.sfx.ctx?.state,soundEnabled:a.sfx.on,volume:a.sfx.out?.gain?.value,modelHasEnglish:a.model?.items?.some(i=>i.kind==='text'&&(/SERVICES|Learn more|Fullstack developer/.test(i.full?.textContent||'')))||false,started:a.engine.started,swarmPreparing:document.documentElement.classList.contains('swarm-preparing')}})()");
    if(report.afterLanguage.locale!=="en"||!report.afterLanguage.modelHasEnglish)
      throw Error("The reconstructed visible model did not switch to English");
    if(report.afterLanguage.soundState!=="running")
      throw Error("Web Audio did not unlock on a trusted click: "+JSON.stringify(report.afterLanguage));
    if(report.afterLanguage.swarmPreparing)
      throw Error("The page remained hidden after locale rebuild");
    console.log("SWARM_LANGUAGE_AUDIO_OK",JSON.stringify({before:report.beforeLanguage,after:report.afterLanguage}));
  }
  if(process.env.SWARM_FULL_TEST === "1") {
    await ev("window.__swarmRebuild.app.engine.speed=3;true");
    const totalHeight=await ev("document.documentElement.scrollHeight");
    for(let y=3200;y<totalHeight;y+=650) {
      await ev("window.scrollTo(0,"+y+");true");
      await sleep(420);
    }
    await ev("window.scrollTo(0,document.documentElement.scrollHeight);true");
    const checkpoints=[];
    for(let i=0;i<50;i++) {
      await sleep(800);
      const state=await ev(stats);
      if(i%5===0||state.flocking)checkpoints.push({done:state.done,total:state.total,flocking:state.flocking});
      if(state.flocking)break;
    }
    report.full={final:await ev(stats),checkpoints};
    report.full.autoHandoff=await ev("(()=>{const a=window.__swarmRebuild.app;return{bg:a.view.bg.style.opacity,world:a.view.world.style.opacity,passive:a.view.host.style.pointerEvents}})()");
    if(report.full.autoHandoff.bg!=="0"||report.full.autoHandoff.world!=="0"||!report.full.autoHandoff.passive)
      throw Error("Automatic completion did not reveal the original site");
    const centroid=()=>ev("(()=>{const cs=window.__swarmRebuild.app.engine.cursors;return cs.reduce((s,c)=>s+c.x,0)/Math.max(1,cs.length)})()");
    await ev("window.dispatchEvent(new PointerEvent('pointermove',{clientX:80,clientY:90,bubbles:true}));true");
    await sleep(1100);
    const left=await centroid();
    await ev("window.dispatchEvent(new PointerEvent('pointermove',{clientX:1320,clientY:740,bubbles:true}));true");
    await sleep(1600);
    const right=await centroid();
    report.full.mouseFollow={left,right,delta:right-left};
    if(right-left<140)throw Error("Completed cursors did not follow the mouse");
    if(report.full.final.done!==report.full.final.total||!report.full.final.flocking)
      throw Error("Complete-page reconstruction did not finish: "+JSON.stringify(report.full));
  }
  // Exercise the original-page handoff path without falsely claiming that
  // hundreds of genuine construction tasks have all finished.
  report.handoff=await ev("(()=>{const a=window.__swarmRebuild.app;a.onComplete();return{originalVisible:a.view.bg.style.opacity==='0',worldHidden:a.view.world.style.opacity==='0',cursorCount:a.engine.cursors.length,hostPassive:a.view.host.style.pointerEvents==='none'}})()");
  report.errors=errors.slice(0,8);
  console.log(JSON.stringify(report,null,2));
  if(!report.initial.ready||!report.initial.started||report.initial.total<100||report.initial.items<100)throw Error("Swarm did not capture the full template");
  if(report.initial.oldUI)throw Error("Old incomplete overlay is still active");
  if(!report.identity.soundEnabled||Math.abs(report.identity.volume-0.52)>0.01||report.identity.speed!==1)
    throw Error("Sound or default 1x configuration is wrong: "+JSON.stringify(report.identity));
  if(report.identity.hudDisplay!=="none")throw Error("Swarm toolbar is still visible");
  if(!report.identity.name.includes("IM")||!report.identity.mainName.includes("Israel Miguel")||!report.identity.photo?.includes("israel-miguel.webp"))
    throw Error("Israel Miguel branding/photo is missing");
  if(report.identity.portraitBackground!==report.identity.siteBackground)
    throw Error("Portrait background differs from current page theme");
  if(process.env.SWARM_MOBILE_TEST==="1"&&report.identity.screenWidth>420)
    throw Error("Mobile viewport emulation not applied");
  if(report.down.done<=report.initial.done||report.down.paused)throw Error("Downward reconstruction did not advance");
  if(!report.up.paused||report.upStable.done!==report.up.done)throw Error("Upward scroll did not pause tasks");
  if(report.resume.paused||report.resume.done<=report.upStable.done)throw Error("Resume did not advance tasks");
  if(!report.handoff.originalVisible||!report.handoff.worldHidden||!report.handoff.hostPassive)throw Error("Original React page was not restored");
  if(report.errors.length)throw Error("Browser console/runtime errors: "+JSON.stringify(report.errors));
  console.log("SWARM_SCROLL_INTEGRATION_OK");
}catch(error){console.error("SWARM_SCROLL_INTEGRATION_FAIL:",error.stack||error.message);process.exitCode=1}
finally{
  try{ws?.close()}catch{}
  if(child){child.kill();if(process.platform==="win32")try{spawnSync("taskkill.exe",["/PID",String(child.pid),"/T","/F"],{stdio:"ignore",timeout:3000})}catch{}}
  await new Promise(resolve=>server.close(resolve));
}

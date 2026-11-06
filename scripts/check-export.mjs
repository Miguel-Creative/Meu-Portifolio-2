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
  const stats="(()=>{const app=window.__swarmRebuild?.app,eng=app?.engine,root=document.querySelector('swarm-rebuild');return{ready:!!eng?.ready,started:!!eng?.started,done:eng?.doneCount||0,total:eng?.tasks?.length||0,items:eng?.items?.length||0,paused:!!eng?.scrollPaused,flocking:!!eng?.flocking,frontier:eng?.frontier||0,y:scrollY,root:!!root,oldUI:!!document.querySelector('#swarm-construction-layer'),allSections:document.querySelectorAll('main').length,docHeight:document.documentElement.scrollHeight}})()";
  await poll(async()=>await ev("!!window.__swarmRebuild?.app?.engine?.ready"),130,220);
  await sleep(2400);
  report.initial=await ev(stats);
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
  // Exercise the original-page handoff path without falsely claiming that
  // hundreds of genuine construction tasks have all finished.
  report.handoff=await ev("(()=>{const a=window.__swarmRebuild.app;a.onComplete();return{originalVisible:a.view.bg.style.opacity==='0',worldHidden:a.view.world.style.opacity==='0',cursorCount:a.engine.cursors.length,hostPassive:a.view.host.style.pointerEvents==='none'}})()");
  report.errors=errors.slice(0,8);
  console.log(JSON.stringify(report,null,2));
  if(!report.initial.ready||!report.initial.started||report.initial.total<100||report.initial.items<100)throw Error("Swarm did not capture the full template");
  if(report.initial.oldUI)throw Error("Old incomplete overlay is still active");
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

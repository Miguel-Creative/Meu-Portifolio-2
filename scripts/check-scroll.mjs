/*
 * Real Chrome integration check: original Next portfolio + on-scroll cursors.
 * Run with: node scripts/check-scroll.mjs
 */
import {spawn,spawnSync} from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=39765;
const url="http://127.0.0.1:"+port;
const dev=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","-p",String(port)],{cwd:process.cwd(),stdio:["ignore","pipe","pipe"],windowsHide:true});
let serverLog="";
dev.stdout.on("data",v=>serverLog+=v.toString().slice(-4000));
dev.stderr.on("data",v=>serverLog+=v.toString().slice(-4000));
let browser=null;
async function poll(fn,maxMs=60000){
  const start=Date.now();
  while(Date.now()-start<maxMs){
    try{const v=await fn();if(v)return v;}catch(e){}
    await sleep(350);
  }
  throw new Error("Timed out waiting for service. Server log: "+serverLog.slice(-1500));
}
function killTree(process){
  if(!process||!process.pid)return;
  try{process.kill()}catch(e){}
  try{spawnSync("taskkill.exe",["/PID",String(process.pid),"/T","/F"],{stdio:"ignore",timeout:5000});}catch(e){}
}
let failed=false;
try{
  await poll(async()=>{const r=await fetch(url);return r.ok;},90000);
  const exe=["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(fs.existsSync);
  if(!exe)throw new Error("Chrome/Edge not installed");
  const debugPort=18933;
  const profile=path.join(os.tmpdir(),"portfolio-scroll-check-"+process.pid);
  browser=spawn(exe,["--headless=new","--disable-extensions","--no-first-run","--no-default-browser-check","--disable-gpu","--remote-debugging-port="+debugPort,"--user-data-dir="+profile,url],{stdio:"ignore",windowsHide:true});
  const page=await poll(async()=>{
    const r=await fetch("http://127.0.0.1:"+debugPort+"/json/list");
    const targets=await r.json();
    return targets.find(t=>t.type==="page"&&t.url.startsWith(url));
  });
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});
  const awaits=new Map(),errors=[];
  let serial=0;
  ws.onmessage=event=>{
    let m;try{m=JSON.parse(event.data);}catch(e){return;}
    if(m.id&&awaits.has(m.id)){
      const fn=awaits.get(m.id);awaits.delete(m.id);fn(m);
    }
    if(m.method==="Runtime.exceptionThrown")errors.push(JSON.stringify(m.params).slice(0,300));
  };
  const send=(method,params={})=>new Promise((res,rej)=>{
    const id=++serial;
    awaits.set(id,message=>message.error?rej(Error(JSON.stringify(message.error))):res(message.result));
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(awaits.has(id)){awaits.delete(id);rej(Error("CDP timeout: "+method));}},7500);
  });
  await send("Runtime.enable");
  async function evaluate(code){
    const result=await send("Runtime.evaluate",{expression:code,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error("Browser exception: "+JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await poll(async()=>await evaluate("!!window.__portfolioSwarm && window.__portfolioSwarm.stats().total>0"),22000);
  await sleep(2200);
  const first=await evaluate("({stats:window.__portfolioSwarm.stats(),title:document.title,sections:document.querySelectorAll('main section').length,hasOriginal:document.body.textContent.includes('Glayson'),pageHeight:document.documentElement.scrollHeight,hasCover:!!document.querySelector('.intro-screen'),root:location.href})");
  await evaluate("window.scrollTo({top:Math.round(document.documentElement.scrollHeight*0.3),behavior:'instant'});true");
  await sleep(1500);
  const down=await evaluate("({stats:window.__portfolioSwarm.stats(),y:window.scrollY})");
  await evaluate("window.scrollTo({top:Math.round(document.documentElement.scrollHeight*0.09),behavior:'instant'});true");
  await sleep(380);
  const up=await evaluate("({stats:window.__portfolioSwarm.stats(),y:window.scrollY})");
  await evaluate("window.scrollTo({top:Math.round(document.documentElement.scrollHeight*0.52),behavior:'instant'});true");
  await sleep(1600);
  const resumed=await evaluate("({stats:window.__portfolioSwarm.stats(),y:window.scrollY})");
  await evaluate("window.__portfolioSwarm.skip();true");
  await sleep(200);
  const finished=await evaluate("({stats:window.__portfolioSwarm.stats(),remainingHidden:document.querySelectorAll('[data-swarm-content],[data-swarm-box]').length,header:!!document.querySelector('header'),clickable:!!document.querySelector('main a')})");
  console.log(JSON.stringify({first,down,up,resumed,finished,exceptions:errors.slice(0,3)},null,2));
  if(!first.hasOriginal||first.sections<3||first.hasCover||first.stats.total<10)throw Error("Original portfolio or construction tasks missing");
  if(down.stats.mode!=="build")throw Error("Did not continue building on downward scroll");
  if(up.stats.mode!=="pause")throw Error("Did not pause on upward scroll");
  if(resumed.stats.mode!=="build")throw Error("Did not resume on downward scroll");
  if(finished.remainingHidden!==0||!finished.stats.complete||!finished.clickable)throw Error("Site not restored as interactive after build");
  console.log("SCROLL_SWARM_CHECK_OK");
  ws.close();
}catch(error){
  failed=true;console.error("SCROLL_SWARM_CHECK_FAILED",error.message);
  console.error("NEXT_LOG_TAIL:",serverLog.slice(-2200));
}finally{killTree(browser);killTree(dev);}
if(failed)process.exitCode=1;

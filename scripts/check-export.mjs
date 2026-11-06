/* Testa o portfólio exportado como site estático no Chrome, sem extensões.
 * node scripts/check-export.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawn,spawnSync} from "node:child_process";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const cwd=process.cwd(),out=path.join(cwd,"out");
const port=39442,debugPort=19891,url="http://127.0.0.1:"+port;
const contentTypes={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ico":"image/x-icon",".pdf":"application/pdf"};
if(!fs.existsSync(path.join(out,"index.html")))throw Error("Export ausente: out/index.html");
const server=http.createServer((req,res)=>{
 let pathname;
 try{pathname=decodeURIComponent(new URL(req.url,url).pathname);}catch{res.writeHead(400);res.end();return;}
 let filepath=path.join(out,pathname);
 if(!filepath.startsWith(out)){res.writeHead(403);res.end();return;}
 if(fs.existsSync(filepath)&&fs.statSync(filepath).isDirectory())filepath=path.join(filepath,"index.html");
 if(!fs.existsSync(filepath)&&!path.extname(filepath))filepath=path.join(filepath,"index.html");
 fs.readFile(filepath,(err,bytes)=>{
  if(err){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":contentTypes[path.extname(filepath)]||"application/octet-stream","Cache-Control":"no-store"});
  res.end(bytes);
 });
});
const chrome=["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"].find(fs.existsSync);
if(!chrome)throw Error("Chrome/Edge não disponível");
const poll=async(fn,tries=90,interval=200)=>{for(let i=0;i<tries;i++){try{const value=await fn();if(value)return value;}catch(e){}await delay(interval);}throw Error("Endpoint CDP/browser não disponível");};
function endProc(p){if(!p)return;try{p.kill();}catch{}try{spawnSync("taskkill.exe",["/PID",String(p.pid),"/T","/F"],{stdio:"ignore",timeout:1800});}catch{}}
let browser,ws;
try{
 await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
 browser=spawn(chrome,["--headless=new","--disable-extensions","--disable-gpu","--no-first-run","--no-default-browser-check","--remote-debugging-port="+debugPort,"--user-data-dir="+path.join(os.tmpdir(),"portfolio-check-"+process.pid),url],{stdio:"ignore",windowsHide:true});
 const tab=await poll(async()=>{const r=await fetch("http://127.0.0.1:"+debugPort+"/json/list");const tabs=await r.json();return tabs.find(t=>t.type==="page"&&t.url.startsWith(url));},110,250);
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;setTimeout(()=>reject(Error("ws timeout")),4000);});
 let cid=0;const pending=new Map(),exceptions=[];
 ws.onmessage=event=>{let m;try{m=JSON.parse(event.data);}catch{return;}if(m.method==="Runtime.exceptionThrown")exceptions.push(String(m.params.exceptionDetails?.text||"error"));if(pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++cid;pending.set(id,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error("timeout "+method));}},7000);});
 await send("Runtime.enable");
 const evaluate=async expression=>{const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
 const controller=await poll(async()=>await evaluate("!!window.__portfolioSwarm && window.__portfolioSwarm.stats().total > 0"),100,220);
 await delay(1300);
 const first=await evaluate("({stats:window.__portfolioSwarm.stats(),title:document.title,sections:document.querySelectorAll('main section').length,roots:document.querySelectorAll('main').length,height:document.documentElement.scrollHeight,hasEntryOverlay:!!document.querySelector('.intro-screen'),hasOriginal:document.body.innerText.includes('Glayson')})");
 await evaluate("window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*.32));true");
 await delay(1300);
 const down=await evaluate("({stats:window.__portfolioSwarm.stats(),y:scrollY})");
 await evaluate("window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*.06));true");
 await delay(500);
 const up=await evaluate("({stats:window.__portfolioSwarm.stats(),y:scrollY})");
 await evaluate("window.scrollTo(0,Math.round((document.documentElement.scrollHeight-innerHeight)*.52));true");
 await delay(1250);
 const resumed=await evaluate("({stats:window.__portfolioSwarm.stats(),y:scrollY})");
 await evaluate("window.__portfolioSwarm.skip();true");
 await delay(250);
 const finish=await evaluate("({stats:window.__portfolioSwarm.stats(),pendingHidden:document.querySelectorAll('[data-swarm-content],[data-swarm-box]').length,linkCount:document.querySelectorAll('main a').length})");
 const report={first,down,up,resumed,finish,exceptions:exceptions.slice(0,4)};
 console.log(JSON.stringify(report,null,2));
 if(first.stats.total<10||first.roots!==1||first.height<1400)throw Error("Página original ou tarefas não encontradas");
 if(down.stats.mode!=="build")throw Error("Direção descer falhou");
 if(up.stats.mode!=="pause")throw Error("Direção subir falhou");
 if(resumed.stats.mode!=="build")throw Error("Retomada ao descer falhou");
 if(finish.pendingHidden!==0||!finish.stats.complete)throw Error("Elementos permanecem ocultos no fim");
 console.log("STATIC_SCROLL_TEST_OK");
}catch(e){console.error("STATIC_SCROLL_TEST_FAIL:",e.message);process.exitCode=1;}
finally{try{ws?.close();}catch{}endProc(browser);await new Promise(resolve=>server.close(resolve));}

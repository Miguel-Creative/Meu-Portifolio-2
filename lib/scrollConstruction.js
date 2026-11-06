/*
 * Scroll Construction — original, site-owned implementation.
 * Renders visual design-tool cursor choreography against the actual React DOM.
 * No Chrome extension, imported animation engine, or replacement page.
 */
const COLORS = ["#1ABCFE","#A259FF","#0ACF83","#FF7262","#F9CA28","#FF65A3","#6AE6F0","#C9FF73","#FF9B59","#AAB4FF","#49DDBF","#C99DFF"];
const NAMES = ["Ada","Linus","Grace","Alan","Margaret","Ken","Radia","Guido","Barbara","Hedy","Tim","Joan"];
const TARGETS = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,small,button,a,img,video,canvas,svg,span,code,strong,em";
const BLOCK = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,button,a";
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lerp=(a,b,t)=>a+(b-a)*t;
const finite=(n)=>Number.isFinite(n)?n:0;
const area=r=>Math.max(0,r.width)*Math.max(0,r.height);
const visible=e=>{
  if(!e || !e.isConnected) return false;
  const s=getComputedStyle(e);
  if(s.display==="none"||s.visibility==="hidden")return false;
  const r=e.getBoundingClientRect();
  return r.width>3 && r.height>3;
};
const pageY=e=>e.getBoundingClientRect().top+window.scrollY;

function textTarget(el){
  const tag=el.tagName.toLowerCase();
  if(tag==="svg" && el.closest("svg svg"))return false;
  if(el.closest("[data-swarm-ui]"))return false;
  if(tag==="span" || tag==="strong" || tag==="em" || tag==="code" || tag==="small"){
    if(el.querySelector("svg,canvas,img,h1,h2,h3,h4,p,button"))return false;
    if(el.textContent.trim().length<2)return false;
    if(el.closest("h1,h2,h3,h4,h5,h6,p,li,button,a,blockquote,figcaption"))return false;
    if(el.parentElement && el.parentElement.closest("[role='presentation']"))return false;
    return true;
  }
  if(tag==="a" && el.querySelector("h1,h2,h3,h4,h5,h6,p,button"))return false;
  if(["svg","img","canvas","video"].includes(tag)){
    if(el.closest("button,a,h1,h2,h3,h4,h5,h6"))return false;
    if(tag==="svg" && el.closest("svg"))return false;
    return true;
  }
  if(!el.textContent.trim() && !["button","a"].includes(tag))return false;
  return true;
}

function createCursor(index,root,initialX,initialY){
  const color=COLORS[index%COLORS.length];
  const node=document.createElement("div");
  node.className="swarm-cursor";
  node.style.setProperty("--cursor-color",color);
  node.innerHTML='<svg class="swarm-arrow" viewBox="0 0 26 28" width="27" height="29" aria-hidden="true"><path d="M3 2L3 23L8.7 17.1L12.7 25L17.2 22.7L13.1 15.1L22.1 13.4Z" fill="'+color+'" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg><svg class="swarm-cross" viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M13 1v24M1 13h24" stroke="'+color+'" stroke-width="1.6"/><circle cx="13" cy="13" r="5" fill="none" stroke="#fff" stroke-width="1.5"/></svg><svg class="swarm-ibeam" viewBox="0 0 26 26" width="26" height="26" aria-hidden="true"><path d="M7 3h12M13 3v20M7 23h12" fill="none" stroke="'+color+'" stroke-width="2" stroke-linecap="round"/></svg><span class="swarm-name">'+NAMES[index%NAMES.length]+'</span>';
  root.appendChild(node);
  return {node,index,color,x:initialX,y:initialY,vx:0,vy:0,task:null,working:false,delay:index*0.07};
}

function createSketch(layer){
  const frame=document.createElement("div");
  frame.className="swarm-sketch";
  frame.innerHTML='<div class="swarm-corner swarm-tl"></div><div class="swarm-corner swarm-tr"></div><div class="swarm-corner swarm-bl"></div><div class="swarm-corner swarm-br"></div><span class="swarm-measure"></span>';
  layer.appendChild(frame);
  return frame;
}

export function startScrollConstruction(){
  if(typeof window==="undefined" || !document.querySelector("main"))return ()=>{};
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  if(media.matches)return ()=>{};
  const mobile=window.matchMedia("(max-width: 680px)").matches;
  const maxAgents=mobile?6:14;
  const layer=document.createElement("div");
  layer.id="swarm-construction-layer";
  layer.setAttribute("data-swarm-ui","");
  layer.setAttribute("aria-hidden","true");
  const canvas=document.createElement("div");
  canvas.className="swarm-overlay";
  const cursorRoot=document.createElement("div");
  cursorRoot.className="swarm-cursors";
  layer.append(canvas,cursorRoot);
  document.body.appendChild(layer);
  const state={
    destroyed:false,mode:"build",scrollY:window.scrollY,lastScrollY:window.scrollY,
    pointer:{x:window.innerWidth*0.58,y:Math.min(260,window.innerHeight*.42)},
    agents:[],tasks:[],pending:0,done:0,total:0,raf:0,
    timer:0,firstPaint:0,sketches:[],lastNow:performance.now(),
    started:false,completed:false,pausedAt:0,lastScrollDirection:0,
  };
  const restorations=[];
  const agentCount=maxAgents;
  for(let i=0;i<agentCount;i++){
    const startX=i%2===0?-80-i*15:window.innerWidth+60+i*15;
    const startY=50+((i*113)%(Math.max(250,window.innerHeight-110)));
    state.agents.push(createCursor(i,cursorRoot,startX,startY));
  }

  function hideLeaf(el,kind){
    if(el.hasAttribute("data-swarm-content"))return;
    el.setAttribute("data-swarm-content","queued");
    restorations.push({el,kind,oldVisibility:el.style.visibility,oldClip:el.style.clipPath,oldOpacity:el.style.opacity});
  }
  function hideBox(el){
    if(el.hasAttribute("data-swarm-box"))return;
    el.setAttribute("data-swarm-box","queued");
    restorations.push({el,kind:"box"});
  }
  function scan(){
    const roots=[document.querySelector("header"),document.querySelector("main"),document.querySelector("footer")].filter(Boolean);
    let content=[],boxes=[],selected=new WeakSet(),selectedBoxes=new WeakSet();
    for(const root of roots){
      for(const el of root.querySelectorAll(TARGETS)){
        if(content.length>=660)break;
        if(selected.has(el))continue;
        if(!visible(el)||!textTarget(el))continue;
        if(el.closest("[data-swarm-ui]"))continue;
        if(el.closest("[data-swarm-content]"))continue;
        const rect=el.getBoundingClientRect();
        if(area(rect)<20)continue;
        if(rect.width>window.innerWidth*1.2)continue;
        if(["svg","canvas","video"].includes(el.tagName.toLowerCase()) && rect.height>720)continue;
        selected.add(el);
        content.push({el,kind:["svg","img","canvas","video"].includes(el.tagName.toLowerCase())?"media":"text",order:content.length});
      }
    }
    for(const root of roots){
      let found=0;
      for(const el of root.querySelectorAll("div,section,article,aside,nav,button")){
        if(found>180)break;
        if(selectedBoxes.has(el))continue;
        if(!visible(el))continue;
        if(el===root || el.closest("[data-swarm-ui]"))continue;
        const r=el.getBoundingClientRect();
        if(r.width<35||r.height<14||area(r)>window.innerWidth*window.innerHeight*0.7)continue;
        const cs=getComputedStyle(el),bg=cs.backgroundColor,grad=cs.backgroundImage;
        const isBg=(bg && bg!=="transparent" && !/rgba?\([^)]*,\s*0(?:\.\d+)?\s*\)/.test(bg) && bg!=="rgba(0, 0, 0, 0)");
        const isBorder=parseFloat(cs.borderTopWidth)>0 && cs.borderTopStyle!=="none";
        const isShadow=cs.boxShadow && cs.boxShadow!=="none";
        if(!(isBg||isBorder||isShadow||(grad && grad!=="none")))continue;
        if(r.width>window.innerWidth*0.93&&r.height>window.innerHeight*0.45)continue;
        boxes.push({el,kind:"box",order:boxes.length});
        selectedBoxes.add(el);
        found++;
      }
    }
    const all=[...boxes,...content].map(item=>{
      const rect=item.el.getBoundingClientRect();
      item.top=rect.top+window.scrollY;
      item.bottom=rect.bottom+window.scrollY;
      item.width=rect.width;item.height=rect.height;
      item.state="queued";item.progress=0;item.agent=null;item.duration=0.42;
      item.savedVisibility=item.el.style.visibility;item.savedClip=item.el.style.clipPath;item.savedOpacity=item.el.style.opacity;
      if(item.kind==="text"){
        const length=(item.el.textContent||"").trim().length;
        item.duration=clamp(0.20+length*0.012,0.35,2.0);
      }else if(item.kind==="media"){
        item.duration=clamp(0.5+area(rect)/1700000,0.5,1.3);
      }else{
        item.duration=clamp(0.2+area(rect)/250000,0.26,0.95);
      }
      return item;
    });
    all.sort((a,b)=>a.top-b.top|| (a.kind==="box"?-1:1));
    for(const task of all){
      if(task.kind==="box")hideBox(task.el);
      else hideLeaf(task.el,task.kind);
    }
    state.tasks=all;
    state.total=all.length;
    state.pending=all.length;
    state.started=true;
    // A fixed header is always part of the initial build.
  }

  function setTaskProgress(task,progress){
    if(task.kind==="box")return;
    const el=task.el;
    if(task.state==="done")return;
    if(progress<=0){
      el.setAttribute("data-swarm-content","queued");
      el.style.clipPath="";
      return;
    }
    el.setAttribute("data-swarm-content","building");
    if(task.kind==="text"){
      el.style.clipPath="inset(0 "+(100-clamp(progress,0,1)*100).toFixed(2)+"% 0 0)";
    }else{
      el.style.clipPath="inset(0 0 "+(100-clamp(progress,0,1)*100).toFixed(2)+"% 0)";
    }
  }

  function finishTask(task){
    if(task.state==="done")return;
    task.state="done";
    task.progress=1;
    task.el.removeAttribute("data-swarm-content");
    task.el.removeAttribute("data-swarm-box");
    if(task.kind!=="box"){
      task.el.style.clipPath=task.savedClip??"";
      task.el.style.visibility=task.savedVisibility??"";
      task.el.style.opacity=task.savedOpacity??"";
    }
    if(task.frame){task.frame.remove();task.frame=null;}
    if(task.agent){task.agent.task=null;task.agent.working=false;task.agent.node.classList.remove("is-drawing","is-typing");task.agent=null;}
    state.done++;
    state.pending=Math.max(0,state.total-state.done);
  }

  function freezeAgents(){
    for(const cursor of state.agents){
      if(cursor.task){
        cursor.task.agent=null;
        if(cursor.task.frame){cursor.task.frame.remove();cursor.task.frame=null;}
        if(cursor.task.state!=="done")cursor.task.state="queued";
        cursor.task=null;
      }
      cursor.node.classList.remove("is-drawing","is-typing");
      cursor.working=false;
    }
  }
  function releaseBehind(){
    const above=window.scrollY-window.innerHeight*0.38;
    for(const task of state.tasks)if(task.state!=="done"&&task.bottom<above)finishTask(task);
  }
  function accessible(task){
    if(task.state!=="queued" || !task.el.isConnected)return false;
    const y=window.scrollY;
    if(task.bottom<y-20||task.top>y+window.innerHeight*0.96)return false;
    const r=task.el.getBoundingClientRect();
    if(r.bottom<0 || r.top>window.innerHeight*0.95)return false;
    if(r.width<=0 || r.height<=0)return false;
    const currentStyle=getComputedStyle(task.el);
    if(currentStyle.display==="none")return false;
    return true;
  }
  function ensureTask(cursor){
    if(cursor.task)return;
    const limit=window.innerHeight*0.95;
    let match=null,score=Infinity;
    const y=window.scrollY;
    for(const task of state.tasks){
      if(!accessible(task))continue;
      const r=task.el.getBoundingClientRect();
      const center=r.top+r.height/2;
      const dist=Math.abs(cursor.y-center)*0.15+Math.abs(cursor.x-(r.left+r.width/2))*0.07;
      // Prioritize content near the incoming lower edge while scrolling.
      const typeBias=task.kind==="box"?-35:task.kind==="text"?0:10;
      const queueBias=(task.top-y)*0.06;
      const value=dist+typeBias+queueBias;
      if(value<score){score=value;match=task;}
    }
    if(!match)return;
    match.state="active";
    match.agent=cursor;
    cursor.task=match;
    cursor.working=true;
    cursor.node.classList.add(match.kind==="text"?"is-typing":"is-drawing");
    match.frame=createSketch(canvas);
    match.frame.style.setProperty("--cursor-color",cursor.color);
  }

  function moveCursor(cursor,tx,ty,dt){
    const k=1-Math.exp(-Math.min(dt,0.05)*7.5);
    const ax=(tx-cursor.x)*k,ay=(ty-cursor.y)*k;
    cursor.vx=lerp(cursor.vx,ax/Math.max(dt,0.001),0.3);
    cursor.vy=lerp(cursor.vy,ay/Math.max(dt,0.001),0.3);
    cursor.x+=ax;cursor.y+=ay;
    cursor.node.style.transform="translate3d("+finite(cursor.x).toFixed(1)+"px,"+finite(cursor.y).toFixed(1)+"px,0)";
  }

  function follow(cursor,dt,time){
    const i=cursor.index,theta=(i/agentCount)*Math.PI*2+time*0.0005;
    const orbit=mobile?18:26;
    const radius=orbit+Math.sqrt(i)*8;
    const goalX=clamp(state.pointer.x+Math.cos(theta)*radius,8,window.innerWidth-10);
    const goalY=clamp(state.pointer.y+Math.sin(theta)*radius*.8,8,window.innerHeight-10);
    moveCursor(cursor,goalX,goalY,dt);
  }

  function draw(task,cursor,dt){
    if(!task.el.isConnected){finishTask(task);return;}
    const r=task.el.getBoundingClientRect();
    if(r.top>window.innerHeight+10 || r.bottom<0){
      task.agent=null;cursor.task=null;task.state="queued";
      if(task.frame)task.frame.remove();task.frame=null;
      cursor.node.classList.remove("is-drawing","is-typing");
      return;
    }
    const progress=task.progress;
    const drawX=r.left+r.width*clamp(progress*1.05,0,1);
    const drawY=r.top+r.height*(task.kind==="box"?clamp(progress,0,1):0.5);
    moveCursor(cursor,drawX,drawY,dt);
    task.progress=clamp(task.progress+dt/task.duration,0,1);
    const f=task.frame;
    if(f){
      const p=task.progress;
      f.style.transform="translate3d("+r.left.toFixed(1)+"px,"+r.top.toFixed(1)+"px,0)";
      f.style.width=Math.max(1,r.width*p).toFixed(1)+"px";
      f.style.height=Math.max(1,task.kind==="text"?r.height:Math.max(1,r.height*p)).toFixed(1)+"px";
      const label=f.querySelector(".swarm-measure");
      if(label)label.textContent=Math.round(r.width*p)+" × "+Math.round(r.height*(task.kind==="text"?1:p));
    }
    setTaskProgress(task,task.progress);
    if(task.progress>=1)finishTask(task);
  }

  function frame(now){
    if(state.destroyed)return;
    const dt=Math.min(0.047,(now-state.lastNow)/1000||0.016);
    state.lastNow=now;
    if(state.started){
      if(state.mode==="build"){
        releaseBehind();
        for(const agent of state.agents)ensureTask(agent);
        for(const agent of state.agents){
          if(agent.task)draw(agent.task,agent,dt);
          else follow(agent,dt,now);
        }
        if(state.done===state.total && state.total>0){
          state.completed=true;state.mode="complete";
          freezeAgents();
        }
      }else{
        for(const agent of state.agents)follow(agent,dt,now);
      }
    }else{
      for(const agent of state.agents)follow(agent,dt,now);
    }
    state.raf=requestAnimationFrame(frame);
  }

  function setDirection(direction){
    if(state.completed || direction===0)return;
    state.lastScrollDirection=direction;
    if(direction<0){
      if(state.mode!=="pause"){
        state.mode="pause";
        state.pausedAt=performance.now();
        freezeAgents();
      }
    }else state.mode="build";
  }
  function onWheel(e){if(Math.abs(e.deltaY)>1)setDirection(Math.sign(e.deltaY));}
  let touchStartY=null;
  function onTouchStart(e){if(e.touches && e.touches.length)touchStartY=e.touches[0].clientY;}
  function onTouchMove(e){
    if(touchStartY===null||!e.touches||!e.touches.length)return;
    const y=e.touches[0].clientY,delta=touchStartY-y;
    if(Math.abs(delta)>5){setDirection(Math.sign(delta));touchStartY=y;}
  }
  function onScroll(){
    const y=window.scrollY,delta=y-state.lastScrollY;
    if(Math.abs(delta)>1.5)setDirection(Math.sign(delta));
    state.lastScrollY=y;
    state.scrollY=y;
  }
  function onPointer(e){state.pointer.x=e.clientX;state.pointer.y=e.clientY;}
  function onResize(){
    for(const task of state.tasks){
      if(!task.el.isConnected)continue;
      const r=task.el.getBoundingClientRect();
      task.top=r.top+window.scrollY;task.bottom=r.bottom+window.scrollY;
      task.width=r.width;task.height=r.height;
    }
  }
  function onKey(e){
    // Escape releases the page but keeps it fully usable.
    if(e.key==="Escape")releaseAll();
  }
  function releaseAll(){
    for(const task of state.tasks)if(task.state!=="done")finishTask(task);
    state.mode="complete";state.completed=true;freezeAgents();
  }
  function destroy(){
    state.destroyed=true;
    cancelAnimationFrame(state.raf);
    clearTimeout(state.timer);
    window.removeEventListener("scroll",onScroll);
    window.removeEventListener("wheel",onWheel);
    window.removeEventListener("touchstart",onTouchStart);
    window.removeEventListener("touchmove",onTouchMove);
    window.removeEventListener("pointermove",onPointer);
    window.removeEventListener("resize",onResize);
    window.removeEventListener("keydown",onKey);
    for(const task of state.tasks)if(task.frame)task.frame.remove();
    for(const item of restorations){
      if(!item.el.isConnected)continue;
      item.el.removeAttribute("data-swarm-content");
      item.el.removeAttribute("data-swarm-box");
      if(item.kind!=="box"){
        item.el.style.visibility=item.oldVisibility||"";
        item.el.style.clipPath=item.oldClip||"";
        item.el.style.opacity=item.oldOpacity||"";
      }
    }
    layer.remove();
    if(window.__portfolioSwarm && window.__portfolioSwarm.instance===api)delete window.__portfolioSwarm;
  }

  window.addEventListener("scroll",onScroll,{passive:true});
  window.addEventListener("wheel",onWheel,{passive:true});
  window.addEventListener("touchstart",onTouchStart,{passive:true});
  window.addEventListener("touchmove",onTouchMove,{passive:true});
  window.addEventListener("pointermove",onPointer,{passive:true});
  window.addEventListener("resize",onResize,{passive:true});
  window.addEventListener("keydown",onKey);
  state.lastNow=performance.now();
  state.raf=requestAnimationFrame(frame);
  state.timer=setTimeout(()=>{
    if(state.destroyed)return;
    scan();
  },420);
  const api={
    instance:null,
    stats(){
      return {mode:state.mode,total:state.total,done:state.done,remaining:state.pending,
        active:state.agents.filter(a=>a.task).length,cursors:state.agents.length,
        overlay:!!document.querySelector("#swarm-construction-layer"),complete:state.completed,scrollDirection:state.lastScrollDirection};
    },
    skip:releaseAll,
    destroy,
  };
  api.instance=api;
  window.__portfolioSwarm=api;
  return destroy;
}

'use strict';
/* 15-draw-overlays.js — Отрисовка сечений, точек, HUD и главный цикл draw. */
function drawBuild(){
  const b=state.build;
  if(!b) return;
  const sec=state.sections.find(s=>s.id===b.secId);
  if(sec && !sec.show) return;
  const n=b.steps.length, k=b.k, complete=(k>=n);
  if(!complete) patchFor(b.plane, b.poly, 'rgba(255,95,158,0.07)', 'rgba(255,95,158,0.35)');
  if(state.showExt && k>0){
    const solid=state.solids.find(s=>s.id===b.solidId);
    if(solid && !solid.smooth){
      ctx.setLineDash([4,6]); ctx.lineWidth=1.3;
      ctx.strokeStyle='rgba(126,231,135,0.6)';
      drawExtensions(b);
      ctx.setLineDash([]);
      drawEdgeExtensions(solid, b.plane);
    }
  }
  ctx.setLineDash([]);
  if(!b.show) return;
  if(!complete){
    for(let i=0;i<k;i++){
      const st=b.steps[i];
      const a=project(st.a), c=project(st.b);
      ctx.setLineDash([7,5]); ctx.lineCap='butt';
      ctx.strokeStyle='rgba(255,209,102,0.95)'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  const revealed = k===0 ? 0 : Math.min(k+1, n);
  ctx.font='700 12px -apple-system,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let i=0;i<revealed;i++){
    const sp=project(b.poly[i]);
    ctx.beginPath(); ctx.arc(sp.x,sp.y,4.8,0,7); ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle='#ff5f9e'; ctx.lineWidth=1.8; ctx.stroke();
    const tx=sp.x+15;
    ctx.fillStyle='rgba(10,14,20,0.82)';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(tx-9,sp.y-9,18,18,5); else ctx.rect(tx-9,sp.y-9,18,18);
    ctx.fill();
    ctx.fillStyle='#ffd166'; ctx.fillText(String(i+1), tx, sp.y+0.5);
  }
}
function drawSections(){
  for(const sec of state.sections){
    if(!sec.show) continue;
    const b=state.build;
    if(b && b.secId===sec.id && b.k < b.steps.length) continue;
    const ssel=isSel('section',sec.id);
    const sp=sec.pts.map(project);
    ctx.beginPath(); ctx.moveTo(sp[0].x,sp[0].y);
    for(let i=1;i<sp.length;i++) ctx.lineTo(sp[i].x,sp[i].y);
    ctx.closePath();
    ctx.fillStyle=ssel?'rgba(255,95,158,0.36)':'rgba(255,95,158,0.22)'; ctx.fill();
    ctx.strokeStyle=ssel?'#ffffff':COL.section; ctx.lineWidth=ssel?3.2:2.2; ctx.lineJoin='round'; ctx.stroke();
    for(const p of sp){
      ctx.beginPath(); ctx.arc(p.x,p.y,3.1,0,7); ctx.fillStyle='#fff'; ctx.fill();
      ctx.strokeStyle=COL.section; ctx.lineWidth=1.6; ctx.stroke();
    }
  }
}

function drawUserGeometry(){
  ctx.lineCap='round';
  for(const sg of state.segments){
    if(!sg.show||!P(sg.a)||!P(sg.b)) continue;
    const a=project(P(sg.a).p), b=project(P(sg.b).p);
    if(isSel('segment',sg.id)){
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.strokeStyle=sg.color||'#4ade80'; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(const ln of state.lines){
    if(!ln.show) continue;
    const e=lineEnds(ln); if(!e) continue;
    const a=project(e[0]), b=project(e[1]);
    if(isSel('line',ln.id)){
      ctx.setLineDash([]); ctx.strokeStyle='#ffffff'; ctx.lineWidth=3.4;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.strokeStyle=ln.color||'#f59e0b'; ctx.lineWidth=1.6; ctx.setLineDash([9,6]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPoints(){
  const all = state.points.filter(p=>p.show);
  all.sort((a,b)=>depthOf(a.p)-depthOf(b.p));
  for(const p of all){
    const sp=project(p.p);
    const sel=state.selection.includes(p.id);
    if(p.kind==='auto'){
      ctx.beginPath(); ctx.arc(sp.x,sp.y, sel?6.8:4.9,0,7);
      ctx.fillStyle='rgba(10,14,20,0.85)'; ctx.fill();
      ctx.lineWidth=2.2; ctx.strokeStyle=sel?COL.ptSel:(p.color||'#c792ea'); ctx.stroke();
      if(sel){ ctx.beginPath(); ctx.arc(sp.x,sp.y,11,0,7); ctx.strokeStyle=COL.ptSel; ctx.lineWidth=1.8; ctx.stroke(); }
      continue;
    }
    const base = p.kind==='solid' ? p.color : (p.color||COL.pt);
    ctx.beginPath(); ctx.arc(sp.x,sp.y, sel?6.2:4.2,0,7);
    ctx.fillStyle = sel ? COL.ptSel : base;
    ctx.fill();
    ctx.lineWidth=1.4; ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.stroke();
    if(sel){ ctx.beginPath(); ctx.arc(sp.x,sp.y,10,0,7); ctx.strokeStyle=COL.ptSel; ctx.lineWidth=1.8; ctx.stroke(); }
  }
  if(state.showLabels){
    ctx.font='600 12.5px -apple-system,Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const p of all){
      if(!p.label) continue;
      const sp=project(p.p);
      const c = p.solidId ? (state.solids.find(s=>s.id===p.solidId)||{}).centroid : null;
      let ox=0, oy=-16;
      if(c){ const cs=project(c); const dx=sp.x-cs.x, dy=sp.y-cs.y; const l=Math.hypot(dx,dy)||1;
        ox=dx/l*20; oy=dy/l*20; }
      const tx=sp.x+ox, ty=sp.y+oy;
      ctx.fillStyle='rgba(10,14,20,0.72)';
      const w=ctx.measureText(p.label).width+8;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(tx-w/2,ty-9,w,18,5);
      else ctx.rect(tx-w/2,ty-9,w,18);
      ctx.fill();
      const lcol = p.kind==='solid' ? p.color : (p.color||COL.pt);
      ctx.fillStyle = state.selection.includes(p.id)?COL.ptSel:lcol;
      ctx.fillText(p.label,tx,ty+0.5);
    }
  }
}

function drawHover(){
  const h=state.hoverPt;
  if(!h || state.tool!=='point') return;
  const sp=project(h.p);
  const col=snapColor(h.kind);
  ctx.save();
  ctx.globalAlpha=0.95;
  ctx.beginPath(); ctx.arc(sp.x,sp.y,9,0,7);
  ctx.strokeStyle=col; ctx.lineWidth=1.6; ctx.setLineDash(h.kind==='vertex'?[]:[3,3]); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(sp.x,sp.y,3.4,0,7); ctx.fillStyle=col; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sp.x-13,sp.y); ctx.lineTo(sp.x-6,sp.y);
  ctx.moveTo(sp.x+6,sp.y); ctx.lineTo(sp.x+13,sp.y);
  ctx.moveTo(sp.x,sp.y-13); ctx.lineTo(sp.x,sp.y-6);
  ctx.moveTo(sp.x,sp.y+6); ctx.lineTo(sp.x,sp.y+13);
  ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.stroke();
  ctx.restore();
}
function draw(){
  pruneSelection();
  resize(); updateCam();
  ctx.clearRect(0,0,cw,ch);
  if(state.showGrid) drawGrid();
  if(state.showAxes) drawAxes();
  drawPointPlane();
  drawFaces();
  drawPlanePatches();
  drawSections();
  drawSolidEdges();
  drawBuild();
  drawUserGeometry();
  drawPoints();
  drawHover();
  updateBadge();
  scheduleHistory();
}
function updateBadge(){
  const b=document.getElementById('badge');
  pruneSelection();
  const sel=state.selection;
  let html='Вершин выбрано: <b>'+sel.length+'</b>';
  if(sel.length===2){
    html+='<br>Длина: <b>'+round(V.dist(P(sel[0]).p,P(sel[1]).p),3).toFixed(3)+'</b>';
  }else if(sel.length===3){
    const [a,b,c]=sel.map(i=>P(i).p);
    const ar=0.5*V.len(V.cross(V.sub(b,a),V.sub(c,a)));
    html+='<br>Площадь Δ: <b>'+round(ar,3).toFixed(3)+'</b>';
  }
  b.innerHTML=html + (flashMsg?('<div class="fl">'+flashMsg+'</div>'):'');
  if(state.tool==='point' && state.hoverPt){
    const names={vertex:'вершина',edge:'ребро',mid:'середина ребра',center:'центр грани',face:'грань',axis:'ось координат',line:'прямая',segment:'отрезок'};
    b.innerHTML += '<div class="fl" style="color:'+snapColor(state.hoverPt.kind)+'">Привязка: '+(names[state.hoverPt.kind]||'точка')+'</div>';
  }
}



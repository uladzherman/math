'use strict';
/* 18-ui-interaction.js — Жесты, вращение сцены, выбор и инструменты построения. */
/* клик / вращение / жесты */
const pointers=new Map();
let dragging=false, moved=false, lastX=0,lastY=0, panMode=false, pinch=null;
const pointerPos=e=>({x:e.clientX,y:e.clientY});
function pinchInfo(){
  const ps=[...pointers.values()];
  return {d:Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y),
          mid:{x:(ps[0].x+ps[1].x)/2, y:(ps[0].y+ps[1].y)/2}};
}
canvas.addEventListener('pointerdown',e=>{
  try{ canvas.setPointerCapture(e.pointerId); }catch(_){}
  pointers.set(e.pointerId, pointerPos(e));
  canvas.classList.add('drag');
  if(pointers.size===1){
    dragging=true; moved=false; lastX=e.clientX; lastY=e.clientY; panMode=e.shiftKey; pinch=null;
  }else if(pointers.size===2){
    dragging=false; moved=true;
    const m=pinchInfo(); pinch={d0:m.d||1, s0:cam.scale, mid:m.mid};
  }
});
let pendingDraw=false;
function requestDraw(){
  if(pendingDraw) return;
  pendingDraw=true;
  requestAnimationFrame(()=>{ pendingDraw=false; draw(); });
}
canvas.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId, pointerPos(e));
  if(pointers.size>=2){
    if(pinch){
      const m=pinchInfo();
      cam.scale = Math.max(18, Math.min(600, pinch.s0*(m.d/pinch.d0)));
      const dx=m.mid.x-pinch.mid.x, dy=m.mid.y-pinch.mid.y;
      cam.target = V.add(cam.target, V.add(V.mul(cam.right,-dx/cam.scale), V.mul(cam.up, dy/cam.scale)));
      pinch.mid=m.mid;
      requestDraw();
    }
    return;
  }
  if(!dragging){
    if(state.tool==='point'){
      const r=canvas.getBoundingClientRect();
      const sx=e.clientX-r.left, sy=e.clientY-r.top;
      const sp=pickPoint(sx,sy);
      if(sp){ state.hoverPt={p:sp.p, kind:'vertex'}; }
      else { const sn=computeSnap(sx,sy); state.hoverPt = sn ? sn : {p:screenToHeightPlane(sx,sy,state.pointZ), kind:'free'}; }
      requestDraw();
    } else if(state.hoverPt){ state.hoverPt=null; requestDraw(); }
    return;
  }
  const dx=e.clientX-lastX, dy=e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  if(Math.abs(dx)+Math.abs(dy)>1) moved=true;
  if(panMode){
    cam.target = V.add(cam.target, V.add(V.mul(cam.right,-dx/cam.scale), V.mul(cam.up, dy/cam.scale)));
  }else{
    cam.az -= dx*0.008;
    cam.el = Math.max(-1.45, Math.min(1.45, cam.el + dy*0.008));
  }
  requestDraw();
});
function endPointer(e,isCancel){
  pointers.delete(e.pointerId);
  if(pointers.size===1){
    const p=[...pointers.values()][0];
    dragging=true; moved=true; pinch=null; lastX=p.x; lastY=p.y;
    return;
  }
  if(pointers.size===0){
    const wasMoved=moved; dragging=false; pinch=null; canvas.classList.remove('drag');
    if(!wasMoved && !isCancel) handleClick(e);
  }
}
canvas.addEventListener('pointerup',e=>endPointer(e,false));
canvas.addEventListener('pointercancel',e=>endPointer(e,true));
canvas.addEventListener('pointerleave',e=>{
  if(e.pointerType==='mouse' && pointers.size===0){ dragging=false; pinch=null; canvas.classList.remove('drag'); }
});
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  cam.scale *= Math.exp(-e.deltaY*0.0012);
  cam.scale = Math.max(18, Math.min(600, cam.scale));
  draw();
},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('dblclick',e=>{
  const r=canvas.getBoundingClientRect();
  const p=pickPoint(e.clientX-r.left, e.clientY-r.top);
  if(!p) return;
  state.selObj=null;
  if(!state.selection.includes(p.id)) state.selection=[p.id];
  updateSelInfo();
  openRename(p.id);
  draw();
});

function pickPoint(sx,sy){
  let best=null, bestD=1e9;
  for(const p of state.points){
    if(!p.show) continue;
    const sp=project(p.p);
    const d=Math.hypot(sp.x-sx,sp.y-sy);
    if(d<17){
      const dd = depthOf(p.p);
      if(d<bestD-0.5 || (Math.abs(d-bestD)<=0.5 && dd> (best?depthOf(best.p):-1e9))){ bestD=d; best=p; }
    }
  }
  return best;
}
function handleClick(e){
  const r=canvas.getBoundingClientRect();
  const sx=e.clientX-r.left, sy=e.clientY-r.top;
  const pt=pickPoint(sx,sy);
  if(pt){
    if(state.revWizard){ revWizardUsePoint(pt.id); return; }
    state.selObj=null; toggleSelect(pt.id); return;
  }
  if(state.tool==='point' || state.revWizard){
    const snap=computeSnap(sx,sy);
    const p = snap ? snap.p : screenToHeightPlane(sx,sy,state.pointZ);
    const col = snap ? snapColor(snap.kind) : '#ffd166';
    const np=addPoint(p,autoLabel(),{color:col});
    if(state.revWizard){ state.hoverPt=null; revWizardUsePoint(np.id); return; }
    state.selection=[np.id]; state.selObj=null; state.hoverPt=null;
    flash(snap ? ('Точка на '+(snap.kind==='edge'?'ребре':snap.kind==='mid'?'середине ребра':snap.kind==='center'?'центре грани':
                    snap.kind==='line'?'прямой':snap.kind==='segment'?'отрезке':'грани'))
               : ('Свободная точка при z = '+(+state.pointZ.toFixed(2))));
    renderObjList(); updateSelInfo(); draw();
    return;
  }
  const obj=pickObject(sx,sy);
  if(obj){
    /* во время построения клик по объекту не должен сбрасывать уже выбранные точки */
    if(needFor(state.tool)>0) return;
    state.selObj=obj; state.selection=[];
    if(obj.kind==='section' && (!state.build || state.build.secId!==obj.id)){
      const sec=state.sections.find(x=>x.id===obj.id);
      const solid=sec && state.solids.find(x=>x.id===sec.solidId);
      if(sec && solid){ state.build=computeBuild(sec,solid); updateStepUI(); }
    }
    updateSelInfo(); draw(); return;
  }
  state.selection=[]; state.selObj=null; updateSelInfo(); draw();
}
function toggleSelect(id){
  state.selObj=null;
  const i=state.selection.indexOf(id);
  if(i>=0) state.selection.splice(i,1); else state.selection.push(id);
  updateSelInfo();
  tryBuild();
  renderObjList();
  draw();
}
function updateSelInfo(){
  const el=document.getElementById('selInfo');
  pruneSelection();
  const row=document.getElementById('renameRow');
  const inp=document.getElementById('renameInp');
  const canRename = state.selection.length===1 && !!P(state.selection[0]);
  if(row) row.style.display = canRename ? 'block' : 'none';
  if(inp && canRename && document.activeElement!==inp) inp.value = P(state.selection[0]).label || '';
  if(state.selObj){
    const names={solid:'фигура',segment:'отрезок',line:'прямая',plane:'плоскость',section:'сечение'};
    el.innerHTML='Выбран объект: <b>'+(names[state.selObj.kind]||'объект')+'</b><br>'+
      '<span style="color:#8ea0b8">Нажмите <b style="color:#ffd166">Delete</b>, чтобы удалить его.</span>';
    return;
  }
  const sel=state.selection;
  const need=needFor(state.tool);
  let head = need? ('Инструмент «'+TOOLNAME[state.tool]+'»: выбрано <b>'+sel.length+'</b> из <b>'+need+'</b>') : 'Ничего не выбрано.';
  if(!sel.length){ el.innerHTML=head+'<br><span style="color:#8ea0b8">Кликните по вершине, чтобы выбрать её.</span>'; return; }
  const names=sel.map(i=>P(i).label||'•').join(', ');
  let s=head+'<br>Точки: <b>'+names+'</b><br>';
  if(sel.length===2){
    s+='Расстояние: <b>'+round(V.dist(P(sel[0]).p,P(sel[1]).p),3).toFixed(3)+'</b>';
  }else if(sel.length>=3){
    const [a,b,c]=sel.map(i=>P(i).p);
    const ar=0.5*V.len(V.cross(V.sub(b,a),V.sub(c,a)));
    s+='Площадь Δ: <b>'+round(ar,3).toFixed(3)+'</b>';
  }
  el.innerHTML=s;
}

/* панель инструментов — режимы построения */
const TOOLNAME={select:'выбор',point:'точка',segment:'отрезок',line:'прямая',plane:'плоскость',section:'сечение'};
function needFor(tool){ return tool==='segment'||tool==='line'?2:(tool==='plane'||tool==='section'?3:0); }
function tryBuild(){
  const tool=state.tool, need=needFor(tool);
  pruneSelection();
  if(!need || state.selection.length!==need) return false;
  const ids=state.selection.slice();
  if(ids.some(id=>!byId.has(id))){ pruneSelection(); updateSelInfo(); return false; }
  if(new Set(ids).size!==ids.length) return false;
  let ok=true;
  if(tool==='segment'){
    state.segments.push({id:uid(),a:ids[0],b:ids[1],color:'#4ade80',show:true});
  }else if(tool==='line'){
    state.lines.push({id:uid(),a:ids[0],b:ids[1],color:'#f59e0b',show:true});
  }else if(tool==='plane'){
    const pl=planeFrom3(...ids.map(i=>P(i).p));
    if(!pl){ flash('Три точки лежат на одной прямой — плоскость не задана'); ok=false; }
    else{
      const np={id:uid(),a:ids[0],b:ids[1],c:ids[2],show:true};
      state.planes.push(np);
      state.selObj={kind:'plane',id:np.id};
      flash('Плоскость построена: синий контур — линия пересечения с фигурой');
    }
  }else if(tool==='section'){
    const solid=state.solids.find(s=>s.show);
    if(!solid){ flash('Сначала загрузите фигуру'); ok=false; }
    else { const s=addSection(solid.id,ids); if(!s) ok=false; }
  }
  if(ok){ state.selection=[]; renderObjList(); updateSelInfo(); }
  return ok;
}
document.querySelectorAll('.tool').forEach(t=>{
  t.addEventListener('click',()=>{
    setTool(t.dataset.tool);
    tryBuild();
    updateSelInfo(); draw();
  });
});
function setTool(t){
  state.tool=t;
  if(t!=='point'){
    state.hoverPt=null;
    if(state.revWizard) cancelRevWizard();
  }
  document.querySelectorAll('.tool').forEach(x=>x.classList.toggle('on',x.dataset.tool===t));
}


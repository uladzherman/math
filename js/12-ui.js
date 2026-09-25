'use strict';
/* 12-ui.js — Привязка панели управления, инструментов и пошагового построения тел вращения. */
/* ============================ UI ============================ */
const shapeSel=document.getElementById('shapeSel');
for(const k in SHAPES){ const o=document.createElement('option'); o.value=k; o.textContent=SHAPES[k].label; shapeSel.appendChild(o); }
shapeSel.value='cube';

function solidColor(i){
  const pal=['#5aa9ff','#7ee787','#ffb86b','#c792ea','#4dd0e1','#f78ca0'];
  return pal[i%pal.length];
}
function loadShape(kind){
  const a=parseFloat(document.getElementById('pSize').value)||2;
  const h=parseFloat(document.getElementById('pHeight').value)||2;
  const prm={
    sides: parseInt(document.getElementById('pSides').value,10)||5,
    offX: parseFloat(document.getElementById('pOffX').value)||0,
    offY: parseFloat(document.getElementById('pOffY').value)||0,
    bOffX: parseFloat(document.getElementById('pbOffX').value)||0,
    bOffY: parseFloat(document.getElementById('pbOffY').value)||0
  };
  state.solids=[]; state.points=[]; state.segments=[]; state.lines=[];
  state.planes=[]; state.sections=[]; state.selection=[]; state.selObj=null; state.dyn=null; state.build=null;
  rebuildIndex();
  const def=SHAPES[kind];
  if(!def){ renderObjList(); return null; }
  const bc = def.baseCount || (def.sides ? prm.sides : 0);
  if(state.baseXY && bc && state.baseXY.length===bc) prm.base = state.baseXY;
  const shape=def.build(a,h,prm);
  const smooth = (kind==='cylinder'||kind==='cone'||kind==='sphere');
  const col=solidColor(0);
  const solid=createSolid(def.label,shape,col,{smooth,kind});
  cam.target=[0,0,0];
  resize();
  adjustScale();
  updateDynUI(); updateStepUI(); renderObjList(); updateSelInfo(); renderBaseEditor();
  return solid;
}
function adjustScale(){
  const R=sceneRadius();
  cam.scale = Math.min(cw,ch)/(R*2.9);
}

/* ---------- тела вращения по двум точкам ---------- */
function axisFrame(A,B){
  const w=V.norm(V.sub(B,A));
  const ref=Math.abs(w[2])>0.9?[1,0,0]:[0,0,1];
  const u=V.norm(V.cross(ref,w));
  const v=V.norm(V.cross(w,u));
  return {w,u,v};
}
const revRadial=(u,v,ang)=>V.add(V.mul(u,Math.cos(ang)),V.mul(v,Math.sin(ang)));
function revSphere(A,R){
  const n=36,m=12, verts=[], idx=[];
  verts.push({p:[A[0],A[1],A[2]+R],label:''});
  for(let j=1;j<m;j++){
    const phi=j*Math.PI/m, row=[];
    for(let i=0;i<n;i++){
      const th=i*2*Math.PI/n;
      verts.push({p:[A[0]+R*Math.sin(phi)*Math.cos(th),A[1]+R*Math.sin(phi)*Math.sin(th),A[2]+R*Math.cos(phi)],label:''});
      row.push(verts.length-1);
    }
    idx.push(row);
  }
  verts.push({p:[A[0],A[1],A[2]-R],label:''});
  const bot=verts.length-1, faces=[];
  for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([0,idx[0][j],idx[0][i]]);}
  for(let j=0;j<idx.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n; faces.push([idx[j][i],idx[j][k],idx[j+1][k],idx[j+1][i]]);}
  const last=idx[idx.length-1];
  for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([bot,last[i],last[j]]);}
  return {verts,faces,curves:[]};
}
function revCylinder(A,B,r){
  const n=48, {u,v}=axisFrame(A,B), verts=[], bottom=[], top=[];
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(A,V.mul(rad,r)),label:''}); }
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(B,V.mul(rad,r)),label:''}); }
  for(let i=0;i<n;i++){ bottom.push(i); top.push(n+i); }
  const faces=[bottom.slice().reverse(),top];
  for(let i=0;i<n;i++){ const j=(i+1)%n; faces.push([i,j,n+j,n+i]); }
  const rn=i=>revRadial(u,v,i*2*Math.PI/n);
  return {verts,faces,curves:[
    {pts:bottom.map(i=>verts[i].p), nrm:bottom.map(i=>rn(i))},
    {pts:top.map(i=>verts[i].p), nrm:top.map(i=>rn(i))}]};
}
function revCone(A,B,r){
  const n=48, {w,u,v}=axisFrame(A,B), H=V.dist(A,B);
  const verts=[{p:B.slice(),label:'S'}], ring=[];
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(A,V.mul(rad,r)),label:''}); ring.push(i+1); }
  const faces=[ring.slice().reverse()];
  for(let i=0;i<n;i++){ const j=(i+1)%n; faces.push([0,ring[i],ring[j]]); }
  const nrm=i=>{ const rad=revRadial(u,v,i*2*Math.PI/n); return V.norm(V.add(V.mul(rad,H),V.mul(w,r))); };
  return {verts,faces,curves:[{pts:ring.map(i=>verts[i].p), nrm:ring.map((_,i)=>nrm(i))}]};
}
function buildRevolution(kind,idA,idB,r){
  const A=P(idA).p, B=P(idB).p, la=liveLabel(idA), lb=liveLabel(idB);
  if(V.dist(A,B)<1e-6){ flash('Точки A и B совпадают — тело не задано'); return null; }
  let shape, name, desc;
  if(kind==='sphere'){
    const R=V.dist(A,B);
    shape=revSphere(A,R);
    name='Сфера ('+la+') через '+lb;
    desc='Сфера: центр '+la+' '+fmtV(A)+', точка '+lb+' на поверхности, r = |'+la+lb+'| = '+round(R,3).toFixed(3);
  }else if(kind==='cylinder'){
    const rr=+r||1;
    shape=revCylinder(A,B,rr);
    name='Цилиндр '+la+lb;
    desc='Цилиндр: '+la+', '+lb+' — центры оснований, ось '+la+lb+', r = '+rr;
  }else{
    const rr=+r||1;
    shape=revCone(A,B,rr);
    name='Конус вершина '+lb+' ('+la+')';
    desc='Конус: '+la+' — центр основания, '+lb+' — вершина, r = '+rr;
  }
  const solid=createSolid(name,shape,solidColorNext(),{smooth:true,kind});
  solid.anchor=[idA,idB];
  resize(); adjustScale();
  return {solid,desc};
}
const revNeedEl=()=>document.getElementById('revNeed');
const revInfoEl=()=>document.getElementById('revInfo');
const revPromptEl=()=>document.getElementById('revPrompt');
const revRoleText={
  sphere:{A:'центр сферы', B:'точка на поверхности'},
  cylinder:{A:'центр нижнего основания', B:'центр верхнего основания'},
  cone:{A:'центр основания', B:'вершина конуса'}
};
function revIsPointsMode(){ return document.getElementById('revMode').value==='points'; }
function revNeedsRadius(kind){ return kind==='cylinder'||kind==='cone'; }
function updateRevNeed(){
  const el=revNeedEl(); if(!el) return;
  const kind=shapeSel.value;
  const role=revRoleText[kind];
  if(!role){ el.innerHTML=''; return; }
  let s;
  if(kind==='sphere') s='Сфера задаётся центром и точкой: <span class="m">A</span> — '+role.A+', <span class="m">B</span> — '+role.B+'; радиус r = |AB|.';
  else s=(SHAPES[kind].label)+' задаётся осью и радиусом: <span class="m">A</span> — '+role.A+', <span class="m">B</span> — '+role.B+'; радиус введите ниже.';
  el.innerHTML=s;
}
function updateRevWizardUI(){
  const info=revInfoEl(), prompt=revPromptEl();
  const w=state.revWizard;
  if(!info) return;
  if(!w){
    if(info) info.innerHTML='Нажмите «Загрузить фигуру», чтобы на сцене указать точки A и B. Можно кликать по вершинам уже загруженной фигуры.';
    if(prompt){ prompt.style.display='none'; prompt.innerHTML=''; }
    return;
  }
  const kind=w.kind, role=revRoleText[kind], need=2, got=w.ids.length;
  const names=w.ids.map(id=>liveLabel(id));
  let s='<div class="step">Шаг '+(got+1)+' из '+need+'</div>';
  s+='Кликните точку <b>'+(got===0?'A':'B')+'</b> — '+role[got===0?'A':'B']+'.';
  if(got===1) s+='<br>Точка A: <b>'+names[0]+'</b>.';
  if(info) info.innerHTML=s;
  if(prompt){
    prompt.style.display='block';
    prompt.innerHTML='<div class="step">Тело вращения · шаг '+(got+1)+' из '+need+'</div>'
      +'Укажите точку <b>'+(got===0?'A':'B')+'</b> — '+role[got===0?'A':'B']
      +(got===1?('<br>Точка A: <b>'+names[0]+'</b>'):'')
      +'<br><span class="step">клик по вершине фигуры или по пустому месту (тогда точка ставится на плоскости z = '+round(state.pointZ,2)+')</span>';
  }
}
function startRevWizard(kind){
  if(!revRoleText[kind]){ loadShape(kind); draw(); return; }
  state.revWizard={kind, ids:[]};
  setTool('point');
  updateRevWizardUI();
  flash('Укажите точки A и B для тела вращения');
  draw();
}
function revWizardUsePoint(id){
  const w=state.revWizard; if(!w) return;
  if(w.ids.includes(id)) return;
  w.ids.push(id);
  if(w.ids.length>=2) finishRevWizard();
  else { updateRevWizardUI(); draw(); }
}
function finishRevWizard(){
  const w=state.revWizard; if(!w) return;
  const r=parseFloat(document.getElementById('revRadius').value);
  const res=buildRevolution(w.kind, w.ids[0], w.ids[1], r);
  state.revWizard=null;
  if(res){ state.selection=[]; state.selObj={kind:'solid',id:res.solid.id}; flash(res.desc); }
  setTool('select');
  updateRevWizardUI();
  renderObjList(); updateSelInfo(); draw();
}
function cancelRevWizard(){
  if(!state.revWizard) return;
  state.revWizard=null; updateRevWizardUI(); draw();
}

let kv=1;
function solidColorNext(){ return solidColor(kv++); }

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

/* удаление выбранного */
function removeObj(o){
  if(!o) return;
  if(o.kind==='segment') state.segments=state.segments.filter(x=>x.id!==o.id);
  else if(o.kind==='line') state.lines=state.lines.filter(x=>x.id!==o.id);
  else if(o.kind==='plane') state.planes=state.planes.filter(x=>x.id!==o.id);
  else if(o.kind==='section'){
    state.sections=state.sections.filter(x=>x.id!==o.id);
    if(state.build && state.build.secId===o.id){ state.build=null; updateStepUI(); }
    if(state.dyn && !state.sections.some(x=>x.solidId===state.dyn.solidId)){ state.dyn=null; updateDynUI(); }
  }
  else if(o.kind==='solid'){
    const s=state.solids.find(x=>x.id===o.id); if(!s) return;
    state.solids=state.solids.filter(x=>x.id!==s.id);
    const dead=new Set(state.points.filter(p=>p.solidId===s.id).map(p=>p.id));
    state.points=state.points.filter(p=>!dead.has(p.id));
    state.segments=state.segments.filter(x=>!dead.has(x.a)&&!dead.has(x.b));
    state.lines=state.lines.filter(x=>!dead.has(x.a)&&!dead.has(x.b));
    state.planes=state.planes.filter(x=>!dead.has(x.a)&&!dead.has(x.b)&&!dead.has(x.c));
    state.sections=state.sections.filter(x=>x.solidId!==s.id);
    if(state.build && state.build.solidId===s.id){ state.build=null; updateStepUI(); }
    if(state.dyn && state.dyn.solidId===s.id){ state.dyn=null; updateDynUI(); }
  }
  pruneSelection();
}
function deleteSelection(){
  let changed=false;
  if(state.selObj){ removeObj(state.selObj); state.selObj=null; changed=true; }
  const sel=new Set(state.selection);
  const dead=new Set(state.points.filter(p=>p.kind==='user'&&sel.has(p.id)).map(p=>p.id));
  if(dead.size){
    const hasDead=(o,ks)=>ks.some(k=>dead.has(o[k]));
    state.segments=state.segments.filter(o=>!hasDead(o,['a','b']));
    state.lines=state.lines.filter(o=>!hasDead(o,['a','b']));
    state.planes=state.planes.filter(o=>!hasDead(o,['a','b','c']));
    state.points=state.points.filter(p=>!dead.has(p.id));
    changed=true;
  }
  state.selection=[];
  if(changed){ rebuildIndex(); renderObjList(); updateDynUI(); }
  updateSelInfo(); draw();
}

document.getElementById('btnLoad').addEventListener('click',()=>{
  const def=SHAPES[shapeSel.value]||{};
  if(def.revolution && revIsPointsMode()){ startRevWizard(shapeSel.value); return; }
  loadShape(shapeSel.value); draw();
});
document.getElementById('revMode').addEventListener('change',()=>{ cancelRevWizard(); syncShapeUI(); draw(); });
document.getElementById('revRadius').addEventListener('input',()=>{ updateRevNeed(); });
document.getElementById('pSides').addEventListener('input',e=>{
  document.getElementById('pSidesVal').textContent=e.target.value;
  state.baseXY=null;
  const def=SHAPES[shapeSel.value];
  if(def&&def.sides){ loadShape(shapeSel.value); draw(); }
});
['pOffX','pOffY','pbOffX','pbOffY','pSize','pHeight'].forEach(id=>{
  document.getElementById(id).addEventListener('change',()=>{
    const def=SHAPES[shapeSel.value];
    if(def&&(def.off||def.sides)){ loadShape(shapeSel.value); draw(); }
  });
});
function syncShapeUI(){
  const def=SHAPES[shapeSel.value]||{};
  const rev=!!def.revolution;
  document.getElementById('customBox').style.display = def.off ? 'block':'none';
  document.getElementById('sidesRow').style.display = def.sides ? 'block':'none';
  document.getElementById('revBox').style.display = rev ? 'block':'none';
  const pointsMode = rev && revIsPointsMode();
  document.getElementById('revPointsBox').style.display = pointsMode ? 'block':'none';
  document.getElementById('sizeRow').style.display = pointsMode ? 'none':'';
  document.getElementById('revRadiusRow').style.display = (pointsMode && revNeedsRadius(shapeSel.value)) ? 'block':'none';
  updateRevNeed(); updateRevWizardUI();
  renderBaseEditor();
}
function currentBaseXY(){
  const s=state.solids[0];
  if(!s||s.smooth||!s.faces||!s.faces.length) return null;
  const pts=coordsOf(s);
  return s.faces[0].map(i=>[pts[i][0],pts[i][1]]);
}
function renderBaseEditor(){
  const box=document.getElementById('baseEditor');
  if(!box) return;
  const def=SHAPES[shapeSel.value]||{};
  const bc=def.baseCount||(def.sides?(parseInt(document.getElementById('pSides').value,10)||5):0);
  if(!bc){ box.style.display='none'; return; }
  box.style.display='block';
  const list=(state.baseXY&&state.baseXY.length===bc)?state.baseXY:(currentBaseXY()||[]);
  const wrap=document.getElementById('baseRows');
  wrap.innerHTML='';
  for(let i=0;i<bc;i++){
    const row=document.createElement('div'); row.className='brow';
    const x=list[i]?round(list[i][0],2):0, y=list[i]?round(list[i][1],2):0;
    row.innerHTML='<span class="bl">'+baseLab(i)+'</span>'+
      '<input type="number" step="0.25" value="'+x+'"><input type="number" step="0.25" value="'+y+'">';
    const ins=row.querySelectorAll('input');
    const commit=()=>{
      if(!state.baseXY || state.baseXY.length!==bc) state.baseXY=list.map(q=>q.slice());
      state.baseXY[i]=[parseFloat(ins[0].value)||0, parseFloat(ins[1].value)||0];
      loadShape(shapeSel.value); draw();
    };
    ins.forEach(inp=>inp.addEventListener('change',commit));
    wrap.appendChild(row);
  }
}
document.getElementById('btnBaseReset').addEventListener('click',()=>{
  state.baseXY=null; loadShape(shapeSel.value); draw();
});
document.getElementById('btnBaseTrap').addEventListener('click',()=>{
  const bc=(SHAPES[shapeSel.value]||{}).baseCount;
  const base=(state.baseXY&&state.baseXY.length?state.baseXY:(currentBaseXY()||[])).map(q=>q.slice());
  if(base.length!==4){ flash('Трапеция — вариант для четырёхугольного основания'); return; }
  const cx=(base[0][0]+base[1][0]+base[2][0]+base[3][0])/4;
  const cy=(base[0][1]+base[1][1]+base[2][1]+base[3][1])/4;
  const k=0.45;
  base[2]=[cx+(base[2][0]-cx)*k, cy+(base[2][1]-cy)*k];
  base[3]=[cx+(base[3][0]-cx)*k, cy+(base[3][1]-cy)*k];
  state.baseXY=base;
  loadShape(shapeSel.value); draw();
  flash('Основание сделано трапецией');
});
shapeSel.addEventListener('change',()=>{ state.baseXY=null; cancelRevWizard(); syncShapeUI(); });
syncShapeUI();
document.getElementById('btnParse').addEventListener('click',()=>runProblem());
document.getElementById('btnParseDemo').addEventListener('click',()=>{
  document.getElementById('taskText').value=
    '57. Дана треугольная пирамида DABC. Точка T лежит на ребре DB, а точка E — на продолжении ребра DC. Постройте: а) точку пересечения прямой TE и плоскости ABC; б) прямую, по которой пересекаются плоскости ATE и ABC.';
  runProblem();
});
document.getElementById('btnClearAll').addEventListener('click',()=>{
  state.solids=[]; state.points=[]; state.segments=[]; state.lines=[]; state.planes=[];
  state.sections=[]; state.selection=[]; state.selObj=null; state.dyn=null; state.build=null; state.revWizard=null; kv=1;
  rebuildIndex(); updateDynUI(); updateStepUI(); renderObjList(); updateSelInfo(); updateRevWizardUI(); draw();
});
document.getElementById('btnClrSel').addEventListener('click',()=>{ state.selection=[]; state.selObj=null; updateSelInfo(); draw(); });
document.getElementById('btnRename').addEventListener('click',()=>{
  if(state.selection.length!==1) return;
  renamePoint(state.selection[0], document.getElementById('renameInp').value);
});
document.getElementById('renameInp').addEventListener('keydown',e=>{
  if(e.key==='Enter' && state.selection.length===1){
    e.preventDefault();
    renamePoint(state.selection[0], e.target.value);
  }
});
document.getElementById('btnDelSel').addEventListener('click',deleteSelection);
document.getElementById('ptH').addEventListener('input',e=>{
  state.pointZ=parseFloat(e.target.value)||0;
  document.getElementById('ptHVal').textContent=state.pointZ;
  draw();
});
document.getElementById('btnAddPt').addEventListener('click',()=>{
  const x=parseFloat(document.getElementById('px').value)||0;
  const y=parseFloat(document.getElementById('py').value)||0;
  const z=parseFloat(document.getElementById('pz').value)||0;
  const lab=document.getElementById('pLab').value.trim();
  const np=addPoint([x,y,z],lab,{color:'#ffd166'});
  state.selection=[np.id];
  renderObjList(); updateSelInfo(); draw();
});
document.getElementById('dynRange').addEventListener('input',e=>{
  if(!state.dyn) return;
  state.dyn.off=parseFloat(e.target.value);
  applyDyn(); draw();
});
document.getElementById('stepRange').addEventListener('input',e=>{
  if(!state.build) return;
  state.build.k=parseInt(e.target.value,10)||0;
  updateStepUI(); draw();
});
document.getElementById('btnStepPrev').addEventListener('click',()=>{
  if(!state.build) return;
  state.build.k=Math.max(0,state.build.k-1); updateStepUI(); draw();
});
document.getElementById('btnStepNext').addEventListener('click',()=>{
  if(!state.build) return;
  state.build.k=Math.min(state.build.steps.length,state.build.k+1); updateStepUI(); draw();
});
document.getElementById('chkTraces').addEventListener('change',e=>{
  if(state.build) state.build.show=e.target.checked;
  draw();
});
document.getElementById('chkExt').addEventListener('change',e=>{
  state.showExt=e.target.checked;
  draw();
});
document.getElementById('chkAxes').addEventListener('change',e=>{ state.showAxes=e.target.checked; draw(); });
document.getElementById('chkGrid').addEventListener('change',e=>{ state.showGrid=e.target.checked; draw(); });
document.getElementById('chkLabels').addEventListener('change',e=>{ state.showLabels=e.target.checked; draw(); });
document.getElementById('chkHidden').addEventListener('change',e=>{ state.showHidden=e.target.checked; draw(); });
document.getElementById('chkAuto').addEventListener('change',e=>{
  state.showAuto=e.target.checked;
  recomputeAutoPoints(); renderObjList(); updateSelInfo(); draw();
});
document.getElementById('btnResetView').addEventListener('click',()=>{
  cam.az=-0.95; cam.el=0.42; cam.target=[0,0,0];
  resize(); adjustScale(); draw();
});
document.getElementById('explToggle').addEventListener('click',()=>{
  const el=document.getElementById('explain');
  el.classList.toggle('collapsed');
  document.getElementById('explToggle').textContent = el.classList.contains('collapsed') ? '▸' : '▾';
});
window.addEventListener('keydown',e=>{
  const tg=(e.target&&e.target.tagName)||'';
  if(/INPUT|SELECT|TEXTAREA/.test(tg)) return;
  if((e.metaKey||e.ctrlKey) && (e.key==='z'||e.key==='Z'||e.key==='я'||e.key==='Я')){
    e.preventDefault();
    if(e.shiftKey) redo(); else undo();
    return;
  }
  if(e.key==='Escape'){
    if(state.revWizard){ cancelRevWizard(); updateSelInfo(); draw(); return; }
    state.selection=[]; state.selObj=null; updateSelInfo(); draw();
  }
  else if(e.key==='Delete'||e.key==='Backspace'){ e.preventDefault(); deleteSelection(); }
});
window.addEventListener('resize',()=>{ draw(); });

/* список объектов */
function objExists(o){
  if(!o) return false;
  if(o.kind==='solid') return state.solids.some(x=>x.id===o.id);
  if(o.kind==='segment') return state.segments.some(x=>x.id===o.id);
  if(o.kind==='line') return state.lines.some(x=>x.id===o.id);
  if(o.kind==='plane') return state.planes.some(x=>x.id===o.id);
  if(o.kind==='section') return state.sections.some(x=>x.id===o.id);
  return false;
}
function validateSelObj(){ if(!objExists(state.selObj)) state.selObj=null; }
function renderObjList(){
  recomputeAutoPoints();
  const el=document.getElementById('objList');
  el.innerHTML='';
  const row=(dot,name,show,ref,onToggle)=>{
    const d=document.createElement('div'); d.className='obj';
    const isSelected = state.selObj && state.selObj.kind===ref.kind && state.selObj.id===ref.id;
    if(isSelected) d.style.background='#223047';
    d.innerHTML='<input type="checkbox" '+(show?'checked':'')+'><span class="dot" style="background:'+dot+'"></span><span class="nm" style="cursor:pointer" title="Выбрать объект">'+name+'</span><button title="Удалить">✕</button>';
    d.querySelector('input').addEventListener('change',ev=>{onToggle(ev.target.checked);recomputeAutoPoints();draw();});
    d.querySelector('.nm').addEventListener('click',()=>{
      state.selObj = isSelected ? null : {kind:ref.kind, id:ref.id};
      state.selection=[];
      if(state.selObj && ref.kind==='section'){
        const sec=state.sections.find(x=>x.id===ref.id);
        const solid=sec && state.solids.find(x=>x.id===sec.solidId);
        if(sec && solid){ state.build=computeBuild(sec,solid); updateStepUI(); }
      }
      updateSelInfo(); renderObjList(); draw();
    });
    d.querySelector('button').addEventListener('click',()=>{
      removeObj(ref); validateSelObj(); rebuildIndex();
      renderObjList(); updateSelInfo(); draw();
    });
    el.appendChild(d);
  };
  state.solids.forEach(s=>row(s.stroke,s.name,s.show,{kind:'solid',id:s.id},v=>s.show=v));
  state.segments.forEach(o=>row('#4ade80','Отрезок '+liveLabel(o.a)+liveLabel(o.b),o.show,{kind:'segment',id:o.id},v=>o.show=v));
  state.lines.forEach(o=>row('#f59e0b','Прямая '+liveLabel(o.a)+liveLabel(o.b),o.show,{kind:'line',id:o.id},v=>o.show=v));
  state.planes.forEach((o,i)=>row(PLANE_COLORS[i%PLANE_COLORS.length],'Плоскость '+GREEK[i%GREEK.length]+' ('+liveLabel(o.a)+liveLabel(o.b)+liveLabel(o.c)+')',o.show,{kind:'plane',id:o.id},v=>o.show=v));
  state.sections.forEach(o=>row('#ff5f9e','Сечение ('+o.pts.length+' сторон)',o.show,{kind:'section',id:o.id},v=>o.show=v));
  if(!el.children.length) el.innerHTML='<div style="color:#8ea0b8;font-size:11.5px;padding:4px">Пусто. Загрузите фигуру.</div>';
  renderExplain();
}


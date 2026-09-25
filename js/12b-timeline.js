'use strict';
/* 12b-timeline.js — Таймлайн построений: пошаговое проигрывание всей сцены. */

function sceneOps(){
  const ops=new Map();
  const add=(o,name)=>{ if(o && o.op!=null && !ops.has(o.op)) ops.set(o.op,{op:o.op,name}); };
  state.solids.forEach(s=>add(s,s.name));
  state.points.forEach(p=>{ if(p.kind!=='auto') add(p,'Точка '+(p.label||'•')); });
  state.segments.forEach(o=>add(o,'Отрезок '+liveLabel(o.a)+liveLabel(o.b)));
  state.lines.forEach(o=>add(o,'Прямая '+liveLabel(o.a)+liveLabel(o.b)));
  state.planes.forEach(o=>add(o,'Плоскость'));
  state.sections.forEach(o=>add(o,'Сечение'));
  return [...ops.values()].sort((a,b)=>a.op-b.op);
}
function timelineOpName(k){
  const ops=sceneOps();
  if(!ops.length || k<=0) return null;
  return ops[Math.min(ops.length,k)-1].name;
}
function saveShowFlags(){
  const m=new Map();
  const put=a=>a.forEach(o=>m.set(o.id,o.show));
  put(state.solids); put(state.points); put(state.segments);
  put(state.lines); put(state.planes); put(state.sections);
  return m;
}
function timelineApply(k){
  if(!state.tlSaved) state.tlSaved=saveShowFlags();
  const guard=o=>state.tlSaved.get(o.id)!==false;
  const set=a=>a.forEach(o=>{ o.show = guard(o) && (o.op==null || o.op<=k); });
  set(state.solids); set(state.points); set(state.segments);
  set(state.lines); set(state.planes); set(state.sections);
}
function timelineOff(){
  if(!state.tlSaved) return;
  const m=state.tlSaved;
  const rst=a=>a.forEach(o=>{ if(m.has(o.id)) o.show=m.get(o.id); });
  rst(state.solids); rst(state.points); rst(state.segments);
  rst(state.lines); rst(state.planes); rst(state.sections);
  state.tlSaved=null;
}
/* обновляет таймлайн сцены и его элементы управления; безопасно вызывать часто */
function refreshTimeline(){
  if(state.stepMode!=='scene') return;
  const ops=sceneOps();
  if(state.tlK>=state.tlMax) state.tlK=ops.length;
  state.tlMax=ops.length;
  if(state.tlK>=ops.length) timelineOff(); else timelineApply(state.tlK);
  const r=document.getElementById('stepRange'), lbl=document.getElementById('stepLbl');
  if(r){ r.disabled=!ops.length; r.max=ops.length; r.value=state.tlK; }
  if(lbl) lbl.textContent=ops.length
    ? (state.tlK+' из '+ops.length+(state.tlK>=ops.length?' — готово':(' — '+timelineOpName(state.tlK))))
    : '—';
}

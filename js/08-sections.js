'use strict';
/* 08-sections.js — Управление сечениями и динамической плоскостью, служебные операции. */
function addSection(solidId, ids){
  const solid = state.solids.find(s=>s.id===solidId);
  if(!solid) return null;
  const pl = planeFrom3(...ids.map(i=>P(i).p));
  if(!pl){ flash('Точки лежат на одной прямой'); return null; }
  const poly = sectionPolygon(solid, pl);
  if(!poly){ flash('Плоскость не пересекает фигуру'); return null; }
  const sec = {id:uid(), solidId, pts:poly, plane:pl, show:true, srcIds:ids.slice()};
  state.sections.push(sec);
  state.dyn = {n:pl.n.slice(), d0:pl.d, off:0, solidId};
  state.build = computeBuild(sec, solid);
  updateDynUI(); updateStepUI();
  updateSectionStats(sec);
  renderObjList();
  return sec;
}
function updateSectionStats(sec){
  const n=sec.pts.length;
  document.getElementById('stN').textContent=n;
  document.getElementById('stP').textContent=round(polyPerim(sec.pts),3).toFixed(3);
  document.getElementById('stS').textContent=round(polyArea(sec.pts),3).toFixed(3);
}
function updateDynUI(){
  const r=document.getElementById('dynRange');
  r.disabled = !state.dyn;
  if(state.dyn) r.value=state.dyn.off;
}
function applyDyn(){
  if(!state.dyn) return;
  const dy=state.dyn;
  const solid=state.solids.find(s=>s.id===dy.solidId);
  const sec = state.sections[state.sections.length-1];
  if(!solid||!sec) return;
  const pl={n:dy.n.slice(), d:dy.d0+dy.off};
  const poly=sectionPolygon(solid,pl);
  if(poly){ sec.pts=poly; sec.plane=pl; updateSectionStats(sec);
    state.build=computeBuild(sec, solid); updateStepUI(); }
}
function clearObjects(){
  state.points = state.points.filter(p=>p.kind==='solid');
  state.segments=[]; state.lines=[]; state.planes=[]; state.sections=[];
  state.selection=[]; state.dyn=null; state.solids.forEach(s=>{});
  rebuildIndex(); updateDynUI(); renderObjList(); updateSelInfo();
}
function rebuildIndex(){ byId.clear(); state.points.forEach(p=>byId.set(p.id,p)); }
/* убрать из выделения id удалённых точек */
function pruneSelection(){
  if(!state.selection.length) return false;
  const before=state.selection.length;
  state.selection=state.selection.filter(id=>byId.has(id));
  return state.selection.length!==before;
}
const liveLabel = id => { const p=byId.get(id); return (p&&p.label)?p.label:'?'; };



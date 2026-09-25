'use strict';
/* 19-ui-panel.js — Привязка элементов панели, отображение и список объектов. */
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


/* ---------- адаптивный интерфейс (телефон / планшет) ---------- */
const TOOLSHORT={select:'Выбор',point:'Точка',segment:'Отрезок',line:'Прямая',plane:'Плоскость',section:'Сечение'};
function compactUI(){
  return !!(window.matchMedia && window.matchMedia('(max-width:820px)').matches);
}
function panelIsOpen(){
  const app=document.getElementById('app');
  return !!(app && app.classList.contains('panel-open'));
}
function setPanelOpen(v){
  const app=document.getElementById('app');
  if(app) app.classList.toggle('panel-open', !!v);
  const b=document.getElementById('panelToggle');
  if(b) b.textContent = v ? '✕' : '☰';
}
function initCollapsibleCards(){
  const cards=[...document.querySelectorAll('#panel .card')];
  cards.forEach(c=>{
    const h=c.querySelector('h2');
    if(!h) return;
    h.addEventListener('click',()=>c.classList.toggle('collapsed'));
  });
  if(compactUI()){
    cards.forEach(c=>{ if(!c.hasAttribute('data-primary')) c.classList.add('collapsed'); });
  }
}
function buildToolbar(){
  const bar=document.getElementById('toolbar');
  if(!bar) return;
  bar.innerHTML='';
  document.querySelectorAll('.tool').forEach(t=>{
    const tool=t.dataset.tool;
    const ic=t.querySelector('.ic');
    const b=document.createElement('button');
    b.type='button'; b.className='tbtn'+(tool===state.tool?' on':''); b.dataset.tool=tool;
    b.innerHTML='<span class="ic">'+(ic?ic.textContent:'')+'</span><span>'+(TOOLSHORT[tool]||tool)+'</span>';
    b.addEventListener('click',()=>{ if(typeof handleToolTap==='function') handleToolTap(tool); });
    bar.appendChild(b);
  });
}
function initAdaptiveUI(){
  initCollapsibleCards();
  buildToolbar();
  const b=document.getElementById('panelToggle');
  if(b) b.addEventListener('click',()=>setPanelOpen(!panelIsOpen()));
  if(compactUI()) setPanelOpen(true);
}

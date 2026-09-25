'use strict';
/* 16-ui-figure.js — Панель фигуры: выбор и загрузка фигуры. */
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


'use strict';
/* 03-state.js — Глобальное состояние сцены, реестр точек, создание и переименование точек. */
/* ============================ СОСТОЯНИЕ ============================ */
let uidN=1; const uid = () => 'o'+(uidN++);
const state = {
  points:[], solids:[], segments:[], lines:[], planes:[], sections:[],
  selection:[], selObj:null, hoverPt:null, showGrid:true, showAxes:true, showLabels:true, showHidden:true,
  showAuto:true, showExt:true, dyn:null, build:null, tool:'select',
  pointZ:0, baseXY:null, revWizard:null,
  opSeq:0, stepMode:'scene', tlK:0, tlMax:0, tlSaved:null,
  intersect:{ll:[],lp:[],lf:[],pp:[]}
};
const byId = new Map();
function P(id){ return byId.get(id); }
function newOp(){ return ++state.opSeq; }

function addPoint(p,label,opt={}){
  const kind=opt.kind||'user';
  const pt={id:uid(),p:[+p[0],+p[1],+p[2]],label:label||'',
    kind, color:opt.color||'#ffd166', solidId:opt.solidId||null,
    op:(opt.op!=null?opt.op:(kind==='user'?newOp():state.opSeq)),
    show:true};
  state.points.push(pt); byId.set(pt.id,pt);
  return pt;
}
/* -------- переименование точек -------- */
function renamePoint(id, label){
  const pt=P(id);
  if(!pt) return false;
  const v=(label==null?'':String(label)).trim();
  if(v){
    const dup=state.points.find(p=>p.id!==id && p.label===v);
    if(dup){ flash('Имя «'+v+'» уже занято'); return false; }
  }
  pt.label=v;
  renderObjList(); updateSelInfo(); draw();
  flash(v ? ('Точка переименована в '+v) : 'Имя точки убрано');
  return true;
}
let renameEl=null;
function closeRename(){ if(renameEl){ const e=renameEl; renameEl=null; e.remove(); } }
function openRename(id){
  const pt=P(id);
  if(!pt) return;
  closeRename();
  const stage=document.getElementById('stage');
  const sp=project(pt.p);
  const inp=document.createElement('input');
  inp.type='text'; inp.className='renamer'; inp.value=pt.label||'';
  const w=stage.clientWidth||800, h=stage.clientHeight||600;
  inp.style.left=Math.max(4,Math.min(w-110, Math.round(sp.x+16)))+'px';
  inp.style.top =Math.max(4,Math.min(h-30,  Math.round(sp.y-15)))+'px';
  stage.appendChild(inp);
  renameEl=inp;
  try{ inp.focus(); inp.select(); }catch(e){}
  const apply=()=>{
    if(!renameEl) return;
    const v=inp.value;
    closeRename();
    renamePoint(id, v);
  };
  inp.addEventListener('keydown',ev=>{
    ev.stopPropagation();
    if(ev.key==='Enter'){ ev.preventDefault(); apply(); }
    else if(ev.key==='Escape'){ ev.preventDefault(); closeRename(); }
  });
  inp.addEventListener('blur',apply);
}
function coordsOf(solid){ return solid.coords || solid.pointIds.map(id=>P(id).p); }function labelMap(solid){
  const m=new Map();
  for(const id of solid.pointIds){ const pt=P(id); if(pt&&pt.label) m.set(pt.label,id); }
  return m;
}

function computeSolidGeometry(solid){
  const pts = coordsOf(solid);
  solid.centroid = centroid(pts);
  solid.normals = solid.faces.map(f=>{
    const fp = f.map(i=>pts[i]);
    const n = faceNormal(fp);
    return V.dot(n, V.sub(centroid(fp), solid.centroid))<0 ? V.mul(n,-1) : n;
  });
  const em = new Map();
  solid.faces.forEach((f,fi)=>{
    for(let i=0;i<f.length;i++){
      const a=f[i], b=f[(i+1)%f.length];
      const k = Math.min(a,b)+'-'+Math.max(a,b);
      if(!em.has(k)) em.set(k,{a:Math.min(a,b),b:Math.max(a,b),faces:[]});
      em.get(k).faces.push(fi);
    }
  });
  solid.edges=[...em.values()];
}

function createSolid(name, shape, stroke, opt={}){
  const id=uid();
  const op=newOp();
  const smooth=!!opt.smooth;
  let pointIds=[], coords=null, radius=0, center=null;
  if(opt.pointIds){
    pointIds=opt.pointIds.slice();
  }else if(smooth){
    coords=shape.verts.map(v=>v.p.slice());
    center=centroid(coords);
    radius=Math.max(...coords.map(p=>V.dist(p,center)));
  }else{
    pointIds = shape.verts.map(v=>
      addPoint(v.p, v.label||'', {kind:'solid', color:stroke, solidId:id, op}).id);
  }
  const solid = {id,name,op,kind:opt.kind||'',pointIds,coords,center,radius,
    faces:shape.faces||[],stroke, fill:opt.fill||stroke, smooth, show:true, curves:shape.curves||[]};
  computeSolidGeometry(solid);
  state.solids.push(solid);
  return solid;
}


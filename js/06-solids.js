'use strict';
/* 06-solids.js — Твёрдое тело: геометрия граней/рёбер, сечение плоскостью и разбиение на шаги. */
/* ============================ ОБЪЕКТЫ ============================ */
function planeFrom3(a,b,c){
  const n=V.cross(V.sub(b,a),V.sub(c,a));
  if(V.len(n)<1e-9) return null;
  const nn=V.norm(n);
  return {n:nn,d:V.dot(nn,a)};
}
function sectionPolygon(solid, plane){
  const pts=coordsOf(solid);
  const {n,d}=plane;
  const found=new Map();
  const key=p=>p.map(v=>Math.round(v*1e5)).join(',');
  const add=p=>{const k=key(p); if(!found.has(k)) found.set(k,[p[0],p[1],p[2]]);};
  for(const e of solid.edges){
    const a=pts[e.a], b=pts[e.b];
    const da=V.dot(n,a)-d, db=V.dot(n,b)-d;
    const ea=Math.abs(da)<1e-7, eb=Math.abs(db)<1e-7;
    if(ea&&eb){add(a);add(b);continue;}
    if(ea){add(a);continue;}
    if(eb){add(b);continue;}
    if(da*db<0){ add(V.lerp(a,b,da/(da-db))); }
  }
  let list=[...found.values()];
  if(list.length<3) return null;
  const c=centroid(list);
  let u=V.norm(V.sub(list[0],c));
  if(V.len(u)<1e-9) return null;
  const v=V.cross(n,u);
  list.sort((p,q)=> Math.atan2(V.dot(V.sub(p,c),v),V.dot(V.sub(p,c),u))
                   - Math.atan2(V.dot(V.sub(q,c),v),V.dot(V.sub(q,c),u)));
  return list;
}
function polyPerim(pts){ let s=0; for(let i=0;i<pts.length;i++) s+=V.dist(pts[i],pts[(i+1)%pts.length]); return s; }
function polyArea(pts){
  const c=centroid(pts); let s=[0,0,0];
  for(let i=0;i<pts.length;i++) s=V.add(s,V.cross(V.sub(pts[i],c),V.sub(pts[(i+1)%pts.length],c)));
  return 0.5*V.len(s);
}

function faceForChord(solid, a, b){
  const m=V.mul(V.add(a,b),0.5);
  const pts=coordsOf(solid);
  for(let fi=0;fi<solid.faces.length;fi++){
    const poly=solid.faces[fi].map(i=>pts[i]);
    const n=faceNormal(poly);
    if(V.len(n)<1e-9) continue;
    if(Math.abs(V.dot(n,m)-V.dot(n,poly[0]))<1e-6 && inConvexPoly(m,poly,n)) return fi;
  }
  return -1;
}
function computeBuild(sec, solid){
  const poly=sec.pts, n=poly.length, steps=[];
  for(let i=0;i<n;i++) steps.push({fi:faceForChord(solid,poly[i],poly[(i+1)%n]), a:poly[i], b:poly[(i+1)%n]});
  return {secId:sec.id, solidId:solid.id, poly, plane:{n:sec.plane.n.slice(), d:sec.plane.d}, steps, k:n, show:true};
}
function updateStepUI(){
  const b=state.build;
  const r=document.getElementById('stepRange'), lbl=document.getElementById('stepLbl');
  if(!b){ r.disabled=true; r.max=0; r.value=0; lbl.textContent='—'; renderExplain(); return; }
  r.disabled=false; r.max=b.steps.length; r.value=b.k;
  lbl.textContent=b.k+' из '+b.steps.length+(b.k>=b.steps.length?' — готово':'');
  renderExplain();
}


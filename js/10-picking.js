'use strict';
/* 10-picking.js — Пикинг объектов, геометрические 2D-помощники и выделение. */
/* -------- пикинг объектов мышью -------- */
function lineEnds(o){
  const A=P(o.a).p, B=P(o.b).p;
  if(!A||!B) return null;
  const dir=V.norm(V.sub(B,A)); const R=sceneRadius()*7;
  return [V.add(A,V.mul(dir,-R)), V.add(A,V.mul(dir,R))];
}
function planeCorners(o){
  const A=P(o.a),B=P(o.b),C=P(o.c);
  if(!A||!B||!C) return null;
  const a=A.p,b=B.p,c=C.p;
  const pln=planeFrom3(a,b,c); if(!pln) return null;
  const cen=centroid([a,b,c]);
  let u=V.norm(V.sub(b,a)); if(V.len(u)<1e-9) u=V.norm(V.sub(c,a));
  const v=V.cross(pln.n,u); const s=Math.max(2.2,sceneRadius()*0.9)*1.25;
  return [V.add(cen,V.add(V.mul(u,-s),V.mul(v,-s))),
          V.add(cen,V.add(V.mul(u, s),V.mul(v,-s))),
          V.add(cen,V.add(V.mul(u, s),V.mul(v, s))),
          V.add(cen,V.add(V.mul(u,-s),V.mul(v, s)))];
}
function distToSeg(px,py,a,b){
  const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
  let t = L2 ? ((px-a.x)*dx+(py-a.y)*dy)/L2 : 0;
  t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(a.x+t*dx), py-(a.y+t*dy));
}
function distToPoly(px,py,pts){
  let d=1e9;
  for(let i=0;i<pts.length;i++) d=Math.min(d,distToSeg(px,py,pts[i],pts[(i+1)%pts.length]));
  return d;
}
function pointInPoly(px,py,pts){
  let inside=false;
  for(let i=0,j=pts.length-1;i<pts.length;j=i++){
    const xi=pts[i].x,yi=pts[i].y,xj=pts[j].x,yj=pts[j].y;
    if(((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/((yj-yi)||1e-9)+xi)) inside=!inside;
  }
  return inside;
}

function pickObject(sx,sy){
  const TH=9;
  for(const o of state.sections){
    if(!o.show) continue;
    if(pointInPoly(sx,sy,o.pts.map(project))) return {kind:'section',id:o.id};
  }
  for(const s of state.solids){
    if(!s.show) continue;
    const pts=coordsOf(s);
    for(let fi=0;fi<s.faces.length;fi++){
      if(s.smooth && V.dot(s.normals[fi],cam.dir)<=0) continue;
      const sp=s.faces[fi].map(i=>project(pts[i]));
      if(pointInPoly(sx,sy,sp)) return {kind:'solid',id:s.id};
    }
  }
  let best=null,bestD=TH;
  const consider=(kind,id,pts)=>{ const d=distToPoly(sx,sy,pts); if(d<bestD){bestD=d;best={kind,id};} };
  for(const o of state.segments){ if(!o.show||!P(o.a)||!P(o.b))continue; consider('segment',o.id,[project(P(o.a).p),project(P(o.b).p)]); }
  for(const o of state.lines){ const e=lineEnds(o); if(o.show&&e) consider('line',o.id,[project(e[0]),project(e[1])]); }
  if(best) return best;
  for(const o of state.planes){
    if(!o.show) continue;
    const c=planeCorners(o); if(!c) continue;
    if(pointInPoly(sx,sy,c.map(project))) return {kind:'plane',id:o.id};
  }
  if(bestD<TH) return best;
  for(const o of state.planes){ const c=o.show?planeCorners(o):null; if(c) consider('plane',o.id,c.map(project)); }
  return best;
}
const isSel = (kind,id) => state.selObj && state.selObj.kind===kind && state.selObj.id===id;



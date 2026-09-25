'use strict';
/* 12-snap.js — Привязка точек к поверхностям и рёбрам, автоматические подписи. */
/* -------- луч и привязка точек к поверхности -------- */
function segParam(px,py,a,b){
  const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
  if(!L2) return 0;
  return Math.max(0,Math.min(1,((px-a.x)*dx+(py-a.y)*dy)/L2));
}
function inConvexPoly(p, poly, n){
  for(let i=0;i<poly.length;i++){
    const a=poly[i], b=poly[(i+1)%poly.length];
    if(V.dot(V.cross(V.sub(b,a),V.sub(p,a)), n) < -1e-7) return false;
  }
  return true;
}
function rayFaceHit(q0, d, poly){
  const n = faceNormal(poly);
  if(V.len(n)<1e-9) return null;
  const den = V.dot(n,d);
  if(Math.abs(den)<1e-9) return null;
  const t = V.dot(n, V.sub(poly[0], q0))/den;
  const p = V.add(q0, V.mul(d,t));
  if(!inConvexPoly(p, poly, n)) return null;
  return t;
}
function closestOnSegToRay(a, b, o, d){
  const u=V.sub(b,a), w=V.sub(o,a);
  const A=V.dot(u,u), B=V.dot(u,d), C=V.dot(d,d), D=V.dot(u,w), E=V.dot(d,w);
  const den=A*C-B*B;
  let s = den>1e-9 ? (C*D-B*E)/den : 0;
  s=Math.max(0,Math.min(1,s));
  return V.add(a,V.mul(u,s));
}
function pickOnUserLine(sx,sy,q0,d){
  const TH=11;
  let best=null, bestD=TH;
  const test=(kind,id,A,B)=>{
    if(!A||!B) return;
    const q=closestOnSegToRay(A,B,q0,d);
    const sp=project(q);
    const dd=Math.hypot(sp.x-sx, sp.y-sy);
    if(dd<bestD){ bestD=dd; best={p:q, kind, id}; }
  };
  for(const o of state.lines){
    if(!o.show) continue;
    const e=lineEnds(o);
    if(e) test('line', o.id, e[0], e[1]);
  }
  for(const o of state.segments){
    if(!o.show) continue;
    const A=P(o.a), B=P(o.b);
    if(A&&B) test('segment', o.id, A.p, B.p);
  }
  return best;
}
function closestOnLineToRay(origin, dir, o, d){
  const w0=V.sub(origin,o);
  const b=V.dot(dir,d);
  const den=1-b*b;
  if(den<1e-6) return null;
  const s=(b*V.dot(d,w0)-V.dot(dir,w0))/den;
  return V.add(origin,V.mul(dir,s));
}
const AXES_DIRS=[[1,0,0],[0,1,0],[0,0,1]];
function pickOnAxis(sx,sy,o,d){
  let best=null, bestD=11;
  const lim=sceneRadius()*2.5;
  for(const e of AXES_DIRS){
    const q=closestOnLineToRay([0,0,0], e, o, d);
    if(!q || V.len(q)>lim) continue;
    const sp=project(q);
    const dd=Math.hypot(sp.x-sx,sp.y-sy);
    if(dd<bestD){ bestD=dd; best={p:q, kind:'axis'}; }
  }
  return best;
}
function computeSnap(sx,sy){
  const q0 = rayOrigin(sx,sy);
  const d = V.mul(cam.dir,-1);
  const onLine = pickOnUserLine(sx,sy,q0,d);
  if(onLine) return onLine;
  const onAxis = pickOnAxis(sx,sy,q0,d);
  let best=null;
  for(const s of state.solids){
    if(!s.show) continue;
    const pts=coordsOf(s);
    s.faces.forEach((f,fi)=>{
      const poly=f.map(i=>pts[i]);
      const t=rayFaceHit(q0,d,poly);
      if(t===null) return;
      if(!best || t<best.t) best={t,p:V.add(q0,V.mul(d,t)),solid:s,poly};
    });
  }
  if(!best) return onAxis;
  if(best.solid.smooth) return {p:best.p, kind:'face'};
  const s=best.solid, pts=coordsOf(s);
  const fcs=project(centroid(best.poly));
  if(Math.hypot(fcs.x-sx,fcs.y-sy)<15) return {p:centroid(best.poly), kind:'center'};
  let bestE=null;
  for(const e of s.edges){
    const a=pts[e.a], b=pts[e.b];
    const pa=project(a), pb=project(b);
    const t=segParam(sx,sy,pa,pb);
    const dpx=Math.hypot(sx-(pa.x+(pb.x-pa.x)*t), sy-(pa.y+(pb.y-pa.y)*t));
    if(dpx<11 && (!bestE||dpx<bestE.d)) bestE={d:dpx,a,b,pa,pb,t};
  }
  if(bestE){
    const m=centroid([bestE.a,bestE.b]);
    const ms=project(m);
    if(Math.hypot(ms.x-sx,ms.y-sy)<15) return {p:m, kind:'mid'};
    return {p:V.lerp(bestE.a,bestE.b,bestE.t), kind:'edge'};
  }
  return {p:best.p, kind:'face'};
}
const LABEL_POOL='MNKPQRSTEFGHLUVWXYZ';
function autoLabel(){
  const used=new Set(state.points.map(p=>p.label).filter(Boolean));
  for(const ch of LABEL_POOL) if(!used.has(ch)) return ch;
  let i=1; while(used.has('P'+i)) i++; return 'P'+i;
}


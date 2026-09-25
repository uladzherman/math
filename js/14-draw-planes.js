'use strict';
/* 14-draw-planes.js — Отрисовка плоскостей, следов и продолжений. */
const GREEK=['α','β','γ','δ','ε','ζ','η','θ','ι','κ'];
const PLANE_COLORS=['#5aa9ff','#c792ea','#7ee787','#ffb86b','#4dd0e1','#f78ca0'];
function planeIntersectionLine(p1,p2){
  const dir=V.cross(p1.n,p2.n);
  if(V.len(dir)<1e-7) return null;
  const num=V.add(V.mul(V.cross(p2.n,dir), p1.d), V.mul(V.cross(dir,p1.n), p2.d));
  const a=V.mul(num, 1/V.dot(dir,dir));
  return {a, d:V.norm(dir)};
}
function clipLineToSphere(a,d,R){
  const bq=V.dot(d,a), cq=V.dot(a,a)-R*R;
  const disc=bq*bq-cq;
  if(disc<=0) return null;
  const sq=Math.sqrt(disc);
  return [-bq-sq, -bq+sq];
}
function drawPlanePatches(){
  const R=Math.max(2.2,sceneRadius()*0.9);
  state.planes.forEach((pl,pi)=>{
    if(!pl.show) return;
    const col=PLANE_COLORS[pi%PLANE_COLORS.length];
    const pa=P(pl.a), pb=P(pl.b), pc=P(pl.c);
    if(!pa||!pb||!pc) return;
    const a=pa.p, b=pb.p, c=pc.p;
    const pln=planeFrom3(a,b,c); if(!pln) return;
    const cen=centroid([a,b,c]);
    let u=V.norm(V.sub(b,a));
    if(V.len(u)<1e-9) u=V.norm(V.sub(c,a));
    if(V.len(u)<1e-9) return;
    const v=V.cross(pln.n,u);
    const s=R*1.2;
    const corners=[
      V.add(cen,V.add(V.mul(u,-s),V.mul(v,-s))),
      V.add(cen,V.add(V.mul(u, s),V.mul(v,-s))),
      V.add(cen,V.add(V.mul(u, s),V.mul(v, s))),
      V.add(cen,V.add(V.mul(u,-s),V.mul(v, s))),
    ].map(project);
    const psel=isSel('plane',pl.id);
    ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y);
    for(let i=1;i<4;i++) ctx.lineTo(corners[i].x,corners[i].y);
    ctx.closePath();
    ctx.fillStyle=shade(col, psel?0.20:0.075); ctx.fill();
    ctx.strokeStyle=psel?'#ffffff':shade(col,0.55); ctx.lineWidth=psel?2.4:1.2;
    ctx.setLineDash([7,5]); ctx.stroke(); ctx.setLineDash([]);

    /* линия пересечения плоскости с фигурами */
    for(const solid of state.solids){
      if(!solid.show || solid.faces.length>200) continue;
      const poly=sectionPolygon(solid, pln);
      if(!poly) continue;
      const sp=poly.map(project);
      ctx.beginPath(); ctx.moveTo(sp[0].x,sp[0].y);
      for(let i=1;i<sp.length;i++) ctx.lineTo(sp[i].x,sp[i].y);
      ctx.closePath();
      ctx.strokeStyle=shade(col,0.95); ctx.lineWidth=2; ctx.stroke();
    }

    /* определяющие точки плоскости */
    const t3=[a,b,c].map(project);
    if(psel){
      ctx.setLineDash([4,4]); ctx.strokeStyle=shade(col,0.9); ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(t3[0].x,t3[0].y); ctx.lineTo(t3[1].x,t3[1].y); ctx.lineTo(t3[2].x,t3[2].y); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
    }
    for(const sp of t3){
      ctx.beginPath(); ctx.arc(sp.x,sp.y, psel?9:6.5, 0,7);
      ctx.strokeStyle=col; ctx.lineWidth=psel?2.2:1.6; ctx.stroke();
    }

    ctx.font='700 13px -apple-system,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.fillStyle=col;
    ctx.fillText(GREEK[pi%GREEK.length], corners[2].x+7, corners[2].y-5);
  });

  /* линии пересечения плоскостей между собой */
  const R2=Math.max(3,sceneRadius()*1.7);
  for(let i=0;i<state.planes.length;i++){
    for(let j=i+1;j<state.planes.length;j++){
      const A=state.planes[i], B=state.planes[j];
      if(!A.show||!B.show) continue;
      if(!P(A.a)||!P(A.b)||!P(A.c)||!P(B.a)||!P(B.b)||!P(B.c)) continue;
      const pa=planeFrom3(P(A.a).p,P(A.b).p,P(A.c).p);
      const pb=planeFrom3(P(B.a).p,P(B.b).p,P(B.c).p);
      if(!pa||!pb) continue;
      const L=planeIntersectionLine(pa,pb);
      if(!L) continue;
      const tr=clipLineToSphere(L.a,L.d,R2);
      if(!tr) continue;
      const s0=project(V.add(L.a,V.mul(L.d,tr[0])));
      const s1=project(V.add(L.a,V.mul(L.d,tr[1])));
      ctx.setLineDash([6,6]); ctx.strokeStyle='rgba(255,255,255,0.55)'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(s0.x,s0.y); ctx.lineTo(s1.x,s1.y); ctx.stroke();
      ctx.setLineDash([]);
      const mid=project(V.add(L.a,V.mul(L.d,(tr[0]+tr[1])/2)));
      ctx.font='700 13px -apple-system,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='rgba(10,14,20,0.8)';
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(mid.x-9,mid.y-9,18,18,5); else ctx.rect(mid.x-9,mid.y-9,18,18);
      ctx.fill();
      ctx.fillStyle='#e6edf6'; ctx.fillText('m', mid.x, mid.y+0.5);
    }
  }
}

function patchFor(plane, poly, fill, stroke){
  const cen=centroid(poly);
  let u=V.norm(V.sub(poly[1],poly[0]));
  if(V.len(u)<1e-9) u=V.norm(V.sub(poly[2%poly.length],poly[0]));
  if(V.len(u)<1e-9) return;
  const v=V.cross(plane.n,u);
  const s=Math.max(2.2,sceneRadius()*0.9)*1.25;
  const corners=[V.add(cen,V.add(V.mul(u,-s),V.mul(v,-s))),V.add(cen,V.add(V.mul(u,s),V.mul(v,-s))),
                 V.add(cen,V.add(V.mul(u,s),V.mul(v,s))),V.add(cen,V.add(V.mul(u,-s),V.mul(v,s)))].map(project);
  ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y);
  for(let i=1;i<4;i++) ctx.lineTo(corners[i].x,corners[i].y);
  ctx.closePath();
  ctx.fillStyle=fill; ctx.fill();
  ctx.strokeStyle=stroke; ctx.lineWidth=1.1; ctx.setLineDash([7,5]); ctx.stroke(); ctx.setLineDash([]);
}
function facePlane(solid, fi){
  const pts=coordsOf(solid);
  const poly=solid.faces[fi].map(i=>pts[i]);
  const n=faceNormal(poly);
  return {n, d:V.dot(n,poly[0])};
}
function cutTraceOnFace(solid, plane, fi){
  const fp=facePlane(solid, fi);
  const dir=V.cross(plane.n, fp.n);
  if(V.len(dir)<1e-7) return null;
  const num=V.add(V.mul(V.cross(fp.n,dir), plane.d), V.mul(V.cross(dir,plane.n), fp.d));
  const p0=V.mul(num, 1/V.dot(dir,dir));
  return {a:p0, d:V.norm(dir), n:fp.n};
}
function drawEdgeExtensions(solid, plane){
  const R=Math.max(3, sceneRadius()*2.2);
  const pts=[];
  const pts3=coordsOf(solid);
  for(const e of solid.edges){
    const A=pts3[e.a], B=pts3[e.b];
    const dir=V.norm(V.sub(B,A)); const len=V.dist(A,B);
    if(V.len(dir)<1e-9) continue;
    for(const fi of e.faces){
      const tr=cutTraceOnFace(solid, plane, fi);
      if(!tr) continue;
      const X=lineIntersectInPlane({a:A,d:dir}, tr, tr.n);
      if(!X) continue;
      const t=V.dot(V.sub(X,A),dir);
      if(t>=-1e-6 && t<=len+1e-6) continue;
      if(V.len(X)>R) continue;
      if(V.dist(A,X)>R*1.5) continue;
      if(pts.some(q=>V.dist(q,X)<0.18)) continue;
      pts.push(X);
      if(pts.length>=10) break;
      const anchor = t<0 ? A : B;
      const s0=project(anchor), s1=project(X);
      ctx.setLineDash([3,5]); ctx.strokeStyle='rgba(77,208,225,0.75)'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(s0.x,s0.y); ctx.lineTo(s1.x,s1.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(s1.x,s1.y,3.5,0,7); ctx.fillStyle='#4dd0e1'; ctx.fill();
    }
    if(pts.length>=10) break;
  }
}
function isOutsideSolid(solidId,p){
  const s=state.solids.find(x=>x.id===solidId);
  if(!s) return true;
  const pts=coordsOf(s);
  let maxd=-1e9;
  for(let fi=0;fi<s.faces.length;fi++){
    const q=pts[s.faces[fi][0]];
    const d=V.dot(s.normals[fi], V.sub(p,q));
    if(d>maxd) maxd=d;
  }
  return maxd > sceneRadius()*0.05;
}
function lineIntersectInPlane(l1,l2,n){
  const u=l1.d, v=l2.d;
  const w=V.cross(u,v);
  const den=V.dot(w,n);
  if(Math.abs(den)<1e-7) return null;
  const s=V.dot(V.cross(V.sub(l2.a,l1.a),v),n)/den;
  return V.add(l1.a, V.mul(u,s));
}
function drawExtensions(b){
  const n=b.steps.length, count=Math.min(b.k, n);
  if(count<1) return;
  const R=Math.max(3, sceneRadius()*2.0);
  const lines=[];
  for(let i=0;i<count;i++){
    const a=b.poly[i], bb=b.poly[(i+1)%n];
    const d=V.norm(V.sub(bb,a));
    if(V.len(d)<1e-9) continue;
    const len=V.dist(a,bb);
    lines.push({a,d,len,i});
    const ao=V.sub(a,[0,0,0]);
    const bq=V.dot(d,ao), cq=V.dot(ao,ao)-R*R;
    const disc=bq*bq-cq;
    if(disc<=0) continue;
    const sq=Math.sqrt(disc);
    let t1=-bq-sq, t2=-bq+sq;
    const parts=[];
    if(t1<0) parts.push([t1, Math.min(t2,0)]);
    if(t2>len) parts.push([Math.max(t1,len), t2]);
    for(const [p0,p1] of parts){
      if(p1-p0 < 1e-3) continue;
      const sp0=project(V.add(a,V.mul(d,p0)));
      const sp1=project(V.add(a,V.mul(d,p1)));
      ctx.beginPath(); ctx.moveTo(sp0.x,sp0.y); ctx.lineTo(sp1.x,sp1.y); ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  const pts=[];
  for(let i=0;i<lines.length;i++){
    for(let j=i+1;j<lines.length;j++){
      const sep=(j-i+n)%n;
      if(sep<=1 || (n-sep)<=1) continue;
      const p=lineIntersectInPlane(lines[i],lines[j],b.plane.n);
      if(!p) continue;
      if(V.len(V.sub(p,[0,0,0]))>R) continue;
      if(!isOutsideSolid(b.solidId,p)) continue;
      if(pts.some(q=>V.dist(q,p)<0.15)) continue;
      pts.push(p);
      if(pts.length>=8) break;
    }
    if(pts.length>=8) break;
  }
  for(const p of pts){
    const sp=project(p);
    ctx.beginPath(); ctx.arc(sp.x,sp.y,3.8,0,7);
    ctx.fillStyle='rgba(126,231,135,0.22)'; ctx.fill();
    ctx.strokeStyle='#7ee787'; ctx.lineWidth=1.5; ctx.stroke();
  }
}

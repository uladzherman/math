'use strict';
/* 11-draw.js — Отрисовка сцены: сетка, оси, грани, рёбра, плоскости, сечения, точки, HUD. */
/* -------- вспомогательное -------- */
function snapColor(kind){
  if(kind==='edge'||kind==='mid') return '#ffb86b';
  if(kind==='center') return '#c792ea';
  if(kind==='face') return '#7ee787';
  if(kind==='line') return '#f59e0b';
  if(kind==='segment') return '#4ade80';
  return '#ffd166';
}
function drawPointPlane(){
  if(state.tool!=='point' || Math.abs(state.pointZ)<1e-6) return;
  const s=Math.max(3,sceneRadius()*1.4);
  const corners=[[-s,-s],[s,-s],[s,s],[-s,s]].map(([x,y])=>project([x,y,state.pointZ]));
  ctx.beginPath(); ctx.moveTo(corners[0].x,corners[0].y);
  for(let i=1;i<4;i++) ctx.lineTo(corners[i].x,corners[i].y);
  ctx.closePath();
  ctx.fillStyle='rgba(255,209,102,0.055)'; ctx.fill();
  ctx.strokeStyle='rgba(255,209,102,0.45)'; ctx.lineWidth=1.1;
  ctx.setLineDash([6,5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.font='600 12px -apple-system,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.fillStyle='#ffd166';
  ctx.fillText('плоскость точек: z = '+round(state.pointZ,2), corners[1].x+6, corners[1].y-5);
}

function drawGrid(){
  const R=Math.max(4,Math.ceil(sceneRadius()*1.8/2)*2);
  const step=R/4;
  ctx.lineWidth=1;
  ctx.strokeStyle=COL.grid; ctx.globalAlpha=1;
  for(let x=-R;x<=R+1e-6;x+=step){
    const a=project([x,-R,0]),b=project([x,R,0]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let y=-R;y<=R+1e-6;y+=step){
    const a=project([-R,y,0]),b=project([R,y,0]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function drawAxes(){
  const R=Math.max(2.6, sceneRadius()*1.4);
  const axes=[
    {v:[1,0,0], c:'#ff5f6d', l:'x'},
    {v:[0,1,0], c:'#4ade80', l:'y'},
    {v:[0,0,1], c:'#5aa9ff', l:'z'},
  ];
  ctx.lineCap='round';
  for(const ax of axes){
    const p0=project(V.mul(ax.v,-R*0.5));
    const p1=project(V.mul(ax.v,R));
    ctx.globalAlpha=0.95;
    ctx.strokeStyle=ax.c; ctx.lineWidth=1.8;
    ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.stroke();
    const ang=Math.atan2(p1.y-p0.y,p1.x-p0.x);
    ctx.beginPath();
    ctx.moveTo(p1.x,p1.y);
    ctx.lineTo(p1.x-10*Math.cos(ang-0.4), p1.y-10*Math.sin(ang-0.4));
    ctx.lineTo(p1.x-10*Math.cos(ang+0.4), p1.y-10*Math.sin(ang+0.4));
    ctx.closePath(); ctx.fillStyle=ax.c; ctx.fill();
    ctx.globalAlpha=1;
    ctx.font='700 13px -apple-system,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=ax.c;
    ctx.fillText(ax.l, p1.x+13*Math.cos(ang), p1.y+13*Math.sin(ang));
    /* деления через 1 единицу */
    if(cam.scale>34){
      ctx.fillStyle=ax.c;
      for(let u=1;u<=Math.floor(R);u++){
        const sp=project(V.mul(ax.v,u));
        ctx.beginPath(); ctx.arc(sp.x,sp.y,1.6,0,7); ctx.fill();
      }
    }
  }
  const o=project([0,0,0]);
  ctx.beginPath(); ctx.arc(o.x,o.y,3.2,0,7); ctx.fillStyle='#cbd5e1'; ctx.fill();
  ctx.font='600 12px -apple-system,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#cbd5e1'; ctx.fillText('O', o.x-11, o.y+11);
}

function drawFaces(){
  const L=V.norm(V.add(V.mul(cam.dir,0.78), V.add(V.mul(cam.up,0.42), V.mul(cam.right,-0.42))));
  const items=[];
  for(const s of state.solids){
    if(!s.show) continue;
    const pts=coordsOf(s);
    s.faces.forEach((f,fi)=>{
      const fp=f.map(i=>pts[i]);
      const c=centroid(fp);
      const n=s.normals[fi];
      const front = V.dot(n,cam.dir)>0;
      if(s.smooth && !front) return;
      items.push({d:depthOf(c), fp, s, n, front});
    });
  }
  items.sort((a,b)=>a.d-b.d);
  for(const it of items){
    const {fp,s,n,front}=it;
    const sp=fp.map(project);
    ctx.beginPath();
    ctx.moveTo(sp[0].x,sp[0].y);
    for(let i=1;i<sp.length;i++) ctx.lineTo(sp[i].x,sp[i].y);
    ctx.closePath();
    if(s.smooth){
      const nl=Math.max(0,V.dot(n,L));
      const spec=Math.pow(nl,18)*0.35;
      let a=0.07+0.44*nl+spec;
      a=Math.max(0,Math.min(0.62,a));
      if(isSel('solid',s.id)) a=Math.min(0.72,a+0.12);
      ctx.fillStyle=shade(s.fill, a);
      ctx.fill();
    }else{
      ctx.fillStyle=shade(s.fill, isSel('solid',s.id)?0.20:(front?0.075:0.035));
      ctx.fill();
    }
  }
}

function drawSolidEdges(){
  ctx.lineCap='round';
  for(const s of state.solids){
    if(!s.show) continue;
    const pts=coordsOf(s);
    if(!s.smooth){
      const ssel=isSel('solid',s.id);
      const flat=(s.faces.length===1);
      for(const e of s.edges){
        const a=pts[e.a], b=pts[e.b];
        let front=false;
        for(const fi of e.faces){ if(V.dot(s.normals[fi],cam.dir)>1e-4){front=true;break;} }
        const pa=project(a), pb=project(b);
        if(front||flat){
          ctx.strokeStyle = ssel?'#ffffff':shade(s.stroke,0.95);
          ctx.lineWidth = ssel?2.6:1.6; ctx.setLineDash([]);
        }else{
          if(!state.showHidden) continue;
          ctx.strokeStyle = ssel?shade('#ffffff',0.6):shade(s.stroke,0.34);
          ctx.lineWidth = ssel?1.8:1.1; ctx.setLineDash([5,5]);
        }
        ctx.beginPath(); ctx.moveTo(pa.x,pa.y); ctx.lineTo(pb.x,pb.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }else{
      for(const cv of s.curves){
        let run=[];
        const flush=()=>{ if(run.length>1){
          ctx.beginPath(); ctx.moveTo(run[0].x,run[0].y);
          for(let i=1;i<run.length;i++) ctx.lineTo(run[i].x,run[i].y);
          ctx.stroke(); } run=[]; };
        for(let i=0;i<cv.pts.length;i++){
          const front = V.dot(cv.nrm[i],cam.dir)>0;
          const sp=project(cv.pts[i]);
          if(front){
            if(run.length===0) { ctx.setLineDash([]); ctx.strokeStyle=shade(s.stroke,0.85); ctx.lineWidth=1.3;}
            run.push(sp);
          }else{
            if(run.length){ flush(); }
            if(state.showHidden){
              ctx.setLineDash([5,5]); ctx.strokeStyle=shade(s.stroke,0.3); ctx.lineWidth=1;
              const prev = i>0 ? [project(cv.pts[i-1]), sp] : null;
              if(prev){ ctx.beginPath();ctx.moveTo(prev[0].x,prev[0].y);ctx.lineTo(prev[1].x,prev[1].y);ctx.stroke(); }
            }
          }
        }
        if(run.length){ ctx.setLineDash([]); ctx.strokeStyle=shade(s.stroke,0.85); ctx.lineWidth=1.3; flush(); }
        ctx.setLineDash([]);
      }
      if(s.kind==='sphere' && s.center && s.radius){
        const c=project(s.center);
        ctx.beginPath(); ctx.arc(c.x,c.y, s.radius*cam.scale, 0, 7);
        ctx.strokeStyle=shade(s.stroke,0.85); ctx.lineWidth=1.6; ctx.stroke();
      }
    }
  }
}

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
function drawBuild(){
  const b=state.build;
  if(!b) return;
  const n=b.steps.length, k=b.k, complete=(k>=n);
  if(!complete) patchFor(b.plane, b.poly, 'rgba(255,95,158,0.07)', 'rgba(255,95,158,0.35)');
  if(state.showExt && k>0){
    const solid=state.solids.find(s=>s.id===b.solidId);
    if(solid && !solid.smooth){
      ctx.setLineDash([4,6]); ctx.lineWidth=1.3;
      ctx.strokeStyle='rgba(126,231,135,0.6)';
      drawExtensions(b);
      ctx.setLineDash([]);
      drawEdgeExtensions(solid, b.plane);
    }
  }
  ctx.setLineDash([]);
  if(!b.show) return;
  if(!complete){
    for(let i=0;i<k;i++){
      const st=b.steps[i];
      const a=project(st.a), c=project(st.b);
      ctx.setLineDash([7,5]); ctx.lineCap='butt';
      ctx.strokeStyle='rgba(255,209,102,0.95)'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  const revealed = k===0 ? 0 : Math.min(k+1, n);
  ctx.font='700 12px -apple-system,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(let i=0;i<revealed;i++){
    const sp=project(b.poly[i]);
    ctx.beginPath(); ctx.arc(sp.x,sp.y,4.8,0,7); ctx.fillStyle='#fff'; ctx.fill();
    ctx.strokeStyle='#ff5f9e'; ctx.lineWidth=1.8; ctx.stroke();
    const tx=sp.x+15;
    ctx.fillStyle='rgba(10,14,20,0.82)';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(tx-9,sp.y-9,18,18,5); else ctx.rect(tx-9,sp.y-9,18,18);
    ctx.fill();
    ctx.fillStyle='#ffd166'; ctx.fillText(String(i+1), tx, sp.y+0.5);
  }
}
function drawSections(){
  for(const sec of state.sections){
    if(!sec.show) continue;
    const b=state.build;
    if(b && b.secId===sec.id && b.k < b.steps.length) continue;
    const ssel=isSel('section',sec.id);
    const sp=sec.pts.map(project);
    ctx.beginPath(); ctx.moveTo(sp[0].x,sp[0].y);
    for(let i=1;i<sp.length;i++) ctx.lineTo(sp[i].x,sp[i].y);
    ctx.closePath();
    ctx.fillStyle=ssel?'rgba(255,95,158,0.36)':'rgba(255,95,158,0.22)'; ctx.fill();
    ctx.strokeStyle=ssel?'#ffffff':COL.section; ctx.lineWidth=ssel?3.2:2.2; ctx.lineJoin='round'; ctx.stroke();
    for(const p of sp){
      ctx.beginPath(); ctx.arc(p.x,p.y,3.1,0,7); ctx.fillStyle='#fff'; ctx.fill();
      ctx.strokeStyle=COL.section; ctx.lineWidth=1.6; ctx.stroke();
    }
  }
}

function drawUserGeometry(){
  ctx.lineCap='round';
  for(const sg of state.segments){
    if(!sg.show||!P(sg.a)||!P(sg.b)) continue;
    const a=project(P(sg.a).p), b=project(P(sg.b).p);
    if(isSel('segment',sg.id)){
      ctx.strokeStyle='#ffffff'; ctx.lineWidth=4;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.strokeStyle=sg.color||'#4ade80'; ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(const ln of state.lines){
    if(!ln.show) continue;
    const e=lineEnds(ln); if(!e) continue;
    const a=project(e[0]), b=project(e[1]);
    if(isSel('line',ln.id)){
      ctx.setLineDash([]); ctx.strokeStyle='#ffffff'; ctx.lineWidth=3.4;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.strokeStyle=ln.color||'#f59e0b'; ctx.lineWidth=1.6; ctx.setLineDash([9,6]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPoints(){
  const all = state.points.filter(p=>p.show);
  all.sort((a,b)=>depthOf(a.p)-depthOf(b.p));
  for(const p of all){
    const sp=project(p.p);
    const sel=state.selection.includes(p.id);
    if(p.kind==='auto'){
      ctx.beginPath(); ctx.arc(sp.x,sp.y, sel?6.8:4.9,0,7);
      ctx.fillStyle='rgba(10,14,20,0.85)'; ctx.fill();
      ctx.lineWidth=2.2; ctx.strokeStyle=sel?COL.ptSel:(p.color||'#c792ea'); ctx.stroke();
      if(sel){ ctx.beginPath(); ctx.arc(sp.x,sp.y,11,0,7); ctx.strokeStyle=COL.ptSel; ctx.lineWidth=1.8; ctx.stroke(); }
      continue;
    }
    const base = p.kind==='solid' ? p.color : (p.color||COL.pt);
    ctx.beginPath(); ctx.arc(sp.x,sp.y, sel?6.2:4.2,0,7);
    ctx.fillStyle = sel ? COL.ptSel : base;
    ctx.fill();
    ctx.lineWidth=1.4; ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.stroke();
    if(sel){ ctx.beginPath(); ctx.arc(sp.x,sp.y,10,0,7); ctx.strokeStyle=COL.ptSel; ctx.lineWidth=1.8; ctx.stroke(); }
  }
  if(state.showLabels){
    ctx.font='600 12.5px -apple-system,Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    for(const p of all){
      if(!p.label) continue;
      const sp=project(p.p);
      const c = p.solidId ? (state.solids.find(s=>s.id===p.solidId)||{}).centroid : null;
      let ox=0, oy=-16;
      if(c){ const cs=project(c); const dx=sp.x-cs.x, dy=sp.y-cs.y; const l=Math.hypot(dx,dy)||1;
        ox=dx/l*20; oy=dy/l*20; }
      const tx=sp.x+ox, ty=sp.y+oy;
      ctx.fillStyle='rgba(10,14,20,0.72)';
      const w=ctx.measureText(p.label).width+8;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(tx-w/2,ty-9,w,18,5);
      else ctx.rect(tx-w/2,ty-9,w,18);
      ctx.fill();
      const lcol = p.kind==='solid' ? p.color : (p.color||COL.pt);
      ctx.fillStyle = state.selection.includes(p.id)?COL.ptSel:lcol;
      ctx.fillText(p.label,tx,ty+0.5);
    }
  }
}

function drawHover(){
  const h=state.hoverPt;
  if(!h || state.tool!=='point') return;
  const sp=project(h.p);
  const col=snapColor(h.kind);
  ctx.save();
  ctx.globalAlpha=0.95;
  ctx.beginPath(); ctx.arc(sp.x,sp.y,9,0,7);
  ctx.strokeStyle=col; ctx.lineWidth=1.6; ctx.setLineDash(h.kind==='vertex'?[]:[3,3]); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(sp.x,sp.y,3.4,0,7); ctx.fillStyle=col; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(sp.x-13,sp.y); ctx.lineTo(sp.x-6,sp.y);
  ctx.moveTo(sp.x+6,sp.y); ctx.lineTo(sp.x+13,sp.y);
  ctx.moveTo(sp.x,sp.y-13); ctx.lineTo(sp.x,sp.y-6);
  ctx.moveTo(sp.x,sp.y+6); ctx.lineTo(sp.x,sp.y+13);
  ctx.strokeStyle=col; ctx.lineWidth=1.2; ctx.stroke();
  ctx.restore();
}
function draw(){
  pruneSelection();
  resize(); updateCam();
  ctx.clearRect(0,0,cw,ch);
  if(state.showGrid) drawGrid();
  if(state.showAxes) drawAxes();
  drawPointPlane();
  drawFaces();
  drawPlanePatches();
  drawSections();
  drawSolidEdges();
  drawBuild();
  drawUserGeometry();
  drawPoints();
  drawHover();
  updateBadge();
  scheduleHistory();
}
function updateBadge(){
  const b=document.getElementById('badge');
  pruneSelection();
  const sel=state.selection;
  let html='Вершин выбрано: <b>'+sel.length+'</b>';
  if(sel.length===2){
    html+='<br>Длина: <b>'+round(V.dist(P(sel[0]).p,P(sel[1]).p),3).toFixed(3)+'</b>';
  }else if(sel.length===3){
    const [a,b,c]=sel.map(i=>P(i).p);
    const ar=0.5*V.len(V.cross(V.sub(b,a),V.sub(c,a)));
    html+='<br>Площадь Δ: <b>'+round(ar,3).toFixed(3)+'</b>';
  }
  b.innerHTML=html + (flashMsg?('<div class="fl">'+flashMsg+'</div>'):'');
  if(state.tool==='point' && state.hoverPt){
    const names={vertex:'вершина',edge:'ребро',mid:'середина ребра',center:'центр грани',face:'грань',line:'прямая',segment:'отрезок'};
    b.innerHTML += '<div class="fl" style="color:'+snapColor(state.hoverPt.kind)+'">Привязка: '+(names[state.hoverPt.kind]||'точка')+'</div>';
  }
}


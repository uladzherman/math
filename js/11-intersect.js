'use strict';
/* 11-intersect.js — Автоматические точки пересечения прямых, плоскостей и граней. */
/* -------- автоматические точки пересечения прямых/отрезков -------- */
const SUBD={0:'₀',1:'₁',2:'₂',3:'₃',4:'₄',5:'₅',6:'₆',7:'₇',8:'₈',9:'₉'};
const subDigits=n=>String(n).split('').map(c=>SUBD[c]||c).join('');
function objDrawnEnds(o){
  if(o.t==='line'){ const e=lineEnds(o.o); return e?{a:e[0],b:e[1]}:null; }
  const A=P(o.o.a), B=P(o.o.b);
  if(!A||!B) return null;
  return {a:A.p, b:B.p};
}
function segSegClosest(p1,q1,p2,q2){
  const d1=V.sub(q1,p1), d2=V.sub(q2,p2), r=V.sub(p1,p2);
  const a=V.dot(d1,d1), e=V.dot(d2,d2);
  const EPS=1e-12;
  let s=0,t=0;
  if(a<EPS && e<EPS) return {s:0,t:0,dist:V.len(r),c1:p1,c2:p2};
  if(a<EPS){ t=V.dot(d2,r)/e; }
  else if(e<EPS){ s=-V.dot(d1,r)/a; }
  else{
    const b=V.dot(d1,d2), c=V.dot(d1,r), f=V.dot(d2,r);
    const den=a*e-b*b;
    if(den>EPS){ s=(b*f-c*e)/den; t=(b*s+f)/e; }
    else { s=0; t=f/e; }
  }
  const c1=V.add(p1,V.mul(d1,s)), c2=V.add(p2,V.mul(d2,t));
  return {s,t,dist:V.dist(c1,c2),c1,c2};
}
function intersectObjects(o1,o2){
  const e1=objDrawnEnds(o1), e2=objDrawnEnds(o2);
  if(!e1||!e2) return null;
  const d1=V.norm(V.sub(e1.b,e1.a)), d2=V.norm(V.sub(e2.b,e2.a));
  if(V.len(d1)<1e-9||V.len(d2)<1e-9) return null;
  if(V.len(V.cross(d1,d2))<1e-6 && V.len(V.cross(d1,V.sub(e2.a,e1.a)))<1e-6) return null;
  const r=segSegClosest(e1.a,e1.b,e2.a,e2.b);
  if(r.dist>0.02) return null;
  const inR=t=>t>=-1e-4 && t<=1+1e-4;
  if(!inR(r.s)||!inR(r.t)) return null;
  return V.mul(V.add(r.c1,r.c2),0.5);
}
function lineObjPlaneStatus(o, plane){
  const e=objDrawnEnds(o);
  if(!e) return null;
  const d=V.sub(e.b,e.a);
  if(V.len(d)<1e-9) return null;
  const den=V.dot(plane.n,d);
  if(Math.abs(den)<1e-7){
    return {kind: (Math.abs(V.dot(plane.n,e.a)-plane.d)<1e-6) ? 'in' : 'par'};
  }
  const s=(plane.d-V.dot(plane.n,e.a))/den;
  if(s<-1e-6||s>1+1e-6) return {kind:'out'};
  return {kind:'point', p:V.add(e.a,V.mul(d,s))};
}
function planesParallel(pa,pb){ return V.len(V.cross(pa.n,pb.n))<1e-7; }
function planesCoincide(pa,pb){
  if(!planesParallel(pa,pb)) return false;
  const s=Math.sign(V.dot(pa.n,pb.n))||1;
  return Math.abs(pa.d - s*pb.d)<1e-6;
}
function objNameById(t,id){
  if(t==='line'){ const l=state.lines.find(x=>x.id===id); return l?('l('+liveLabel(l.a)+liveLabel(l.b)+')'):'l'; }
  const s=state.segments.find(x=>x.id===id);
  return s?('отрезок '+liveLabel(s.a)+liveLabel(s.b)):'отрезок';
}
function planeNameById(id){
  const i=state.planes.findIndex(p=>p.id===id);
  return i>=0?GREEK[i%GREEK.length]:'α';
}
function pointLabelAt(q){
  const p=state.points.find(pt=>V.dist(pt.p,q)<1e-3 && pt.label);
  if(p) return p.label;
  const a=state.points.find(pt=>V.dist(pt.p,q)<1e-3);
  return a? a.label||'•' : '•';
}
function recomputeAutoPoints(){
  const objs=[];
  for(const o of state.lines) if(o.show) objs.push({t:'line',o});
  for(const o of state.segments) if(o.show) objs.push({t:'seg',o});
  const info={ll:[], lp:[], lf:[], pp:[]};
  const found=[];
  for(let i=0;i<objs.length;i++)for(let j=i+1;j<objs.length;j++){
    const q=intersectObjects(objs[i],objs[j]);
    if(q){
      const rec={p:q, pre:'X', src:{type:'ll', l1:{t:objs[i].t,id:objs[i].o.id}, l2:{t:objs[j].t,id:objs[j].o.id}}};
      found.push(rec); info.ll.push(rec);
    }
  }
  const pls=[];
  state.planes.forEach(pl=>{
    if(!pl.show) return;
    const pp=planeFrom3(P(pl.a).p,P(pl.b).p,P(pl.c).p);
    if(pp) pls.push({pl:pp, id:pl.id});
  });
  for(const o of objs){
    for(const pl of pls){
      const st=lineObjPlaneStatus(o, pl.pl);
      if(!st) continue;
      const src={type:'lp', l:{t:o.t,id:o.o.id}, plane:pl.id};
      if(st.kind==='point'){
        if(V.len(st.p)>sceneRadius()*3.5) continue;
        const rec={p:st.p, pre:'Y', src};
        found.push(rec); info.lp.push(rec);
      }else if(st.kind!=='out'){
        info.lp.push({status:st.kind, src});
      }
    }
  }
  for(let i=0;i<pls.length;i++)for(let j=i+1;j<pls.length;j++){
    const A=pls[i], B=pls[j];
    if(planesCoincide(A.pl,B.pl)) info.pp.push({kind:'coincide', ids:[A.id,B.id]});
    else if(planesParallel(A.pl,B.pl)) info.pp.push({kind:'par', ids:[A.id,B.id]});
    else info.pp.push({kind:'line', ids:[A.id,B.id], L:planeIntersectionLine(A.pl,B.pl)});
  }
  /* прямая/отрезок ∩ плоскости граней многогранника */
  for(const o of objs){
    for(const s of state.solids){
      if(!s.show || s.smooth) continue;
      const sp=coordsOf(s);
      s.faces.forEach((f,fi)=>{
        const poly=f.map(i=>sp[i]);
        const n=faceNormal(poly);
        if(V.len(n)<1e-9) return;
        const st=lineObjPlaneStatus(o, {n, d:V.dot(n,poly[0])});
        if(!st || st.kind!=='point') return;
        if(V.len(st.p)>sceneRadius()*3.5) return;
        const inside=inConvexPoly(st.p, poly, n);
        const pe=pointOnEdge(s, st.p);
        const src={type:'lf', l:{t:o.t,id:o.o.id}, solidId:s.id, fi};
        info.lf.push({p:st.p, src, inside,
          vert: pe&&pe.vertex?pe.vertex:null,
          edge: pe&&pe.edge?pe.edge:null,
          mid: !!(pe&&pe.mid)});
        if(inside) found.push({p:st.p, pre:'Z', src});
      });
    }
  }
  /* одна и та же точка на ребре/вершине принадлежит нескольким граням — объединяем */
  const lfMap=new Map();
  for(const r of info.lf){
    const k=r.src.solidId+'|'+r.src.l.t+'|'+r.src.l.id+'|'+
      Math.round(r.p[0]*1e5)+','+Math.round(r.p[1]*1e5)+','+Math.round(r.p[2]*1e5);
    const e=lfMap.get(k);
    if(e){ if(!e.fis.includes(r.src.fi)) e.fis.push(r.src.fi); e.inside=e.inside||r.inside; }
    else lfMap.set(k, {p:r.p, src:r.src, inside:r.inside, fis:[r.src.fi], vert:r.vert, edge:r.edge, mid:r.mid});
  }
  info.lf=[...lfMap.values()];
  state.intersect=info;
  const live=state.points.filter(p=>p.kind!=='auto');
  const old=state.points.filter(p=>p.kind==='auto');
  const keep=[];
  for(const f of found){
    if(live.some(p=>V.dist(p.p,f.p)<1e-4)) continue;
    if(keep.some(k=>V.dist(k.p,f.p)<1e-4)) continue;
    keep.push(f);
  }
  const next=live.slice();
  const used=new Set(next.map(p=>p.label).filter(Boolean));
  const cnt={X:1,Y:1,Z:1};
  const nextLabel=pre=>{
    while(used.has(pre+subDigits(cnt[pre]))) cnt[pre]++;
    const l=pre+subDigits(cnt[pre]); used.add(l); cnt[pre]++; return l;
  };
  const autoColor={X:'#c792ea', Y:'#4dd0e1', Z:'#7ee787'};
  for(const f of keep){
    const prev=old.find(p=>V.dist(p.p,f.p)<1e-4);
    if(prev){ prev.show=state.showAuto; prev.src=f.src; next.push(prev); }
    else next.push({id:uid(), p:f.p.slice(), label:nextLabel(f.pre), kind:'auto',
      color:autoColor[f.pre]||'#c792ea', solidId:null, show:state.showAuto, src:f.src});
  }
  state.points=next;
  rebuildIndex();
}


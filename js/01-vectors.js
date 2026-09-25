/* 01-vectors.js — Векторная алгебра и базовые числовые помощники. */
'use strict';
/* ============================ ВЕКТОРЫ ============================ */
const V = {
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm:a=>{const l=V.len(a);return l<1e-9?[0,0,0]:V.mul(a,1/l);},
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],
  dist:(a,b)=>V.len(V.sub(a,b)),
};
const centroid = pts => {
  const s=[0,0,0]; for(const p of pts){s[0]+=p[0];s[1]+=p[1];s[2]+=p[2];}
  return V.mul(s,1/(pts.length||1));
};
const faceNormal = pts => {
  let n=[0,0,0];
  for(let i=0;i<pts.length;i++){
    const a=pts[i],b=pts[(i+1)%pts.length];
    n[0]+=(a[1]-b[1])*(a[2]+b[2]);
    n[1]+=(a[2]-b[2])*(a[0]+b[0]);
    n[2]+=(a[0]-b[0])*(a[1]+b[1]);
  }
  return V.norm(n);
};
const round = (v,d=3)=> Number(v.toFixed(d));


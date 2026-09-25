'use strict';
/* 02-camera.js — Камера: ориентация, проекция, лучи и преобразование экранных координат. */
/* ============================ СЦЕНА ============================ */
const canvas = document.getElementById('cv');
const ctx = canvas.getContext('2d');
let cw=0, ch=0, dpr=1;

const cam = {
  az:-0.95, el:0.42, target:[0,0,0], scale:118,
  dir:[0,0,1], right:[1,0,0], up:[0,1,0], cx:0, cy:0
};
function updateCam(){
  const ce=Math.cos(cam.el), se=Math.sin(cam.el);
  cam.dir = [ce*Math.cos(cam.az), ce*Math.sin(cam.az), se];
  const f = V.mul(cam.dir,-1);
  let r = V.cross(f,[0,0,1]);
  if(V.len(r)<1e-6) r=[1,0,0];
  r = V.norm(r);
  cam.up = V.norm(V.cross(r,f));
  cam.right = r;
}
function project(p){
  const v=V.sub(p,cam.target);
  const X=V.dot(v,cam.right), Y=V.dot(v,cam.up);
  return {x:cam.cx+X*cam.scale, y:cam.cy-Y*cam.scale, z:V.dot(v,cam.dir)};
}
const depthOf = p => V.dot(V.sub(p,cam.target),cam.dir);
function screenToZ0(sx,sy){
  const X=(sx-cam.cx)/cam.scale, Y=(cam.cy-sy)/cam.scale;
  const dz = Math.abs(cam.dir[2])<1e-6 ? 1e-6 : cam.dir[2];
  const t = -(X*cam.right[2]+Y*cam.up[2])/dz;
  return V.add(cam.target,V.add(V.mul(cam.right,X),V.add(V.mul(cam.up,Y),V.mul(cam.dir,t))));
}
/* точка луча с теми же экранными координатами: стабильна при любом угле камеры */
function rayOrigin(sx,sy){
  const X=(sx-cam.cx)/cam.scale, Y=(cam.cy-sy)/cam.scale;
  return V.add(cam.target, V.add(V.mul(cam.right,X), V.mul(cam.up,Y)));
}
function clampHorizontal(p, rMax){
  const r=Math.hypot(p[0],p[1]);
  if(r<=rMax) return p;
  const k=rMax/r;
  return [p[0]*k, p[1]*k, p[2]];
}
/* свободная точка ставится на горизонтальную плоскость z = высота (по умолчанию z = 0) */
function screenToHeightPlane(sx,sy,z0){
  const o=rayOrigin(sx,sy);
  const d=V.mul(cam.dir,-1);
  const rMax=Math.max(3, sceneRadius()*2.5);
  if(Math.abs(d[2])<0.02) return clampHorizontal(o, rMax);
  const t=(z0-o[2])/d[2];
  return clampHorizontal(V.add(o,V.mul(d,t)), rMax);
}
function resize(){
  const r = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio||1,2);
  cw=r.width; ch=r.height;
  canvas.width=Math.max(1,Math.round(cw*dpr));
  canvas.height=Math.max(1,Math.round(ch*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  cam.cx=cw/2; cam.cy=ch/2;
}


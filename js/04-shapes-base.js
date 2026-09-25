'use strict';
/* 04-shapes-base.js — Геометрические помощники: основания, призмы, общие утилиты фигур. */
/* ============================ ФИГУРЫ ============================ */
function sub1(s){ return s.replace(/1$/,'₁'); }
const BASE_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const baseLab = i => BASE_LETTERS[i] || ('P'+(i+1));
function ngonRing(n,r,z,prefix,startAng){
  const out=[];
  for(let i=0;i<n;i++){
    const a=(startAng||0)+i*2*Math.PI/n;
    out.push({p:[r*Math.cos(a),r*Math.sin(a),z], label: prefix+(i+1)});
  }
  return out;
}
function ringIndices(off,n){ const a=[];for(let i=0;i<n;i++)a.push(off+i);return a; }
function offXY(prm,kx,ky){ return [ (prm&&prm[kx])||0, (prm&&prm[ky])||0 ]; }
function shiftPt(p,o){ return [p[0]+o[0], p[1]+o[1], p[2]]; }
function basePts(n,a,prm){
  if(prm && Array.isArray(prm.base) && prm.base.length===n)
    return prm.base.map(b=>[+b[0],+b[1]]);
  const R=a/(2*Math.sin(Math.PI/n));
  const out=[];
  for(let i=0;i<n;i++){ const ang=Math.PI/2+i*2*Math.PI/n; out.push([R*Math.cos(ang),R*Math.sin(ang)]); }
  return out;
}
const quadBase = a => { const s=a/2; return [[-s,-s],[s,-s],[s,s],[-s,s]]; };
function boxVertsFromBase(base,c,bo,to){
  const z=c/2, v=[];
  for(let i=0;i<4;i++) v.push({p:[base[i][0]+bo[0],base[i][1]+bo[1],-z], label:'ABCD'[i]});
  for(let i=0;i<4;i++) v.push({p:[base[i][0]+to[0],base[i][1]+to[1], z], label:'ABCD'[i]+'₁'});
  return v;
}
const BOX_FACES=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]];


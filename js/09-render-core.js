'use strict';
/* 09-render-core.js — Основы отрисовки: цвета, вспышки, радиус сцены. */
/* ============================ ОТРИСОВКА ============================ */
const COL = {
  hide:'#3a4658', pt:'#ffd166', ptSel:'#ff8a3d', grid:'#1b2431',
  axisX:'#c0392b', axisY:'#27ae60', axisZ:'#2980b9', section:'#ff5f9e'
};
function shade(hex,a){
  const h=hex.replace('#','');
  const r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
  return `rgba(${r},${g},${b},${a})`;
}
let flashMsg='', flashT=0;
function flash(msg){
  flashMsg=msg; draw();
  clearTimeout(flashT); flashT=setTimeout(()=>{ flashMsg=''; draw(); }, 6500);
}

function sceneRadius(){
  let R=3;
  for(const s of state.solids){
    if(s.coords){ for(const p of s.coords) R=Math.max(R,V.len(p)); continue; }
    for(const id of s.pointIds){ const p=P(id); if(p) R=Math.max(R,V.len(p.p)); }
  }
  return R;
}


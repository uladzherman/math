'use strict';
/* 13-history.js — История действий: отмена и возврат. */
/* ============================ ИСТОРИЯ (отмена / возврат) ============================ */
let history=[], hIdx=-1, histTimer=0;
const HIST_MAX=60;
function snapshotStr(){
  const data={
    uidN, kv,
    points: state.points.map(p=>({...p})),
    solids: state.solids.map(s=>({...s})),
    segments: state.segments.map(o=>({...o})),
    lines: state.lines.map(o=>({...o})),
    planes: state.planes.map(o=>({...o})),
    sections: state.sections.map(o=>({...o})),
    build: state.build, dyn: state.dyn,
    baseXY: state.baseXY,
    problemGiven: state.problemGiven ? [...state.problemGiven] : null
  };
  return JSON.stringify(data);
}
function updateHistoryUI(){
  const u=document.getElementById('btnUndo'), r=document.getElementById('btnRedo');
  if(u) u.disabled = hIdx<=0;
  if(r) r.disabled = hIdx>=history.length-1;
}
function pushHistory(){
  if(!state) return;
  const str=snapshotStr();
  if(history.length && history[hIdx]===str) return;
  history=history.slice(0, hIdx+1);
  history.push(str);
  if(history.length>HIST_MAX){ history.shift(); }
  hIdx=history.length-1;
  updateHistoryUI();
}
function scheduleHistory(){
  clearTimeout(histTimer);
  histTimer=setTimeout(pushHistory, 350);
}
function restoreSnapshot(str){
  const d=JSON.parse(str);
  uidN=d.uidN; kv=d.kv;
  state.points=d.points||[]; state.solids=d.solids||[];
  state.segments=d.segments||[]; state.lines=d.lines||[];
  state.planes=d.planes||[]; state.sections=d.sections||[];
  state.build=d.build||null; state.dyn=d.dyn||null;
  state.baseXY=d.baseXY||null;
  state.problemGiven = d.problemGiven ? new Set(d.problemGiven) : null;
  state.selection=[]; state.selObj=null; state.revWizard=null;
  rebuildIndex();
  state.solids.forEach(s=>computeSolidGeometry(s));
  if(state.build){
    const sec=state.sections.find(x=>x.id===state.build.secId);
    const sol=state.solids.find(x=>x.id===state.build.solidId);
    state.build = (sec&&sol) ? computeBuild(sec,sol) : null;
  }
  updateDynUI(); updateStepUI(); updateRevWizardUI();
  renderObjList(); updateSelInfo();
  draw();
}
function undo(){
  clearTimeout(histTimer);
  pushHistory();
  if(hIdx>0){ hIdx--; restoreSnapshot(history[hIdx]); updateHistoryUI(); }
}
function redo(){
  clearTimeout(histTimer);
  if(hIdx<history.length-1){ hIdx++; restoreSnapshot(history[hIdx]); updateHistoryUI(); }
}
document.getElementById('btnUndo').addEventListener('click',()=>{ undo(); });
document.getElementById('btnRedo').addEventListener('click',()=>{ redo(); });


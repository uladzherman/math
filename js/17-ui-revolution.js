'use strict';
/* 17-ui-revolution.js — Тела вращения: построение и пошаговый мастер. */
/* ---------- тела вращения по двум точкам ---------- */
function axisFrame(A,B){
  const w=V.norm(V.sub(B,A));
  const ref=Math.abs(w[2])>0.9?[1,0,0]:[0,0,1];
  const u=V.norm(V.cross(ref,w));
  const v=V.norm(V.cross(w,u));
  return {w,u,v};
}
const revRadial=(u,v,ang)=>V.add(V.mul(u,Math.cos(ang)),V.mul(v,Math.sin(ang)));
function revSphere(A,R){
  const n=36,m=12, verts=[], idx=[];
  verts.push({p:[A[0],A[1],A[2]+R],label:''});
  for(let j=1;j<m;j++){
    const phi=j*Math.PI/m, row=[];
    for(let i=0;i<n;i++){
      const th=i*2*Math.PI/n;
      verts.push({p:[A[0]+R*Math.sin(phi)*Math.cos(th),A[1]+R*Math.sin(phi)*Math.sin(th),A[2]+R*Math.cos(phi)],label:''});
      row.push(verts.length-1);
    }
    idx.push(row);
  }
  verts.push({p:[A[0],A[1],A[2]-R],label:''});
  const bot=verts.length-1, faces=[];
  for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([0,idx[0][j],idx[0][i]]);}
  for(let j=0;j<idx.length-1;j++)for(let i=0;i<n;i++){const k=(i+1)%n; faces.push([idx[j][i],idx[j][k],idx[j+1][k],idx[j+1][i]]);}
  const last=idx[idx.length-1];
  for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([bot,last[i],last[j]]);}
  return {verts,faces,curves:[]};
}
function revCylinder(A,B,r){
  const n=48, {u,v}=axisFrame(A,B), verts=[], bottom=[], top=[];
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(A,V.mul(rad,r)),label:''}); }
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(B,V.mul(rad,r)),label:''}); }
  for(let i=0;i<n;i++){ bottom.push(i); top.push(n+i); }
  const faces=[bottom.slice().reverse(),top];
  for(let i=0;i<n;i++){ const j=(i+1)%n; faces.push([i,j,n+j,n+i]); }
  const rn=i=>revRadial(u,v,i*2*Math.PI/n);
  return {verts,faces,curves:[
    {pts:bottom.map(i=>verts[i].p), nrm:bottom.map(i=>rn(i))},
    {pts:top.map(i=>verts[i].p), nrm:top.map(i=>rn(i))}]};
}
function revCone(A,B,r){
  const n=48, {w,u,v}=axisFrame(A,B), H=V.dist(A,B);
  const verts=[{p:B.slice(),label:'S'}], ring=[];
  for(let i=0;i<n;i++){ const rad=revRadial(u,v,i*2*Math.PI/n); verts.push({p:V.add(A,V.mul(rad,r)),label:''}); ring.push(i+1); }
  const faces=[ring.slice().reverse()];
  for(let i=0;i<n;i++){ const j=(i+1)%n; faces.push([0,ring[i],ring[j]]); }
  const nrm=i=>{ const rad=revRadial(u,v,i*2*Math.PI/n); return V.norm(V.add(V.mul(rad,H),V.mul(w,r))); };
  return {verts,faces,curves:[{pts:ring.map(i=>verts[i].p), nrm:ring.map((_,i)=>nrm(i))}]};
}
function buildRevolution(kind,idA,idB,r){
  const A=P(idA).p, B=P(idB).p, la=liveLabel(idA), lb=liveLabel(idB);
  if(V.dist(A,B)<1e-6){ flash('Точки A и B совпадают — тело не задано'); return null; }
  let shape, name, desc;
  if(kind==='sphere'){
    const R=V.dist(A,B);
    shape=revSphere(A,R);
    name='Сфера ('+la+') через '+lb;
    desc='Сфера: центр '+la+' '+fmtV(A)+', точка '+lb+' на поверхности, r = |'+la+lb+'| = '+round(R,3).toFixed(3);
  }else if(kind==='cylinder'){
    const rr=+r||1;
    shape=revCylinder(A,B,rr);
    name='Цилиндр '+la+lb;
    desc='Цилиндр: '+la+', '+lb+' — центры оснований, ось '+la+lb+', r = '+rr;
  }else{
    const rr=+r||1;
    shape=revCone(A,B,rr);
    name='Конус вершина '+lb+' ('+la+')';
    desc='Конус: '+la+' — центр основания, '+lb+' — вершина, r = '+rr;
  }
  const solid=createSolid(name,shape,solidColorNext(),{smooth:true,kind});
  solid.anchor=[idA,idB];
  resize(); adjustScale();
  return {solid,desc};
}
const revNeedEl=()=>document.getElementById('revNeed');
const revInfoEl=()=>document.getElementById('revInfo');
const revPromptEl=()=>document.getElementById('revPrompt');
const revRoleText={
  sphere:{A:'центр сферы', B:'точка на поверхности'},
  cylinder:{A:'центр нижнего основания', B:'центр верхнего основания'},
  cone:{A:'центр основания', B:'вершина конуса'}
};
function revIsPointsMode(){ return document.getElementById('revMode').value==='points'; }
function revNeedsRadius(kind){ return kind==='cylinder'||kind==='cone'; }
function updateRevNeed(){
  const el=revNeedEl(); if(!el) return;
  const kind=shapeSel.value;
  const role=revRoleText[kind];
  if(!role){ el.innerHTML=''; return; }
  let s;
  if(kind==='sphere') s='Сфера задаётся центром и точкой: <span class="m">A</span> — '+role.A+', <span class="m">B</span> — '+role.B+'; радиус r = |AB|.';
  else s=(SHAPES[kind].label)+' задаётся осью и радиусом: <span class="m">A</span> — '+role.A+', <span class="m">B</span> — '+role.B+'; радиус введите ниже.';
  el.innerHTML=s;
}
function updateRevWizardUI(){
  const info=revInfoEl(), prompt=revPromptEl();
  const w=state.revWizard;
  if(!info) return;
  if(!w){
    if(info) info.innerHTML='Нажмите «Загрузить фигуру», чтобы на сцене указать точки A и B. Можно кликать по вершинам уже загруженной фигуры.';
    if(prompt){ prompt.style.display='none'; prompt.innerHTML=''; }
    return;
  }
  const kind=w.kind, role=revRoleText[kind], need=2, got=w.ids.length;
  const names=w.ids.map(id=>liveLabel(id));
  let s='<div class="step">Шаг '+(got+1)+' из '+need+'</div>';
  s+='Кликните точку <b>'+(got===0?'A':'B')+'</b> — '+role[got===0?'A':'B']+'.';
  if(got===1) s+='<br>Точка A: <b>'+names[0]+'</b>.';
  if(info) info.innerHTML=s;
  if(prompt){
    prompt.style.display='block';
    prompt.innerHTML='<div class="step">Тело вращения · шаг '+(got+1)+' из '+need+'</div>'
      +'Укажите точку <b>'+(got===0?'A':'B')+'</b> — '+role[got===0?'A':'B']
      +(got===1?('<br>Точка A: <b>'+names[0]+'</b>'):'')
      +'<br><span class="step">клик по вершине фигуры или по пустому месту (тогда точка ставится на плоскости z = '+round(state.pointZ,2)+')</span>';
  }
}
function startRevWizard(kind){
  if(!revRoleText[kind]){ loadShape(kind); draw(); return; }
  state.revWizard={kind, ids:[]};
  setTool('point');
  updateRevWizardUI();
  flash('Укажите точки A и B для тела вращения');
  draw();
}
function revWizardUsePoint(id){
  const w=state.revWizard; if(!w) return;
  if(w.ids.includes(id)) return;
  w.ids.push(id);
  if(w.ids.length>=2) finishRevWizard();
  else { updateRevWizardUI(); draw(); }
}
function finishRevWizard(){
  const w=state.revWizard; if(!w) return;
  const r=parseFloat(document.getElementById('revRadius').value);
  const res=buildRevolution(w.kind, w.ids[0], w.ids[1], r);
  state.revWizard=null;
  if(res){ state.selection=[]; state.selObj={kind:'solid',id:res.solid.id}; flash(res.desc); }
  setTool('select');
  updateRevWizardUI();
  renderObjList(); updateSelInfo(); draw();
}
function cancelRevWizard(){
  if(!state.revWizard) return;
  state.revWizard=null; updateRevWizardUI(); draw();
}

let kv=1;
function solidColorNext(){ return solidColor(kv++); }


'use strict';
/* 23-parser-apply.js — Построение по разобранной задаче и отчёт. */
function buildFlatFigures(figs){
  const L=2, H=1.75, DX=0.7;
  const coords=new Map();
  let s0=figs[0].labels[0], s1=figs[0].labels[1];
  if(figs.length>1){
    const common=figs[0].labels.filter(x=>figs[1].labels.includes(x));
    if(common.length>=2){ s0=common[0]; s1=common[1]; }
  }
  figs.forEach((fig,fi)=>{
    const labs=fig.labels;
    const i0=labs.indexOf(s0), i1=labs.indexOf(s1);
    const shared=(i0>=0&&i1>=0);
    const a=shared?s0:labs[0], b=shared?s1:labs[1];
    const local=new Map();
    local.set(a,[0,0,0]); local.set(b,[L,0,0]);
    const rest=labs.filter(x=>x!==a&&x!==b);
    const m=rest.length;
    if(m===1) local.set(rest[0],[L/2,0,H]);
    else if(m===2){ local.set(rest[0],[L+DX,0,H*0.95]); local.set(rest[1],[DX,0,H*0.95]); }
    else rest.forEach((lb,k)=>{
      const ang=Math.PI-(k+1)*Math.PI/(m+1);
      local.set(lb,[L/2+(L/2)*Math.cos(ang), 0, (L/2)*Math.sin(ang)*1.6]);
    });
    const th=(fi===0)?0:((68+(fi-1)*24)*Math.PI/180);
    const ct=Math.cos(th), st=Math.sin(th);
    for(const lb of labs){
      const q=local.get(lb)||[0,0,0];
      coords.set(lb,[q[0], q[1]*ct-q[2]*st, q[1]*st+q[2]*ct]);
    }
  });
  return coords;
}
function applyProblem(p){
  if(!p.shapeKind) return;
  if(p.shapeKind==='flat'){
    state.solids=[]; state.points=[]; state.segments=[]; state.lines=[];
    state.planes=[]; state.sections=[]; state.selection=[]; state.selObj=null;
    state.dyn=null; state.build=null; state.baseXY=null;
    rebuildIndex();
    const coords=buildFlatFigures(p.figs);
    for(const ent of coords) addPoint(ent[1], ent[0], {color:'#5aa9ff'});
    rebuildIndex();
    const pal=['#5aa9ff','#7ee787','#ffb86b','#c792ea'];
    p.figs.forEach((fig,fi)=>{
      const ids=fig.labels.map(lb=>{ const q=findPtByLabel(lb); return q?q.id:null; }).filter(Boolean);
      const verts=fig.labels.map(lb=>({p:coords.get(lb).slice()}));
      const faces=[fig.labels.map((_,i)=>i)];
      const nm=fig.name.charAt(0).toUpperCase()+fig.name.slice(1);
      createSolid(nm+' '+fig.labels.join(''), {verts,faces}, pal[fi%pal.length], {pointIds:ids});
    });
  }else{
    if(p.sides){
      const el=document.getElementById('pSides');
      if(el){ el.value=String(p.sides); const v=document.getElementById('pSidesVal'); if(v) v.textContent=String(p.sides); }
    }
    loadShape(p.shapeKind);
    if(!state.solids.length) return;
    remapLabels(p.pairs);
  }
  const placed={};
  for(const pt of p.points){
    const A=findPtByLabel(pt.on.a), B=findPtByLabel(pt.on.b);
    if(!A||!B){ p.warnings.push('Точка '+pt.name+': не найдены '+pt.on.a+' и '+pt.on.b+'.'); continue; }
    let pos;
    if(pt.on.type==='ext') pos=V.add(B.p, V.mul(V.sub(B.p,A.p), 0.6));
    else pos=V.lerp(A.p, B.p, pt.on.mid?0.5:0.45);
    const np=addPoint(pos, pt.name, {color:'#ffd166'});
    placed[pt.name]=np.id;
  }
  rebuildIndex();
  const idOf=l=>{ const q=findPtByLabel(l); return q?q.id:null; };
  let nL=0,nP=0,nS=0;
  for(const [a,b] of p.lines){
    const A=idOf(a), B=idOf(b);
    if(A&&B){ state.lines.push({id:uid(),a:A,b:B,color:'#f59e0b',show:true}); nL++; }
    else p.warnings.push('Прямая '+a+b+': точки не найдены.');
  }
  for(const ls of p.planes){
    const secKey=p.sections.map(s=>s.join('|'));
    if(secKey.includes(ls.join('|'))) continue;
    const ids=ls.map(idOf);
    if(ids.every(Boolean) && planeFrom3(...ids.map(i=>P(i).p))){
      state.planes.push({id:uid(),a:ids[0],b:ids[1],c:ids[2],show:true}); nP++;
    }else p.warnings.push('Плоскость '+ls.join('')+': не удалось построить.');
  }
  const solid=state.solids[0];
  for(const ls of p.sections){
    const ids=ls.map(idOf);
    if(ids.every(Boolean) && addSection(solid.id, ids)) nS++;
  }
  p.notes.push('Создано: точек '+Object.keys(placed).length+', прямых '+nL+', плоскостей '+nP+(nS?(', сечений '+nS):'')+'.');
  state.problemGiven=new Set(Object.values(placed));
  adjustScale();
  renderObjList(); updateSelInfo(); draw();
}
function problemReport(){
  const it=state.intersect||{lf:[],lp:[],pp:[]};
  const given=state.problemGiven||new Set();
  const out=[], seen=new Set();
  const key=p=>p.map(x=>Math.round(x*1e3)).join(',');
  const isGiven=q=>{ const p=state.points.find(x=>V.dist(x.p,q)<1e-3); return !!p && given.has(p.id); };
  const lineEndsOf=r=>{
    const o=(r.src.l.t==='line') ? state.lines.find(x=>x.id===r.src.l.id)
                                 : state.segments.find(x=>x.id===r.src.l.id);
    return o ? [P(o.a),P(o.b)].filter(Boolean) : [];
  };
  const isEnd=(r,q)=>lineEndsOf(r).some(e=>V.dist(e.p,q)<1e-3);
  /* сначала пересечения с построенными плоскостями — это и есть ответ задачи */
  for(const r of it.lp||[]){
    if(!r.p) continue;
    const k=key(r.p); if(seen.has(k)) continue; seen.add(k);
    out.push('точка пересечения прямой и плоскости: '+objNameById(r.src.l.t,r.src.l.id)+' ∩ '+planeNameById(r.src.plane)+' = '+pointLabelAt(r.p)+' '+fmtV(r.p));
  }
  for(const r of it.lf||[]){
    if(!r.inside || isGiven(r.p) || isEnd(r,r.p)) continue;
    const k=key(r.p); if(seen.has(k)) continue; seen.add(k);
    const s=state.solids.find(x=>x.id===r.src.solidId);
    const names=r.fis.map(fi=>s?faceLabelOf(s,fi):'').join(', ');
    out.push('точка пересечения прямой с гранью: '+objNameById(r.src.l.t,r.src.l.id)+' ∩ ('+names+') = '+pointLabelAt(r.p)+' '+fmtV(r.p));
  }
  for(const r of it.pp||[]){
    if(r.kind!=='line'||!r.L) continue;
    out.push('прямая пересечения плоскостей: '+planeNameById(r.ids[0])+' ∩ '+planeNameById(r.ids[1])+' = m, через точку '+fmtV(r.L.a)+', направление '+fmtV(r.L.d));
  }
  for(const s of state.sections){
    out.push('сечение: '+polyName(s.pts.length)+', сторон '+s.pts.length+
      ', периметр '+round(polyPerim(s.pts),3).toFixed(3)+', площадь '+round(polyArea(s.pts),3).toFixed(3));
  }
  return out;
}
function runProblem(){
  const txt=document.getElementById('taskText').value;
  const rep=document.getElementById('parseReport');
  const p=parseProblem(txt);
  if(p.warnings.length && !p.shapeKind){
    rep.innerHTML='<b style="color:#f87171">Не разобрано.</b><br>'+p.warnings.join('<br>');
    return;
  }
  applyProblem(p);
  const lines=[].concat(p.notes||[]).concat(problemReport());
  let h='<b style="color:#4ade80">Готово.</b><br>'+lines.join('<br>');
  if(p.warnings.length) h+='<div style="color:#fbbf24;margin-top:5px">'+p.warnings.join('<br>')+'</div>';
  rep.innerHTML=h;
}



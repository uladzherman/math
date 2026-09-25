'use strict';
/* 07-explain.js — Аксиомы и текстовое обоснование построения. */
/* ---------- математическое обоснование построения ---------- */
const AXIOMS_HTML='<h4>Аксиомы и следствия</h4><div class="axs">'+
  '<b>A1.</b> Через любые три точки, не лежащие на одной прямой, проходит плоскость, и притом только одна.<br>'+
  '<b>A2.</b> Если две точки прямой лежат в плоскости, то и вся прямая лежит в этой плоскости.<br>'+
  '<b>A3.</b> Если две плоскости имеют общую точку, то они пересекаются по прямой, проходящей через эту точку.<br>'+
  '<b>Следствие 1.</b> Через прямую и не лежащую на ней точку проходит единственная плоскость.<br>'+
  '<b>Следствие 2.</b> Через две пересекающиеся прямые проходит единственная плоскость.</div>';
function faceLabelOf(solid, fi){
  const f=solid.faces[fi];
  if(!f) return 'γ';
  const labs=f.map(i=>liveLabel(solid.pointIds[i]));
  if(labs.length<=6 && labs.every(l=>l&&l!=='?')) return labs.join('');
  return 'γ'+(fi+1);
}
function pointOnEdge(solid, p){
  if(solid.smooth) return null;
  const pts=coordsOf(solid);
  for(let i=0;i<pts.length;i++){
    if(V.dist(pts[i],p)<1e-3) return {vertex:liveLabel(solid.pointIds[i]), edge:null, mid:false};
  }
  for(const e of solid.edges){
    const a=pts[e.a], b=pts[e.b];
    const AB=V.sub(b,a), L2=V.dot(AB,AB);
    if(L2<1e-12) continue;
    const t=V.dot(V.sub(p,a),AB)/L2;
    if(t<-1e-4||t>1+1e-4) continue;
    const q=V.lerp(a,b,Math.max(0,Math.min(1,t)));
    if(V.dist(q,p)<2e-3){
      return {edge:liveLabel(solid.pointIds[e.a])+liveLabel(solid.pointIds[e.b]), mid:Math.abs(t-0.5)<4e-3};
    }
  }
  return null;
}
function pointDesc(idx, info){
  if(!info) return null;
  if(info.vertex) return '<span class="m">'+idx+'</span> = вершина <span class="m">'+info.vertex+'</span>';
  return '<span class="m">'+idx+'</span> ∈ ребру <span class="m">'+info.edge+'</span>'+(info.mid?' (середина)':'');
}
function polyName(n){
  return n===3?'треугольник':n===4?'четырёхугольник':n===5?'пятиугольник':
         n===6?'шестиугольник':n===7?'семиугольник':n===8?'восьмиугольник':(n+'-угольник');
}
function renderExplain(){
  const body=document.getElementById('explBody');
  if(!body) return;
  const b=state.build;
  if(!b){
    body.innerHTML='<div style="color:#8ea0b8">Постройте сечение (инструмент <span class="m">Сечение</span>, выберите 3 точки) — здесь появится вывод построения с обоснованием по аксиомам. Отдельные точки можно ставить на рёбрах, гранях и в пространстве; <span class="m">X₁, X₂…</span> — пересечения прямых, <span class="m">Y₁, Y₂…</span> — пересечения прямой с плоскостью.</div>'
      + intersectHTML() + AXIOMS_HTML;
    return;
  }
  const solid=state.solids.find(s=>s.id===b.solidId);
  const sec=state.sections.find(s=>s.id===b.secId);
  if(!solid||!sec){ body.innerHTML=''; return; }
  const poly=b.poly, n=poly.length, k=b.k;
  const src=(sec.srcIds||[]).map(id=>liveLabel(id)).filter(Boolean);
  let h='';
  h+='<h4>Дано</h4><div>Фигура <span class="m">Φ</span>: '+solid.name+'.<br>';
  if(src.length>=3) h+='Точки <span class="m">'+src.join(', ')+'</span> не лежат на одной прямой, поэтому через них проходит единственная плоскость (A1): <span class="m">α = ('+src.join('')+')</span>.';
  else h+='Секущая плоскость <span class="m">α</span>.';
  h+='</div>';
  h+='<h4>Определение</h4><div>Сечение — общие точки фигуры и плоскости: <span class="m">S = Φ ∩ α</span>.</div>';
  h+='<h4>Шаги построения (по граням)</h4>';
  for(let i=0;i<n;i++){
    const A=poly[i], B=poly[(i+1)%n];
    const a1=i+1, a2=(i+2>n?1:i+2);
    const fi=b.steps[i]?b.steps[i].fi:-1;
    const fn=fi>=0?faceLabelOf(solid,fi):'γ';
    const eA=pointOnEdge(solid,A), eB=pointOnEdge(solid,B);
    const cls=(i<k-1)?'done':(i===k-1?'cur':'todo');
    let t='<div class="st '+cls+'"><b>Шаг '+(i+1)+'.</b> Точки <span class="m">'+a1+', '+a2+'</span> принадлежат и плоскости <span class="m">α</span>, и плоскости грани <span class="m">'+fn+'</span>. Значит, <span class="m">('+a1+a2+') = α ∩ ('+fn+')</span> — след <span class="m">α</span> на этой грани (A3), а отрезок <span class="m">'+a1+a2+'</span> — сторона сечения (A2).';
    const parts=[];
    const dA=pointDesc(a1,eA), dB=pointDesc(a2,eB);
    if(dA) parts.push(dA);
    if(dB) parts.push(dB);
    if(parts.length) t+='<br>'+parts.join(', ')+'.';
    t+='</div>';
    h+=t;
  }
  h+='<h4>Результат</h4><div class="res">Сечение — <b>'+polyName(n)+'</b>: вершины <span class="m">1…'+n+'</span>, сторон <span class="m">'+n+'</span>.<br>Периметр <span class="m">'+round(polyPerim(poly),3).toFixed(3)+'</span>, площадь <span class="m">'+round(polyArea(poly),3).toFixed(3)+'</span>.</div>';
  h+='<div class="axs" style="margin-top:8px">Голубые линии — продолжения рёбер до следа, зелёные — продолжения сторон: они дают вспомогательные точки для следующих вершин (все построения идут в плоскостях граней, A2).</div>';
  h+=intersectHTML();
  h+=AXIOMS_HTML;
  body.innerHTML=h;
}
const fmtV=p=>'('+round(p[0],2)+'; '+round(p[1],2)+'; '+round(p[2],2)+')';
function intersectHTML(){
  const it=state.intersect||{ll:[],lp:[],lf:[],pp:[]};
  let h='';
  h+='<h4>Пересечение прямой с гранями фигуры</h4>';
  if(!(it.lf||[]).length){
    h+='<div class="axs">Постройте прямую или отрезок, пересекающий грань фигуры, — здесь появится точка пересечения с обоснованием.</div>';
  }else{
    const shown=(it.lf||[]).slice(0,10);
    for(const r of shown){
      const on=objNameById(r.src.l.t, r.src.l.id);
      const s=state.solids.find(x=>x.id===r.src.solidId);
      const names=r.fis.map(fi=>(s?faceLabelOf(s,fi):'грань')).join(', ');
      const where = r.vert ? ('совпадает с вершиной <span class="m">'+r.vert+'</span>')
                  : r.edge ? ('лежит на ребре <span class="m">'+r.edge+'</span>'+(r.mid?' (середина)':''))
                  : 'лежит внутри грани';
      if(r.inside){
        const nm=pointLabelAt(r.p);
        const tail = r.vert ? 'Точка общая для прямой и всех этих граней (A2).'
                   : r.edge ? 'Точка общая для прямой и обеих граней (A2).'
                   : 'Прямая протыкает грань: точка общая для прямой и плоскости грани (A2).';
        h+='<div class="st done"><span class="m">'+on+' ∩ ('+names+') = '+nm+'</span>, '+nm+' '+fmtV(r.p)+' — '+where+'. '+tail+'</div>';
      }else{
        h+='<div class="st">'+on+' пересекает плоскость грани <span class="m">('+names+')</span> вне самой грани — в точке '+fmtV(r.p)+'. Вспомогательная точка для построений (продолжение прямой за гранью).</div>';
      }
    }
    if((it.lf||[]).length>shown.length) h+='<div class="axs">…и ещё '+(it.lf.length-shown.length)+'.</div>';
  }
  h+='<h4>Пересечение прямой и плоскости</h4>';
  if(!it.lp.length){
    h+='<div class="axs">Постройте прямую (или отрезок) и плоскость <span class="m">α</span> — здесь появятся их пересечения.</div>';
  }else{
    for(const r of it.lp){
      const on=objNameById(r.src.l.t, r.src.l.id), pn=planeNameById(r.src.plane);
      if(r.p){
        const nm=pointLabelAt(r.p);
        h+='<div class="st done"><span class="m">'+on+' ∩ '+pn+' = '+nm+'</span>, '+nm+' '+fmtV(r.p)+'. Прямая не параллельна плоскости и не лежит в ней ⇒ у них ровно одна общая точка (A2).</div>';
      }else if(r.status==='par'){
        h+='<div class="st todo">'+on+' ∥ '+pn+' — направление прямой перпендикулярно нормали плоскости, общих точек нет.</div>';
      }else if(r.status==='in'){
        h+='<div class="st">'+on+' ⊂ '+pn+' — две точки прямой лежат в плоскости, значит вся прямая лежит в ней (A2); пересечение — сама прямая.</div>';
      }
    }
  }
  h+='<h4>Пересечение плоскостей</h4>';
  if(!it.pp.length){
    h+='<div class="axs">Постройте две плоскости — здесь появится их линия пересечения.</div>';
  }else{
    for(const r of it.pp){
      const n1=planeNameById(r.ids[0]), n2=planeNameById(r.ids[1]);
      if(r.kind==='line'&&r.L){
        h+='<div class="st done"><span class="m">'+n1+' ∩ '+n2+' = m</span> — прямая. По A3 плоскости имеют общую точку, значит пересекаются по прямой; она задаётся точкой '+fmtV(r.L.a)+' и направлением '+fmtV(r.L.d)+' (прямая определяется двумя точками, A2).</div>';
      }else if(r.kind==='par'){
        h+='<div class="st todo">'+n1+' ∥ '+n2+' — общих точек нет.</div>';
      }else{
        h+='<div class="st">'+n1+' = '+n2+' — плоскости совпадают.</div>';
      }
    }
  }
  return h;
}

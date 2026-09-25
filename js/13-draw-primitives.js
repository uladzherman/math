'use strict';
/* 13-draw-primitives.js — Отрисовка сетки, осей, граней и рёбер тел. */
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


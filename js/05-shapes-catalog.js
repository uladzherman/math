'use strict';
/* 05-shapes-catalog.js — Каталог фигур SHAPES (куб, призмы, пирамиды, тела вращения, свои). */
const SHAPES = {
  cube:{
    label:'Куб ABCDA₁B₁C₁D₁', off:true, baseCount:4,
    build:(a,h,prm)=>({verts:boxVertsFromBase(
      (prm&&prm.base&&prm.base.length===4)?prm.base:quadBase(a), a,
      offXY(prm,'bOffX','bOffY'), offXY(prm,'offX','offY')), faces:BOX_FACES})
  },
  box:{
    label:'Параллелепипед', off:true, baseCount:4,
    build:(a,h,prm)=>{
      const s=a/2;
      const def=[[-s,-s*1.6],[s,-s*1.6],[s,s*1.6],[-s,s*1.6]];
      return {verts:boxVertsFromBase(
        (prm&&prm.base&&prm.base.length===4)?prm.base:def, h,
        offXY(prm,'bOffX','bOffY'), offXY(prm,'offX','offY')), faces:BOX_FACES};
    }
  },
  tetra:{
    label:'Тетраэдр DABC', off:true, baseCount:3,
    build:(a,h,prm)=>{const R=a/Math.sqrt(3), hh=a*Math.sqrt(2/3);
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(3,a,prm);
      const vs=[{p:[b[0][0]+bo[0],b[0][1]+bo[1],-hh/3],label:'A'},
        {p:[b[1][0]+bo[0],b[1][1]+bo[1],-hh/3],label:'B'},
        {p:[b[2][0]+bo[0],b[2][1]+bo[1],-hh/3],label:'C'},
        {p:[to[0],to[1],2*hh/3],label:'D'}];
      return {verts:vs,faces:[[0,1,2],[0,1,3],[1,2,3],[2,0,3]]};
    }
  },
  prism3:{
    label:'Правильная призма ABCA₁B₁C₁', off:true, baseCount:3,
    build:(a,h,prm)=>{
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(3,a,prm);
      const verts=[
        {p:[b[0][0]+bo[0],b[0][1]+bo[1],-h/2],label:'A'},
        {p:[b[1][0]+bo[0],b[1][1]+bo[1],-h/2],label:'B'},
        {p:[b[2][0]+bo[0],b[2][1]+bo[1],-h/2],label:'C'},
        {p:[b[0][0]+to[0],b[0][1]+to[1],h/2],label:'A₁'},
        {p:[b[1][0]+to[0],b[1][1]+to[1],h/2],label:'B₁'},
        {p:[b[2][0]+to[0],b[2][1]+to[1],h/2],label:'C₁'}];
      return {verts,faces:[[0,1,2],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]};
    }
  },
  pyramid4:{
    label:'Пирамида SABCD', off:true, baseCount:4,
    build:(a,h,prm)=>{
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(4,a,prm);
      return {verts:[
        {p:[b[0][0]+bo[0],b[0][1]+bo[1],-h/2],label:'A'},
        {p:[b[1][0]+bo[0],b[1][1]+bo[1],-h/2],label:'B'},
        {p:[b[2][0]+bo[0],b[2][1]+bo[1],-h/2],label:'C'},
        {p:[b[3][0]+bo[0],b[3][1]+bo[1],-h/2],label:'D'},
        {p:[to[0],to[1],h/2],label:'S'}],
        faces:[[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]]};
    }
  },
  pyramid3:{
    label:'Пирамида SABC', off:true, baseCount:3,
    build:(a,h,prm)=>{
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(3,a,prm);
      return {verts:[
        {p:[b[0][0]+bo[0],b[0][1]+bo[1],-h/2],label:'A'},
        {p:[b[1][0]+bo[0],b[1][1]+bo[1],-h/2],label:'B'},
        {p:[b[2][0]+bo[0],b[2][1]+bo[1],-h/2],label:'C'},
        {p:[to[0],to[1],h/2],label:'S'}],
        faces:[[0,1,2],[0,1,3],[1,2,3],[2,0,3]]};
    }
  },
  octa:{
    label:'Октаэдр',
    build:(a)=>{const r=a/1.4;
      return {verts:[
        {p:[r,0,0],label:'A'},{p:[0,r,0],label:'B'},{p:[-r,0,0],label:'C'},
        {p:[0,-r,0],label:'D'},{p:[0,0,r],label:'S'},{p:[0,0,-r],label:'S₁'}],
        faces:[[0,1,4],[1,2,4],[2,3,4],[3,0,4],[0,1,5],[1,2,5],[2,3,5],[3,0,5]]};
    }
  },
  cylinder:{
    label:'Цилиндр', revolution:true,
    build:(a,h)=>{const n=48,r=a/2;
      const verts=[]; const bottom=[],top=[];
      for(let i=0;i<n;i++){const ang=i*2*Math.PI/n;
        verts.push({p:[r*Math.cos(ang),r*Math.sin(ang),-h/2],label:''});}
      for(let i=0;i<n;i++){const ang=i*2*Math.PI/n;
        verts.push({p:[r*Math.cos(ang),r*Math.sin(ang),h/2],label:''});}
      for(let i=0;i<n;i++){bottom.push(i);top.push(n+i);}
      const faces=[bottom.slice().reverse(),top];
      for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([i,j,n+j,n+i]);}
      const curves=[];
      curves.push({pts:bottom.map(i=>verts[i].p), nrm:bottom.map(i=>V.norm([verts[i].p[0],verts[i].p[1],0]))});
      curves.push({pts:top.map(i=>verts[i].p), nrm:top.map(i=>V.norm([verts[i].p[0],verts[i].p[1],0]))});
      return {verts,faces,curves};
    }
  },
  cone:{
    label:'Конус', revolution:true,
    build:(a,h)=>{const n=48,r=a/2;
      const verts=[{p:[0,0,h/2],label:'S'}];
      const ring=[];
      for(let i=0;i<n;i++){const ang=i*2*Math.PI/n;
        verts.push({p:[r*Math.cos(ang),r*Math.sin(ang),-h/2],label:''});}
      for(let i=0;i<n;i++) ring.push(i+1);
      const faces=[ring.slice().reverse()];
      for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([0,ring[i],ring[j]]);}
      const curves=[{pts:ring.map(i=>verts[i].p),
        nrm:ring.map(i=>{
          const ang=Math.atan2(verts[i].p[1],verts[i].p[0]);
          const radial=[Math.cos(ang),Math.sin(ang),0];
          return V.norm(V.add(V.mul(radial,r),V.mul([0,0,1],h/Math.max(1e-6,h))));
        })}];
      return {verts,faces,curves};
    }
  },
  sphere:{
    label:'Сфера', revolution:true,
    build:(a)=>{const n=36,m=12,r=a/2;
      const verts=[]; const rings=[];
      const top=0;
      verts.push({p:[0,0,r],label:''});
      const idx=[];
      for(let j=1;j<m;j++){
        const phi=j*Math.PI/m; const row=[];
        for(let i=0;i<n;i++){
          const th=i*2*Math.PI/n;
          verts.push({p:[r*Math.sin(phi)*Math.cos(th),r*Math.sin(phi)*Math.sin(th),r*Math.cos(phi)],label:''});
          row.push(verts.length-1);
        }
        idx.push(row);
      }
      verts.push({p:[0,0,-r],label:''});
      const bot=verts.length-1;
      const faces=[];
      for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([top,idx[0][j],idx[0][i]]);}
      for(let j=0;j<idx.length-1;j++){
        for(let i=0;i<n;i++){const k=(i+1)%n;
          faces.push([idx[j][i],idx[j][k],idx[j+1][k],idx[j+1][i]]);}
      }
      const last=idx[idx.length-1];
      for(let i=0;i<n;i++){const j=(i+1)%n; faces.push([bot,last[i],last[j]]);}
      return {verts,faces,curves:[]};
    }
  },
  myPyramid:{
    label:'Своя пирамида (n-угольная)', off:true, sides:true,
    build:(a,h,prm)=>{
      const n=Math.max(3,Math.min(16,Math.round((prm&&prm.sides)||5)));
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(n,a,prm);
      const verts=[];
      for(let i=0;i<n;i++) verts.push({p:[b[i][0]+bo[0],b[i][1]+bo[1],-h/2], label:baseLab(i)});
      verts.push({p:[to[0],to[1],h/2], label:'S'});
      const faces=[[]];
      for(let i=0;i<n;i++) faces[0].push(i);
      for(let i=0;i<n;i++) faces.push([i,(i+1)%n,n]);
      return {verts,faces};
    }
  },
  myPrism:{
    label:'Своя призма (n-угольная)', off:true, sides:true,
    build:(a,h,prm)=>{
      const n=Math.max(3,Math.min(16,Math.round((prm&&prm.sides)||5)));
      const bo=offXY(prm,'bOffX','bOffY'), to=offXY(prm,'offX','offY');
      const b=basePts(n,a,prm);
      const verts=[];
      for(let i=0;i<n;i++) verts.push({p:[b[i][0]+bo[0],b[i][1]+bo[1],-h/2], label:baseLab(i)});
      for(let i=0;i<n;i++) verts.push({p:[b[i][0]+to[0],b[i][1]+to[1],h/2], label:baseLab(i)+'₁'});
      const faces=[[]];
      for(let i=0;i<n;i++) faces[0].push(i);
      const top=[];
      for(let i=0;i<n;i++) top.push(n+i);
      faces.push(top);
      for(let i=0;i<n;i++){ const j=(i+1)%n; faces.push([i,j,n+j,n+i]); }
      return {verts,faces};
    }
  }
};



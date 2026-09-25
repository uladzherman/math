'use strict';
/* 22-parser-parse.js — Разбор текстовых условий задач. */
/* ============================ РАЗБОР ТЕКСТА ЗАДАЧИ ============================ */
const SUB2DIG={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
const DIG2SUB='₀₁₂₃₄₅₆₇₈₉';
const toDigits = s => s.replace(/[₀-₉]/g, c=>SUB2DIG[c]||c);
const toSubLabel = s => s.replace(/([A-Za-z])(\d+)/g,(m,a,d)=>a+d.split('').map(x=>DIG2SUB[+x]||x).join(''));
function splitLabels(tok){
  const out=[]; let cur=null;
  for(const ch of tok){
    if(/[A-Za-z]/.test(ch)){ if(cur) out.push(cur); cur=ch.toUpperCase(); }
    else if(/[0-9]/.test(ch)&&cur) cur+=ch;
    else if(cur){ out.push(cur); cur=null; }
  }
  if(cur) out.push(cur);
  return out.map(toSubLabel);
}
/* кириллические буквы, похожие на латинские: Т, К, АВ, СD … */
const CYR2LAT={'А':'A','В':'B','С':'C','Е':'E','Н':'H','К':'K','М':'M','О':'O','Р':'P','Т':'T','Х':'X','У':'Y','І':'I','Ѕ':'S',
  'а':'a','в':'b','с':'c','е':'e','н':'h','к':'k','м':'m','о':'o','р':'p','т':'t','х':'x','у':'y','і':'i','ѕ':'s'};
const LOOKCH='АВСЕНКМОРТХУІЅавсенкмортхуіѕABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function normalizeLabels(text){
  const isLook=c=>LOOKCH.indexOf(c)>=0;
  const isLetter=c=>/[A-Za-zА-Яа-яЁё]/.test(c);
  let out='', i=0;
  while(i<text.length){
    if(isLook(text[i]) && !(i>0 && isLetter(text[i-1]))){
      let j=i;
      while(j<text.length && (isLook(text[j])||/[0-9]/.test(text[j]))) j++;
      const endLetter = (j<text.length && isLetter(text[j]));
      const tok=text.slice(i,j);
      out += endLetter ? tok : tok.split('').map(c=>CYR2LAT[c]||c).join('');
      i=j;
    }else{ out+=text[i]; i++; }
  }
  return out;
}
const findPtByLabel = l => state.points.find(p=>p.label===l);
/* группы меток в тексте: «ABC» -> [A,B,C]; «A, C и B₁» -> [A,C,B₁] */
function labelGroups(tail){
  const toks=[]; let m;
  const re=/[A-Za-z][A-Za-z0-9]*/g;
  while((m=re.exec(tail))) toks.push(m[0]);
  const groups=[];
  for(const t of toks){
    const ls=splitLabels(t);
    if(ls.length>=3&&ls.length<=4) groups.push(ls);
  }
  if(groups.length) return groups;
  const singles=[];
  for(const t of toks){
    const ls=splitLabels(t);
    if(ls.length===1) singles.push(ls[0]);
  }
  if(singles.length>=3) groups.push(singles.slice(0,3));
  return groups;
}
function remapLabels(pairs){
  const list=[];
  for(const pr of pairs){
    if(!pr[1]) continue;
    const p=findPtByLabel(pr[0]);
    if(p) list.push([p,pr[1]]);
  }
  list.forEach((x,i)=>{ x[0].label='\u0000t'+i; });
  list.forEach(x=>{ x[0].label=x[1]; });
}
function parseProblem(text){
  const res={shapeKind:null,sides:0,pairs:[],points:[],lines:[],planes:[],sections:[],warnings:[],notes:[]};
  const raw=normalizeLabels(toDigits(text||''));
  let kind=null, tok=null, m;
  if((m=/(пирамид[а-яё]*)\s+([A-Za-z][A-Za-z0-9]*)/i.exec(raw))){ kind='pyramid'; tok=m[2]; }
  else if((m=/(тетраэдр[а-яё]*)\s+([A-Za-z][A-Za-z0-9]*)/i.exec(raw))){ kind='tetra'; tok=m[2]; }
  else if((m=/(куб[а-яё]*)\s*([A-Za-z][A-Za-z0-9]*)/i.exec(raw))){ kind='cube'; tok=m[2]; }
  else if((m=/(параллелепипед[а-яё]*)\s+([A-Za-z][A-Za-z0-9]*)/i.exec(raw))){ kind='box'; tok=m[2]; }
  else if((m=/(призм[а-яё]*)\s+([A-Za-z][A-Za-z0-9]*)/i.exec(raw))){ kind='prism'; tok=m[2]; }
  else if(/цилиндр/i.test(raw)) kind='cylinder';
  else if(/конус/i.test(raw)) kind='cone';
  else if(/сфер|шар/i.test(raw)) kind='sphere';
  if(!kind){
    /* плоские фигуры: треугольник ABC и параллелограмм ABED */
    const FIGN={'треугольник':3,'параллелограмм':4,'ромб':4,'квадрат':4,'прямоугольник':4,
                'четырёхугольник':4,'трапеция':4,'пятиугольник':5,'шестиугольник':6};
    const figs=[];
    const fre=/(треугольник|параллелограмм|ромб|квадрат|прямоугольник|четырёхугольник|трапеция|пятиугольник|шестиугольник)[а-яё]*\s+([A-Za-z][A-Za-z0-9]*)/gi;
    let fm;
    while((fm=fre.exec(raw))){
      const name=fm[1].toLowerCase(), labs=splitLabels(fm[2]), want=FIGN[name];
      if(labs.length!==want){ res.warnings.push('«'+fm[1]+' '+fm[2]+'»: ожидалось '+want+' вершин.'); continue; }
      figs.push({name, labels:labs});
    }
    if(figs.length){
      res.shapeKind='flat';
      res.figs=figs;
      res.notes.push('Плоские фигуры: '+figs.map(f=>f.name+' '+f.labels.join('')).join(', ')+' — размещены в разных плоскостях.');
    }
  }
  if(!kind && !res.shapeKind){
    res.warnings.push('Фигура не распознана. Напишите, например: «дана треугольная пирамида DABC», «куб ABCDA1B1C1D1» или «треугольник ABC и параллелограмм ABED».');
    return res;
  }
  if(res.shapeKind==='flat'){
    /* дальше — только точки и построения */
  }
  const labs=tok?splitLabels(tok):[];
  const LETTERS='ABCDEFGH';
  if(kind==='pyramid'){
    if(labs.length<4){ res.warnings.push('В обозначении пирамиды нужно минимум 4 буквы (вершина + основание).'); return res; }
    const n=labs.length-1, apex=labs[0], base=labs.slice(1);
    res.sides=n;
    res.shapeKind = n===3?'pyramid3' : n===4?'pyramid4' : 'myPyramid';
    for(let i=0;i<n;i++) res.pairs.push([LETTERS[i], base[i]]);
    res.pairs.push(['S', apex]);
    res.notes.push('Пирамида: основание '+base.join('')+', вершина '+apex+'.');
  }else if(kind==='tetra'){
    if(labs.length<4){ res.warnings.push('Обозначение тетраэдра — 4 буквы, например DABC.'); return res; }
    const apex=labs[0], base=labs.slice(1,4);
    res.shapeKind='tetra';
    res.pairs.push(['A',base[0]],['B',base[1]],['C',base[2]],['D',apex]);
    res.notes.push('Тетраэдр: основание '+base.join('')+', вершина '+apex+'.');
  }else if(kind==='cube'||kind==='box'){
    if(labs.length!==8){ res.warnings.push('Для куба/параллелепипеда нужно 8 букв, например ABCDA1B1C1D1.'); return res; }
    res.shapeKind=kind;
    const canon=['A','B','C','D','A₁','B₁','C₁','D₁'];
    for(let i=0;i<8;i++) res.pairs.push([canon[i],labs[i]]);
    res.notes.push((kind==='cube'?'Куб':'Параллелепипед')+': '+labs.join('')+'.');
  }else if(kind==='prism'){
    if(labs.length<6||labs.length%2){ res.warnings.push('Для призмы нужно чётное число букв, например ABCA1B1C1.'); return res; }
    const n=labs.length/2;
    res.sides=n;
    res.shapeKind = n===3?'prism3':'myPrism';
    const canon=[];
    for(let i=0;i<n;i++) canon.push(LETTERS[i]);
    for(let i=0;i<n;i++) canon.push(LETTERS[i]+'₁');
    for(let i=0;i<2*n;i++) res.pairs.push([canon[i],labs[i]]);
    res.notes.push('Призма: нижнее основание '+labs.slice(0,n).join('')+', верхнее '+labs.slice(n).join('')+'.');
  }else if(kind){
    res.shapeKind=kind;
    res.notes.push('Фигура: '+(kind==='cylinder'?'цилиндр':kind==='cone'?'конус':'сфера')+'.');
  }
  /* точки: «точки T и K — середины рёбер AB и CD» */
  const planned=new Set(res.pairs.map(x=>x[1]).concat(res.figs?res.figs.reduce((a,f)=>a.concat(f.labels),[]):[]));
  const plural=/(^|[^а-яёА-ЯЁ])точк[а-яё]*\s+([A-Za-z][0-9]?)\s+и\s+([A-Za-z][0-9]?)[^.;!?]*?(?:ребер|ребр|сторон)[а-яё]*\s+([A-Za-z][A-Za-z0-9]*)\s+и\s+([A-Za-z][A-Za-z0-9]*)/i.exec(raw);
  if(plural){
    const isMid=/середин/i.test(plural[0]);
    const seg1=splitLabels(plural[4]), seg2=splitLabels(plural[5]);
    if(seg1.length===2) res.points.push({name:toSubLabel(plural[2]), on:{type:'edge',a:seg1[0],b:seg1[1],mid:isMid}});
    if(seg2.length===2) res.points.push({name:toSubLabel(plural[3]), on:{type:'edge',a:seg2[0],b:seg2[1],mid:isMid}});
  }
  const frags=raw.split(/[,;.]\s*/);
  for(const fr of frags){
    const pm=/точк[а-яё]*\s+([A-Za-z][0-9]?)/i.exec(fr);
    if(!pm) continue;
    const name=toSubLabel(pm[1]);
    if(plural && (plural[2]===pm[1]||plural[3]===pm[1])) continue;
    const rest=fr.slice(pm.index);
    const seg=/(?:ребр|сторон)[а-яё]*\s+([A-Za-z][0-9]?)\s*([A-Za-z][0-9]?)/i.exec(rest);
    const lin=/прямой\s+([A-Za-z][0-9]?)\s*([A-Za-z][0-9]?)/i.exec(rest);
    const ot=/отрезк[а-яё]*\s+([A-Za-z][0-9]?)\s*([A-Za-z][0-9]?)/i.exec(rest);
    let on=null;
    if(seg){
      const a=toSubLabel(seg[1]), b=toSubLabel(seg[2]);
      const mid=/середин/i.test(rest.slice(0,seg.index+8));
      on={type: /продолжени/i.test(rest) ? 'ext' : 'edge', a, b, mid};
    }else if(lin){ on={type:'edge', a:toSubLabel(lin[1]), b:toSubLabel(lin[2]), mid:false}; }
    else if(ot){ on={type:'edge', a:toSubLabel(ot[1]), b:toSubLabel(ot[2]), mid:false}; }
    if(on) res.points.push({name, on});
    else if(!planned.has(name))
      res.warnings.push('Точка '+name+': не понял, где она лежит (укажите «на ребре XY» или «на продолжении ребра XY»).');
  }
  /* построения */
  const linesSet=new Set(), planesSet=new Set();
  for(const mm of raw.matchAll(/прям[а-яё]*\s+\(?([A-Za-z][0-9]?)\s*([A-Za-z][0-9]?)\)?/gi)){
    const a=toSubLabel(mm[1]), b=toSubLabel(mm[2]);
    if(a!==b) linesSet.add(a+'|'+b);
  }
  for(const mm of raw.matchAll(/плоскост[а-яё]*/gi)){
    for(const g of labelGroups(raw.slice(mm.index, mm.index+70))) planesSet.add(g.join('|'));
  }
  res.lines=[...linesSet].map(s=>s.split('|'));
  res.planes=[...planesSet].map(s=>s.split('|'));
  const secRe=/(^|[^а-яёА-ЯЁ])сечени/i;
  const secM=secRe.exec(raw);
  if(secM){
    const gs=labelGroups(raw.slice(secM.index+secM[1].length, secM.index+120));
    if(gs.length) res.sections.push(gs[0].slice(0,3));
    else res.warnings.push('Сечение: не нашёл три точки, задающие плоскость сечения.');
  }
  return res;
}

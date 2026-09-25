'use strict';
/* 24-main.js — Точка входа: инициализация сцены при загрузке. */
/* ============================ СТАРТ ============================ */
(function touchAdapt(){
  if(!window.matchMedia) return;
  const coarse=window.matchMedia('(pointer:coarse)').matches;
  if(coarse){
    const hud=document.getElementById('hud');
    if(hud) hud.innerHTML='<kbd>1 палец</kbd> вращение &nbsp; <kbd>2 пальца</kbd> масштаб и панорама<br>'+
      '<kbd>тап по вершине</kbd> выбрать &nbsp; <kbd>двойной тап</kbd> переименовать';
    const ex=document.getElementById('explain');
    if(ex){
      ex.classList.add('collapsed');
      const t=document.getElementById('explToggle'); if(t) t.textContent='▸';
    }
  }
})();
initAdaptiveUI();
rebuildIndex();
renderTasks();
updateStepUI();
resize();
adjustScale();
draw();

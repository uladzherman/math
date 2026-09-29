(function () {
  "use strict";

  var LS = {
    practice: "math-trainer-practice-v1",
    attempts: "math-trainer-attempts-v1",
    live: "math-trainer-exam-live-v1"
  };
  var KATEX_DISPLAY = { throwOnError: false, displayMode: true, strict: "ignore", trust: false };
  var KATEX_INLINE = { throwOnError: false, displayMode: false, strict: "ignore", trust: false };
  var LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
  var LEVEL_RANK = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

  var SECTION_TITLE = {};
  window.SECTIONS.forEach(function (s) { SECTION_TITLE[s.id] = s.title; });

  var TASK_BY_ID = {};
  window.TASKS.forEach(function (t) { TASK_BY_ID[t.id] = t; });

  function byId(id) { return document.getElementById(id); }
  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* недоступно */ }
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) { return String(s); }

  function renderMathInline(node, latex) {
    node.innerHTML = "";
    if (window.katex) {
      try { window.katex.render(latex, node, KATEX_INLINE); return; } catch (e) { /* фолбэк */ }
    }
    node.textContent = latex;
  }
  function renderFormula(node, latex) {
    node.innerHTML = "";
    if (window.katex) {
      try { window.katex.render(latex, node, KATEX_DISPLAY); return; } catch (e) { /* фолбэк */ }
    }
    var code = document.createElement("code");
    code.textContent = latex;
    node.appendChild(code);
  }
  function appendRich(parent, text) {
    parent.innerHTML = "";
    if (text === undefined || text === null) return;
    String(text).split("$").forEach(function (part, i) {
      if (i % 2 === 1) {
        var span = document.createElement("span");
        renderMathInline(span, part);
        parent.appendChild(span);
      } else if (part) {
        parent.appendChild(document.createTextNode(part));
      }
    });
  }

  function normalizeAnswer(v) {
    return String(v === undefined || v === null ? "" : v)
      .trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
  }
  function answersEqual(user, correct) {
    var a = normalizeAnswer(user), b = normalizeAnswer(correct);
    if (a === "") return false;
    if (a === b) return true;
    var na = parseFloat(a), nb = parseFloat(b);
    if (!isNaN(na) && !isNaN(nb)) return Math.abs(na - nb) < 1e-9;
    return false;
  }
  function formatTime(totalSec) {
    var s = Math.max(0, Math.floor(totalSec));
    var m = Math.floor(s / 60), sec = s % 60;
    return String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  }

  /* ============ Тренировка ============ */
  var pState = load(LS.practice, { ok: 0, bad: 0, bySection: {}, solved: [] });
  var solvedSet = {};
  (pState.solved || []).forEach(function (id) { solvedSet[id] = 1; });

  function savePractice() {
    pState.solved = Object.keys(solvedSet);
    save(LS.practice, pState);
  }

  var practice = { section: "all", order: [], pos: 0, answered: false };

  function practicePool() {
    if (practice.section === "all") return window.TASKS.slice();
    return window.TASKS.filter(function (t) { return t.section === practice.section; });
  }
  function practiceNewOrder() {
    practice.order = shuffle(practicePool().map(function (_, i) { return i; }));
    practice.pos = 0;
  }

  function buildPracticeChips() {
    var box = byId("practiceChips");
    box.innerHTML = "";
    var items = [{ id: "all", title: "Все разделы" }].concat(window.SECTIONS);
    items.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (practice.section === s.id ? " is-active" : "");
      b.textContent = s.title;
      b.dataset.section = s.id;
      b.addEventListener("click", function () {
        practice.section = s.id;
        box.querySelectorAll(".chip").forEach(function (c) {
          c.classList.toggle("is-active", c.dataset.section === s.id);
        });
        practiceNewOrder();
        renderPractice();
      });
      box.appendChild(b);
    });
  }

  function practiceMeta() {
    byId("practiceMeta").textContent = "Верно " + pState.ok + " · Ошибок " + pState.bad +
      " · Решено заданий: " + Object.keys(solvedSet).length + " из " + window.TASKS.length;
  }

  function renderPractice() {
    if (!practice.order.length) practiceNewOrder();
    var pool = practicePool();
    var task = pool[practice.order[practice.pos % practice.order.length]];
    practice.current = task;
    practice.answered = false;

    byId("practiceSection").textContent = SECTION_TITLE[task.section] + " · уровень " + task.level +
      " · часть " + task.type;
    appendRich(byId("practiceTask"), task.question);

    var feedback = byId("practiceFeedback");
    feedback.textContent = ""; feedback.className = "feedback";
    byId("practiceSolution").hidden = true;
    byId("practiceNext").disabled = true;
    byId("practiceInput").value = "";
    byId("practiceInput").disabled = false;
    byId("practiceCheck").disabled = false;

    var optionsBox = byId("practiceOptions");
    var inputRow = byId("practiceInputRow");
    var checkBtn = byId("practiceCheck");
    optionsBox.innerHTML = "";

    if (task.type === "A") {
      optionsBox.hidden = false;
      inputRow.hidden = true;
      checkBtn.hidden = true;
      task.options.forEach(function (opt, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option";
        var letter = document.createElement("span");
        letter.className = "option__letter";
        letter.textContent = LETTERS[i] + ")";
        btn.appendChild(letter);
        var span = document.createElement("span");
        appendRich(span, opt);
        btn.appendChild(span);
        btn.dataset.index = String(i);
        btn.addEventListener("click", function () { practiceAnswerA(i, btn); });
        optionsBox.appendChild(btn);
      });
    } else {
      optionsBox.hidden = true;
      inputRow.hidden = false;
      checkBtn.hidden = false;
    }
    practiceMeta();
  }

  function practiceAnswered(ok, task) {
    practice.answered = true;
    pState[ok ? "ok" : "bad"]++;
    var sec = task.section;
    if (!pState.bySection[sec]) pState.bySection[sec] = { ok: 0, bad: 0 };
    pState.bySection[sec][ok ? "ok" : "bad"]++;
    if (ok) solvedSet[task.id] = 1;
    savePractice();
    byId("practiceNext").disabled = false;
    var fb = byId("practiceFeedback");
    fb.className = "feedback " + (ok ? "feedback--ok" : "feedback--bad");
    fb.textContent = ok ? "Верно!" : "Неверно. Правильный ответ: " + correctAnswerText(task) + ".";
    byId("practiceSolution").hidden = false;
    appendRich(byId("practiceSolutionBody"), task.explanation || "Решение не указано.");
    practiceMeta();
    updateProgress();
  }

  function correctAnswerText(task) {
    if (task.type === "A") {
      var raw = task.options[task.correct];
      return String(raw).replace(/\$/g, "");
    }
    return String(task.answer);
  }

  function practiceAnswerA(index, btn) {
    if (practice.answered) return;
    var task = practice.current;
    var optionsBox = byId("practiceOptions");
    optionsBox.querySelectorAll(".option").forEach(function (b) {
      b.disabled = true;
      if (Number(b.dataset.index) === task.correct) b.classList.add("is-correct");
    });
    if (index !== task.correct) btn.classList.add("is-wrong");
    practiceAnswered(index === task.correct, task);
  }

  function practiceCheckB() {
    if (practice.answered) return;
    var task = practice.current;
    var val = byId("practiceInput").value;
    if (normalizeAnswer(val) === "") return;
    byId("practiceInput").disabled = true;
    byId("practiceCheck").disabled = true;
    practiceAnswered(answersEqual(val, task.answer), task);
  }

  function practiceNext() {
    practice.pos++;
    if (practice.pos >= practice.order.length) practiceNewOrder();
    renderPractice();
  }

  function updateProgress() {
    var total = window.TASKS.length, done = Object.keys(solvedSet).length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    byId("progressFill").style.width = pct + "%";
    byId("progressLabel").textContent = done + " / " + total;
  }

  /* ============ Генератор варианта ============ */
  function pickTasks(section, type, count, used) {
    var pool = window.TASKS.filter(function (t) {
      return t.section === section && t.type === type && !used[t.id];
    });
    if (pool.length < count) {
      window.TASKS.forEach(function (t) {
        if (t.section === section && !used[t.id] && pool.indexOf(t) === -1) pool.push(t);
      });
    }
    var groups = {};
    shuffle(pool).forEach(function (t) {
      if (!groups[t.level]) groups[t.level] = [];
      groups[t.level].push(t);
    });
    var levels = Object.keys(groups).sort(function (a, b) { return LEVEL_RANK[a] - LEVEL_RANK[b]; });
    var out = [];
    var guard = 0;
    while (out.length < count && guard < 100) {
      levels.forEach(function (l) {
        if (out.length < count && groups[l].length) out.push(groups[l].shift());
      });
      guard++;
    }
    out.forEach(function (t) { used[t.id] = 1; });
    return out;
  }

  function generateVariant() {
    var used = {};
    var partA = [], partB = [];
    window.EXAM.spec.forEach(function (sp) {
      partA = partA.concat(pickTasks(sp.section, "A", sp.A, used));
    });
    window.EXAM.spec.forEach(function (sp) {
      partB = partB.concat(pickTasks(sp.section, "B", sp.B, used));
    });
    var order = partA.concat(partB).map(function (t) { return t.id; });
    order.sort(function (a, b) {
      return LEVEL_RANK[TASK_BY_ID[a].level] - LEVEL_RANK[TASK_BY_ID[b].level];
    });
    return order;
  }

  /* ============ Экзамен ============ */
  var live = null;
  var timerId = null;

  function renderExamSpecGrid() {
    var box = byId("examSpecGrid");
    box.innerHTML = "";
    window.EXAM.spec.forEach(function (sp) {
      var div = document.createElement("div");
      div.className = "spec-item";
      var name = document.createElement("div");
      name.className = "spec-item__name";
      name.textContent = SECTION_TITLE[sp.section];
      var val = document.createElement("div");
      val.className = "spec-item__val";
      val.textContent = sp.total + " заданий · " + sp.A + " A / " + sp.B + " B";
      div.appendChild(name); div.appendChild(val);
      box.appendChild(div);
    });
  }

  function showExamPanel(name) {
    byId("examStart").hidden = name !== "start";
    byId("examRun").hidden = name !== "run";
    byId("examResult").hidden = name !== "result";
  }

  function startExam(fresh) {
    if (fresh || !live) {
      var order = generateVariant();
      live = {
        startedAt: Date.now(),
        endsAt: Date.now() + window.EXAM.durationMin * 60000,
        order: order,
        answers: {},
        current: 0
      };
      save(LS.live, live);
    }
    showExamPanel("run");
    renderExamNav();
    renderExamTask();
    startTimer();
  }

  function startTimer() {
    if (timerId) clearInterval(timerId);
    tickTimer();
    timerId = setInterval(tickTimer, 1000);
  }
  function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

  function tickTimer() {
    if (!live) return;
    var left = Math.round((live.endsAt - Date.now()) / 1000);
    var el = byId("examTimer");
    el.textContent = formatTime(left);
    el.className = "timer" + (left <= 300 ? " is-critical" : (left <= 1800 ? " is-low" : ""));
    if (left <= 0) { stopTimer(); finishExam(true); }
  }

  function answeredCount() {
    var n = 0;
    live.order.forEach(function (id) {
      var v = live.answers[id];
      if (v !== undefined && normalizeAnswer(v) !== "") n++;
    });
    return n;
  }

  function examMetaText() { return "Отвечено " + answeredCount() + " из " + live.order.length; }

  function renderExamNav() {
    var grid = byId("examNavGrid");
    grid.innerHTML = "";
    live.order.forEach(function (id, i) {
      var task = TASK_BY_ID[id];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "navbtn " + (task.type === "A" ? "is-partA" : "is-partB");
      var v = live.answers[id];
      if (v !== undefined && normalizeAnswer(v) !== "") b.classList.add("is-done");
      if (i === live.current) b.classList.add("is-current");
      b.textContent = String(i + 1);
      b.title = "Задание " + (i + 1) + " · Часть " + task.type + " · " + SECTION_TITLE[task.section];
      b.addEventListener("click", function () { live.current = i; save(LS.live, live); renderExamNav(); renderExamTask(); });
      grid.appendChild(b);
    });
    byId("examProgressText").textContent = examMetaText();
    byId("examPrev").disabled = live.current === 0;
    byId("examNext").disabled = live.current === live.order.length - 1;
  }

  function renderExamTask() {
    var id = live.order[live.current];
    var task = TASK_BY_ID[id];
    byId("examTaskMeta").textContent = "Задание " + (live.current + 1) + " из " + live.order.length +
      " · Часть " + task.type + " · уровень " + task.level;
    byId("examTaskCaption").textContent = SECTION_TITLE[task.section];
    appendRich(byId("examTaskBody"), task.question);

    var optionsBox = byId("examOptions");
    var inputRow = byId("examInputRow");
    optionsBox.innerHTML = "";
    var stored = live.answers[id];

    if (task.type === "A") {
      optionsBox.hidden = false;
      inputRow.hidden = true;
      task.options.forEach(function (opt, i) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "option" + (stored === i ? " is-selected" : "");
        var letter = document.createElement("span");
        letter.className = "option__letter";
        letter.textContent = LETTERS[i] + ")";
        btn.appendChild(letter);
        var span = document.createElement("span");
        appendRich(span, opt);
        btn.appendChild(span);
        btn.addEventListener("click", function () { examSelect(i); });
        optionsBox.appendChild(btn);
      });
    } else {
      optionsBox.hidden = true;
      inputRow.hidden = false;
      var input = byId("examInput");
      input.value = stored === undefined ? "" : stored;
    }
  }

  function examSelect(index) {
    var id = live.order[live.current];
    live.answers[id] = index;
    save(LS.live, live);
    renderExamTask();
    renderExamNav();
  }

  function examGo(delta) {
    live.current = Math.max(0, Math.min(live.order.length - 1, live.current + delta));
    save(LS.live, live);
    renderExamNav();
    renderExamTask();
  }

  function finishExam(expired) {
    if (!live) return;
    if (!expired) {
      var unanswered = live.order.length - answeredCount();
      var msg = unanswered > 0
        ? "Осталось без ответа заданий: " + unanswered + ". Завершить экзамен?"
        : "Завершить экзамен и увидеть результат?";
      if (!window.confirm(msg)) return;
    }
    stopTimer();
    var result = scoreVariant(live);
    result.durationSec = Math.max(1, Math.round((Date.now() - live.startedAt) / 1000));
    delete result.details;
    var attempts = load(LS.attempts, []);
    attempts.unshift(result);
    if (attempts.length > 50) attempts = attempts.slice(0, 50);
    save(LS.attempts, attempts);
    live = null;
    try { localStorage.removeItem(LS.live); } catch (e) { /* недоступно */ }
    showExamPanel("result");
    renderResult(result, byId("examResult"), true);
  }

  function scoreVariant(data) {
    var correct = 0;
    var bySection = {};
    window.SECTIONS.forEach(function (s) { bySection[s.id] = { total: 0, ok: 0 }; });
    var details = data.order.map(function (id, i) {
      var task = TASK_BY_ID[id];
      bySection[task.section].total++;
      var user = data.answers[id];
      var ok = task.type === "A" ? user === task.correct : answersEqual(user, task.answer);
      if (ok) { correct++; bySection[task.section].ok++; }
      return { index: i + 1, task: task, user: user, ok: ok };
    });
    var test = window.RIKZ.table[Math.min(correct, window.RIKZ.table.length - 1)];
    return {
      id: "att-" + Date.now(),
      date: Date.now(),
      order: data.order.slice(),
      answers: JSON.parse(JSON.stringify(data.answers)),
      primary: correct,
      test: test,
      bySection: bySection,
      details: details
    };
  }

  /* ============ Рендер результатов и разбора ============ */
  function renderScoreBoxes(container, attempt) {
    var total = attempt.order.length;
    var answered = 0;
    attempt.order.forEach(function (id) {
      var v = attempt.answers[id];
      if (v !== undefined && normalizeAnswer(v) !== "") answered++;
    });
    var boxes = [
      { label: "Первичный балл", val: attempt.primary + " / " + total, hint: "по 1 баллу за задание" },
      { label: "Тестовый балл (РИКЗ)", val: attempt.test, hint: "из 100" },
      { label: "Верных заданий", val: attempt.primary, hint: "из " + total },
      { label: "Отвечено", val: answered, hint: attempt.durationSec ? ("время " + formatTime(attempt.durationSec)) : "" }
    ];
    var wrap = document.createElement("div");
    wrap.className = "score-card";
    boxes.forEach(function (b) {
      var box = document.createElement("div");
      box.className = "score-box";
      var l = document.createElement("div"); l.className = "score-box__label"; l.textContent = b.label;
      var v = document.createElement("div"); v.className = "score-box__val"; v.textContent = b.val;
      var h = document.createElement("div"); h.className = "score-box__hint"; h.textContent = b.hint;
      box.appendChild(l); box.appendChild(v); box.appendChild(h);
      wrap.appendChild(box);
    });
    container.appendChild(wrap);
  }

  function renderBars(container, attempt) {
    var wrap = document.createElement("div");
    wrap.className = "bars";
    var bys = attempt.bySection || {};
    window.SECTIONS.forEach(function (s) {
      var d = bys[s.id] || { total: 0, ok: 0 };
      var pct = d.total ? Math.round((d.ok / d.total) * 100) : 0;
      var row = document.createElement("div");
      row.className = "bar-row";
      var name = document.createElement("div"); name.className = "bar-row__name"; name.textContent = s.title;
      var track = document.createElement("div"); track.className = "bar-track";
      var fill = document.createElement("span"); fill.className = "bar-fill"; fill.style.width = pct + "%";
      if (pct < 50) fill.style.background = "var(--bad)";
      else if (pct < 80) fill.style.background = "var(--warn)";
      else fill.style.background = "var(--ok)";
      track.appendChild(fill);
      var val = document.createElement("div"); val.className = "bar-row__val";
      val.textContent = d.ok + " / " + d.total;
      row.appendChild(name); row.appendChild(track); row.appendChild(val);
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  function renderReviewList(container, attempt) {
    var details = attempt.details;
    if (!details) {
      details = attempt.order.map(function (id, i) {
        var task = TASK_BY_ID[id];
        var user = attempt.answers[id];
        var ok = task.type === "A" ? user === task.correct : answersEqual(user, task.answer);
        return { index: i + 1, task: task, user: user, ok: ok };
      });
    }
    details.forEach(function (d) {
      var task = d.task;
      var item = document.createElement("div");
      item.className = "review-item";

      var head = document.createElement("div");
      head.className = "review-item__head";
      var num = document.createElement("span"); num.className = "review-item__num"; num.textContent = "№" + d.index;
      var badge = document.createElement("span");
      badge.className = "badge" + (task.type === "B" ? " badge--b" : "");
      badge.textContent = "Часть " + task.type + " · " + SECTION_TITLE[task.section] + " · " + task.level;
      var mark = document.createElement("span");
      mark.className = "mark " + (d.ok ? "mark--ok" : "mark--bad");
      mark.textContent = d.ok ? "✓ верно" : "✗ неверно";
      head.appendChild(num); head.appendChild(badge); head.appendChild(mark);
      item.appendChild(head);

      var q = document.createElement("div");
      q.className = "review-item__q";
      appendRich(q, task.question);
      item.appendChild(q);

      var ans = document.createElement("div");
      ans.className = "review-item__ans";
      var u = document.createElement("span");
      u.className = "u";
      var userText = d.user === undefined || normalizeAnswer(d.user) === "" ? "— (нет ответа)"
        : (task.type === "A" ? String(task.options[d.user]).replace(/\$/g, "") : String(d.user));
      u.innerHTML = "Ваш ответ: <b>" + escapeHtml(userText) + "</b>";
      var c = document.createElement("span");
      c.className = "c";
      c.innerHTML = "Правильный ответ: <b>" + escapeHtml(correctAnswerText(task)) + "</b>";
      ans.appendChild(u); ans.appendChild(c);
      item.appendChild(ans);

      var sol = document.createElement("div");
      sol.className = "solution";
      var t = document.createElement("p"); t.className = "solution__title"; t.textContent = "Решение";
      var body = document.createElement("div"); body.className = "solution__body";
      appendRich(body, task.explanation || "Решение не указано.");
      sol.appendChild(t); sol.appendChild(body);
      item.appendChild(sol);

      container.appendChild(item);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function renderResult(attempt, container, withHeader) {
    container.innerHTML = "";
    if (withHeader) {
      var panel = document.createElement("div");
      panel.className = "panel";
      var h = document.createElement("h2"); h.className = "panel__title"; h.textContent = "Результат экзамена";
      var p = document.createElement("p"); p.className = "panel__text";
      p.textContent = "Первичный балл переводится в тестовый по ориентировочной шкале РИКЗ. " +
        "Ниже — статистика по темам и разбор каждого задания.";
      panel.appendChild(h); panel.appendChild(p);
      container.appendChild(panel);
    }
    renderScoreBoxes(container, attempt);
    var barsPanel = document.createElement("div");
    barsPanel.className = "panel";
    var bt = document.createElement("h3"); bt.className = "panel__title"; bt.textContent = "Успешность по темам";
    barsPanel.appendChild(bt);
    renderBars(barsPanel, attempt);
    container.appendChild(barsPanel);

    var revPanel = document.createElement("div");
    revPanel.className = "panel";
    var rt = document.createElement("h3"); rt.className = "panel__title"; rt.textContent = "Разбор заданий";
    revPanel.appendChild(rt);
    renderReviewList(revPanel, attempt);
    container.appendChild(revPanel);

    var row = document.createElement("div");
    row.className = "quiz__row";
    var again = document.createElement("button");
    again.type = "button"; again.className = "btn"; again.textContent = "Пройти новый экзамен";
    again.addEventListener("click", function () { showExamPanel("start"); refreshResumeBtn(); });
    row.appendChild(again);
    container.appendChild(row);
  }

  /* ============ История попыток ============ */
  function renderHistory() {
    var list = byId("historyList");
    var detail = byId("historyDetail");
    list.innerHTML = "";
    detail.innerHTML = "";
    var attempts = load(LS.attempts, []);
    if (!attempts.length) {
      var e = document.createElement("p");
      e.className = "empty";
      e.textContent = "Пока нет завершённых экзаменов. Пройдите экзамен в режиме «Экзамен».";
      list.appendChild(e);
      return;
    }
    attempts.forEach(function (att) {
      var item = document.createElement("div");
      item.className = "history-item";
      var date = document.createElement("div");
      date.className = "history-item__date";
      date.textContent = new Date(att.date).toLocaleString("ru-RU");
      var sc = document.createElement("div");
      sc.className = "history-item__score";
      sc.innerHTML = att.test + " <span class=\"primary\">тест · " + att.primary + " первичных</span>";
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn btn--ghost"; btn.textContent = "Разбор";
      btn.addEventListener("click", function () {
        detail.innerHTML = "";
        var panel = document.createElement("div");
        panel.className = "panel";
        var h = document.createElement("h2"); h.className = "panel__title";
        h.textContent = "Попытка от " + new Date(att.date).toLocaleString("ru-RU");
        panel.appendChild(h);
        renderBars(panel, att);
        detail.appendChild(panel);
        var rev = document.createElement("div");
        rev.className = "panel";
        var rt = document.createElement("h3"); rt.className = "panel__title"; rt.textContent = "Разбор заданий";
        rev.appendChild(rt);
        renderReviewList(rev, att);
        detail.appendChild(rev);
        window.scrollTo({ top: detail.offsetTop - 80, behavior: "smooth" });
      });
      item.appendChild(date); item.appendChild(sc); item.appendChild(btn);
      list.appendChild(item);
    });

    var clearRow = document.createElement("div");
    clearRow.className = "quiz__row";
    var clear = document.createElement("button");
    clear.type = "button"; clear.className = "btn btn--ghost"; clear.textContent = "Очистить историю";
    clear.addEventListener("click", function () {
      if (!window.confirm("Удалить все сохранённые попытки?")) return;
      save(LS.attempts, []);
      renderHistory();
    });
    clearRow.appendChild(clear);
    list.appendChild(clearRow);
  }

  /* ============ Справочник ============ */
  function renderReference(section) {
    var box = byId("formulaList");
    box.innerHTML = "";
    window.FORMULAS.filter(function (f) { return !section || section === "all" || f.section === section; })
      .forEach(function (f) {
        var item = document.createElement("div");
        item.className = "formula-item";
        var name = document.createElement("p");
        name.className = "formula-item__name";
        name.textContent = SECTION_TITLE[f.section] + " · " + f.name;
        var body = document.createElement("div");
        body.className = "formula-item__body";
        renderFormula(body, f.f);
        item.appendChild(name); item.appendChild(body);
        box.appendChild(item);
      });
  }
  function buildReferenceChips() {
    var box = byId("referenceChips");
    box.innerHTML = "";
    var items = [{ id: "all", title: "Все разделы" }].concat(window.SECTIONS);
    items.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (s.id === "all" ? " is-active" : "");
      b.textContent = s.title;
      b.addEventListener("click", function () {
        box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("is-active"); });
        b.classList.add("is-active");
        renderReference(s.id);
      });
      box.appendChild(b);
    });
  }

  /* ============ Графики ============ */
  var GRAPH_KINDS = [
    {
      id: "line", name: "Линейная: y = kx + b",
      coefs: [{ k: "k", v: 1, min: -5, max: 5, step: 0.5 }, { k: "b", v: 0, min: -5, max: 5, step: 0.5 }],
      ev: function (x, c) { return c.k * x + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "x") + add(c.b); }
    },
    {
      id: "quad", name: "Квадратичная: y = ax² + bx + c",
      coefs: [{ k: "a", v: 1, min: -3, max: 3, step: 0.25 }, { k: "b", v: 0, min: -6, max: 6, step: 0.5 }, { k: "c", v: 0, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { return c.a * x * x + c.b * x + c.c; },
      tex: function (c) { return "y = " + mul(c.a, "x^2") + addMul(c.b, "x") + add(c.c); }
    },
    {
      id: "hyper", name: "Обратная пропорциональность: y = k/x",
      coefs: [{ k: "k", v: 1, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { return c.k / x; },
      tex: function (c) { return "y = \\dfrac{" + c.k + "}{x}"; }
    },
    {
      id: "sqrt", name: "Корень: y = k·√x",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }],
      ev: function (x, c) { return x < 0 ? NaN : c.k * Math.sqrt(x); },
      tex: function (c) { return "y = " + c.k + "\\sqrt{x}"; }
    },
    {
      id: "abs", name: "Модуль: y = k|x| + b",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }, { k: "b", v: 0, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { return c.k * Math.abs(x) + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "|x|") + add(c.b); }
    },
    {
      id: "sine", name: "Синусоида: y = A·sin(kx)",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.sin(c.k * x); },
      tex: function (c) { return "y = " + mul(c.A, "\\sin(" + c.k + "x)"); }
    }
  ];

  function fmtNum(v) { return String(v).replace(".", ","); }
  function mul(k, body) {
    if (k === 0) return "0";
    if (k === 1) return body;
    if (k === -1) return "-" + body;
    return fmtNum(k) + body;
  }
  function add(b) {
    if (b === 0) return "";
    return (b > 0 ? " + " : " - ") + fmtNum(Math.abs(b));
  }
  function addMul(b, body) {
    if (b === 0) return "";
    if (b > 0) return " + " + mul(b, body);
    return " - " + mul(Math.abs(b), body);
  }

  var graphState = { kind: GRAPH_KINDS[0].id, values: {} };

  function graphKind() {
    var found = GRAPH_KINDS[0];
    GRAPH_KINDS.forEach(function (g) { if (g.id === graphState.kind) found = g; });
    return found;
  }

  function buildGraphControls() {
    var sel = byId("graphKind");
    sel.innerHTML = "";
    GRAPH_KINDS.forEach(function (g) {
      var o = document.createElement("option");
      o.value = g.id; o.textContent = g.name;
      sel.appendChild(o);
    });
    sel.value = graphState.kind;
    sel.addEventListener("change", function () {
      graphState.kind = sel.value;
      buildGraphCoefs();
      drawGraph();
    });
    buildGraphCoefs();
  }

  function currentValues() {
    var g = graphKind();
    var v = {};
    g.coefs.forEach(function (c) {
      var stored = graphState.values[g.id + ":" + c.k];
      v[c.k] = stored === undefined ? c.v : stored;
    });
    return v;
  }

  function buildGraphCoefs() {
    var box = byId("graphCoefs");
    box.innerHTML = "";
    var g = graphKind();
    var vals = currentValues();
    g.coefs.forEach(function (c) {
      var wrap = document.createElement("div");
      wrap.className = "coef";
      var label = document.createElement("label");
      label.className = "coef__label";
      label.textContent = c.k + " = " + fmtNum(vals[c.k]);
      var input = document.createElement("input");
      input.type = "range";
      input.min = c.min; input.max = c.max; input.step = c.step;
      input.value = vals[c.k];
      input.addEventListener("input", function () {
        graphState.values[g.id + ":" + c.k] = parseFloat(input.value);
        label.textContent = c.k + " = " + fmtNum(parseFloat(input.value));
        drawGraph();
      });
      wrap.appendChild(label); wrap.appendChild(input);
      box.appendChild(wrap);
    });
  }

  function drawGraph() {
    var canvas = byId("graphCanvas");
    var wrapEl = canvas.parentNode;
    var cssW = wrapEl.clientWidth - 12;
    if (cssW <= 0) cssW = 640;
    var cssH = Math.round(cssW * 0.75);
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var W = cssW, H = cssH;
    var rangeX = 10, rangeY = rangeX * (H / W);
    var xToPx = function (x) { return W / 2 + x * (W / (2 * rangeX)); };
    var yToPx = function (y) { return H / 2 - y * (H / (2 * rangeY)); };

    var css = getComputedStyle(document.body);
    var colText = css.getPropertyValue("--text").trim() || "#1e2433";
    var colMuted = css.getPropertyValue("--muted").trim() || "#6b7488";
    var colBorder = css.getPropertyValue("--border").trim() || "#e3e8f0";
    var colAccent = css.getPropertyValue("--accent").trim() || "#3b5bdb";

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = colBorder;
    ctx.lineWidth = 1;
    for (var gx = -rangeX; gx <= rangeX; gx++) {
      ctx.beginPath(); ctx.moveTo(xToPx(gx), 0); ctx.lineTo(xToPx(gx), H); ctx.stroke();
    }
    for (var gy = -rangeY; gy <= rangeY; gy++) {
      ctx.beginPath(); ctx.moveTo(0, yToPx(gy)); ctx.lineTo(W, yToPx(gy)); ctx.stroke();
    }

    ctx.strokeStyle = colMuted;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, yToPx(0)); ctx.lineTo(W, yToPx(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xToPx(0), 0); ctx.lineTo(xToPx(0), H); ctx.stroke();

    ctx.fillStyle = colMuted;
    ctx.font = "12px -apple-system, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var lx = -rangeX + 1; lx <= rangeX - 1; lx++) {
      if (lx === 0) continue;
      ctx.fillText(String(lx), xToPx(lx), yToPx(0) + 4);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var ly = -Math.floor(rangeY) + 1; ly <= rangeY - 1; ly++) {
      if (ly === 0) continue;
      ctx.fillText(String(ly), xToPx(0) - 5, yToPx(ly));
    }

    var g = graphKind();
    var vals = currentValues();
    ctx.strokeStyle = colAccent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    var started = false;
    var stepPx = 1;
    for (var px = 0; px <= W; px += stepPx) {
      var x = (px - W / 2) / (W / (2 * rangeX));
      var y;
      try { y = g.ev(x, vals); } catch (e) { y = NaN; }
      if (y === null || isNaN(y) || !isFinite(y) || y < -rangeY * 4 || y > rangeY * 4) {
        started = false;
        continue;
      }
      var py = yToPx(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    appendRich(byId("graphFormula"), "$" + g.tex(vals) + "$");
  }

  /* ============ Переключение режимов ============ */
  function setMode(mode) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.mode === mode);
    });
    byId("viewPractice").hidden = mode !== "practice";
    byId("viewExam").hidden = mode !== "exam";
    byId("viewHistory").hidden = mode !== "history";
    byId("viewReference").hidden = mode !== "reference";
    byId("viewGraph").hidden = mode !== "graph";
    byId("progress").style.display = mode === "practice" ? "" : "none";

    if (mode === "practice") renderPractice();
    else if (mode === "exam") { refreshResumeBtn(); }
    else if (mode === "history") renderHistory();
    else if (mode === "reference") renderReference("all");
    else if (mode === "graph") window.requestAnimationFrame(drawGraph);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshResumeBtn() {
    var btn = byId("examResumeBtn");
    if (live && live.endsAt > Date.now()) btn.hidden = false;
    else btn.hidden = true;
  }

  /* ============ Инициализация ============ */
  function init() {
    var savedLive = load(LS.live, null);
    if (savedLive && savedLive.endsAt > Date.now() && savedLive.order && savedLive.order.length) {
      live = savedLive;
    } else if (savedLive) {
      try { localStorage.removeItem(LS.live); } catch (e) { /* недоступно */ }
    }

    buildPracticeChips();
    renderExamSpecGrid();
    buildReferenceChips();
    buildGraphControls();
    updateProgress();
    renderPractice();
    refreshResumeBtn();

    byId("tabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".tab");
      if (tab) setMode(tab.dataset.mode);
    });

    byId("practiceNext").addEventListener("click", practiceNext);
    byId("practiceCheck").addEventListener("click", practiceCheckB);
    byId("practiceInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") practiceCheckB();
    });
    byId("practiceReset").addEventListener("click", function () {
      if (!window.confirm("Сбросить прогресс тренировки?")) return;
      pState = { ok: 0, bad: 0, bySection: {}, solved: [] };
      solvedSet = {};
      savePractice();
      updateProgress();
      practiceNewOrder();
      renderPractice();
    });

    byId("examStartBtn").addEventListener("click", function () {
      if (live) {
        if (!window.confirm("Уже есть незавершённый экзамен. Начать новый и сбросить текущий?")) return;
      }
      startExam(true);
    });
    byId("examResumeBtn").addEventListener("click", function () { startExam(false); });
    byId("examFinish").addEventListener("click", function () { finishExam(false); });
    byId("examPrev").addEventListener("click", function () { examGo(-1); });
    byId("examNext").addEventListener("click", function () { examGo(1); });
    byId("examInput").addEventListener("input", function () {
      live.answers[live.order[live.current]] = byId("examInput").value;
      save(LS.live, live);
      renderExamNav();
    });

    byId("graphReset").addEventListener("click", function () {
      graphState.values = {};
      buildGraphCoefs();
      drawGraph();
    });

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!byId("viewGraph").hidden) drawGraph();
      }, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (!byId("viewGraph").hidden) drawGraph(); });
    }
  }

  init();
})();

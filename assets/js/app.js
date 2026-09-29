(function () {
  "use strict";

  var LS = {
    known: "math-trainer-known-v1",
    srs: "math-trainer-srs-v1",
    stats: "math-trainer-stats-v1",
    attempts: "math-trainer-attempts-v1",
    live: "math-trainer-exam-live-v1"
  };
  var KATEX_DISPLAY = { throwOnError: false, displayMode: true, strict: "ignore", trust: false };
  var KATEX_INLINE = { throwOnError: false, displayMode: false, strict: "ignore", trust: false };
  var LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];
  var LEVEL_RANK = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  var DAY = 86400000;

  var SECTION_TITLE = {};
  window.SECTIONS.forEach(function (s) { SECTION_TITLE[s.id] = s.title; });

  function cardId(card) { return card.s + "::" + card.t; }
  var CARD_ENTRIES = window.CARDS.map(function (c) { return { card: c, id: cardId(c) }; });

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
  function wrapMath(s) { return String(s).indexOf("$") === -1 ? "$" + s + "$" : String(s); }

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
  function fitFormula(container) {
    var node = container.querySelector(".katex-display") || container.querySelector(".katex");
    if (!node) return;
    node.style.transform = "";
    node.style.transformOrigin = "center center";
    var availW = container.clientWidth, availH = container.clientHeight;
    if (availW <= 0 || availH <= 0) return;
    var w = node.offsetWidth || node.scrollWidth, h = node.offsetHeight || node.scrollHeight;
    if (!w || !h) return;
    var scale = Math.min(1, (availW - 6) / w, (availH - 6) / h);
    if (scale < 0.999) node.style.transform = "scale(" + scale.toFixed(4) + ")";
  }
  function fitAllWithin(root) {
    root.querySelectorAll(".formula").forEach(fitFormula);
  }
  function fitOptions(box) {
    box.querySelectorAll(".option").forEach(function (btn) {
      var node = btn.querySelector(".katex");
      if (!node) return;
      node.style.transform = "";
      node.style.transformOrigin = "center center";
      var availW = btn.clientWidth - 14, availH = btn.clientHeight - 14;
      if (availW <= 0 || availH <= 0) return;
      var w = node.offsetWidth, h = node.offsetHeight;
      if (!w || !h) return;
      var scale = Math.min(1, availW / w, availH / h);
      if (scale < 0.999) node.style.transform = "scale(" + scale.toFixed(4) + ")";
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
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var STAT_KEYS = ["matchOk", "matchBad", "formulaOk", "formulaBad", "namesOk", "namesBad", "taskOk", "taskBad"];
  var state = {
    mode: "cards",
    section: "all",
    shuffled: false,
    list: [],
    known: new Set(load(LS.known, [])),
    srs: load(LS.srs, {}),
    stats: load(LS.stats, {}),
    formula: { order: [], pos: 0 },
    names: { order: [], pos: 0 },
    match: { set: [], selectedId: null, matched: {} },
    review: { queue: [] }
  };
  STAT_KEYS.forEach(function (k) { if (state.stats[k] === undefined) state.stats[k] = 0; });
  if (!state.stats.taskBySection) state.stats.taskBySection = {};

  /* ============ Общие помощники тестов ============ */
  function buildChoices(correctText, poolValues, count) {
    var others = poolValues.filter(function (v) { return v !== correctText; });
    shuffle(others);
    var out = [{ ok: true, text: correctText }];
    others.slice(0, count).forEach(function (v) { out.push({ ok: false, text: v }); });
    return shuffle(out);
  }
  function renderOptions(box, choices, decorate, onPick) {
    box.innerHTML = "";
    choices.forEach(function (choice) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      if (choice.ok) btn.dataset.correct = "1";
      decorate(btn, choice);
      btn.addEventListener("click", function () { onPick(btn, choice); });
      box.appendChild(btn);
    });
  }
  function renderMathOptions(box, choices, onPick) {
    renderOptions(box, choices, function (btn, c) {
      var span = document.createElement("span");
      appendRich(span, c.text);
      btn.appendChild(span);
    }, onPick);
    window.requestAnimationFrame(function () { fitOptions(box); });
  }
  function answerOption(box, btn, ok, feedbackEl, okText, badText) {
    box.querySelectorAll(".option").forEach(function (b) {
      b.disabled = true;
      if (b.dataset.correct) b.classList.add("is-correct");
    });
    if (!ok) btn.classList.add("is-wrong");
    feedbackEl.textContent = ok ? okText : badText;
    feedbackEl.className = "feedback " + (ok ? "feedback--ok" : "feedback--bad");
  }
  function resetFeedback(id) {
    var el = byId(id);
    el.textContent = "";
    el.className = "feedback";
  }

  /* ============ Режим «Карточки» ============ */
  var gridEl = byId("grid"), emptyEl = byId("empty"), chipsEl = byId("sectionChips");

  function createCard(entry, opts) {
    opts = opts || {};
    var card = entry.card, id = entry.id;

    var root = document.createElement("div");
    root.className = "card" + (state.known.has(id) ? " is-known" : "");
    root.tabIndex = 0;
    root.setAttribute("role", "button");
    root.setAttribute("aria-pressed", "false");
    root.setAttribute("aria-label", card.t);
    root.dataset.id = id;

    var inner = document.createElement("div");
    inner.className = "card__inner";

    var front = document.createElement("div");
    front.className = "card__face card__face--front";
    var badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = SECTION_TITLE[card.s] || "";
    var title = document.createElement("p");
    title.className = "card__title";
    title.textContent = card.t;
    var hint = document.createElement("span");
    hint.className = "card__hint";
    hint.textContent = "Нажмите, чтобы увидеть формулу";
    front.appendChild(badge); front.appendChild(title); front.appendChild(hint);

    var back = document.createElement("div");
    back.className = "card__face card__face--back";
    var badgeBack = document.createElement("span");
    badgeBack.className = "badge";
    badgeBack.textContent = SECTION_TITLE[card.s] || "";

    var formula = document.createElement("div");
    formula.className = "formula";
    renderFormula(formula, card.f);

    var meta = document.createElement("div");
    meta.className = "card__meta";
    if (card.n) {
      var note = document.createElement("p");
      note.className = "card__note";
      appendRich(note, card.n);
      meta.appendChild(note);
    }

    var actions = document.createElement("div");
    actions.className = "card__actions";
    if (!opts.review) {
      var knownBtn = document.createElement("button");
      knownBtn.type = "button";
      knownBtn.className = "known-btn";
      knownBtn.textContent = state.known.has(id) ? "✓ Изучено" : "Отметить изученным";
      knownBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleKnown(id, root, knownBtn);
      });
      actions.appendChild(knownBtn);
    }

    back.appendChild(badgeBack);
    back.appendChild(formula);
    back.appendChild(meta);
    back.appendChild(actions);
    inner.appendChild(front);
    inner.appendChild(back);
    root.appendChild(inner);

    function flip() {
      var flipped = root.classList.toggle("is-flipped");
      root.setAttribute("aria-pressed", String(flipped));
      if (flipped) fitFormula(formula);
    }
    root.addEventListener("click", flip);
    root.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); flip(); }
    });
    return root;
  }

  function toggleKnown(id, root, btn) {
    if (state.known.has(id)) {
      state.known.delete(id); root.classList.remove("is-known");
      if (btn) btn.textContent = "Отметить изученным";
    } else {
      state.known.add(id); root.classList.add("is-known");
      if (btn) btn.textContent = "✓ Изучено";
    }
    save(LS.known, Array.from(state.known));
    updateProgress();
  }

  function updateProgress() {
    var total = window.CARDS.length, done = state.known.size;
    var pct = total ? Math.round((done / total) * 100) : 0;
    byId("progressFill").style.width = pct + "%";
    byId("progressLabel").textContent = done + " / " + total;
  }

  function buildChips() {
    var frag = document.createDocumentFragment();
    function makeChip(id, title) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (state.section === id ? " is-active" : "");
      btn.textContent = title;
      btn.dataset.section = id;
      btn.addEventListener("click", function () {
        state.section = id; state.shuffled = false;
        chipsEl.querySelectorAll(".chip").forEach(function (c) {
          c.classList.toggle("is-active", c.dataset.section === id);
        });
        renderBrowse();
      });
      return btn;
    }
    frag.appendChild(makeChip("all", "Все разделы"));
    window.SECTIONS.forEach(function (s) { frag.appendChild(makeChip(s.id, s.title)); });
    chipsEl.appendChild(frag);
  }

  function renderBrowse() {
    var base = CARD_ENTRIES.slice();
    state.list = state.section === "all" ? base : base.filter(function (x) { return x.card.s === state.section; });
    if (state.shuffled) shuffle(state.list);
    gridEl.innerHTML = "";
    if (!state.list.length) { emptyEl.hidden = false; return; }
    emptyEl.hidden = true;
    var frag = document.createDocumentFragment();
    state.list.forEach(function (entry) { frag.appendChild(createCard(entry)); });
    gridEl.appendChild(frag);
    window.requestAnimationFrame(function () { fitAllWithin(gridEl); });
  }

  /* ============ Режим «Соответствие» ============ */
  function matchNewRound() {
    var pool = shuffle(CARD_ENTRIES.slice());
    var chosen = [], used = {};
    for (var i = 0; i < pool.length && chosen.length < 4; i++) {
      if (used[pool[i].card.f]) continue;
      used[pool[i].card.f] = 1;
      chosen.push(pool[i]);
    }
    state.match.set = chosen;
    state.match.selectedId = null;
    state.match.matched = {};

    var namesBox = byId("matchNames"), formulasBox = byId("matchFormulas");
    namesBox.innerHTML = "";
    formulasBox.innerHTML = "";
    byId("matchNext").disabled = true;
    resetFeedback("matchFeedback");

    shuffle(chosen.slice()).forEach(function (entry) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-item";
      btn.dataset.id = entry.id;
      btn.textContent = entry.card.t;
      btn.addEventListener("click", function () { matchSelectName(btn); });
      namesBox.appendChild(btn);
    });
    shuffle(chosen.slice()).forEach(function (entry) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-item";
      btn.dataset.id = entry.id;
      renderMathInline(btn, entry.card.f);
      btn.addEventListener("click", function () { matchPickFormula(btn); });
      formulasBox.appendChild(btn);
    });
    matchMeta();
  }
  function matchBtn(containerId, id) {
    var found = null;
    byId(containerId).querySelectorAll(".match-item").forEach(function (b) {
      if (b.dataset.id === id) found = b;
    });
    return found;
  }
  function matchSelectName(btn) {
    if (btn.disabled) return;
    byId("matchNames").querySelectorAll(".match-item").forEach(function (b) { b.classList.remove("is-selected"); });
    btn.classList.add("is-selected");
    state.match.selectedId = btn.dataset.id;
    resetFeedback("matchFeedback");
  }
  function matchPickFormula(btn) {
    if (btn.disabled) return;
    if (!state.match.selectedId) {
      byId("matchFeedback").textContent = "Сначала выберите название слева.";
      byId("matchFeedback").className = "feedback feedback--info";
      return;
    }
    var id = btn.dataset.id;
    var nameBtn = matchBtn("matchNames", state.match.selectedId);
    if (id === state.match.selectedId) {
      state.match.matched[id] = true;
      if (nameBtn) { nameBtn.classList.remove("is-selected"); nameBtn.classList.add("is-matched"); nameBtn.disabled = true; }
      btn.classList.add("is-matched");
      btn.disabled = true;
      state.match.selectedId = null;
      if (Object.keys(state.match.matched).length === state.match.set.length) {
        state.stats.matchOk++;
        save(LS.stats, state.stats);
        byId("matchNext").disabled = false;
        byId("matchFeedback").textContent = "Раунд собран!";
        byId("matchFeedback").className = "feedback feedback--ok";
      }
      matchMeta();
    } else {
      state.stats.matchBad++;
      save(LS.stats, state.stats);
      if (nameBtn) nameBtn.classList.add("is-wrong");
      btn.classList.add("is-wrong");
      state.match.selectedId = null;
      matchMeta();
      window.setTimeout(function () {
        if (nameBtn) nameBtn.classList.remove("is-wrong", "is-selected");
        btn.classList.remove("is-wrong");
      }, 550);
    }
  }
  function matchMeta() {
    var s = state.stats;
    byId("matchMeta").textContent = "Собрано пар " + s.matchOk + " · Ошибок " + s.matchBad;
    byId("matchReset").disabled = (s.matchOk + s.matchBad) === 0;
  }

  /* ============ Режим «Формулы» (название → формула) ============ */
  function formulaNewOrder() {
    state.formula.order = shuffle(CARD_ENTRIES.map(function (_, i) { return i; }));
    state.formula.pos = 0;
  }
  function formulaDistractors(entry) {
    var same = shuffle(window.CARDS.filter(function (c) { return c.s === entry.card.s && c.f !== entry.card.f; }));
    var res = [];
    for (var i = 0; i < same.length && res.length < 3; i++) {
      if (res.indexOf(same[i].f) === -1) res.push(same[i].f);
    }
    var all = shuffle(window.CARDS.map(function (c) { return c.f; }));
    for (var j = 0; j < all.length && res.length < 3; j++) {
      if (all[j] !== entry.card.f && res.indexOf(all[j]) === -1) res.push(all[j]);
    }
    return res;
  }
  function formulaRender() {
    if (!state.formula.order.length) formulaNewOrder();
    var entry = CARD_ENTRIES[state.formula.order[state.formula.pos % state.formula.order.length]];
    state.formula.answered = false;
    byId("formulaSection").textContent = SECTION_TITLE[entry.card.s] || "";
    byId("formulaName").textContent = entry.card.t;
    resetFeedback("formulaFeedback");
    formulaMeta();
    renderMathOptions(byId("formulaOptions"),
      buildChoices(wrapMath(entry.card.f), formulaDistractors(entry), 3),
      function (btn, c) { formulaAnswer(btn, c.ok); });
  }
  function formulaMeta() {
    var s = state.stats;
    byId("formulaMeta").textContent = "Задача " + (state.formula.pos % CARD_ENTRIES.length + 1) +
      " из " + CARD_ENTRIES.length + " · Верно " + s.formulaOk + " · Ошибок " + s.formulaBad;
    byId("formulaReset").disabled = (s.formulaOk + s.formulaBad) === 0;
  }
  function formulaAnswer(btn, ok) {
    if (state.formula.answered) return;
    state.formula.answered = true;
    state.stats[ok ? "formulaOk" : "formulaBad"]++;
    save(LS.stats, state.stats);
    answerOption(byId("formulaOptions"), btn, ok, byId("formulaFeedback"), "Верно!",
      "Неверно — верный вариант выделен.");
    formulaMeta();
  }
  function formulaNext() {
    state.formula.pos++;
    if (state.formula.pos >= state.formula.order.length) formulaNewOrder();
    formulaRender();
  }

  /* ============ Режим «Названия» (формула → название) ============ */
  function namesNewOrder() {
    state.names.order = shuffle(CARD_ENTRIES.map(function (_, i) { return i; }));
    state.names.pos = 0;
  }
  function namesDistractors(entry) {
    var same = shuffle(window.CARDS.filter(function (c) { return c.s === entry.card.s && c.t !== entry.card.t; }));
    var res = [];
    for (var i = 0; i < same.length && res.length < 3; i++) {
      if (res.indexOf(same[i].t) === -1) res.push(same[i].t);
    }
    var all = shuffle(window.CARDS.map(function (c) { return c.t; }));
    for (var j = 0; j < all.length && res.length < 3; j++) {
      if (all[j] !== entry.card.t && res.indexOf(all[j]) === -1) res.push(all[j]);
    }
    return res;
  }
  function namesRender() {
    if (!state.names.order.length) namesNewOrder();
    var entry = CARD_ENTRIES[state.names.order[state.names.pos % state.names.order.length]];
    state.names.answered = false;
    byId("namesSection").textContent = SECTION_TITLE[entry.card.s] || "";
    renderMathInline(byId("namesFormula"), entry.card.f);
    resetFeedback("namesFeedback");
    namesMeta();
    var valid = window.CARDS
      .filter(function (c) { return c.f === entry.card.f; })
      .map(function (c) { return c.t; });
    var distractors = namesDistractors(entry).filter(function (n) { return valid.indexOf(n) === -1; });
    renderOptions(byId("namesOptions"),
      buildChoices(entry.card.t, distractors, 3),
      function (btn, c) { btn.textContent = c.text; },
      function (btn, c) { namesAnswer(btn, c.ok); });
  }
  function namesMeta() {
    var s = state.stats;
    byId("namesMeta").textContent = "Задача " + (state.names.pos % CARD_ENTRIES.length + 1) +
      " из " + CARD_ENTRIES.length + " · Верно " + s.namesOk + " · Ошибок " + s.namesBad;
    byId("namesReset").disabled = (s.namesOk + s.namesBad) === 0;
  }
  function namesAnswer(btn, ok) {
    if (state.names.answered) return;
    state.names.answered = true;
    state.stats[ok ? "namesOk" : "namesBad"]++;
    save(LS.stats, state.stats);
    answerOption(byId("namesOptions"), btn, ok, byId("namesFeedback"), "Верно!",
      "Неверно — верный вариант выделен.");
    namesMeta();
  }
  function namesNext() {
    state.names.pos++;
    if (state.names.pos >= state.names.order.length) namesNewOrder();
    namesRender();
  }

  /* ============ Режим «Задачи» ============ */
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
    var s = state.stats;
    byId("practiceMeta").textContent = "Верно " + s.taskOk + " · Ошибок " + s.taskBad;
  }
  function correctAnswerText(task) {
    if (task.type === "A") return String(task.options[task.correct]).replace(/\$/g, "");
    return String(task.answer);
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
    resetFeedback("practiceFeedback");
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
    state.stats[ok ? "taskOk" : "taskBad"]++;
    var sec = task.section;
    if (!state.stats.taskBySection[sec]) state.stats.taskBySection[sec] = { ok: 0, bad: 0 };
    state.stats.taskBySection[sec][ok ? "ok" : "bad"]++;
    save(LS.stats, state.stats);
    byId("practiceNext").disabled = false;
    var fb = byId("practiceFeedback");
    fb.className = "feedback " + (ok ? "feedback--ok" : "feedback--bad");
    fb.textContent = ok ? "Верно!" : "Неверно. Правильный ответ: " + correctAnswerText(task) + ".";
    byId("practiceSolution").hidden = false;
    appendRich(byId("practiceSolutionBody"), task.explanation || "Решение не указано.");
    practiceMeta();
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

  /* ============ Повторение (SRS, SM-2 lite) ============ */
  function dueEntries() {
    var now = Date.now();
    return CARD_ENTRIES
      .filter(function (e) { var st = state.srs[e.id]; return !st || st.due <= now; })
      .sort(function (a, b) {
        var da = state.srs[a.id] ? state.srs[a.id].due : 0;
        var db = state.srs[b.id] ? state.srs[b.id].due : 0;
        return da - db;
      });
  }
  function dueCount() {
    var now = Date.now();
    return CARD_ENTRIES.reduce(function (n, e) {
      var st = state.srs[e.id];
      return n + (!st || st.due <= now ? 1 : 0);
    }, 0);
  }
  function updateDueBadge() { byId("dueCount").textContent = dueCount(); }
  function schedule(id, grade) {
    var st = state.srs[id] || { ease: 2.5, interval: 0, reps: 0, due: 0 };
    var ease = st.ease, interval = st.interval, reps = st.reps;
    if (grade === "hard") {
      ease = Math.max(1.3, ease - 0.15);
      interval = Math.max(1, Math.round((interval || 1) * 1.2));
    } else if (grade === "good") {
      reps += 1;
      interval = reps === 1 ? 1 : (reps === 2 ? 6 : Math.round((interval || 1) * ease));
    } else {
      ease += 0.15; reps += 1;
      interval = reps <= 1 ? 4 : Math.round((interval || 1) * ease * 1.3);
    }
    state.srs[id] = { ease: ease, interval: interval, reps: reps, due: Date.now() + interval * DAY };
    save(LS.srs, state.srs);
  }
  function renderReview() {
    var slot = byId("reviewSlot"), grades = byId("reviewGrades"), done = byId("reviewDone");
    state.review.queue = dueEntries();
    byId("reviewReset").disabled = Object.keys(state.srs).length === 0;
    if (!state.review.queue.length) {
      slot.innerHTML = "";
      grades.hidden = true;
      done.hidden = false;
      byId("reviewMeta").textContent = "Все карточки на сегодня повторены.";
      return;
    }
    done.hidden = true;
    grades.hidden = false;
    slot.innerHTML = "";
    var entry = state.review.queue[0];
    slot.appendChild(createCard(entry, { review: true }));
    window.requestAnimationFrame(function () { fitAllWithin(slot); });
    byId("reviewMeta").textContent = "К повторению: " + state.review.queue.length +
      " · всего в расписании: " + Object.keys(state.srs).length;
  }
  function reviewGrade(grade) {
    var entry = state.review.queue[0];
    if (!entry) return;
    schedule(entry.id, grade);
    updateDueBadge();
    renderReview();
  }

  /* ============ Генератор варианта и экзамен ============ */
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
    window.EXAM.spec.forEach(function (sp) { partA = partA.concat(pickTasks(sp.section, "A", sp.A, used)); });
    window.EXAM.spec.forEach(function (sp) { partB = partB.concat(pickTasks(sp.section, "B", sp.B, used)); });
    var order = partA.concat(partB).map(function (t) { return t.id; });
    order.sort(function (a, b) {
      return LEVEL_RANK[TASK_BY_ID[a].level] - LEVEL_RANK[TASK_BY_ID[b].level];
    });
    return order;
  }
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
  var live = null, timerId = null;
  function startExam(fresh) {
    if (fresh || !live) {
      live = {
        startedAt: Date.now(),
        endsAt: Date.now() + window.EXAM.durationMin * 60000,
        order: generateVariant(),
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
    byId("examProgressText").textContent = "Отвечено " + answeredCount() + " из " + live.order.length;
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
      byId("examInput").value = stored === undefined ? "" : stored;
    }
  }
  function examSelect(index) {
    live.answers[live.order[live.current]] = index;
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
    return {
      id: "att-" + Date.now(),
      date: Date.now(),
      order: data.order.slice(),
      answers: JSON.parse(JSON.stringify(data.answers)),
      primary: correct,
      test: window.RIKZ.table[Math.min(correct, window.RIKZ.table.length - 1)],
      bySection: bySection,
      details: details
    };
  }

  /* ============ Результаты и разбор ============ */
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
      fill.style.background = pct < 50 ? "var(--bad)" : (pct < 80 ? "var(--warn)" : "var(--ok)");
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
      var userText = d.user === undefined || normalizeAnswer(d.user) === "" ? "— (нет ответа)"
        : (task.type === "A" ? String(task.options[d.user]).replace(/\$/g, "") : String(d.user));
      var u = document.createElement("span");
      u.className = "u";
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
      id: "cubic", name: "Кубическая: y = ax³ + b",
      coefs: [{ k: "a", v: 1, min: -2, max: 2, step: 0.25 }, { k: "b", v: 0, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { return c.a * x * x * x + c.b; },
      tex: function (c) { return "y = " + mul(c.a, "x^3") + add(c.b); }
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
      id: "expo", name: "Показательная: y = A·kˣ",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 3, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.pow(c.k, x); },
      tex: function (c) { return "y = " + mul(c.A, fmtNum(c.k) + "^{x}"); }
    },
    {
      id: "log", name: "Логарифмическая: y = A·log_k x",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 5, step: 0.5 }],
      ev: function (x, c) { return x <= 0 ? NaN : c.A * Math.log(x) / Math.log(c.k); },
      tex: function (c) { return "y = " + mul(c.A, "\\log_{" + fmtNum(c.k) + "} x"); }
    },
    {
      id: "sine", name: "Синусоида: y = A·sin(kx)",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.sin(c.k * x); },
      tex: function (c) { return "y = " + mul(c.A, "\\sin(" + fmtNum(c.k) + "x)"); }
    },
    {
      id: "cosine", name: "Косинусоида: y = A·cos(kx)",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.cos(c.k * x); },
      tex: function (c) { return "y = " + mul(c.A, "\\cos(" + fmtNum(c.k) + "x)"); }
    },
    {
      id: "tangent", name: "Тангенсоида: y = A·tg(kx)",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.tan(c.k * x); },
      tex: function (c) { return "y = " + mul(c.A, "\\operatorname{tg}(" + fmtNum(c.k) + "x)"); }
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
    if (!ctx) return;
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
    for (var px = 0; px <= W; px += 1) {
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
    state.mode = mode;
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.dataset.mode === mode);
    });
    byId("viewCards").hidden = mode !== "cards";
    byId("viewMatch").hidden = mode !== "match";
    byId("viewFormulas").hidden = mode !== "formulas";
    byId("viewNames").hidden = mode !== "names";
    byId("viewTasks").hidden = mode !== "tasks";
    byId("viewExam").hidden = mode !== "exam";
    byId("viewHistory").hidden = mode !== "history";
    byId("viewReview").hidden = mode !== "review";
    byId("viewGraph").hidden = mode !== "graph";
    byId("progress").style.display = mode === "cards" ? "" : "none";

    if (mode === "cards") renderBrowse();
    else if (mode === "match") matchNewRound();
    else if (mode === "formulas") { if (!state.formula.order.length) formulaNewOrder(); formulaRender(); }
    else if (mode === "names") { if (!state.names.order.length) namesNewOrder(); namesRender(); }
    else if (mode === "tasks") renderPractice();
    else if (mode === "exam") refreshResumeBtn();
    else if (mode === "history") renderHistory();
    else if (mode === "review") renderReview();
    else if (mode === "graph") window.requestAnimationFrame(drawGraph);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function refreshResumeBtn() {
    var btn = byId("examResumeBtn");
    btn.hidden = !(live && live.endsAt > Date.now());
  }

  /* ============ Инициализация ============ */
  function init() {
    var savedLive = load(LS.live, null);
    if (savedLive && savedLive.endsAt > Date.now() && savedLive.order && savedLive.order.length) {
      live = savedLive;
    } else if (savedLive) {
      try { localStorage.removeItem(LS.live); } catch (e) { /* недоступно */ }
    }

    buildChips();
    buildPracticeChips();
    renderExamSpecGrid();
    buildGraphControls();
    renderBrowse();
    updateProgress();
    updateDueBadge();
    matchMeta();
    renderPractice();

    byId("tabs").addEventListener("click", function (e) {
      var tab = e.target.closest(".tab");
      if (tab) setMode(tab.dataset.mode);
    });

    byId("shuffleBtn").addEventListener("click", function () {
      state.shuffled = true; renderBrowse();
    });
    byId("resetBtn").addEventListener("click", function () {
      if (!state.known.size) return;
      if (!window.confirm("Сбросить прогресс изучения карточек?")) return;
      state.known.clear(); save(LS.known, []);
      renderBrowse(); updateProgress();
    });

    byId("matchNext").addEventListener("click", matchNewRound);
    byId("matchReset").addEventListener("click", function () {
      if ((state.stats.matchOk + state.stats.matchBad) === 0) return;
      if (!window.confirm("Сбросить прогресс в режиме «Соответствие»?")) return;
      state.stats.matchOk = 0; state.stats.matchBad = 0;
      save(LS.stats, state.stats);
      matchNewRound();
    });

    byId("formulaNext").addEventListener("click", formulaNext);
    byId("formulaReset").addEventListener("click", function () {
      if ((state.stats.formulaOk + state.stats.formulaBad) === 0) return;
      if (!window.confirm("Сбросить прогресс в режиме «Формулы»?")) return;
      state.stats.formulaOk = 0; state.stats.formulaBad = 0;
      save(LS.stats, state.stats);
      formulaNewOrder(); formulaRender();
    });

    byId("namesNext").addEventListener("click", namesNext);
    byId("namesReset").addEventListener("click", function () {
      if ((state.stats.namesOk + state.stats.namesBad) === 0) return;
      if (!window.confirm("Сбросить прогресс в режиме «Названия»?")) return;
      state.stats.namesOk = 0; state.stats.namesBad = 0;
      save(LS.stats, state.stats);
      namesNewOrder(); namesRender();
    });

    byId("practiceNext").addEventListener("click", practiceNext);
    byId("practiceCheck").addEventListener("click", practiceCheckB);
    byId("practiceInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") practiceCheckB();
    });
    byId("practiceReset").addEventListener("click", function () {
      if (!window.confirm("Сбросить прогресс в режиме «Задачи»?")) return;
      state.stats.taskOk = 0; state.stats.taskBad = 0; state.stats.taskBySection = {};
      save(LS.stats, state.stats);
      practiceNewOrder();
      renderPractice();
    });

    byId("examStartBtn").addEventListener("click", function () {
      if (live && !window.confirm("Уже есть незавершённый экзамен. Начать новый и сбросить текущий?")) return;
      startExam(true);
    });
    byId("examResumeBtn").addEventListener("click", function () { startExam(false); });
    byId("examFinish").addEventListener("click", function () { finishExam(false); });
    byId("examPrev").addEventListener("click", function () { examGo(-1); });
    byId("examNext").addEventListener("click", function () { examGo(1); });
    byId("examInput").addEventListener("input", function () {
      if (!live) return;
      live.answers[live.order[live.current]] = byId("examInput").value;
      save(LS.live, live);
      renderExamNav();
    });

    byId("reviewGrades").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-grade]");
      if (btn) reviewGrade(btn.dataset.grade);
    });
    byId("reviewReset").addEventListener("click", function () {
      if (!Object.keys(state.srs).length) return;
      if (!window.confirm("Сбросить расписание повторений?")) return;
      state.srs = {}; save(LS.srs, state.srs);
      updateDueBadge(); renderReview();
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
        fitAllWithin(document);
        if (state.mode === "formulas") fitOptions(byId("formulaOptions"));
        if (state.mode === "names") fitOptions(byId("namesOptions"));
        if (state.mode === "graph") drawGraph();
      }, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        fitAllWithin(document);
        if (state.mode === "graph") drawGraph();
      });
    }
  }

  init();
})();

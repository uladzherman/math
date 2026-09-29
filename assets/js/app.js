(function () {
  "use strict";

  var LS = {
    known: "math-trainer-known-v1",
    srs: "math-trainer-srs-v1",
    stats: "math-trainer-stats-v1"
  };
  var KATEX_DISPLAY = { throwOnError: false, displayMode: true, strict: "ignore", trust: false };
  var KATEX_INLINE = { throwOnError: false, displayMode: false, strict: "ignore", trust: false };
  var DAY = 86400000;

  var SECTION_TITLE = {};
  window.SECTIONS.forEach(function (s) { SECTION_TITLE[s.id] = s.title; });

  function cardId(card) { return card.s + "::" + card.t; }
  var CARD_ENTRIES = window.CARDS.map(function (c) { return { card: c, id: cardId(c) }; });

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

  var STAT_KEYS = ["matchOk", "matchBad", "formulaOk", "formulaBad", "namesOk", "namesBad"];
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
      appendRich(span, wrapMath(c.text));
      btn.appendChild(span);
    }, onPick);
    window.requestAnimationFrame(function () { fitOptions(box); });
  }
  function answerOption(box, btn, ok, feedbackEl) {
    box.querySelectorAll(".option").forEach(function (b) {
      b.disabled = true;
      if (b.dataset.correct) b.classList.add("is-correct");
    });
    if (!ok) btn.classList.add("is-wrong");
    feedbackEl.textContent = ok ? "Верно!" : "Неверно — верный вариант выделен.";
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
    answerOption(byId("formulaOptions"), btn, ok, byId("formulaFeedback"));
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
    answerOption(byId("namesOptions"), btn, ok, byId("namesFeedback"));
    namesMeta();
  }
  function namesNext() {
    state.names.pos++;
    if (state.names.pos >= state.names.order.length) namesNewOrder();
    namesRender();
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

  /* ============ Графики ============ */
  var GRAPH_KINDS = [
    {
      id: "line", name: "Линейная: y = kx + b",
      coefs: [{ k: "k", v: 1, min: -5, max: 5, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.k * x + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "x") + add(c.b); }
    },
    {
      id: "quad", name: "Квадратичная: y = ax² + bx + c",
      coefs: [{ k: "a", v: 1, min: -3, max: 3, step: 0.25 }, { k: "b", v: 0, min: -6, max: 6, step: 0.5 }, { k: "c", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.a * x * x + c.b * x + c.c; },
      tex: function (c) { return "y = " + mul(c.a, "x^2") + addMul(c.b, "x") + add(c.c); }
    },
    {
      id: "cubic", name: "Кубическая: y = ax³ + b",
      coefs: [{ k: "a", v: 1, min: -2, max: 2, step: 0.25 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.a * x * x * x + c.b; },
      tex: function (c) { return "y = " + mul(c.a, "x^3") + add(c.b); }
    },
    {
      id: "hyper", name: "Обратная пропорциональность: y = k/x + b",
      coefs: [{ k: "k", v: 1, min: -6, max: 6, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.k / x + c.b; },
      tex: function (c) { return "y = \\dfrac{" + c.k + "}{x}" + add(c.b); }
    },
    {
      id: "sqrt", name: "Корень: y = k·√x + b",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return x < 0 ? NaN : c.k * Math.sqrt(x) + c.b; },
      tex: function (c) { return "y = " + c.k + "\\sqrt{x}" + add(c.b); }
    },
    {
      id: "abs", name: "Модуль: y = k|x| + b",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.k * Math.abs(x) + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "|x|") + add(c.b); }
    },
    {
      id: "expo", name: "Показательная: y = A·kˣ + b",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 3, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.pow(c.k, x) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, fmtNum(c.k) + "^{x}") + add(c.b); }
    },
    {
      id: "log", name: "Логарифмическая: y = A·log_k x + b",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 5, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return x <= 0 ? NaN : c.A * Math.log(x) / Math.log(c.k) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, "\\log_{" + fmtNum(c.k) + "} x") + add(c.b); }
    },
    {
      id: "sine", name: "Синусоида: y = A·sin(kx) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.sin(c.k * x) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, "\\sin(" + fmtNum(c.k) + "x)") + add(c.b); }
    },
    {
      id: "cosine", name: "Косинусоида: y = A·cos(kx) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.cos(c.k * x) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, "\\cos(" + fmtNum(c.k) + "x)") + add(c.b); }
    },
    {
      id: "tangent", name: "Тангенсоида: y = A·tg(kx) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }, { k: "b", v: 0, min: -10, max: 10, step: 0.5 }],
      ev: function (x, c) { return c.A * Math.tan(c.k * x) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, "\\operatorname{tg}(" + fmtNum(c.k) + "x)") + add(c.b); }
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

  var GRAPH_BASE_RANGE = 10;
  var graphState = { kind: GRAPH_KINDS[0].id, values: {}, center: { x: 0, y: 0 }, wpp: (2 * GRAPH_BASE_RANGE) / 640, rangeX: GRAPH_BASE_RANGE, zoom: 1 };
  function graphKind() {
    var found = GRAPH_KINDS[0];
    GRAPH_KINDS.forEach(function (g) { if (g.id === graphState.kind) found = g; });
    return found;
  }
  function updateZoomLabel() {
    var el = byId("graphZoomVal");
    if (el) el.textContent = "×" + String(Math.round(graphState.zoom * 10) / 10).replace(".", ",");
  }
  function setZoom(z, skipDraw) {
    if (isNaN(z)) return;
    z = Math.min(6, Math.max(0.2, z));
    graphState.zoom = z;
    graphState.rangeX = GRAPH_BASE_RANGE / z;
    var zoom = byId("graphZoom");
    if (zoom) zoom.value = z;
    updateZoomLabel();
    if (!skipDraw) drawGraph();
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
      graphState.cursorX = undefined;
      buildGraphCoefs();
      drawGraph();
    });
    buildGraphCoefs();
    var zoom = byId("graphZoom");
    if (zoom) {
      zoom.value = graphState.zoom;
      zoom.addEventListener("input", function () { setZoom(parseFloat(zoom.value)); });
      updateZoomLabel();
    }
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

      var row = document.createElement("div");
      row.className = "coef__row";

      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = c.min; slider.max = c.max; slider.step = c.step;
      slider.value = vals[c.k];

      var num = document.createElement("input");
      num.type = "number";
      num.className = "coef__num";
      num.step = c.step;
      num.value = vals[c.k];
      num.setAttribute("aria-label", "Коэффициент " + c.k);

      function apply(raw, clamp) {
        var v = parseFloat(String(raw).replace(",", "."));
        if (isNaN(v)) return;
        if (clamp) v = Math.min(c.max, Math.max(c.min, v));
        graphState.values[g.id + ":" + c.k] = v;
        slider.value = v;
        num.value = v;
        label.textContent = c.k + " = " + fmtNum(v);
        drawGraph();
      }
      slider.addEventListener("input", function () { apply(slider.value, false); });
      num.addEventListener("input", function () { apply(num.value, false); });
      num.addEventListener("change", function () { apply(num.value, true); });
      num.addEventListener("blur", function () { apply(num.value, true); });

      row.appendChild(slider); row.appendChild(num);
      wrap.appendChild(label); wrap.appendChild(row);
      box.appendChild(wrap);
    });
  }
  function niceStep(range) {
    var raw = range / 6;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / p;
    var s = n < 1.5 ? 1 : (n < 3.5 ? 2 : (n < 7.5 ? 5 : 10));
    return s * p;
  }
  function fmtTick(v, step) {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
    var dec = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(dec).replace(".", ",");
  }
  function fmtCoord(v) { return String(Math.round(v * 100) / 100).replace(".", ","); }

  function drawGraph() {
    var canvas = byId("graphCanvas");
    var wrapEl = canvas.parentNode;
    var cs = getComputedStyle(wrapEl);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var cssW = Math.floor(wrapEl.clientWidth - padL - padR);
    if (cssW <= 0) cssW = Math.min(720, Math.max(280, (window.innerWidth || 640) - 60));
    var cssH = Math.round(cssW * 0.72);
    if (cssH < 240) cssH = 240;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW, H = cssH;
    var rangeX = graphState.rangeX;
    var rangeY = rangeX * (H / W);
    var cx = graphState.center.x, cy = graphState.center.y;
    var xToPx = function (x) { return W / 2 + (x - cx) * (W / (2 * rangeX)); };
    var yToPx = function (y) { return H / 2 - (y - cy) * (H / (2 * rangeY)); };
    graphState.wpp = (2 * rangeX) / W;

    var css = getComputedStyle(document.body);
    var colMuted = css.getPropertyValue("--muted").trim() || "#6b7488";
    var colBorder = css.getPropertyValue("--border").trim() || "#e3e8f0";
    var colAccent = css.getPropertyValue("--accent").trim() || "#3b5bdb";

    ctx.clearRect(0, 0, W, H);

    var step = niceStep(rangeX);
    var k0 = Math.ceil((cx - rangeX) / step), k1 = Math.floor((cx + rangeX) / step);
    var j0 = Math.ceil((cy - rangeY) / step), j1 = Math.floor((cy + rangeY) / step);

    ctx.strokeStyle = colBorder;
    ctx.lineWidth = 1;
    for (var k = k0; k <= k1; k++) {
      var X = xToPx(k * step);
      ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    }
    for (var j = j0; j <= j1; j++) {
      var Y = yToPx(j * step);
      ctx.beginPath(); ctx.moveTo(0, Y); ctx.lineTo(W, Y); ctx.stroke();
    }

    ctx.strokeStyle = colMuted;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, yToPx(0)); ctx.lineTo(W, yToPx(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xToPx(0), 0); ctx.lineTo(xToPx(0), H); ctx.stroke();

    ctx.fillStyle = colMuted;
    ctx.font = "12px -apple-system, sans-serif";
    var axisY = yToPx(0), axisX = xToPx(0);
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    if (axisY >= 0 && axisY <= H) {
      for (var lk = k0; lk <= k1; lk++) {
        if (lk === 0) continue;
        ctx.fillText(fmtTick(lk * step, step), xToPx(lk * step), axisY + 4);
      }
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    if (axisX >= 0 && axisX <= W) {
      for (var lj = j0; lj <= j1; lj++) {
        if (lj === 0) continue;
        ctx.fillText(fmtTick(lj * step, step), axisX - 5, yToPx(lj * step));
      }
    }
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText("0", axisX - 3, axisY + 3);

    var g = graphKind();
    var vals = currentValues();
    ctx.strokeStyle = colAccent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    var started = false;
    for (var px = 0; px <= W; px += 1) {
      var x = cx + (px - W / 2) * (2 * rangeX) / W;
      var y;
      try { y = g.ev(x, vals); } catch (e) { y = NaN; }
      if (y === null || isNaN(y) || !isFinite(y) || y < cy - rangeY * 3 || y > cy + rangeY * 3) {
        started = false;
        continue;
      }
      var py = yToPx(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    if (graphState.cursorX !== undefined) {
      var mx = graphState.cursorX, my;
      try { my = g.ev(mx, vals); } catch (e) { my = NaN; }
      if (isFinite(my)) {
        var mpx = xToPx(mx), mpy = yToPx(my);
        ctx.fillStyle = colAccent;
        ctx.beginPath(); ctx.arc(mpx, mpy, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colMuted;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(mpx, yToPx(0)); ctx.lineTo(mpx, mpy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xToPx(0), mpy); ctx.lineTo(mpx, mpy); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    appendRich(byId("graphFormula"), "$" + g.tex(vals) + "$");
    updateReadout();
  }

  function updateReadout() {
    var el = byId("graphReadout");
    if (!el) return;
    if (graphState.cursorX === undefined) {
      el.textContent = "Наведите курсор на график, чтобы увидеть координаты точки.";
      return;
    }
    var g = graphKind();
    var vals = currentValues();
    var x = graphState.cursorX, y;
    try { y = g.ev(x, vals); } catch (e) { y = NaN; }
    var yText = (y === null || isNaN(y) || !isFinite(y)) ? "не определена" : fmtCoord(y);
    el.textContent = "Точка на графике:  x = " + fmtCoord(x) + ",  y = " + yText;
  }

  /* ============ Перетаскивание и наведение ============ */
  var graphDrag = null;
  function setupGraphPan() {
    var canvas = byId("graphCanvas");
    if (!canvas) return;
    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", function (e) {
      graphDrag = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      if (e.preventDefault) e.preventDefault();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (graphDrag) {
        var dx = e.clientX - graphDrag.x;
        var dy = e.clientY - graphDrag.y;
        graphDrag.x = e.clientX;
        graphDrag.y = e.clientY;
        var wpp = graphState.wpp || (2 * graphState.rangeX) / 640;
        graphState.center.x -= dx * wpp;
        graphState.center.y += dy * wpp;
        graphState.cursorX = undefined;
        drawGraph();
      } else {
        var rect = canvas.getBoundingClientRect();
        var px = e.clientX - rect.left;
        var W = canvas.clientWidth || 640;
        graphState.cursorX = graphState.center.x + (px - W / 2) * (2 * graphState.rangeX) / W;
        drawGraph();
      }
      if (e.preventDefault) e.preventDefault();
    });
    function endDrag(e) {
      if (!graphDrag) return;
      graphDrag = null;
      canvas.style.cursor = "grab";
      if (canvas.releasePointerCapture && e && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    }
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("lostpointercapture", endDrag);
    canvas.addEventListener("pointerleave", function () {
      if (graphDrag) return;
      graphState.cursorX = undefined;
      drawGraph();
    });
    canvas.addEventListener("wheel", function (e) {
      if (e.preventDefault) e.preventDefault();
      var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      setZoom(graphState.zoom * factor);
    }, { passive: false });
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
    byId("viewReview").hidden = mode !== "review";
    byId("viewGraph").hidden = mode !== "graph";
    byId("progress").style.display = mode === "cards" ? "" : "none";

    if (mode === "cards") renderBrowse();
    else if (mode === "match") matchNewRound();
    else if (mode === "formulas") { if (!state.formula.order.length) formulaNewOrder(); formulaRender(); }
    else if (mode === "names") { if (!state.names.order.length) namesNewOrder(); namesRender(); }
    else if (mode === "review") renderReview();
    else if (mode === "graph") window.requestAnimationFrame(drawGraph);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ============ Инициализация ============ */
  function init() {
    buildChips();
    buildGraphControls();
    renderBrowse();
    updateProgress();
    updateDueBadge();
    matchMeta();

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
      graphState.center = { x: 0, y: 0 };
      graphState.cursorX = undefined;
      setZoom(1, true);
      buildGraphCoefs();
      drawGraph();
    });

    setupGraphPan();

    if (typeof ResizeObserver !== "undefined") {
      var graphWrap = byId("graphCanvas").parentNode;
      if (graphWrap) {
        new ResizeObserver(function () {
          if (state.mode === "graph") drawGraph();
        }).observe(graphWrap);
      }
    }

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

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
  var SVG_NS = "http://www.w3.org/2000/svg";

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

  var STAT_KEYS = ["matchOk", "matchBad", "formulaOk", "formulaBad", "namesOk", "namesBad", "readOk", "readBad"];
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
    if (card.g && !opts.review) {
      var gbtn = document.createElement("button");
      gbtn.type = "button";
      gbtn.className = "known-btn";
      gbtn.textContent = "Построить график";
      gbtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openGraphKind(card.g);
      });
      actions.appendChild(gbtn);
    }
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
    window.requestAnimationFrame(drawMatchLines);
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
      window.requestAnimationFrame(drawMatchLines);
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
  function drawMatchLines() {
    var svg = byId("matchLines");
    var wrap = svg && svg.parentNode;
    if (!svg || !wrap) return;
    var wrect = wrap.getBoundingClientRect();
    if (!wrect.width || !wrect.height) { svg.innerHTML = ""; return; }
    svg.setAttribute("viewBox", "0 0 " + wrect.width + " " + wrect.height);
    svg.innerHTML = "";

    var defs = document.createElementNS(SVG_NS, "defs");
    var marker = document.createElementNS(SVG_NS, "marker");
    marker.setAttribute("id", "matchArrow");
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "8");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto-start-reverse");
    var tip = document.createElementNS(SVG_NS, "path");
    tip.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    tip.setAttribute("class", "match__arrow");
    marker.appendChild(tip);
    defs.appendChild(marker);
    svg.appendChild(defs);

    Object.keys(state.match.matched).forEach(function (id) {
      var n = matchBtn("matchNames", id), f = matchBtn("matchFormulas", id);
      if (!n || !f) return;
      var nr = n.getBoundingClientRect(), fr = f.getBoundingClientRect();
      var x1 = nr.right - wrect.left, y1 = nr.top + nr.height / 2 - wrect.top;
      var x2 = fr.left - wrect.left, y2 = fr.top + fr.height / 2 - wrect.top;
      var mid = (x1 + x2) / 2;
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", "M " + x1 + " " + y1 +
        " C " + mid + " " + y1 + ", " + mid + " " + y2 + ", " + x2 + " " + y2);
      path.setAttribute("class", "match__line");
      path.setAttribute("marker-end", "url(#matchArrow)");
      svg.appendChild(path);
    });
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
      id: "line", name: "Линейная: y = k(x − a) + b",
      coefs: [{ k: "k", v: 1, min: -5, max: 5, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return c.k * X + c.b; },
      tex: function (c) { return "y = " + mul(c.k, shiftX(c.a)) + add(c.b); }
    },
    {
      id: "quad", name: "Квадратичная: y = k(x − a)² + p(x − a) + b",
      coefs: [{ k: "k", v: 1, min: -3, max: 3, step: 0.25 }, { k: "p", v: 0, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return c.k * X * X + c.p * X + c.b; },
      tex: function (c) { return "y = " + mul(c.k, shiftX(c.a) + "^2") + addMul(c.p, shiftX(c.a)) + add(c.b); }
    },
    {
      id: "cubic", name: "Кубическая: y = k(x − a)³ + b",
      coefs: [{ k: "k", v: 1, min: -2, max: 2, step: 0.25 }],
      ev: function (x, c) { var X = x - c.a; return c.k * X * X * X + c.b; },
      tex: function (c) { return "y = " + mul(c.k, shiftX(c.a) + "^3") + add(c.b); }
    },
    {
      id: "hyper", name: "Обратная пропорциональность: y = k/(x − a) + b",
      coefs: [{ k: "k", v: 1, min: -6, max: 6, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return X === 0 ? NaN : c.k / X + c.b; },
      tex: function (c) { return "y = \\dfrac{" + c.k + "}{" + shiftX(c.a) + "}" + add(c.b); }
    },
    {
      id: "sqrt", name: "Корень: y = k·√(x − a) + b",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return X < 0 ? NaN : c.k * Math.sqrt(X) + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "\\sqrt{" + shiftX(c.a) + "}") + add(c.b); }
    },
    {
      id: "abs", name: "Модуль: y = k|x − a| + b",
      coefs: [{ k: "k", v: 1, min: -4, max: 4, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return c.k * Math.abs(X) + c.b; },
      tex: function (c) { return "y = " + mul(c.k, "|" + shiftX(c.a) + "|") + add(c.b); }
    },
    {
      id: "expo", name: "Показательная: y = A·k^(x − a) + b",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 3, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return c.A * Math.pow(c.k, X) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, fmtNum(c.k) + "^{" + shiftX(c.a) + "}") + add(c.b); }
    },
    {
      id: "log", name: "Логарифмическая: y = A·log_k(x − a) + b",
      coefs: [{ k: "A", v: 1, min: -4, max: 4, step: 0.5 }, { k: "k", v: 2, min: 0.5, max: 5, step: 0.5 }],
      ev: function (x, c) { var X = x - c.a; return X <= 0 ? NaN : c.A * Math.log(X) / Math.log(c.k) + c.b; },
      tex: function (c) { return "y = " + mul(c.A, "\\log_{" + fmtNum(c.k) + "}" + shiftX(c.a)) + add(c.b); }
    },
    {
      id: "sine", name: "Синусоида: y = A·sin(k(x − a)) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { var a = c.unit === "deg" ? c.a * Math.PI / 180 : c.a; var X = x - a; return c.A * Math.sin(c.k * X) + c.b; },
      tex: function (c) { return trigTex("\\sin", c); }
    },
    {
      id: "cosine", name: "Косинусоида: y = A·cos(k(x − a)) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { var a = c.unit === "deg" ? c.a * Math.PI / 180 : c.a; var X = x - a; return c.A * Math.cos(c.k * X) + c.b; },
      tex: function (c) { return trigTex("\\cos", c); }
    },
    {
      id: "tangent", name: "Тангенсоида: y = A·tg(k(x − a)) + b",
      coefs: [{ k: "A", v: 1, min: -3, max: 3, step: 0.5 }, { k: "k", v: 1, min: -2, max: 2, step: 0.5 }],
      ev: function (x, c) { var a = c.unit === "deg" ? c.a * Math.PI / 180 : c.a; var X = x - a; return c.A * Math.tan(c.k * X) + c.b; },
      tex: function (c) { return trigTex("\\operatorname{tg}", c); }
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
  function shiftX(a, deg) {
    var u = deg ? "°" : "";
    if (a === 0) return "x";
    return a > 0 ? "(x - " + fmtNum(a) + u + ")" : "(x + " + fmtNum(Math.abs(a)) + u + ")";
  }
  function trigShiftArg(a, deg) {
    if (a === 0) return "x";
    var num = deg ? (fmtNum(Math.abs(a)) + "°") : piLabel(Math.abs(a));
    return a > 0 ? "(x - " + num + ")" : "(x + " + num + ")";
  }
  function trigTex(name, c) {
    var deg = c.unit === "deg";
    var inner = (c.k === 1 ? "" : fmtNum(c.k)) + trigShiftArg(c.a, deg);
    return "y = " + mul(c.A, name + "(" + inner + ")") + add(c.b);
  }
  function transformCoefs(kindId) {
    var trig = isTrig(kindId);
    var deg = graphState.unit === "deg";
    var aSpec;
    if (trig && deg) {
      aSpec = { k: "a", v: 0, min: -360, max: 360, step: 15, cap: "сдвиг по x, °",
        show: function (v) { return fmtNum(v) + "°"; } };
    } else if (trig) {
      aSpec = { k: "a", v: 0, min: -2 * Math.PI, max: 2 * Math.PI, step: Math.PI / 12, cap: "сдвиг по x, кратно π",
        show: piLabel };
    } else {
      aSpec = { k: "a", v: 0, min: -10, max: 10, step: 0.5, cap: "сдвиг по x" };
    }
    return [aSpec, { k: "b", v: 0, min: -10, max: 10, step: 0.5, cap: "сдвиг по y" }];
  }

  var GRAPH_BASE_RANGE = 10;
  var graphState = { kind: GRAPH_KINDS[0].id, values: {}, center: { x: 0, y: 0 }, wpp: (2 * GRAPH_BASE_RANGE) / 640, rangeX: GRAPH_BASE_RANGE, zoom: 1, absX: false, absY: false, unit: "rad" };
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
    transformCoefs(g.id).forEach(function (c) {
      var s = graphState.values["shift:" + c.k];
      v[c.k] = s === undefined ? c.v : s;
    });
    v.unit = graphState.unit;
    return v;
  }
  function renderCoefGroup(box, list, prefix) {
    list.forEach(function (c) {
      var stored = graphState.values[prefix + c.k];
      var cur = stored === undefined ? c.v : stored;
      var wrap = document.createElement("div");
      wrap.className = "coef";
      var label = document.createElement("label");
      label.className = "coef__label";
      label.textContent = c.k + " = " + (c.show ? c.show(cur) : fmtNum(cur)) + (c.cap ? "  (" + c.cap + ")" : "");

      var row = document.createElement("div");
      row.className = "coef__row";
      var slider = document.createElement("input");
      slider.type = "range";
      slider.min = c.min; slider.max = c.max; slider.step = c.step;
      slider.value = cur;
      var num = document.createElement("input");
      num.type = "number";
      num.className = "coef__num";
      num.step = c.step;
      num.value = cur;
      num.setAttribute("aria-label", "Коэффициент " + c.k);

      function apply(raw, clamp) {
        var v = parseFloat(String(raw).replace(",", "."));
        if (isNaN(v)) return;
        if (clamp) v = Math.min(c.max, Math.max(c.min, v));
        graphState.values[prefix + c.k] = v;
        slider.value = v;
        num.value = v;
        label.textContent = c.k + " = " + (c.show ? c.show(v) : fmtNum(v)) + (c.cap ? "  (" + c.cap + ")" : "");
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
  function buildGraphCoefs() {
    var box = byId("graphCoefs");
    box.innerHTML = "";
    var g = graphKind();
    renderCoefGroup(box, g.coefs, g.id + ":");
    var head = document.createElement("p");
    head.className = "coef__heading";
    head.textContent = "Преобразования: f(x − a) + b";
    box.appendChild(head);
    renderCoefGroup(box, transformCoefs(g.id), "shift:");
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
  function pickStep(candidates, span) {
    var best = candidates[candidates.length - 1], bestScore = Infinity;
    candidates.forEach(function (s) {
      var n = span / s;
      var score = Math.abs(n - 8);
      if (n >= 4 && n <= 14 && score < bestScore) { bestScore = score; best = s; }
    });
    return best;
  }
  var PI_DENS = [1, 2, 3, 4, 6, 12];
  function piLabel(v) {
    if (Math.abs(v) < 1e-9) return "0";
    var ratio = v / Math.PI;
    for (var i = 0; i < PI_DENS.length; i++) {
      var q = PI_DENS[i], p = Math.round(ratio * q);
      if (p !== 0 && Math.abs(ratio - p / q) < 1e-3) {
        var sign = p < 0 ? "−" : "";
        var ap = Math.abs(p);
        var num = ap === 1 ? "π" : ap + "π";
        return sign + (q === 1 ? num : num + "/" + q);
      }
    }
    return fmtNum(Math.round(v * 100) / 100);
  }
  function isTrig(kind) { return kind === "sine" || kind === "cosine" || kind === "tangent"; }
  function fmtCoord(v) { return String(Math.round(v * 100) / 100).replace(".", ","); }

  /* ============ Свойства функции ============ */
  function graphEval(g, v, x) {
    try { var y = g.ev(x, v); return (y === null || isNaN(y)) ? NaN : y; }
    catch (e) { return NaN; }
  }
  function findZeros(g, v, x0, x1) {
    var zs = [], n = 600;
    var prevX = x0, prevY = graphValue(g, v, x0), pf = isFinite(prevY);
    for (var i = 1; i <= n; i++) {
      var x = x0 + (x1 - x0) * i / n, y = graphValue(g, v, x);
      if (pf && isFinite(y)) {
        if (prevY === 0) zs.push(prevX);
        else if (prevY * y < 0) {
          var lo = prevX, hi = x, flo = prevY;
          for (var b = 0; b < 50; b++) {
            var m = (lo + hi) / 2, fm = graphValue(g, v, m);
            if (!isFinite(fm)) break;
            if (flo * fm <= 0) hi = m; else { lo = m; flo = fm; }
          }
          zs.push((lo + hi) / 2);
        }
      }
      prevX = x; prevY = y; pf = isFinite(y);
    }
    return zs.filter(function (z, i, arr) {
      return arr.findIndex(function (w) { return Math.abs(w - z) < 1e-3; }) === i;
    });
  }
  function graphParity(g, v) {
    var even = true, odd = true, n = 0;
    for (var i = 1; i <= 60; i++) {
      var x = i * 0.2;
      var fp = graphValue(g, v, x), fm = graphValue(g, v, -x);
      if (!isFinite(fp) || !isFinite(fm)) continue;
      n++;
      if (Math.abs(fp - fm) > 1e-6) even = false;
      if (Math.abs(fp + fm) > 1e-6) odd = false;
    }
    if (n < 5) return "ни чётная, ни нечётная";
    if (even && odd) return "f(x) = 0";
    if (even) return "чётная: f(−x) = f(x)";
    if (odd) return "нечётная: f(−x) = −f(x)";
    return "ни чётная, ни нечётная";
  }
  function domainText(id, v) {
    switch (id) {
      case "hyper": return "x ≠ " + fmtCoord(v.a);
      case "sqrt": return "x ≥ " + fmtCoord(v.a);
      case "log": return "x > " + fmtCoord(v.a);
      case "tangent": return "x ≠ " + fmtCoord(v.a) + " + π/(2k) + πn/k, n ∈ ℤ";
      default: return "x ∈ ℝ";
    }
  }
  function rangeText(id, v) {
    switch (id) {
      case "line": return v.k === 0 ? ("y = " + fmtCoord(v.b)) : "y ∈ ℝ";
      case "quad":
        if (v.k === 0) return v.p === 0 ? ("y = " + fmtCoord(v.b)) : "y ∈ ℝ";
        var yv = v.b - (v.p * v.p) / (4 * v.k);
        return v.k > 0 ? ("y ≥ " + fmtCoord(yv)) : ("y ≤ " + fmtCoord(yv));
      case "cubic": return "y ∈ ℝ";
      case "hyper": return v.k === 0 ? ("y = " + fmtCoord(v.b)) : ("y ≠ " + fmtCoord(v.b));
      case "sqrt":
      case "abs":
        return v.k === 0 ? ("y = " + fmtCoord(v.b)) : (v.k > 0 ? ("y ≥ " + fmtCoord(v.b)) : ("y ≤ " + fmtCoord(v.b)));
      case "expo": return v.A === 0 ? ("y = " + fmtCoord(v.b)) : (v.A > 0 ? ("y > " + fmtCoord(v.b)) : ("y < " + fmtCoord(v.b)));
      case "log": return "y ∈ ℝ";
      case "sine":
      case "cosine": return "[" + fmtCoord(v.b - Math.abs(v.A)) + "; " + fmtCoord(v.b + Math.abs(v.A)) + "]";
      default: return "y ∈ ℝ";
    }
  }
  function extremumText(id, v) {
    if (id === "quad" && v.k !== 0) {
      var x0 = v.a - v.p / (2 * v.k), y0 = v.b - (v.p * v.p) / (4 * v.k);
      return (v.k > 0 ? "минимум " : "максимум ") + fmtCoord(y0) + " при x = " + fmtCoord(x0);
    }
    if (id === "abs" && v.k !== 0) {
      return (v.k > 0 ? "минимум " : "максимум ") + fmtCoord(v.b) + " при x = " + fmtCoord(v.a);
    }
    if ((id === "sine" || id === "cosine") && v.A !== 0) {
      return "наибольшее " + fmtCoord(v.b + Math.abs(v.A)) + ", наименьшее " + fmtCoord(v.b - Math.abs(v.A));
    }
    return null;
  }
  function asymptoteText(id, v) {
    if (id === "hyper" && v.k !== 0) return "x = " + fmtCoord(v.a) + " (вертикальная), y = " + fmtCoord(v.b) + " (горизонтальная)";
    if (id === "expo" && v.A !== 0) return "y = " + fmtCoord(v.b) + " (горизонтальная)";
    if (id === "log" && v.A !== 0) return "x = " + fmtCoord(v.a) + " (вертикальная)";
    if (id === "tangent" && v.k !== 0) {
      var deg = graphState.unit === "deg";
      var aStr = deg ? (fmtCoord(v.a) + "°") : piLabel(v.a);
      var base = deg ? "90°" : "π/2";
      var step = deg ? "180°" : "π";
      var kk = (Math.abs(Math.abs(v.k) - 1) < 1e-9) ? "" : "/" + fmtNum(Math.abs(v.k));
      return "вертикальные: x = " + aStr + " + " + base + kk + " + " + step + "n" + kk;
    }
    return null;
  }
  function periodText(id, v) {
    if (v.k === 0) return null;
    var ak = Math.abs(v.k);
    var deg = graphState.unit === "deg";
    if (id === "sine" || id === "cosine") {
      if (deg) return ak === 1 ? "360°" : ("360°/" + fmtNum(ak) + " ≈ " + fmtCoord(360 / ak) + "°");
      return ak === 1 ? "2π" : ("2π/" + fmtNum(ak) + " ≈ " + fmtCoord(2 * Math.PI / ak));
    }
    if (id === "tangent") {
      if (deg) return ak === 1 ? "180°" : ("180°/" + fmtNum(ak) + " ≈ " + fmtCoord(180 / ak) + "°");
      return ak === 1 ? "π" : ("π/" + fmtNum(ak) + " ≈ " + fmtCoord(Math.PI / ak));
    }
    return null;
  }
  function monotonicText(id, v) {
    var k = v.k;
    switch (id) {
      case "line":
      case "cubic":
        if ((id === "line" ? k : v.k) === 0) return "постоянная";
        return k > 0 ? "возрастает на ℝ" : "убывает на ℝ";
      case "quad":
        if (v.k === 0) return "линейная (см. линейную функцию)";
        var x0 = v.a - v.p / (2 * v.k);
        return v.k > 0
          ? "убывает на (−∞; " + fmtCoord(x0) + "], возрастает на [" + fmtCoord(x0) + "; +∞)"
          : "возрастает на (−∞; " + fmtCoord(x0) + "], убывает на [" + fmtCoord(x0) + "; +∞)";
      case "hyper": return v.k > 0 ? "убывает на каждом промежутке области определения" : "возрастает на каждом промежутке области определения";
      case "sqrt": return k >= 0 ? "возрастает на области определения" : "убывает на области определения";
      case "abs": return k > 0 ? "убывает на (−∞; " + fmtCoord(v.a) + "], возрастает на [" + fmtCoord(v.a) + "; +∞)" : "возрастает на (−∞; " + fmtCoord(v.a) + "], убывает на [" + fmtCoord(v.a) + "; +∞)";
      case "expo": {
        if (v.A === 0) return "постоянная";
        var inc = (v.k > 1) === (v.A > 0);
        return inc ? "возрастает на ℝ" : "убывает на ℝ";
      }
      case "log": {
        if (v.A === 0) return "постоянная";
        var inc2 = (v.k > 1) === (v.A > 0);
        return inc2 ? "возрастает на области определения" : "убывает на области определения";
      }
      default: return null;
    }
  }
  function trigZerosText(id, v) {
    var A = v.A, k = v.k, a = v.a, b = v.b;
    if (A === 0) return b === 0 ? "вся числовая прямая" : "нет корней";
    if (Math.abs(k) < 1e-9) return b === 0 ? "вся числовая прямая" : "нет корней";
    var t = -b / A;
    if (Math.abs(t) > 1) return "нет корней (|−b/A| > 1)";
    var deg = graphState.unit === "deg";
    var P = deg ? "180°" : "π";
    var P2 = deg ? "360°" : "2π";
    var unit = deg ? "°" : "";
    function cstr(c) { var cv = deg ? c * 180 / Math.PI : c; return fmtCoord(cv) + unit; }
    var aStr;
    if (Math.abs(a) < 1e-9) aStr = "";
    else {
      var mag = deg ? (fmtNum(Math.abs(a)) + "°") : piLabel(Math.abs(a));
      aStr = (a < 0 ? "−" + mag : mag) + " + ";
    }
    var head = aStr;
    var slash = (Math.abs(Math.abs(k) - 1) < 1e-9) ? "" : "/" + fmtNum(Math.abs(k));
    if (id === "sine") {
      var c = Math.asin(t);
      if (Math.abs(c) < 1e-9) return "x = " + head + P + "n" + slash + ",  n ∈ ℤ";
      return "x = " + head + "((−1)ⁿ·" + cstr(c) + " + " + P + "n)" + slash + ",  n ∈ ℤ";
    }
    if (id === "cosine") {
      var c2 = Math.acos(t);
      return "x = " + head + "(±" + cstr(c2) + " + " + P2 + "n)" + slash + ",  n ∈ ℤ";
    }
    if (id === "tangent") {
      var c3 = Math.atan(t);
      if (Math.abs(c3) < 1e-9) return "x = " + head + P + "n" + slash + ",  n ∈ ℤ";
      return "x = " + head + "(" + cstr(c3) + " + " + P + "n)" + slash + ",  n ∈ ℤ";
    }
    return null;
  }
  function renderGraphProps(g, v) {
    var box = byId("graphProps");
    if (!box) return;
    box.innerHTML = "";
    var rows = [];
    rows.push(["Область определения", domainText(g.id, v)]);
    rows.push(["Область значений", rangeText(g.id, v)]);
    rows.push(["Чётность", graphParity(g, v)]);
    if (isTrig(g.id)) {
      rows.push(["Нули функции (общее решение)", trigZerosText(g.id, v) || "нет корней"]);
    } else {
      var rx = graphState.rangeX;
      var zs = findZeros(g, v, graphState.center.x - rx, graphState.center.x + rx);
      rows.push(["Нули функции", zs.length ? zs.slice(0, 8).map(fmtCoord).join(";  ") + (zs.length > 8 ? "  …" : "") : "нет на видимом промежутке"]);
    }
    var y0 = graphValue(g, v, 0);
    rows.push(["Пересечение с осью Oy", isFinite(y0) ? "(0; " + fmtCoord(y0) + ")" : "нет"]);
    var ext = extremumText(g.id, v); if (ext) rows.push(["Экстремум", ext]);
    var asy = asymptoteText(g.id, v); if (asy) rows.push(["Асимптоты", asy]);
    var per = periodText(g.id, v); if (per) rows.push(["Период", per]);
    var mono = monotonicText(g.id, v); if (mono) rows.push(["Монотонность", mono]);
    var tr = [];
    if (graphState.absY) tr.push("|f(x)|");
    if (graphState.absX) tr.push("f(|x|)");
    if (tr.length) rows.push(["Дополнительные преобразования", tr.join(", ") + " поверх графика"]);
    rows.forEach(function (r) {
      var li = document.createElement("li");
      var b = document.createElement("b");
      b.textContent = r[0] + ": ";
      li.appendChild(b);
      li.appendChild(document.createTextNode(r[1]));
      box.appendChild(li);
    });
  }

  function evalAt(g, v, x, absX, absY) {
    var arg = absX ? Math.abs(x) : x;
    var y = graphEval(g, v, arg);
    if (absY && isFinite(y)) y = Math.abs(y);
    return y;
  }
  function graphValue(g, v, x) {
    return evalAt(g, v, x, graphState.absX, graphState.absY);
  }

  function paintGraph(canvas, g, v, view) {
    var wrapEl = canvas.parentNode;
    var cs = getComputedStyle(wrapEl);
    var padL = parseFloat(cs.paddingLeft) || 0;
    var padR = parseFloat(cs.paddingRight) || 0;
    var availW = Math.floor(wrapEl.clientWidth - padL - padR);
    if (availW <= 0) availW = Math.min(720, Math.max(280, (window.innerWidth || 640) - 60));
    if (view.maxW) availW = Math.min(availW, view.maxW);
    var aspect = view.aspect || 0.72;
    var minH = (window.innerWidth <= 620) ? 240 : 200;
    var maxH = (window.innerHeight || 800) - (window.innerWidth <= 620 ? 200 : 250);
    maxH = Math.max(minH, Math.min(600, maxH));
    var cssW = availW;
    var cssH = Math.round(cssW * aspect);
    if (cssH > maxH) { cssH = maxH; cssW = Math.min(availW, Math.round(cssH / aspect)); }
    if (cssH < minH) { cssH = minH; cssW = Math.min(availW, Math.round(cssH / aspect)); }
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    var ctx = canvas.getContext("2d");
    if (!ctx) return cssW;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW, H = cssH;
    var rangeX = view.rangeX;
    var rangeY = rangeX * (H / W);
    var cx = view.centerX, cy = view.centerY;
    var xToPx = function (x) { return W / 2 + (x - cx) * (W / (2 * rangeX)); };
    var yToPx = function (y) { return H / 2 - (y - cy) * (H / (2 * rangeY)); };

    var css = getComputedStyle(document.body);
    var colMuted = css.getPropertyValue("--muted").trim() || "#6b7488";
    var colBorder = css.getPropertyValue("--border").trim() || "#e3e8f0";
    var colAccent = css.getPropertyValue("--accent").trim() || "#3b5bdb";

    ctx.clearRect(0, 0, W, H);

    var stepX, labelX;
    if (view.trig && view.unit === "deg") {
      var degSpan = 2 * rangeX * 180 / Math.PI;
      var stepDeg = pickStep([15, 30, 45, 90, 180, 360], degSpan);
      stepX = stepDeg * Math.PI / 180;
      labelX = function (val) { return String(Math.round(val * 180 / Math.PI)) + "°"; };
    } else if (view.trig) {
      stepX = pickStep([Math.PI / 6, Math.PI / 4, Math.PI / 2, Math.PI, 2 * Math.PI], 2 * rangeX);
      labelX = piLabel;
    } else {
      stepX = niceStep(rangeX);
      labelX = function (val) { return fmtTick(val, stepX); };
    }
    var stepY = niceStep(rangeY);
    var k0 = Math.ceil((cx - rangeX) / stepX), k1 = Math.floor((cx + rangeX) / stepX);
    var j0 = Math.ceil((cy - rangeY) / stepY), j1 = Math.floor((cy + rangeY) / stepY);

    ctx.strokeStyle = colBorder;
    ctx.lineWidth = 1;
    for (var k = k0; k <= k1; k++) {
      var X = xToPx(k * stepX);
      ctx.beginPath(); ctx.moveTo(X, 0); ctx.lineTo(X, H); ctx.stroke();
    }
    for (var j = j0; j <= j1; j++) {
      var Y = yToPx(j * stepY);
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
        ctx.fillText(labelX(lk * stepX), xToPx(lk * stepX), axisY + 4);
      }
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    if (axisX >= 0 && axisX <= W) {
      for (var lj = j0; lj <= j1; lj++) {
        if (lj === 0) continue;
        ctx.fillText(fmtTick(lj * stepY, stepY), axisX - 5, yToPx(lj * stepY));
      }
    }
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.fillText("0", axisX - 3, axisY + 3);

    ctx.strokeStyle = colAccent;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    var started = false;
    for (var px = 0; px <= W; px += 1) {
      var x = cx + (px - W / 2) * (2 * rangeX) / W;
      var y = evalAt(g, v, x, view.absX, view.absY);
      if (y === null || isNaN(y) || !isFinite(y) || y < cy - rangeY * 3 || y > cy + rangeY * 3) {
        started = false;
        continue;
      }
      var py = yToPx(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else { ctx.lineTo(px, py); }
    }
    ctx.stroke();

    if (view.markerX !== undefined && view.markerX !== null) {
      var mx = view.markerX;
      var my = evalAt(g, v, mx, view.absX, view.absY);
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
    return W;
  }

  function drawGraph() {
    var g = graphKind();
    var vals = currentValues();
    var W = paintGraph(byId("graphCanvas"), g, vals, {
      centerX: graphState.center.x,
      centerY: graphState.center.y,
      rangeX: graphState.rangeX,
      absX: graphState.absX,
      absY: graphState.absY,
      trig: isTrig(g.id),
      unit: graphState.unit,
      aspect: (window.innerWidth <= 620 ? 0.95 : 0.72),
      markerX: graphState.cursorX
    });
    graphState.wpp = (2 * graphState.rangeX) / (W || 640);
    appendRich(byId("graphFormula"), "$" + g.tex(vals) + "$");
    renderGraphProps(g, vals);
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
    var x = graphState.cursorX;
    var y = graphValue(g, vals, x);
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

  /* ============ Связь карточка → график ============ */
  function openGraphKind(kind) {
    graphState.kind = kind;
    graphState.cursorX = undefined;
    var sel = byId("graphKind");
    if (sel) sel.value = kind;
    buildGraphCoefs();
    setMode("graph");
  }

  /* ============ Чтение графиков ============ */
  var READ_KINDS = ["line", "quad", "abs", "hyper", "sqrt", "expo", "log", "sine", "cosine", "cubic"];
  var read = { answered: false, current: null };

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function kindById(id) {
    var found = GRAPH_KINDS[0];
    GRAPH_KINDS.forEach(function (g) { if (g.id === id) found = g; });
    return found;
  }
  function readRandCoef(c) {
    var choices = [];
    for (var x = c.min; x <= c.max + 1e-9; x += c.step) choices.push(Math.round(x * 100) / 100);
    var nz = choices.filter(function (x) { return x !== 0; });
    return (nz.length ? nz : choices)[randInt(0, (nz.length ? nz.length : choices.length) - 1)];
  }
  function readRandomVals(id, g) {
    var v = {};
    g.coefs.forEach(function (c) { v[c.k] = readRandCoef(c); });
    v.a = 0; v.b = 0;
    if ((id === "expo" || id === "log") && v.k === 1) v.k = 2;
    return v;
  }
  function readRangeFor(id) {
    if (id === "sine" || id === "cosine") return Math.PI;
    if (id === "tangent") return Math.PI * 0.75;
    if (id === "expo" || id === "log") return 5;
    if (id === "hyper") return 6;
    if (id === "quad" || id === "cubic") return 4;
    return 5;
  }
  function readHintText(id, v) {
    var map = {
      line: "Прямая линия. Угловой коэффициент k = " + fmtNum(v.k) + ".",
      quad: "Парабола, ветви " + (v.k > 0 ? "вверх" : "вниз") + ".",
      cubic: "Кубическая парабола (S-образная линия).",
      hyper: "Видна характерная гипербола: ветви не пересекают оси.",
      sqrt: "Это ветвь графика корня — начинается в точке (0; 0).",
      abs: "«Уголок» с вершиной в начале координат.",
      expo: "Кривая растёт всё быстрее — показательная функция.",
      log: "Медленно растущая кривая — логарифмическая функция.",
      sine: "Периодическая волна — синусоида.",
      cosine: "Периодическая волна с максимумом при x = 0 — косинусоида.",
      tangent: "Ветви, уходящие вверх и вниз, — тангенсоида."
    };
    var parity = {
      line: (v.b === 0 && v.a === 0 ? "Нечётная функция." : ""),
      quad: "Чётная функция.",
      abs: "Чётная функция.",
      cosine: "Чётная функция.",
      sine: "Нечётная функция.",
      cubic: "Нечётная функция.",
      hyper: "Нечётная функция."
    }[id];
    var t = map[id] || "Определите функцию по форме графика.";
    if (parity) t += " " + parity;
    return t;
  }
  function showReadHint() {
    var el = byId("readHint");
    if (!el || !read.current) return;
    el.textContent = readHintText(read.current.id, read.current.vals);
    el.hidden = false;
  }
  function readNewTask() {
    var id = READ_KINDS[randInt(0, READ_KINDS.length - 1)];
    var g = kindById(id);
    var vals = readRandomVals(id, g);
    read.current = { id: id, g: g, vals: vals, rangeX: readRangeFor(id) };
    read.answered = false;

    var correct = g.tex(vals);
    var opts = [{ ok: true, text: correct }];
    var guard = 0;
    while (opts.length < 4 && guard < 80) {
      guard++;
      var gd = READ_KINDS[randInt(0, READ_KINDS.length - 1)];
      var gg = kindById(gd);
      var vv = readRandomVals(gd, gg);
      var t = gg.tex(vv);
      if (t === correct) continue;
      if (opts.some(function (o) { return o.text === t; })) continue;
      opts.push({ ok: false, text: t });
    }
    shuffle(opts);

    renderOptions(byId("readOptions"), opts, function (btn, c) {
      var span = document.createElement("span");
      appendRich(span, wrapMath(c.text));
      btn.appendChild(span);
    }, function (btn, c) { readAnswer(btn, c.ok); });
    window.requestAnimationFrame(function () { fitOptions(byId("readOptions")); });

    resetFeedback("readFeedback");
    var hint = byId("readHint");
    hint.textContent = "";
    hint.hidden = true;
    readMeta();
    var canvas = byId("readCanvas");
    window.requestAnimationFrame(function () {
      paintGraph(canvas, read.current.g, read.current.vals, {
        centerX: 0, centerY: 0, rangeX: read.current.rangeX,
        absX: false, absY: false, trig: isTrig(id), unit: graphState.unit,
        aspect: 0.6, maxW: 520
      });
    });
  }
  function readMeta() {
    var s = state.stats;
    byId("readMeta").textContent = "Верно " + s.readOk + " · Ошибок " + s.readBad;
    byId("readReset").disabled = (s.readOk + s.readBad) === 0;
  }
  function readAnswer(btn, ok) {
    if (read.answered) return;
    read.answered = true;
    state.stats[ok ? "readOk" : "readBad"]++;
    save(LS.stats, state.stats);
    answerOption(byId("readOptions"), btn, ok, byId("readFeedback"));
    if (!ok) showReadHint();
    readMeta();
  }
  function readNext() { readNewTask(); }

  /* ============ Устный счёт ============ */
  var CALC_DURATION = 60;
  var calc = {
    active: false, endsAt: 0, correct: 0, wrong: 0, current: null, timerId: null,
    classes: { 5: true, 6: false, 7: false }
  };

  function calcBestLoad() { return load("math-trainer-calc-v1", { best: 0 }).best; }
  function calcBestSave(v) { save("math-trainer-calc-v1", { best: v }); }
  function calcPick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function calcGcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function calcPlus(v) { return v === 0 ? "" : (v > 0 ? " + " + v : " - " + Math.abs(v)); }
  function calcFlip(sign) { return sign === "<" ? ">" : (sign === ">" ? "<" : (sign === "≤" ? "≥" : "≤")); }
  function decStr(x) { var v = Math.round(x * 100) / 100; return String(v).replace(".", ","); }
  function fracTex(n, d) {
    var g = calcGcd(n, d); n /= g; d /= g;
    if (d < 0) { n = -n; d = -d; }
    if (d === 1) return String(n);
    return "$" + (n < 0 ? "-\\dfrac{" + Math.abs(n) + "}{" + d + "}" : "\\dfrac{" + n + "}{" + d + "}") + "$";
  }
  function mixedTex(k, n, d) {
    if (n === 0) return String(k);
    return "$" + k + "\\frac{" + n + "}{" + d + "}$";
  }
  function calcWrongs(correct, cands) {
    var out = [];
    cands.forEach(function (c) {
      if (c !== correct && out.indexOf(c) === -1 && out.length < 3) out.push(c);
    });
    var guard = 0;
    while (out.length < 3 && guard < 80) {
      guard++;
      var c2 = String(randInt(1, 40));
      if (c2 !== correct && out.indexOf(c2) === -1) out.push(c2);
    }
    return out;
  }

  /* ----- 5 класс: натуральные числа, остаток, обыкновенные дроби ----- */
  function g5() {
    var t = randInt(1, 9), q, correct, wrong = [];
    if (t === 1) {
      var a = randInt(120, 980), b = randInt(120, 980);
      q = "$" + a + " + " + b + "$"; correct = String(a + b);
      wrong = calcWrongs(correct, [String(a + b + 10), String(a + b - 10), String(a + b + 100), String(a + b - 1)]);
    } else if (t === 2) {
      var a2 = randInt(320, 980), b2 = randInt(120, a2 - 100);
      q = "$" + a2 + " - " + b2 + "$"; correct = String(a2 - b2);
      wrong = calcWrongs(correct, [String(a2 - b2 + 10), String(a2 - b2 - 10), String(a2 + b2), String(a2 - b2 + 1)]);
    } else if (t === 3) {
      var a3 = randInt(12, 49), b3 = randInt(3, 9);
      q = "$" + a3 + " \\cdot " + b3 + "$"; correct = String(a3 * b3);
      wrong = calcWrongs(correct, [String(a3 * b3 + a3), String(a3 * b3 - b3), String(a3 + b3), String(a3 * b3 + 10)]);
    } else if (t === 4) {
      var b4 = randInt(3, 12), x4 = randInt(5, 30);
      q = "$" + (b4 * x4) + " : " + b4 + "$"; correct = String(x4);
      wrong = calcWrongs(correct, [String(x4 + 1), String(x4 - 1), String(x4 + 10), String(b4)]);
    } else if (t === 5) {
      var a5 = randInt(40, 300), b5 = randInt(3, 15), rem = a5 % b5;
      q = "Остаток от деления $" + a5 + "$ на $" + b5 + "$"; correct = String(rem);
      wrong = calcWrongs(correct, [String((rem + 1) % b5), String((rem + b5 - 1) % b5), String(Math.floor(a5 / b5)), String(b5 - rem)]);
    } else if (t === 6) {
      var d6 = randInt(2, 9), k6 = randInt(1, 8), r6 = randInt(1, d6 - 1), p6 = k6 * d6 + r6;
      q = "Выделите целую часть: $\\dfrac{" + p6 + "}{" + d6 + "}$"; correct = mixedTex(k6, r6, d6);
      wrong = calcWrongs(correct, [mixedTex(k6 + 1, r6, d6), mixedTex(k6, r6 === d6 - 1 ? r6 - 1 : r6 + 1, d6), "$\\dfrac{" + p6 + "}{" + d6 + "}$", mixedTex(k6, r6, d6 + 1)]);
    } else if (t === 7) {
      var k7 = randInt(1, 8), d7 = randInt(2, 9), r7 = randInt(1, d7 - 1);
      q = "Запишите неправильной дробью: " + mixedTex(k7, r7, d7); correct = fracTex(k7 * d7 + r7, d7);
      wrong = calcWrongs(correct, [fracTex(k7 + r7, d7), fracTex(k7 * d7, d7), fracTex(k7 * d7 + r7, k7 + d7), fracTex(k7 * d7 - r7, d7)]);
    } else if (t === 8) {
      var d8 = randInt(3, 9), r8 = randInt(1, d8 - 1), m8 = randInt(2, 12), N8 = d8 * m8;
      q = "$\\dfrac{" + r8 + "}{" + d8 + "}$ от $" + N8 + "$"; correct = String(r8 * m8);
      wrong = calcWrongs(correct, [String(m8), String(r8 * N8), String(r8 * m8 + N8), String(r8 * m8 - m8)]);
    } else {
      var p9 = randInt(1, 7), d9 = randInt(p9 + 1, 9), g9 = randInt(2, 6), n9 = p9 * g9, q9 = d9 * g9;
      q = "Сократите дробь: $\\dfrac{" + n9 + "}{" + q9 + "}$"; correct = fracTex(p9, d9);
      wrong = calcWrongs(correct, [fracTex(n9, q9), fracTex(p9 * 2, d9 * 2), fracTex(n9 - 1, q9), fracTex(p9, d9 + 1)]);
    }
    return { q: q, correct: correct, wrong: wrong };
  }

  /* ----- 6 класс: десятичные дроби, целые числа, пропорции, проценты ----- */
  function g6() {
    var t = randInt(1, 10), q, correct, wrong = [];
    if (t === 1) {
      var a = randInt(11, 99) / 10, b = randInt(11, 99) / 10;
      q = "$" + decStr(a) + " + " + decStr(b) + "$"; correct = decStr(a + b);
      wrong = calcWrongs(correct, [decStr(a + b + 0.1), decStr(a + b - 0.1), decStr(a + b + 1), decStr(a + b - 1)]);
    } else if (t === 2) {
      var a2 = randInt(30, 99) / 10, b2 = randInt(11, 29) / 10;
      q = "$" + decStr(a2) + " - " + decStr(b2) + "$"; correct = decStr(a2 - b2);
      wrong = calcWrongs(correct, [decStr(a2 - b2 + 0.1), decStr(a2 - b2 - 0.1), decStr(a2 + b2), decStr(a2 - b2 + 1)]);
    } else if (t === 3) {
      var at = randInt(11, 49), bt = randInt(11, 49);
      q = "$" + decStr(at / 10) + " \\cdot " + decStr(bt / 10) + "$"; correct = decStr(at * bt / 100);
      wrong = calcWrongs(correct, [decStr(at * bt / 10), decStr(at * bt), decStr(at * bt / 100 + 0.1), decStr(at * bt / 100 - 0.1)]);
    } else if (t === 4) {
      var bb = randInt(2, 9), ans4 = randInt(2, 9), at4 = bb * ans4;
      q = "$" + decStr(at4 / 10) + " : " + decStr(bb / 10) + "$"; correct = String(ans4);
      wrong = calcWrongs(correct, [String(ans4 + 1), String(ans4 - 1), decStr(at4 / 10), String(bb)]);
    } else if (t === 5) {
      var x5 = randInt(-12, -1), y5 = randInt(2, 15);
      q = "$(" + x5 + ") + " + y5 + "$"; correct = String(x5 + y5);
      wrong = calcWrongs(correct, [String(x5 - y5), String(-x5 + y5), String(x5 + y5 + 1), String(x5 + y5 - 1)]);
    } else if (t === 6) {
      var x6 = randInt(-9, 9), y6 = randInt(-9, 9);
      q = "$" + x6 + " - (" + y6 + ")$"; correct = String(x6 - y6);
      wrong = calcWrongs(correct, [String(x6 + y6), String(-x6 - y6), String(x6 - y6 + 1), String(x6 - y6 - 1)]);
    } else if (t === 7) {
      var x7 = randInt(-9, -2), y7 = randInt(2, 9);
      q = "$" + x7 + " \\cdot " + y7 + "$"; correct = String(x7 * y7);
      wrong = calcWrongs(correct, [String(-x7 * y7), String(x7 + y7), String(x7 * y7 + y7), String(x7 * y7 - y7)]);
    } else if (t === 8) {
      var y8 = (randInt(0, 1) ? 1 : -1) * randInt(2, 9), x8 = (randInt(0, 1) ? 1 : -1) * randInt(2, 9);
      q = "$" + (y8 * x8) + " : " + y8 + "$"; correct = String(x8);
      wrong = calcWrongs(correct, [String(-x8), String(x8 + 1), String(y8), String(x8 - 1)]);
    } else if (t === 9) {
      var pa = 4, pb = 6, pc = 8, px = 3, found = false;
      for (var i = 0; i < 40 && !found; i++) {
        var c9 = randInt(2, 9), b9 = randInt(2, 9), a9 = randInt(2, 9);
        if ((b9 * a9) % c9 === 0) { var xx = b9 * a9 / c9; if (xx >= 1 && xx <= 20) { pa = a9; pb = b9; pc = c9; px = xx; found = true; } }
      }
      q = "$\\dfrac{x}{" + pa + "} = \\dfrac{" + pb + "}{" + pc + "}$"; correct = String(px);
      wrong = calcWrongs(correct, [String(pb + pc - pa), String(pa * pc - pb), String(px + 1), String(Math.abs(pa - pb) || 1)]);
    } else {
      var pp = calcPick([10, 20, 25, 50, 75]), N10 = calcPick([40, 60, 80, 120, 160, 200]);
      q = "$" + pp + "\\%$ от $" + N10 + "$"; correct = String(N10 * pp / 100);
      wrong = calcWrongs(correct, [String(N10 - N10 * pp / 100), String(Math.round(N10 / pp) || 1), String(N10 * pp / 100 + 5), String(N10 * pp / 100 - 5)]);
    }
    return { q: q, correct: correct, wrong: wrong };
  }

  /* ----- 7 класс: линейные уравнения и неравенства ----- */
  function g7() {
    var t = randInt(1, 4), q, correct, wrong = [];
    if (t === 1) {
      var a = randInt(2, 9), x = randInt(-9, 9), b = randInt(-15, 15), c = a * x + b;
      q = "$" + a + "x" + calcPlus(b) + " = " + c + "$"; correct = String(x);
      wrong = calcWrongs(correct, [String(-x), String(x + 1), String(x - 1), String(c - b)]);
    } else if (t === 2) {
      var a2 = randInt(2, 9), x2 = randInt(-9, 9), b2 = randInt(-9, 9), c2 = a2 * (x2 + b2);
      q = "$" + a2 + "(x" + calcPlus(b2) + ") = " + c2 + "$"; correct = String(x2);
      wrong = calcWrongs(correct, [String(x2 + b2), String(-x2), String(x2 + 1), String(c2 - b2)]);
    } else if (t === 3) {
      var a3 = randInt(2, 9), c3 = randInt(2, 9);
      if (c3 === a3) c3 = a3 + 1;
      var x3 = randInt(-6, 6), b3 = randInt(-9, 9), d3 = (a3 - c3) * x3 + b3;
      q = "$" + a3 + "x" + calcPlus(b3) + " = " + c3 + "x" + calcPlus(d3) + "$"; correct = String(x3);
      wrong = calcWrongs(correct, [String(-x3), String(x3 + 1), String(x3 - 1), String(b3 - d3)]);
    } else {
      var a4 = calcPick([-9, -8, -7, -6, -5, -4, -3, -2, -1, 2, 3, 4, 5, 6, 7, 8, 9]);
      var k = randInt(-9, 9), b4 = randInt(-12, 12), sign = calcPick(["<", ">", "≤", "≥"]), c4 = a4 * k + b4;
      q = "$" + a4 + "x" + calcPlus(b4) + " " + sign + " " + c4 + "$";
      var solSign = a4 > 0 ? sign : calcFlip(sign);
      correct = "$x " + solSign + " " + k + "$";
      wrong = calcWrongs(correct, ["$x " + calcFlip(solSign) + " " + k + "$", "$x " + solSign + " " + (-k) + "$", "$x " + solSign + " " + (k + 1) + "$", "$x " + solSign + " " + (k - 1) + "$"]);
    }
    return { q: q, correct: correct, wrong: wrong };
  }

  function makeCalcTask() {
    var selected = [];
    [5, 6, 7].forEach(function (c) { if (calc.classes[c]) selected.push(c); });
    if (!selected.length) selected = [5];
    var cls = calcPick(selected);
    return cls === 5 ? g5() : (cls === 6 ? g6() : g7());
  }
  function calcMeta() { byId("calcMeta").textContent = "Верно " + calc.correct + " · Ошибок " + calc.wrong; }
  function calcNewTask() {
    var task = makeCalcTask();
    calc.current = { answered: false };
    appendRich(byId("calcTask"), task.q);
    var opts = [{ ok: true, text: task.correct }];
    task.wrong.slice(0, 3).forEach(function (w) { opts.push({ ok: false, text: w }); });
    shuffle(opts);
    var box = byId("calcOptions");
    box.innerHTML = "";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "option option--tile";
      if (o.ok) b.dataset.correct = "1";
      appendRich(b, o.text);
      b.addEventListener("click", function () { calcAnswer(b, o.ok); });
      box.appendChild(b);
    });
    resetFeedback("calcFeedback");
  }
  function calcAnswer(btn, ok) {
    if (!calc.active || calc.current.answered) return;
    calc.current.answered = true;
    if (ok) calc.correct++; else calc.wrong++;
    answerOption(byId("calcOptions"), btn, ok, byId("calcFeedback"));
    calcMeta();
    if (calc.active) window.setTimeout(function () { if (calc.active) calcNewTask(); }, 360);
  }
  function buildCalcClasses() {
    var box = byId("calcClasses");
    if (!box) return;
    box.innerHTML = "";
    [5, 6, 7].forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (calc.classes[c] ? " is-active" : "");
      b.textContent = c + " класс";
      b.dataset.cls = String(c);
      b.setAttribute("aria-pressed", String(!!calc.classes[c]));
      b.addEventListener("click", function () {
        var count = [5, 6, 7].filter(function (x) { return calc.classes[x]; }).length;
        if (calc.classes[c] && count === 1) return;
        calc.classes[c] = !calc.classes[c];
        b.classList.toggle("is-active", calc.classes[c]);
        b.setAttribute("aria-pressed", String(!!calc.classes[c]));
      });
      box.appendChild(b);
    });
  }
  function calcStart() {
    if (!(calc.classes[5] || calc.classes[6] || calc.classes[7])) calc.classes[5] = true;
    buildCalcClasses();
    byId("calcStart").hidden = true;
    byId("calcResult").hidden = true;
    byId("calcRun").hidden = false;
    calc.active = true; calc.correct = 0; calc.wrong = 0;
    calc.endsAt = Date.now() + CALC_DURATION * 1000;
    calcNewTask();
    calcMeta();
    calcTick();
    if (calc.timerId) clearInterval(calc.timerId);
    calc.timerId = setInterval(calcTick, 200);
  }
  function calcTick() {
    var left = Math.max(0, Math.round((calc.endsAt - Date.now()) / 1000));
    var el = byId("calcTimer");
    el.textContent = String(left);
    el.className = "timer" + (left <= 10 ? " is-critical" : "");
    if (left <= 0) calcFinish();
  }
  function calcFinish() {
    if (!calc.active) return;
    calc.active = false;
    if (calc.timerId) { clearInterval(calc.timerId); calc.timerId = null; }
    var best = calcBestLoad();
    if (calc.correct > best) { best = calc.correct; calcBestSave(best); }
    byId("calcRun").hidden = true;
    var res = byId("calcResult");
    res.hidden = false;
    res.innerHTML = "";
    var panel = document.createElement("div");
    panel.className = "panel";
    var h = document.createElement("h2");
    h.className = "panel__title";
    h.textContent = "Результат: " + calc.correct + " верных";
    var p = document.createElement("p");
    p.className = "panel__text";
    p.textContent = "Ошибок: " + calc.wrong + " · Рекорд: " + best;
    var row = document.createElement("div");
    row.className = "quiz__row";
    var again = document.createElement("button");
    again.type = "button"; again.className = "btn"; again.textContent = "Ещё раз";
    again.addEventListener("click", calcStart);
    var back = document.createElement("button");
    back.type = "button"; back.className = "btn btn--ghost"; back.textContent = "К началу";
    back.addEventListener("click", function () {
      res.hidden = true;
      byId("calcStart").hidden = false;
      byId("calcBest").textContent = calcBestLoad();
    });
    row.appendChild(again); row.appendChild(back);
    panel.appendChild(h); panel.appendChild(p); panel.appendChild(row);
    res.appendChild(panel);
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
    byId("viewCalc").hidden = mode !== "calc";
    byId("viewRead").hidden = mode !== "read";
    byId("viewReview").hidden = mode !== "review";
    byId("viewGraph").hidden = mode !== "graph";
    byId("progress").style.display = mode === "cards" ? "" : "none";

    if (mode === "cards") renderBrowse();
    else if (mode === "match") matchNewRound();
    else if (mode === "formulas") { if (!state.formula.order.length) formulaNewOrder(); formulaRender(); }
    else if (mode === "names") { if (!state.names.order.length) namesNewOrder(); namesRender(); }
    else if (mode === "calc") {
      buildCalcClasses();
      if (!calc.active) {
        byId("calcStart").hidden = false;
        byId("calcRun").hidden = true;
        byId("calcResult").hidden = true;
        byId("calcBest").textContent = calcBestLoad();
      }
    }
    else if (mode === "read") readNewTask();
    else if (mode === "review") renderReview();
    else if (mode === "graph") window.requestAnimationFrame(drawGraph);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ============ Инициализация ============ */
  function init() {
    buildChips();
    buildGraphControls();
    buildCalcClasses();
    if (byId("graphUnit")) byId("graphUnit").value = graphState.unit;
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

    byId("readNext").addEventListener("click", readNext);
    byId("readReset").addEventListener("click", function () {
      if ((state.stats.readOk + state.stats.readBad) === 0) return;
      if (!window.confirm("Сбросить прогресс в режиме «Чтение графиков»?")) return;
      state.stats.readOk = 0; state.stats.readBad = 0;
      save(LS.stats, state.stats);
      readMeta();
    });

    byId("calcStartBtn").addEventListener("click", calcStart);
    byId("calcStop").addEventListener("click", calcFinish);

    byId("graphReset").addEventListener("click", function () {
      graphState.values = {};
      graphState.center = { x: 0, y: 0 };
      graphState.cursorX = undefined;
      graphState.absX = false;
      graphState.absY = false;
      if (byId("graphAbsX")) byId("graphAbsX").checked = false;
      if (byId("graphAbsY")) byId("graphAbsY").checked = false;
      setZoom(1, true);
      buildGraphCoefs();
      drawGraph();
    });
    if (byId("graphAbsY")) byId("graphAbsY").addEventListener("change", function () {
      graphState.absY = byId("graphAbsY").checked;
      drawGraph();
    });
    if (byId("graphAbsX")) byId("graphAbsX").addEventListener("change", function () {
      graphState.absX = byId("graphAbsX").checked;
      drawGraph();
    });
    if (byId("graphUnit")) byId("graphUnit").addEventListener("change", function () {
      var next = byId("graphUnit").value;
      var prev = graphState.unit;
      if (next !== prev && isTrig(graphState.kind)) {
        var s = graphState.values["shift:a"];
        if (s !== undefined && s !== 0) {
          graphState.values["shift:a"] = (next === "deg") ? (s * 180 / Math.PI) : (s * Math.PI / 180);
        }
      }
      graphState.unit = next;
      buildGraphCoefs();
      drawGraph();
    });
    if (byId("readHintBtn")) byId("readHintBtn").addEventListener("click", showReadHint);

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
        if (state.mode === "match") drawMatchLines();
        if (state.mode === "graph") drawGraph();
      }, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        fitAllWithin(document);
        if (state.mode === "graph") drawGraph();
      });
    }

    var headerEl = document.querySelector(".site-header");
    var compact = false, scrollTick = false;
    function applyScroll() {
      scrollTick = false;
      if (!headerEl) return;
      var y = window.scrollY || window.pageYOffset || 0;
      if (!compact && y > 90) { compact = true; headerEl.classList.add("is-compact"); }
      else if (compact && y < 40) { compact = false; headerEl.classList.remove("is-compact"); }
    }
    function onScroll() {
      if (scrollTick) return;
      scrollTick = true;
      window.requestAnimationFrame(applyScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    applyScroll();
  }

  init();
})();

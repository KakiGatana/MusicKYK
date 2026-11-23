(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   *  Théorie
   * ------------------------------------------------------------------ */
  const LETTERS = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
  const NATURAL_PC = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { "-2": "♭♭", "-1": "♭", "0": "", "1": "♯", "2": "♯♯" };

  // Orthographe des 12 notes de départ (lettre + altération)
  const ROOTS = [
    { pc: 0, l: 0, a: 0 },  { pc: 1, l: 1, a: -1 }, { pc: 2, l: 1, a: 0 },
    { pc: 3, l: 2, a: -1 }, { pc: 4, l: 2, a: 0 },  { pc: 5, l: 3, a: 0 },
    { pc: 6, l: 3, a: 1 },  { pc: 7, l: 4, a: 0 },  { pc: 8, l: 5, a: -1 },
    { pc: 9, l: 5, a: 0 },  { pc: 10, l: 6, a: -1 }, { pc: 11, l: 6, a: 0 },
  ];

  // Noms affichés sur les boutons / touches (par classe de hauteur)
  const PC_LABEL = [
    ["Do"], ["Do♯", "Ré♭"], ["Ré"], ["Ré♯", "Mi♭"], ["Mi"], ["Fa"],
    ["Fa♯", "Sol♭"], ["Sol"], ["Sol♯", "La♭"], ["La"], ["La♯", "Si♭"], ["Si"],
  ];
  const IS_BLACK = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0].map(Boolean);

  const INTERVALS = [
    { id: "2m", name: "seconde mineure",  short: "2de min",  num: 2, semis: 1 },
    { id: "2M", name: "seconde majeure",  short: "2de maj",  num: 2, semis: 2 },
    { id: "3m", name: "tierce mineure",   short: "3ce min",  num: 3, semis: 3 },
    { id: "3M", name: "tierce majeure",   short: "3ce maj",  num: 3, semis: 4 },
    { id: "4d", name: "quarte diminuée",  short: "4te dim",  num: 4, semis: 4 },
    { id: "4J", name: "quarte juste",     short: "4te juste", num: 4, semis: 5, juste: true },
    { id: "4A", name: "quarte augmentée", short: "4te aug",  num: 4, semis: 6 },
    { id: "5d", name: "quinte diminuée",  short: "5te dim",  num: 5, semis: 6 },
    { id: "5J", name: "quinte juste",     short: "5te juste", num: 5, semis: 7, juste: true },
    { id: "5A", name: "quinte augmentée", short: "5te aug",  num: 5, semis: 8 },
    { id: "6m", name: "sixte mineure",    short: "6te min",  num: 6, semis: 8 },
    { id: "6M", name: "sixte majeure",    short: "6te maj",  num: 6, semis: 9 },
    { id: "7m", name: "septième mineure", short: "7e min",   num: 7, semis: 10 },
    { id: "7M", name: "septième majeure", short: "7e maj",   num: 7, semis: 11 },
  ];

  const spell = (l, a) => LETTERS[l] + ACC[a];
  // les altérations passent par une police de symboles (la police du site ne les a pas)
  const fmt = name => String(name).replace(/[♯♭]+/g, m => `<span class="acc">${m}</span>`);

  // dir = 1 (montant) ou -1 (descendant)
  function spellInterval(root, iv, dir = 1) {
    const letter = ((root.l + dir * (iv.num - 1)) % 7 + 7) % 7;
    const pc = ((root.pc + dir * iv.semis) % 12 + 12) % 12;
    let acc = pc - NATURAL_PC[letter];
    acc = ((acc + 6) % 12 + 12) % 12 - 6; // ramène dans [-6, 5]
    return { pc, name: spell(letter, acc) };
  }

  function tonesText(semis) {
    const t = Math.floor(semis / 2);
    const half = semis % 2 === 1;
    if (t === 0) return "un demi-ton";
    return `${t} ton${t > 1 ? "s" : ""}${half ? " et demi" : ""}`;
  }

  /* ------------------------------------------------------------------ *
   *  Stockage (facultatif)
   * ------------------------------------------------------------------ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("musickyk:" + k) ?? localStorage.getItem("kyk:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("musickyk:" + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  // Les données du navigateur sont partagées par tous les sites *.github.io du même compte :
  // on ne leur fait pas confiance et on ne garde que des valeurs connues.
  const IV_IDS = INTERVALS.map(i => i.id);
  function loadSettings() {
    const raw = store.get("settings", {});
    const s = { intervals: IV_IDS.slice(), roots: ROOTS.map(r => r.pc), sound: true, auto: false, mode: "note", dir: "up", focus: false };
    if (!raw || typeof raw !== "object") return s;
    if (Array.isArray(raw.intervals)) s.intervals = IV_IDS.filter(id => raw.intervals.includes(id));
    if (Array.isArray(raw.roots)) s.roots = ROOTS.map(r => r.pc).filter(pc => raw.roots.includes(pc));
    if (typeof raw.sound === "boolean") s.sound = raw.sound;
    if (typeof raw.auto === "boolean") s.auto = raw.auto;
    if (typeof raw.focus === "boolean") s.focus = raw.focus;
    if (["note", "name", "ear"].includes(raw.mode)) s.mode = raw.mode;
    if (["up", "down", "both"].includes(raw.dir)) s.dir = raw.dir;
    return s;
  }
  const RECENT = 20;
  function loadStats() {
    const raw = store.get("stats", {});
    const n = v => (Number.isSafeInteger(v) && v >= 0 ? v : 0);
    const s = { score: n(raw && raw.score), total: n(raw && raw.total), streak: n(raw && raw.streak), best: n(raw && raw.best), byMode: {} };
    if (s.score > s.total) s.score = s.total;
    // détail par mode et par intervalle : { n, ok, last: [1,0,1…] (20 dernières réponses) }
    const bm = raw && raw.byMode;
    ["note", "name", "ear"].forEach(m => {
      s.byMode[m] = {};
      const src = bm && typeof bm === "object" ? bm[m] : null;
      if (!src || typeof src !== "object") return;
      IV_IDS.forEach(id => {
        const e = src[id];
        if (!e || typeof e !== "object") return;
        const last = Array.isArray(e.last) ? e.last.filter(x => x === 0 || x === 1).slice(-RECENT) : [];
        const tot = n(e.n), ok = Math.min(n(e.ok), tot);
        if (tot) s.byMode[m][id] = { n: tot, ok, last };
      });
    });
    return s;
  }
  const settings = loadSettings();
  const stats = loadStats();

  /* ------------------------------------------------------------------ *
   *  Audio (petit synthé type piano)
   * ------------------------------------------------------------------ */
  let ctx = null;
  function audio() {
    // les navigateurs refusent le son avant une première interaction de l'utilisateur
    if (!ctx && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function playNote(midi, delay = 0, dur = 1.6, vel = 0.32) {
    if (!settings.sound) return;
    const ac = audio(); if (!ac) return;
    const t = ac.currentTime + delay;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const out = ac.createGain();
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    out.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.25);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(out).connect(ac.destination);
    [[1, "triangle", 1], [2, "sine", 0.35], [3, "sine", 0.12], [4.01, "sine", 0.05]].forEach(([mult, type, g]) => {
      const o = ac.createOscillator(); const og = ac.createGain();
      o.type = type; o.frequency.value = f * mult; og.gain.value = g;
      o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 0.05);
    });
  }

  /* ------------------------------------------------------------------ *
   *  DOM
   * ------------------------------------------------------------------ */
  const $ = s => document.querySelector(s);
  const els = {
    question: $("#question"), eyebrow: $("#q-eyebrow"), feedback: $("#feedback"),
    next: $("#btn-next"), listen: $("#btn-listen"), piano: $("#piano"), semis: $("#semis"),
    answers: $("#answers"), answersIv: $("#answers-iv"), listenLabel: $("#listen-label"), chipsIv: $("#chips-intervals"), chipsRoots: $("#chips-roots"),
    summary: $("#settings-summary"), weakList: $("#weak-list"), weakSummary: $("#weak-summary"), weakMode: $("#weak-mode"), focus: $("#opt-focus"), cheat: $("#cheat"), sound: $("#opt-sound"), auto: $("#opt-auto"),
    score: $("#stat-score"), acc: $("#stat-acc"), streak: $("#stat-streak"),
  };

  // Piano : 2 octaves, Do4 (60) → Si5 (83)
  const LOW = 60, HIGH = 83;
  const keyEls = new Map();
  (function buildPiano() {
    const inner = document.createElement("div");
    inner.className = "keys";
    const whites = [];
    for (let m = LOW; m <= HIGH; m++) if (!IS_BLACK[m % 12]) whites.push(m);
    const ww = 100 / whites.length;
    let wi = 0;
    for (let m = LOW; m <= HIGH; m++) {
      const pc = m % 12;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.midi = m;
      b.setAttribute("aria-label", PC_LABEL[pc].join(" / "));
      const name = document.createElement("span");
      name.className = "kname";
      b.appendChild(name);
      if (IS_BLACK[pc]) {
        b.className = "key black";
        const bw = ww * 0.6;
        b.style.left = `calc(${wi * ww}% - ${bw / 2}%)`;
        b.style.width = `${bw}%`;
      } else {
        b.className = "key white" + (pc === 0 ? " c" : "");
        wi++;
        if (m === HIGH) b.classList.add("last");
      }
      keyEls.set(m, b);
      inner.appendChild(b);
    }
    els.piano.appendChild(inner);
    resetKeyNames();
  })();

  function resetKeyNames() {
    keyEls.forEach((k, m) => {
      k.querySelector(".kname").textContent = m % 12 === 0 ? "Do" : "";
    });
  }

  // Boutons de réponse
  const ansEls = [];
  for (let pc = 0; pc < 12; pc++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ans" + (IS_BLACK[pc] ? " blackish" : "");
    b.dataset.pc = pc;
    b.innerHTML = `<span>${fmt(PC_LABEL[pc][0])}</span>` + (PC_LABEL[pc][1] ? `<small>${fmt(PC_LABEL[pc][1])}</small>` : "");
    b.addEventListener("click", () => answer(pc, null));
    ansEls.push(b);
    els.answers.appendChild(b);
  }

  // Aide-mémoire
  els.cheat.innerHTML = "<tbody>" + INTERVALS.map(iv =>
    `<tr><td>${cap(iv.name)}</td><td>${iv.semis}</td></tr>`).join("") + "</tbody>";

  /* ------------------------------------------------------------------ *
   *  Réglages
   * ------------------------------------------------------------------ */
  function chip(label, pressed, onToggle) {
    const c = document.createElement("button");
    c.type = "button"; c.className = "chip"; c.textContent = label;
    c.setAttribute("aria-pressed", String(pressed));
    c.addEventListener("click", () => {
      const now = c.getAttribute("aria-pressed") !== "true";
      c.setAttribute("aria-pressed", String(now));
      onToggle(now);
    });
    return c;
  }
  function renderChips() {
    els.chipsIv.innerHTML = ""; els.chipsRoots.innerHTML = "";
    INTERVALS.forEach(iv => els.chipsIv.appendChild(chip(cap(iv.name), settings.intervals.includes(iv.id), on => {
      settings.intervals = on ? [...settings.intervals, iv.id] : settings.intervals.filter(x => x !== iv.id);
      saveSettings();
    })));
    ROOTS.forEach(r => els.chipsRoots.appendChild(chip(spell(r.l, r.a), settings.roots.includes(r.pc), on => {
      settings.roots = on ? [...settings.roots, r.pc] : settings.roots.filter(x => x !== r.pc);
      saveSettings();
    })));
  }
  function saveSettings() {
    store.set("settings", settings);
    els.summary.textContent = `${settings.intervals.length} intervalle${settings.intervals.length > 1 ? "s" : ""} · ${settings.roots.length} note${settings.roots.length > 1 ? "s" : ""}`;
  }
  document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    const p = b.dataset.preset;
    settings.intervals = p === "all" ? INTERVALS.map(i => i.id) : p === "asked" ? INTERVALS.filter(i => !i.juste).map(i => i.id) : [];
    renderChips(); saveSettings();
  }));
  document.querySelectorAll("[data-roots]").forEach(b => b.addEventListener("click", () => {
    settings.roots = b.dataset.roots === "all" ? ROOTS.map(r => r.pc) : ROOTS.filter(r => r.a === 0).map(r => r.pc);
    renderChips(); saveSettings();
  }));
  els.sound.checked = settings.sound;
  els.auto.checked = settings.auto;
  els.sound.addEventListener("change", () => { settings.sound = els.sound.checked; saveSettings(); });
  els.auto.addEventListener("change", () => { settings.auto = els.auto.checked; saveSettings(); });
  els.focus.checked = settings.focus;
  els.focus.addEventListener("change", () => { settings.focus = els.focus.checked; saveSettings(); });
  $("#btn-reset").addEventListener("click", () => {
    Object.assign(stats, { score: 0, total: 0, streak: 0, best: 0, byMode: { note: {}, name: {}, ear: {} } });
    store.set("stats", stats); renderStats(); renderWeak();
  });

  /* ------------------------------------------------------------------ *
   *  Modes
   * ------------------------------------------------------------------ */
  const MODES = {
    note: { listen: "Écouter", hint: "Réponds avec les cases ou directement sur le clavier." },
    name: { listen: "Écouter", hint: "" },
    ear:  { listen: "Réécouter", hint: "" },
  };
  if (!MODES[settings.mode]) settings.mode = "note";
  const modeBtns = document.querySelectorAll("[data-mode]");
  function renderModes() {
    modeBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === settings.mode)));
    els.listenLabel.textContent = MODES[settings.mode].listen;
    els.answers.hidden = settings.mode !== "note";
    els.answersIv.hidden = settings.mode === "note";
  }
  const dirBtns = document.querySelectorAll("[data-dir]");
  function renderDirs() { dirBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.dir === settings.dir))); }
  dirBtns.forEach(b => b.addEventListener("click", () => {
    if (settings.dir === b.dataset.dir) return;
    settings.dir = b.dataset.dir; saveSettings(); renderDirs();
    newQuestion();
  }));
  modeBtns.forEach(b => b.addEventListener("click", () => {
    if (settings.mode === b.dataset.mode) return;
    settings.mode = b.dataset.mode; saveSettings(); renderModes(); renderWeak();
    current = null; qNum = 0; newQuestion();
  }));

  /* ------------------------------------------------------------------ *
   *  Quiz
   * ------------------------------------------------------------------ */
  let current = null;
  let answered = false;
  let qNum = 0;
  let autoTimer = null;
  let ivBtns = [];

  const deOf = name => /^[AEIOUYÉ]/i.test(name) ? "d’" : "de ";

  function playInterval(c, delay = 0.05) {
    playNote(c.rootMidi, delay, 1.1); setTimeout(() => pulse(c.rootMidi), delay * 1000);
    playNote(c.targetMidi, delay + 0.55, 1.1); setTimeout(() => pulse(c.targetMidi), (delay + 0.55) * 1000);
    playNote(c.rootMidi, delay + 1.2, 1.8, 0.24); playNote(c.targetMidi, delay + 1.2, 1.8, 0.24);
  }
  // en mode oreille on ne trahit pas la réponse en faisant bouger les touches
  function playIntervalSilently(c, delay = 0.05) {
    playNote(c.rootMidi, delay, 1.1);
    playNote(c.targetMidi, delay + 0.55, 1.1);
    playNote(c.rootMidi, delay + 1.2, 1.8, 0.24); playNote(c.targetMidi, delay + 1.2, 1.8, 0.24);
  }

  function buildIntervalButtons(ivs) {
    els.answersIv.innerHTML = "";
    let options;
    if (settings.mode === "ear") {
      // même nombre de demi-tons = même son : un seul bouton
      const bySemis = new Map();
      ivs.forEach(iv => { if (!bySemis.has(iv.semis)) bySemis.set(iv.semis, []); bySemis.get(iv.semis).push(iv); });
      options = [...bySemis.entries()].sort((a, b) => a[0] - b[0]).map(([semis, list]) => ({
        semis,
        label: list.length > 1 ? list.map(i => cap(i.short)).join(" / ") : cap(list[0].name),
        sub: list.length > 1 ? "même son" : `${semis} demi-ton${semis > 1 ? "s" : ""}`,
        test: iv => iv.semis === semis,
      }));
    } else {
      options = ivs.map(iv => ({ id: iv.id, label: cap(iv.name), sub: "", test: x => x.id === iv.id }));
    }
    ivBtns = options.map(o => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "ans";
      b.innerHTML = `<span>${o.label}</span>` + (o.sub ? `<small>${o.sub}</small>` : "");
      b.addEventListener("click", () => answerInterval(o, b));
      b._opt = o;
      els.answersIv.appendChild(b);
      return b;
    });
  }

  function newQuestion() {
    clearTimeout(autoTimer);
    const ivs = INTERVALS.filter(i => settings.intervals.includes(i.id));
    const roots = ROOTS.filter(r => settings.roots.includes(r.pc));
    if (!ivs.length || !roots.length) {
      els.question.textContent = "Aucun intervalle ou aucune note choisis. Voir les réglages plus bas.";
      els.feedback.textContent = ""; els.feedback.className = "feedback";
      ansEls.forEach(b => b.disabled = true);
      els.answersIv.innerHTML = "";
      els.next.disabled = false;
      current = null; clearPiano();
      return;
    }
    let root, iv, tries = 0;
    do {
      root = roots[Math.floor(Math.random() * roots.length)];
      iv = settings.focus ? pickWeighted(ivs) : ivs[Math.floor(Math.random() * ivs.length)];
    } while (current && tries++ < 20 && (ivs.length * roots.length > 1) && current.root === root && current.iv === iv);

    const dir = settings.dir === "down" ? -1 : settings.dir === "both" ? (Math.random() < 0.5 ? 1 : -1) : 1;
    const target = spellInterval(root, iv, dir);
    // montant : départ dans l'octave du bas ; descendant : départ dans l'octave du haut
    current = { root, iv, dir, target, rootName: spell(root.l, root.a), rootMidi: LOW + root.pc + (dir < 0 ? 12 : 0) };
    current.targetMidi = current.rootMidi + dir * iv.semis;
    current.ivName = iv.name + (dir < 0 ? " descendante" : "");
    answered = false;
    qNum++;

    els.eyebrow.textContent = String(qNum).padStart(2, "0");
    els.feedback.className = "feedback";
    els.feedback.textContent = MODES[settings.mode].hint;
    els.semis.innerHTML = "";
    els.next.disabled = true;
    clearPiano();

    const { rootName } = current;
    if (settings.mode === "note") {
      els.question.innerHTML = `La <span class="int">${current.ivName}</span> ${deOf(rootName)}<span class="nt">${fmt(rootName)}</span> ?`;
      ansEls.forEach(b => { b.disabled = false; b.classList.remove("correct", "incorrect"); });
      mark(current.rootMidi, "root", rootName);
      playNote(current.rootMidi, 0.02, 1.2);
    } else if (settings.mode === "name") {
      els.question.innerHTML = `De <span class="nt">${fmt(rootName)}</span> à <span class="nt t">${fmt(target.name)}</span>${dir < 0 ? " en descendant" : ""}, quel intervalle ?`;
      buildIntervalButtons(ivs);
      mark(current.rootMidi, "root", rootName);
      mark(current.targetMidi, "target", target.name);
      playInterval(current);
    } else {
      els.question.innerHTML = `Quel intervalle entends-tu ?`;
      buildIntervalButtons(ivs);
      playIntervalSilently(current, 0.1);
    }
  }

  function clearPiano() {
    keyEls.forEach(k => k.classList.remove("root", "target", "wrong", "between", "press"));
    resetKeyNames();
  }
  function mark(midi, cls, label) {
    const k = keyEls.get(midi); if (!k) return;
    k.classList.add(cls);
    if (label) k.querySelector(".kname").innerHTML = fmt(label);
  }
  function pulse(midi) {
    const k = keyEls.get(midi); if (!k) return;
    k.classList.add("press");
    clearTimeout(k._t); k._t = setTimeout(() => k.classList.remove("press"), 160);
  }

  function score(ok) {
    answered = true;
    clearTimeout(autoTimer);
    stats.total++;
    if (ok) { stats.score++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
    else stats.streak = 0;
    const tab = stats.byMode[settings.mode];
    const e = tab[current.iv.id] || (tab[current.iv.id] = { n: 0, ok: 0, last: [] });
    e.n++; if (ok) e.ok++;
    e.last.push(ok ? 1 : 0); if (e.last.length > RECENT) e.last.shift();
    store.set("stats", stats);
    renderStats(ok);
    renderWeak();
  }

  function revealPiano() {
    const { rootMidi, targetMidi, rootName, target, iv, dir } = current;
    for (let m = Math.min(rootMidi, targetMidi) + 1; m < Math.max(rootMidi, targetMidi); m++) mark(m, "between");
    mark(rootMidi, "root", rootName);
    mark(targetMidi, "target", target.name);
    els.semis.innerHTML = `${fmt(rootName)} à ${fmt(target.name)}, en ${dir < 0 ? "descendant" : "montant"} : <b>${iv.semis} demi-ton${iv.semis > 1 ? "s" : ""}</b> (${tonesText(iv.semis)})`;
  }

  function finish(ok, html) {
    els.feedback.className = "feedback " + (ok ? "ok" : "ko");
    els.feedback.innerHTML = html;
    els.next.disabled = false;
    if (ok && settings.auto) autoTimer = setTimeout(newQuestion, 2800);
  }

  // Mode « trouver la note »
  function answer(pc, clickedMidi) {
    if (!current || answered || settings.mode !== "note") return;
    const ok = pc === current.target.pc;
    const { root, iv, target, rootName, rootMidi, targetMidi } = current;
    score(ok);

    ansEls.forEach(b => b.disabled = true);
    ansEls[target.pc].classList.add("correct");
    if (!ok) ansEls[pc].classList.add("incorrect");

    revealPiano();
    if (!ok) {
      let wm = clickedMidi;
      if (wm == null) {
        const d = current.dir > 0 ? (pc - root.pc + 12) % 12 : (root.pc - pc + 12) % 12;
        wm = rootMidi + current.dir * (d || 12);
      }
      if (wm !== rootMidi && wm !== targetMidi) mark(wm, "wrong", PC_LABEL[pc][0]);
    }

    const sameKey = PC_LABEL[target.pc].includes(target.name) ? "" : ` <span class="soft">Même touche que ${PC_LABEL[target.pc].map(fmt).join(" / ")}.</span>`;
    const sentence = `${cap(current.ivName)} ${deOf(rootName)}${fmt(rootName)} : <b>${fmt(target.name)}</b>.${sameKey}`;
    finish(ok, ok ? `<span class="tag">Juste</span>${sentence}` : `<span class="tag">Faux</span>Tu as mis ${PC_LABEL[pc].map(fmt).join(" / ")}. ${sentence}`);
    playInterval(current);
  }

  // Modes « nommer l'intervalle » et « à l'oreille »
  function answerInterval(opt, btn) {
    if (!current || answered) return;
    const ok = opt.test(current.iv);
    score(ok);
    ivBtns.forEach(b => {
      b.disabled = true;
      if (b._opt.test(current.iv)) b.classList.add("correct");
    });
    if (!ok) btn.classList.add("incorrect");
    revealPiano();
    const { iv, rootName, target } = current;
    let sentence = `${fmt(rootName)} à ${fmt(target.name)} : <b>${current.ivName}</b>.`;
    if (settings.mode === "ear") {
      const twins = INTERVALS.filter(i => i.semis === iv.semis && i !== iv);
      if (twins.length) sentence += ` <span class="soft">Même son : ${twins.map(t => t.name).join(", ")}.</span>`;
    }
    finish(ok, ok ? `<span class="tag">Juste</span>${sentence}` : `<span class="tag">Faux</span>${sentence}`);
    playInterval(current);
  }

  /* ---------- Points faibles ---------- */
  // taux de réussite récent (20 dernières réponses) ; null si jamais joué
  function rateOf(id) {
    const e = stats.byMode[settings.mode][id];
    if (!e || !e.last.length) return null;
    return e.last.reduce((a, b) => a + b, 0) / e.last.length;
  }
  // plus un intervalle est raté, plus il revient souvent ; jamais joué = un peu favorisé
  function pickWeighted(ivs) {
    const w = ivs.map(iv => { const r = rateOf(iv.id); return r === null ? 2 : 1 + 8 * (1 - r); });
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ivs.length; i++) { x -= w[i]; if (x <= 0) return ivs[i]; }
    return ivs[ivs.length - 1];
  }
  const MODE_NAMES = { note: "Trouver la note", name: "Nommer l’intervalle", ear: "À l’oreille" };
  function renderWeak() {
    const rows = INTERVALS.map(iv => {
      const e = stats.byMode[settings.mode][iv.id];
      return { iv, e, r: rateOf(iv.id) };
    });
    const played = rows.filter(x => x.r !== null).sort((a, b) => a.r - b.r || b.e.n - a.e.n);
    const unplayed = rows.filter(x => x.r === null);
    const weak = played.filter(x => x.r < 0.7 && x.e.last.length >= 3);
    els.weakSummary.textContent = played.length
      ? (weak.length ? `${weak.length} à revoir` : "rien à signaler")
      : "pas encore de données";
    els.weakMode.textContent = MODE_NAMES[settings.mode];
    if (!played.length) {
      els.weakList.innerHTML = `<p class="weak-empty">Réponds à quelques questions dans ce mode : les intervalles les plus ratés s’afficheront ici, du pire au meilleur.</p>`;
      return;
    }
    els.weakList.innerHTML = played.map(({ iv, e, r }) => {
      const pct = Math.round(r * 100);
      const lvl = e.last.length < 3 ? "few" : r < 0.5 ? "bad" : r < 0.7 ? "mid" : r < 0.9 ? "ok" : "top";
      const dots = e.last.slice(-10).map(x => `<i class="${x ? "y" : "n"}"></i>`).join("");
      return `<li class="${lvl}"><span class="wn">${cap(iv.name)}</span>`
        + `<span class="wbar"><b data-w="${pct}"></b></span>`
        + `<span class="wp">${pct}%</span>`
        + `<span class="wd" title="10 dernières réponses">${dots}</span>`
        + `<span class="wc">${e.ok}/${e.n}</span></li>`;
    }).join("") + (unplayed.length
      ? `<li class="none"><span class="wn">Pas encore joués</span><span class="wrest">${unplayed.map(x => x.iv.short).join(", ")}</span></li>`
      : "");
    // largeur posée via le DOM : la CSP interdit les attributs style dans le HTML
    els.weakList.querySelectorAll("[data-w]").forEach(b => { b.style.width = b.dataset.w + "%"; });
  }

  function renderStats(ok) {
    els.score.textContent = stats.score;
    els.acc.textContent = stats.total ? Math.round(100 * stats.score / stats.total) + "%" : "–";
    els.streak.textContent = stats.streak;
    els.streak.title = `Record : ${stats.best}`;
    if (ok) { els.streak.classList.remove("hit"); void els.streak.offsetWidth; els.streak.classList.add("hit"); }
  }

  // Clic sur le piano : répond (mode note) ou joue simplement la note
  function pressKey(m) {
    if (current && !answered && settings.mode === "note") answer(m % 12, m);
    else { playNote(m, 0, 1.2); pulse(m); }
  }
  els.piano.addEventListener("pointerdown", e => {
    const k = e.target.closest(".key"); if (!k) return;
    pressKey(+k.dataset.midi);
  });
  els.piano.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const k = e.target.closest(".key"); if (!k) return;
    e.preventDefault(); pressKey(+k.dataset.midi);
  });

  els.next.addEventListener("click", newQuestion);
  els.listen.addEventListener("click", () => {
    if (!current) return;
    if (settings.mode === "note") { playNote(current.rootMidi, 0, 1.2); pulse(current.rootMidi); }
    else if (settings.mode === "ear" && !answered) playIntervalSilently(current, 0);
    else playInterval(current, 0);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !els.next.disabled && !e.target.closest("button, input, summary")) { e.preventDefault(); newQuestion(); }
  });

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ------------------------------------------------------------------ */
  renderChips();
  saveSettings();
  renderModes();
  renderDirs();
  renderStats();
  renderWeak();
  newQuestion();

  /* ------------------------------------------------------------------ *
   *  Détection de nouvelle version → bandeau « Actualiser »
   *  On compare l'empreinte des fichiers du site au chargement et
   *  périodiquement (toutes les 5 min et au retour sur l'onglet).
   * ------------------------------------------------------------------ */
  const WATCHED = ["index.html", "app.js", "style.css"];
  const bar = $("#update-bar");
  let baseline = null, dismissedAt = null, checking = false;

  async function fingerprint() {
    if (!window.crypto || !crypto.subtle || location.protocol === "file:") return null;
    const parts = await Promise.all(WATCHED.map(f =>
      // cache:"reload" va chercher la version en ligne ET met à jour le cache du navigateur,
      // pour que « Actualiser » charge bien les nouveaux fichiers.
      fetch(f, { cache: "reload", credentials: "same-origin" }).then(r => (r.ok ? r.text() : Promise.reject(r.status)))));
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("\u0000")));
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }
  async function checkUpdate() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const fp = await fingerprint();
      if (!fp) return;
      if (!baseline) baseline = fp;
      else if (fp !== baseline && fp !== dismissedAt) bar.hidden = false;
      if (fp !== baseline) bar.dataset.fp = fp;
    } catch { /* hors ligne : on réessaiera */ }
    finally { checking = false; }
  }
  $("#btn-update").addEventListener("click", () => location.reload());
  $("#btn-update-close").addEventListener("click", () => { bar.hidden = true; dismissedAt = bar.dataset.fp || null; });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkUpdate(); });
  window.addEventListener("online", checkUpdate);
  setInterval(checkUpdate, 5 * 60 * 1000);
  checkUpdate();
})();

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

  function spellInterval(root, iv) {
    const letter = (root.l + iv.num - 1) % 7;
    const pc = (root.pc + iv.semis) % 12;
    let acc = pc - NATURAL_PC[letter];
    acc = ((acc + 6) % 12 + 12) % 12 - 6; // ramène dans [-6, 5]
    return { pc, name: spell(letter, acc) };
  }

  function tonesText(semis) {
    const t = Math.floor(semis / 2);
    const half = semis % 2 === 1;
    if (t === 0) return "½ ton";
    return `${t} ton${t > 1 ? "s" : ""}${half ? " ½" : ""}`;
  }

  /* ------------------------------------------------------------------ *
   *  Stockage (facultatif)
   * ------------------------------------------------------------------ */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("kyk:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("kyk:" + k, JSON.stringify(v)); } catch { /* ignore */ } },
  };

  const settings = Object.assign(
    { intervals: INTERVALS.map(i => i.id), roots: ROOTS.map(r => r.pc), sound: true, auto: false },
    store.get("settings", {})
  );
  const stats = Object.assign({ score: 0, total: 0, streak: 0, best: 0 }, store.get("stats", {}));

  /* ------------------------------------------------------------------ *
   *  Audio (petit synthé type piano)
   * ------------------------------------------------------------------ */
  let ctx = null;
  function audio() {
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
    answers: $("#answers"), chipsIv: $("#chips-intervals"), chipsRoots: $("#chips-roots"),
    summary: $("#settings-summary"), cheat: $("#cheat"), sound: $("#opt-sound"), auto: $("#opt-auto"),
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
      }
      keyEls.set(m, b);
      inner.appendChild(b);
    }
    els.piano.appendChild(inner);
    resetKeyNames();
  })();

  function resetKeyNames() {
    keyEls.forEach((k, m) => {
      k.querySelector(".kname").textContent = m % 12 === 0 ? `Do${Math.floor(m / 12) - 1}` : "";
    });
  }

  // Boutons de réponse
  const ansEls = [];
  for (let pc = 0; pc < 12; pc++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ans" + (IS_BLACK[pc] ? " blackish" : "");
    b.dataset.pc = pc;
    b.innerHTML = PC_LABEL[pc][0] + (PC_LABEL[pc][1] ? `<small>${PC_LABEL[pc][1]}</small>` : "");
    b.addEventListener("click", () => answer(pc, null));
    ansEls.push(b);
    els.answers.appendChild(b);
  }

  // Aide-mémoire
  els.cheat.innerHTML = INTERVALS.map(iv =>
    `<div class="cheat-item"><span>${cap(iv.name)}</span><b>${iv.semis} ½t</b></div>`).join("");

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
  $("#btn-reset").addEventListener("click", () => {
    Object.assign(stats, { score: 0, total: 0, streak: 0, best: 0 });
    store.set("stats", stats); renderStats();
  });

  /* ------------------------------------------------------------------ *
   *  Quiz
   * ------------------------------------------------------------------ */
  let current = null;
  let answered = false;
  let qNum = 0;
  let autoTimer = null;

  function newQuestion() {
    clearTimeout(autoTimer);
    const ivs = INTERVALS.filter(i => settings.intervals.includes(i.id));
    const roots = ROOTS.filter(r => settings.roots.includes(r.pc));
    if (!ivs.length || !roots.length) {
      els.question.innerHTML = "Choisis au moins un intervalle et une note dans les réglages ↓";
      els.feedback.textContent = ""; els.feedback.className = "feedback";
      ansEls.forEach(b => b.disabled = true);
      els.next.disabled = false;
      current = null; clearPiano();
      return;
    }
    let root, iv, tries = 0;
    do {
      root = roots[Math.floor(Math.random() * roots.length)];
      iv = ivs[Math.floor(Math.random() * ivs.length)];
    } while (current && tries++ < 20 && (ivs.length * roots.length > 1) && current.root === root && current.iv === iv);

    const target = spellInterval(root, iv);
    current = { root, iv, target, rootName: spell(root.l, root.a), rootMidi: LOW + root.pc };
    current.targetMidi = current.rootMidi + iv.semis;
    answered = false;
    qNum++;

    els.eyebrow.textContent = `Question ${qNum}`;
    const de = /^[AEIOUYÉ]/i.test(current.rootName) ? "d’" : "de ";
    els.question.innerHTML = `Quelle est la <span class="hl-int">${iv.name}</span> ${de}<span class="hl-root">${current.rootName}</span> ?`;
    els.feedback.className = "feedback";
    els.feedback.textContent = "Choisis une note ci‑dessous ou directement sur le piano.";
    els.semis.innerHTML = "";
    els.next.disabled = true;
    ansEls.forEach(b => { b.disabled = false; b.classList.remove("correct", "incorrect"); });

    clearPiano();
    mark(current.rootMidi, "root", current.rootName);
    playNote(current.rootMidi, 0.02, 1.2);
  }

  function clearPiano() {
    keyEls.forEach(k => k.classList.remove("root", "target", "wrong", "between", "pulse"));
    resetKeyNames();
  }
  function mark(midi, cls, label) {
    const k = keyEls.get(midi); if (!k) return;
    k.classList.add(cls);
    if (label) k.querySelector(".kname").textContent = label;
  }
  function pulse(midi) {
    const k = keyEls.get(midi); if (!k) return;
    k.classList.remove("pulse"); void k.offsetWidth; k.classList.add("pulse");
  }

  function answer(pc, clickedMidi) {
    if (!current || answered) return;
    answered = true;
    clearTimeout(autoTimer);
    const ok = pc === current.target.pc;
    const { root, iv, target, rootName, rootMidi, targetMidi } = current;

    stats.total++;
    if (ok) { stats.score++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
    else stats.streak = 0;
    store.set("stats", stats);
    renderStats(ok);

    // Boutons
    ansEls.forEach(b => b.disabled = true);
    ansEls[target.pc].classList.add("correct");
    if (!ok) ansEls[pc].classList.add("incorrect");

    // Piano
    for (let m = rootMidi + 1; m < targetMidi; m++) mark(m, "between");
    mark(targetMidi, "target", target.name);
    if (!ok) {
      let wm = clickedMidi;
      if (wm == null) { wm = rootMidi + ((pc - root.pc + 12) % 12); if (wm === rootMidi) wm += 12; }
      if (wm !== rootMidi && wm !== targetMidi) mark(wm, "wrong", PC_LABEL[pc][0]);
    }

    // Texte
    const de = /^[AEIOUYÉ]/i.test(rootName) ? "d’" : "de ";
    const sameKey = PC_LABEL[target.pc].includes(target.name) ? "" : ` <span class="muted">(même touche que ${PC_LABEL[target.pc].join(" / ")})</span>`;
    const sentence = `La ${iv.name} ${de}${rootName}, c’est <strong>${target.name}</strong>${sameKey}.`;
    els.feedback.className = "feedback " + (ok ? "ok" : "ko");
    els.feedback.innerHTML = ok ? `Bravo ! ${sentence}` : `Raté — tu as choisi ${PC_LABEL[pc].join(" / ")}. ${sentence}`;
    els.semis.innerHTML = `${rootName} → ${target.name} : <b>${iv.semis} demi‑ton${iv.semis > 1 ? "s" : ""}</b> · ${tonesText(iv.semis)}`;
    els.next.disabled = false;

    // Son : mélodique puis harmonique
    playNote(rootMidi, 0.05, 1.1); setTimeout(() => pulse(rootMidi), 50);
    playNote(targetMidi, 0.6, 1.1); setTimeout(() => pulse(targetMidi), 600);
    playNote(rootMidi, 1.25, 1.8, 0.24); playNote(targetMidi, 1.25, 1.8, 0.24);

    if (ok && settings.auto) autoTimer = setTimeout(newQuestion, 2600);
  }

  function renderStats(ok) {
    els.score.textContent = stats.score;
    els.acc.textContent = stats.total ? Math.round(100 * stats.score / stats.total) + "%" : "–";
    els.streak.textContent = stats.streak;
    els.streak.parentElement.title = `Meilleure série : ${stats.best}`;
    if (ok) {
      const s = els.streak.parentElement;
      s.classList.remove("bump"); void s.offsetWidth; s.classList.add("bump");
    }
  }

  // Clic sur le piano : répond (si question en cours) et joue la note
  els.piano.addEventListener("pointerdown", e => {
    const k = e.target.closest(".key"); if (!k) return;
    const m = +k.dataset.midi;
    if (current && !answered) { answer(m % 12, m); }
    else { playNote(m, 0, 1.2); pulse(m); }
  });
  els.piano.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const k = e.target.closest(".key"); if (!k) return;
    e.preventDefault();
    const m = +k.dataset.midi;
    if (current && !answered) answer(m % 12, m); else playNote(m, 0, 1.2);
  });

  els.next.addEventListener("click", newQuestion);
  els.listen.addEventListener("click", () => {
    if (!current) return;
    playNote(current.rootMidi, 0, 1.2); pulse(current.rootMidi);
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && !els.next.disabled && !e.target.closest("button, input, summary")) { e.preventDefault(); newQuestion(); }
  });

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ------------------------------------------------------------------ */
  renderChips();
  saveSettings();
  renderStats();
  newQuestion();

  // Exposé pour les tests
  window.__kyk = { spellInterval, ROOTS, INTERVALS, spell };
})();

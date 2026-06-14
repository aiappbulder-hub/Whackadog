(() => {
  "use strict";

  const DOGS = ["assets/dog1.png", "assets/dog2.png"];
  const HOLE_COUNT = 9;
  const ROUND_SECONDS = 30;
  const PENALTY_POINTS = 2; // points lost for whacking a sleeping dog
  const MAX_MULT = 5;

  const DIFFICULTY = {
    easy:   { up: 1100, gap: 750, max: 1, penalty: 0.12 },
    normal: { up: 850,  gap: 500, max: 2, penalty: 0.20 },
    hard:   { up: 600,  gap: 320, max: 3, penalty: 0.28 },
  };

  // ---- DOM ----
  const board = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const timeEl = document.getElementById("time");
  const comboEl = document.getElementById("combo");
  const comboMultEl = document.getElementById("comboMult");
  const startBtn = document.getElementById("startBtn");
  const muteBtn = document.getElementById("muteBtn");
  const overlay = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("finalScore");
  const newBestEl = document.getElementById("newBest");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const diffWrap = document.getElementById("difficulty");

  // ---- State ----
  let score = 0;
  let timeLeft = ROUND_SECONDS;
  let running = false;
  let difficulty = "easy";
  let streak = 0; // consecutive good whacks
  let muted = localStorage.getItem("whackADogMuted") === "1";
  let best = Number(localStorage.getItem("whackADogBest") || 0);

  let popTimer = null;
  let countdownTimer = null;
  const holes = [];

  bestEl.textContent = best;
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", muted);

  // ---- Sound (Web Audio, no asset files) ----
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function blip(freq, dur, type = "square", gain = 0.18, slideTo = null) {
    if (muted || !audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur);
  }

  const sounds = {
    whack() { blip(660, 0.12, "square", 0.2, 1180); },
    combo(mult) { blip(520 + mult * 90, 0.16, "triangle", 0.22, 1320); },
    penalty() {
      blip(180, 0.28, "sawtooth", 0.22, 70);
      setTimeout(() => blip(120, 0.22, "sawtooth", 0.2, 60), 90);
    },
    over() {
      [523, 392, 311, 196].forEach((f, i) =>
        setTimeout(() => blip(f, 0.22, "triangle", 0.2), i * 130)
      );
    },
  };

  // ---- Build the board ----
  for (let i = 0; i < HOLE_COUNT; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";

    const dog = document.createElement("img");
    dog.className = "dog";
    dog.alt = "dog";
    dog.draggable = false;

    const badge = document.createElement("div");
    badge.className = "sleep-badge";
    badge.textContent = "😴";

    const fx = document.createElement("div");
    fx.className = "bonk-fx";

    hole.appendChild(dog);
    hole.appendChild(badge);
    hole.appendChild(fx);
    board.appendChild(hole);

    const state = { el: hole, dog, fx, up: false, penalty: false, hitTimer: null };
    holes.push(state);

    hole.addEventListener("pointerdown", () => whack(state));
  }

  // ---- Combo helpers ----
  function multiplier() {
    return Math.min(1 + Math.floor(streak / 3), MAX_MULT);
  }

  function renderCombo() {
    const m = multiplier();
    if (m > 1 && running) {
      comboMultEl.textContent = "x" + m;
      comboEl.classList.remove("hidden");
      comboEl.classList.remove("bump");
      void comboEl.offsetWidth; // restart animation
      comboEl.classList.add("bump");
    } else {
      comboEl.classList.add("hidden");
    }
  }

  // ---- Game logic ----
  function whack(state) {
    if (!running || !state.up) return;
    state.up = false;
    state.el.classList.remove("up");
    clearTimeout(state.hitTimer);

    if (state.penalty) {
      // whacked a sleeping dog — penalty!
      streak = 0;
      score = Math.max(0, score - PENALTY_POINTS);
      scoreEl.textContent = score;
      state.fx.textContent = "-" + PENALTY_POINTS;
      state.el.classList.add("oops");
      state.hitTimer = setTimeout(
        () => state.el.classList.remove("oops"),
        500
      );
      sounds.penalty();
      renderCombo();
      return;
    }

    // good whack
    streak++;
    const m = multiplier();
    score += m;
    scoreEl.textContent = score;
    state.fx.textContent = "+" + m;
    state.el.classList.add("bonk");
    state.hitTimer = setTimeout(() => state.el.classList.remove("bonk"), 500);

    if (m > 1 && streak % 3 === 0) sounds.combo(m);
    else sounds.whack();
    renderCombo();
  }

  function popUp() {
    if (!running) return;
    const cfg = DIFFICULTY[difficulty];

    const down = holes.filter((h) => !h.up);
    const activeCount = holes.filter((h) => h.up).length;
    const slots = Math.max(1, cfg.max - activeCount);

    for (let n = 0; n < slots && down.length; n++) {
      const idx = Math.floor(Math.random() * down.length);
      const state = down.splice(idx, 1)[0];
      raise(state, cfg.up, cfg.penalty);
    }

    const next = cfg.gap + Math.random() * cfg.gap;
    popTimer = setTimeout(popUp, next);
  }

  function raise(state, upMs, penaltyChance) {
    state.dog.src = DOGS[Math.floor(Math.random() * DOGS.length)];
    state.penalty = Math.random() < penaltyChance;
    state.up = true;
    state.el.classList.remove("bonk", "oops");
    state.el.classList.toggle("penalty", state.penalty);
    state.el.classList.add("up");

    setTimeout(() => {
      if (!state.up) return; // already whacked
      state.up = false;
      state.el.classList.remove("up");
    }, upMs);
  }

  function tick() {
    timeLeft--;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 5) timeEl.classList.add("low");
    if (timeLeft <= 0) endGame();
  }

  function resetHoles() {
    holes.forEach((h) => {
      h.up = false;
      h.penalty = false;
      h.el.classList.remove("up", "bonk", "oops", "penalty");
    });
  }

  function startGame() {
    ensureAudio();
    score = 0;
    streak = 0;
    timeLeft = ROUND_SECONDS;
    running = true;
    scoreEl.textContent = "0";
    timeEl.textContent = ROUND_SECONDS;
    timeEl.classList.remove("low");
    comboEl.classList.add("hidden");
    overlay.classList.add("hidden");
    startBtn.disabled = true;

    resetHoles();
    popTimer = setTimeout(popUp, 600);
    countdownTimer = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    clearTimeout(popTimer);
    clearInterval(countdownTimer);
    startBtn.disabled = false;
    comboEl.classList.add("hidden");
    resetHoles();
    sounds.over();

    const isBest = score > best;
    if (isBest) {
      best = score;
      localStorage.setItem("whackADogBest", String(best));
      bestEl.textContent = best;
    }

    finalScoreEl.textContent = score;
    newBestEl.classList.toggle("hidden", !isBest);
    overlay.classList.remove("hidden");
  }

  // ---- Controls ----
  startBtn.addEventListener("click", startGame);
  playAgainBtn.addEventListener("click", startGame);

  muteBtn.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("whackADogMuted", muted ? "1" : "0");
    muteBtn.textContent = muted ? "🔇" : "🔊";
    muteBtn.classList.toggle("muted", muted);
    if (!muted) ensureAudio();
  });

  diffWrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".diff-btn");
    if (!btn || running) return;
    difficulty = btn.dataset.diff;
    diffWrap.querySelectorAll(".diff-btn").forEach((b) =>
      b.classList.toggle("active", b === btn)
    );
  });

  // Avoid losing taps to context menu / text selection on long press
  board.addEventListener("contextmenu", (e) => e.preventDefault());
})();

(() => {
  "use strict";

  const DOGS = ["assets/dog1.png", "assets/dog2.png"];
  const HOLE_COUNT = 9;
  const ROUND_SECONDS = 30;

  const DIFFICULTY = {
    easy:   { up: 1100, gap: 750, max: 1 },
    normal: { up: 850,  gap: 500, max: 2 },
    hard:   { up: 600,  gap: 320, max: 3 },
  };

  // ---- DOM ----
  const board = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const timeEl = document.getElementById("time");
  const startBtn = document.getElementById("startBtn");
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
  let best = Number(localStorage.getItem("whackADogBest") || 0);

  let popTimer = null;
  let countdownTimer = null;
  const holes = [];

  bestEl.textContent = best;

  // ---- Build the board ----
  for (let i = 0; i < HOLE_COUNT; i++) {
    const hole = document.createElement("div");
    hole.className = "hole";

    const dog = document.createElement("img");
    dog.className = "dog";
    dog.alt = "dog";
    dog.draggable = false;

    const fx = document.createElement("div");
    fx.className = "bonk-fx";
    fx.textContent = "+1";

    hole.appendChild(dog);
    hole.appendChild(fx);
    board.appendChild(hole);

    const state = { el: hole, dog, fx, up: false, hitTimer: null };
    holes.push(state);

    hole.addEventListener("pointerdown", () => whack(state));
  }

  // ---- Game logic ----
  function whack(state) {
    if (!running || !state.up) return;
    state.up = false;
    score++;
    scoreEl.textContent = score;

    state.el.classList.remove("up");
    state.el.classList.add("bonk");
    clearTimeout(state.hitTimer);
    state.hitTimer = setTimeout(() => state.el.classList.remove("bonk"), 500);
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
      raise(state, cfg.up);
    }

    const next = cfg.gap + Math.random() * cfg.gap;
    popTimer = setTimeout(popUp, next);
  }

  function raise(state, upMs) {
    state.dog.src = DOGS[Math.floor(Math.random() * DOGS.length)];
    state.up = true;
    state.el.classList.remove("bonk");
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

  function startGame() {
    score = 0;
    timeLeft = ROUND_SECONDS;
    running = true;
    scoreEl.textContent = "0";
    timeEl.textContent = ROUND_SECONDS;
    timeEl.classList.remove("low");
    overlay.classList.add("hidden");
    startBtn.disabled = true;

    holes.forEach((h) => {
      h.up = false;
      h.el.classList.remove("up", "bonk");
    });

    popTimer = setTimeout(popUp, 600);
    countdownTimer = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    clearTimeout(popTimer);
    clearInterval(countdownTimer);
    startBtn.disabled = false;

    holes.forEach((h) => {
      h.up = false;
      h.el.classList.remove("up", "bonk");
    });

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

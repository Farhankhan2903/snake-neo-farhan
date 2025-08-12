// Snake Neo — One-Shot Full Build (MVP -> Full Release)
(() => {
  // --- Helpers & State ---
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const canvas = $("#board");
  const ctx = canvas.getContext("2d");

  const scoreEl = $("#score");
  const bestEl = $("#best");
  const speedEl = $("#speed");
  const modeLabel = $("#modeLabel");

  const sEat = $("#sEat");
  const sDie = $("#sDie");

  const LS = {
    get(key, d){ try { return JSON.parse(localStorage.getItem(key)) ?? d; } catch { return d; } },
    set(key, v){ localStorage.setItem(key, JSON.stringify(v)); }
  };

  // Settings / Progress
  const settings = LS.get("snake_settings", {
    difficulty: "normal",
    boardSize: "medium",
    theme: "neon",
    wrap: false,
    vibrate: false,
  });
  const progress = LS.get("snake_progress", {
    best: 0,
    coins: 0,
    achievements: {},
    ownedSkins: { neon: true },
    equippedSkin: "neon",
    localBoard: [],
  });

  // Apply theme immediately
  document.documentElement.setAttribute("data-theme", settings.theme);
  $("#wrapToggle").checked = settings.wrap;
  $("#difficulty").value = settings.difficulty;
  $("#boardSize").value = settings.boardSize;
  $("#theme").value = settings.theme;
  $("#vibrate").checked = settings.vibrate;
  bestEl.textContent = progress.best;

  // Board configs by size
  const BOARDS = {
    small: { cols: 28, rows: 20, cell: 18 },
    medium: { cols: 40, rows: 30, cell: 18 },
    large: { cols: 54, rows: 38, cell: 16 },
  };

  // Difficulty → base tick
  const DIFF = { easy: 140, normal: 110, hard: 85 };

  // Power-ups
  const POWER_TYPES = ["slow", "shrink", "shield"];
  const POWER_DURATION = 6000; // ms active
  const POWER_SPAWN_CHANCE = 0.08; // 8% each step to spawn if none exists

  // Golden fruit
  const GOLDEN_CHANCE = 0.05;

  // Game State
  let loopId = null, playing = false, paused = false;
  let wrap = settings.wrap;
  let tickBase = DIFF[settings.difficulty];
  let tick = tickBase;
  let board = { cols: BOARDS[settings.boardSize].cols, rows: BOARDS[settings.boardSize].rows, cell: BOARDS[settings.boardSize].cell };

  const rnd = (n) => Math.floor(Math.random() * n);
  const dir = { x: 1, y: 0 };
  const nextDir = { x: 1, y: 0 };

  let snake, apple, golden = null, power = null, powerActive = null, powerEndTime = 0;
  let score = 0, coins = progress.coins;

  // --- Init & Resize Canvas ---
  const resizeCanvas = () => {
    canvas.width = board.cols * board.cell;
    canvas.height = board.rows * board.cell;
  };

  function reset() {
    wrap = settings.wrap;
    tickBase = DIFF[settings.difficulty];
    tick = tickBase;
    board = { ...BOARDS[settings.boardSize] };
    resizeCanvas();
    score = 0;
    golden = null;
    power = null;
    powerActive = null;
    powerEndTime = 0;

    // center snake
    snake = [{ x: Math.floor(board.cols/2), y: Math.floor(board.rows/2) }];
    for (let i = 1; i < 5; i++) snake.push({ x: snake[0].x - i, y: snake[0].y });
    placeApple();

    dir.x = 1; dir.y = 0;
    nextDir.x = 1; nextDir.y = 0;

    scoreEl.textContent = "0";
    speedEl.textContent = "1x";
    modeLabel.textContent = settings.difficulty[0].toUpperCase() + settings.difficulty.slice(1);
    render(true);
  }

  function placeApple() {
    do { apple = { x: rnd(board.cols), y: rnd(board.rows) }; }
    while (snake.some(s => s.x === apple.x && s.y === apple.y));
  }

  function placeGolden() {
    if (golden) return;
    golden = { x: rnd(board.cols), y: rnd(board.rows), ttl: 8000 };
    if (snake.some(s => s.x === golden.x && s.y === golden.y) || (apple && golden.x===apple.x && golden.y===apple.y)) {
      golden = null;
    }
  }

  function placePower() {
    if (power) return;
    const type = POWER_TYPES[rnd(POWER_TYPES.length)];
    let pos;
    do { pos = { x: rnd(board.cols), y: rnd(board.rows) }; }
    while (snake.some(s => s.x === pos.x && s.y === pos.y) || (apple && pos.x===apple.x && pos.y===apple.y));
    power = { ...pos, type, ttl: 12000 };
  }

  // --- Loop ---
  function start(){ if(playing) return; playing = true; paused = false; gameLoop(); }
  function pause(){ if(!playing) return; paused = !paused; if(!paused) gameLoop(); else render(); }
  function stop(){ playing=false; paused=false; cancelAnimationFrame(loopId); loopId=null; }

  function step() {
    // Direction switching
    if (Math.abs(nextDir.x) !== Math.abs(dir.x) || Math.abs(nextDir.y) !== Math.abs(dir.y)) {
      dir.x = nextDir.x; dir.y = nextDir.y;
    }
    // Next head
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (wrap) {
      head.x = (head.x + board.cols) % board.cols;
      head.y = (head.y + board.rows) % board.rows;
    }

    // Collisions
    if (!wrap && (head.x < 0 || head.y < 0 || head.x >= board.cols || head.y >= board.rows)) return die();
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      if (powerActive === "shield") {
        // ignore one collision
      } else {
        return die();
      }
    }

    snake.unshift(head);

    // Eat apple
    if (head.x === apple.x && head.y === apple.y) {
      try{ sEat.currentTime = 0; sEat.play(); }catch{}
      score += 1; coins += 1;
      scoreEl.textContent = String(score);
      // speed up a bit, clamp
      tick = Math.max(40, tick - 6);
      speedEl.textContent = (DIFF[settings.difficulty] / tick).toFixed(1).replace(/\.0$/,"") + "x";
      placeApple();

      unlockAch("first_bite");
      if (score >= 10) unlockAch("score_10");
      if (score >= 25) unlockAch("score_25");
      if (score >= 50) unlockAch("score_50");

      // maybe spawn golden/power
      if (!golden && Math.random() < GOLDEN_CHANCE) placeGolden();
      if (!power && Math.random() < POWER_SPAWN_CHANCE) placePower();
    } else if (golden && head.x === golden.x && head.y === golden.y) {
      score += 5; coins += 5; golden = null; scoreEl.textContent = String(score);
      tick = Math.max(40, tick - 10);
      unlockAch("golden_bite");
    } else if (power && head.x === power.x && head.y === power.y) {
      activatePower(power.type);
      power = null;
    } else {
      snake.pop();
    }

    // power ttl / golden ttl countdown
    if (golden) { golden.ttl -= tick; if (golden.ttl <= 0) golden = null; }
    if (power) { power.ttl -= tick; if (power.ttl <= 0) power = null; }
    if (powerActive && performance.now() > powerEndTime) powerActive = null;
  }

  function die() {
    try{ sDie.currentTime = 0; sDie.play(); }catch{}
    stop();
    // save best / coins / leaderboard prompt
    if (score > progress.best) { progress.best = score; }
    progress.coins = coins;
    saveProgress();
    render(true);
    if (navigator.vibrate && settings.vibrate) navigator.vibrate(80);
  }

  function activatePower(type) {
    powerActive = type;
    powerEndTime = performance.now() + POWER_DURATION;
    if (type === "slow") tick = Math.min(tick + 40, tickBase + 60);
    if (type === "shrink") snake.splice(-2);
    if (type === "shield") {/* handled in collision */}
    unlockAch("first_power");
  }

  function render(overlay=false) {
    canvas.width = board.cols * board.cell;
    canvas.height = board.rows * board.cell;

    // background grid
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let x=0;x<board.cols;x++){
      for(let y=0;y<board.rows;y++){
        ctx.strokeRect(x*board.cell, y*board.cell, board.cell, board.cell);
      }
    }

    // draw apple
    if (apple) {
      const ax = apple.x*board.cell, ay = apple.y*board.cell;
      const grd = ctx.createRadialGradient(ax+board.cell*0.3, ay+board.cell*0.3, 2, ax+board.cell/2, ay+board.cell/2, board.cell/1.2);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(0.1, "rgba(255,255,255,0.7)");
      grd.addColorStop(0.11, "#ff9aa2");
      grd.addColorStop(1, "#ff2d55");
      roundRect(ax+2, ay+2, board.cell-4, board.cell-4, 6, grd);
      ctx.fillStyle = getCSS("--good");
      ctx.beginPath(); ctx.ellipse(ax+board.cell*0.7, ay+board.cell*0.2, 3, 6, 0.6, 0, Math.PI*2); ctx.fill();
    }

    // golden fruit
    if (golden) {
      const gx = golden.x*board.cell, gy = golden.y*board.cell;
      const grd2 = ctx.createRadialGradient(gx+board.cell*0.4, gy+board.cell*0.4, 2, gx+board.cell/2, gy+board.cell/2, board.cell/1.2);
      grd2.addColorStop(0, "#fff8");
      grd2.addColorStop(1, "#ffd36e");
      roundRect(gx+2, gy+2, board.cell-4, board.cell-4, 8, grd2);
    }

    // power-up
    if (power) {
      const px = power.x*board.cell, py = power.y*board.cell;
      ctx.fillStyle = power.type==="shield" ? "#6cf" : (power.type==="slow" ? "#ffd36e" : "#b4ff50");
      roundRect(px+3, py+3, board.cell-6, board.cell-6, 8, ctx.fillStyle);
      ctx.fillStyle = "#000c";
      ctx.font = `700 ${Math.max(10,board.cell/2)}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(power.type[0].toUpperCase(), px+board.cell/2, py+board.cell*0.7);
    }

    // snake
    for (let i=0;i<snake.length;i++){
      const s = snake[i]; const x = s.x*board.cell, y = s.y*board.cell;
      let base = progress.equippedSkin === "emerald" ? "#50e3c2" : (progress.equippedSkin === "sunset" ? "#ff9a76" : "#6cf");
      const gloss = ctx.createLinearGradient(x, y, x, y+board.cell);
      gloss.addColorStop(0, "rgba(255,255,255,.25)");
      gloss.addColorStop(.35, base);
      gloss.addColorStop(1, "#2b5b8f");
      roundRect(x+2, y+2, board.cell-4, board.cell-4, 8, gloss);
      if (i===0){ // eyes + aura
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(x+board.cell*0.35,y+board.cell*0.35,2.2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+board.cell*0.65,y+board.cell*0.35,2.2,0,Math.PI*2); ctx.fill();
        // aura
        ctx.save();
        ctx.shadowColor = base;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = base;
        ctx.lineWidth = 2;
        ctx.strokeRect(x+2, y+2, board.cell-4, board.cell-4);
        ctx.restore();
      }
    }

    if (overlay || !playing || paused){
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = "#e7ecf3";
      ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textAlign = "center";
      ctx.fillText(!playing ? "Game Over" : (paused ? "Paused" : "Ready"), canvas.width/2, canvas.height/2);
      ctx.restore();
    }
  }

  function roundRect(x,y,w,h,r, fillStyle){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
    if (typeof fillStyle === "string") ctx.fillStyle = fillStyle;
    ctx.shadowColor = "rgba(108,170,255,.25)";
    ctx.shadowBlur = 8; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
    ctx.fill();
  }

  function gameLoop() {
    if (!playing || paused) return;
    render();
    setTimeout(() => { step(); loopId = requestAnimationFrame(gameLoop); }, tick);
  }

  function getCSS(varName){
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || "#6cf";
  }

  // --- Achievements ---
  const ACHS = [
    { id:"first_bite", name:"First Bite", desc:"Eat your first apple." },
    { id:"score_10", name:"On a Roll", desc:"Reach score 10." },
    { id:"score_25", name:"Snake Charmer", desc:"Reach score 25." },
    { id:"score_50", name:"Neo Master", desc:"Reach score 50." },
    { id:"golden_bite", name:"Lucky Catch", desc:"Eat a golden fruit." },
    { id:"first_power", name:"Power Player", desc:"Collect your first power-up." }
  ];

  function unlockAch(id){
    if (progress.achievements[id]) return;
    progress.achievements[id] = true;
    coins += 10; // reward
    saveProgress();
    renderAchList();
    toast(`Achievement unlocked: ${ACHS.find(a=>a.id===id)?.name || id} +10💰`);
  }

  function renderAchList(){
    const ul = $("#achList"); ul.innerHTML = "";
    ACHS.forEach(a => {
      const li = document.createElement("li");
      const done = !!progress.achievements[a.id];
      li.textContent = `${a.name} — ${a.desc} ${done ? "✅" : "—"}`;
      ul.appendChild(li);
    });
  }

  // --- Leaderboard (local) ---
  function renderLocalBoard(){
    const ol = $("#localBoard"); ol.innerHTML = "";
    const sorted = [...progress.localBoard].sort((a,b)=>b.score-a.score).slice(0,20);
    sorted.forEach((e,i)=>{
      const li = document.createElement("li");
      const when = new Date(e.time).toLocaleString();
      li.textContent = `#${i+1} ${e.name} — ${e.score} (${when})`;
      ol.appendChild(li);
    });
  }

  function submitLocal(name){
    if (!name) return toast("Enter a player name first.");
    progress.localBoard.push({ name, score, time: Date.now() });
    saveProgress(); renderLocalBoard();
    toast("Score submitted locally.");
  }

  // --- Shop / Skins ---
  function equipSkin(key){
    if (!progress.ownedSkins[key]) return toast("You don't own this skin yet.");
    progress.equippedSkin = key;
    settings.theme = key; // sync theme
    document.documentElement.setAttribute("data-theme", key);
    $("#theme").value = key;
    saveSettings(); saveProgress();
    toast(`Equipped ${key} skin.`);
  }

  $$(".skin-card").forEach(b => {
    b.addEventListener("click", () => {
      const skin = b.getAttribute("data-skin");
      if (progress.ownedSkins[skin]) { equipSkin(skin); return; }
      const price = skin==="emerald"||skin==="sunset" ? 100 : 0;
      if (coins >= price){
        coins -= price; progress.ownedSkins[skin] = true; equipSkin(skin);
        saveProgress(); toast(`Purchased ${skin} for ${price} coins.`);
      } else {
        toast("Not enough coins.");
      }
    });
  });

  // --- Tabs ---
  $$(".tab").forEach(t => t.addEventListener("click", e => {
    $$(".tab").forEach(x => x.classList.remove("active"));
    e.currentTarget.classList.add("active");
    const id = e.currentTarget.getAttribute("data-tab");
    $$(".tabpane").forEach(p => p.classList.remove("active"));
    $("#"+id).classList.add("active");
  }));

  // --- Input ---
  const keyMap = { ArrowUp:[0,-1], KeyW:[0,-1], ArrowDown:[0,1], KeyS:[0,1], ArrowLeft:[-1,0], KeyA:[-1,0], ArrowRight:[1,0], KeyD:[1,0] };
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyP"){ pause(); return; }
    const v = keyMap[e.code]; if (!v) return;
    const [x,y] = v;
    if (x !== -dir.x || y !== -dir.y){ nextDir.x = x; nextDir.y = y; }
  });

  // D-pad
  $$(".dpad button").forEach(b => b.addEventListener("click", () => {
    const map = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };
    const [x,y] = map[b.getAttribute("data-dir")];
    if (x !== -dir.x || y !== -dir.y){ nextDir.x = x; nextDir.y = y; }
  }));

  // Swipe
  let touchStart = null;
  canvas.addEventListener("touchstart", (e)=>{ touchStart = e.touches[0]; });
  canvas.addEventListener("touchmove", (e)=>{
    if (!touchStart) return;
    const dx = e.touches[0].clientX - touchStart.clientX;
    const dy = e.touches[0].clientY - touchStart.clientY;
    if (Math.abs(dx) > 30 || Math.abs(dy) > 30){
      const x = Math.abs(dx) > Math.abs(dy) ? (dx>0?1:-1) : 0;
      const y = x===0 ? (dy>0?1:-1) : 0;
      if (x !== -dir.x || y !== -dir.y){ nextDir.x = x; nextDir.y = y; }
      touchStart = null;
    }
  }, {passive:true});

  // Buttons
  $("#startBtn").onclick = start;
  $("#restartBtn").onclick = () => { stop(); reset(); start(); };
  $("#pauseBtn").onclick = pause;
  $("#wrapToggle").addEventListener("change", (e) => { wrap = e.target.checked; settings.wrap = wrap; saveSettings(); });

  $("#saveSettings").onclick = () => {
    settings.difficulty = $("#difficulty").value;
    settings.boardSize = $("#boardSize").value;
    settings.theme = $("#theme").value;
    settings.vibrate = $("#vibrate").checked;
    document.documentElement.setAttribute("data-theme", settings.theme);
    saveSettings(); reset(); toast("Settings saved.");
  };
  $("#resetProgress").onclick = () => {
    if (!confirm("Reset best score, coins, and achievements?")) return;
    progress.best = 0; progress.coins = 0; progress.achievements = {};
    progress.localBoard = []; coins = 0;
    progress.ownedSkins = { neon: true }; progress.equippedSkin = "neon";
    saveProgress(); renderAchList(); renderLocalBoard(); reset(); toast("Progress reset.");
  };

  $("#submitScore").onclick = () => submitLocal($("#playerName").value.trim());

  // Share & Screenshot
  $("#shareBtn").onclick = async () => {
    const text = `I scored ${score} in Snake Neo!`;
    try {
      if (navigator.share) await navigator.share({ title:"Snake Neo", text, url: location.href });
      else { await navigator.clipboard.writeText(text + " " + location.href); toast("Copied share text to clipboard."); }
    } catch {}
  };
  $("#shotBtn").onclick = () => {
    const a = document.createElement("a");
    a.download = `snake_neo_${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  // Save/Load
  function saveSettings(){ LS.set("snake_settings", settings); }
  function saveProgress(){ LS.set("snake_progress", progress); bestEl.textContent = progress.best; }

  // Toast
  let toastTimer = null;
  function toast(msg){
    let el = $("#_toast");
    if (!el){
      el = document.createElement("div"); el.id = "_toast";
      el.style.position = "fixed"; el.style.bottom="14px"; el.style.left="50%"; el.style.transform="translateX(-50%)";
      el.style.padding="10px 14px"; el.style.background="rgba(0,0,0,.7)"; el.style.color="#fff"; el.style.borderRadius="12px";
      el.style.zIndex="9999"; el.style.fontWeight="700"; el.style.border="1px solid rgba(255,255,255,.2)";
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity="1";
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ el.style.opacity="0"; }, 1800);
  }

  // Bootstrap
  renderAchList();
  renderLocalBoard();
  reset();
})();

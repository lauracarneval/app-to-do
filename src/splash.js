/* ============================================================
   ABERTURA — o frasco enche passando pelas cores de todos os
   estágios da poção; ao chegar no topo, o app abre.
   Clicar pula a animação.
   ============================================================ */
(function () {
  const canvas = document.getElementById('splashCanvas');
  const ctx = canvas.getContext('2d');
  const sub = document.getElementById('splashSub');

  const INK = '#14102b';
  const STAGES = [
    { main: '#7f9bb0', light: '#b4cbd9', dark: '#5b7587', text: 'acendendo as velas...' },
    { main: '#4ed44a', light: '#9cf07a', dark: '#2f8f3a', text: 'separando as ervas...' },
    { main: '#3cb4e8', light: '#8fe3ff', dark: '#2478b0', text: 'mexendo o caldeirão...' },
    { main: '#9a4ed4', light: '#c990ff', dark: '#6a2f9c', text: 'acordando o gato...' },
    { main: '#e0457a', light: '#ff8fb0', dark: '#a02a55', text: 'abrindo o grimório...' },
    { main: '#f2b632', light: '#ffe27a', dark: '#b9791a', text: 'pronto!' }
  ];

  /* mesmo frasco do cenário, centralizado num canvas de 48x54 */
  const FX = 24, FY = 36.5;
  const LIQ_BOTTOM = 50, LIQ_ROWS = 33;
  const TOTAL_TICKS = 34;   /* ~2,9 s a 85 ms por quadro */

  let tick = 0;
  let done = false;
  let bubbles = [];
  let fumes = [];

  function R(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function flaskPart(x, y) {
    const dx = x + 0.5 - FX, dy = y + 0.5 - FY, d2 = dx * dx + dy * dy;
    if (d2 <= 169 || (x >= 21 && x <= 26 && y >= 9 && y <= 28)) return 2;
    if (d2 <= 210.25 || (x >= 20 && x <= 27 && y >= 9 && y <= 28)) return 1;
    return 0;
  }

  function draw() {
    const progress = Math.min(1, tick / TOTAL_TICKS);
    const stage = STAGES[Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length))];
    const top = LIQ_BOTTOM - Math.round(progress * LIQ_ROWS);
    sub.textContent = stage.text;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 9; y <= 51; y++) {
      for (let x = 8; x <= 40; x++) {
        const part = flaskPart(x, y);
        if (part === 1) R(x, y, 1, 1, INK);
        else if (part === 2) {
          if (y >= top) R(x, y, 1, 1, y === top ? stage.light : (x + 0.5 - FX > 6 ? stage.dark : stage.main));
          else R(x, y, 1, 1, 'rgba(190,225,255,0.16)');
        }
      }
    }

    bubbles.forEach(function (b) {
      if (b.y > top && flaskPart(b.x, b.y) === 2) R(b.x, b.y, 1, 1, stage.light);
    });

    R(19, 6, 10, 3, INK);
    R(20, 7, 8, 1, '#cfe8ff');
    R(15, 29, 2, 5, 'rgba(255,255,255,0.55)');
    R(17, 27, 2, 2, 'rgba(255,255,255,0.55)');
    R(22, 12, 1, 8, 'rgba(255,255,255,0.4)');

    fumes.forEach(function (f) {
      ctx.globalAlpha = Math.min(0.75, f.life / 12);
      R(Math.round(f.x), Math.round(f.y), 1, 1, stage.light);
      ctx.globalAlpha = 1;
    });
  }

  function step() {
    tick++;
    const progress = Math.min(1, tick / TOTAL_TICKS);
    const top = LIQ_BOTTOM - Math.round(progress * LIQ_ROWS);

    if (Math.random() < 0.6) {
      const b = { x: 14 + Math.floor(Math.random() * 20), y: 48 };
      if (flaskPart(b.x, b.y) === 2) bubbles.push(b);
    }
    bubbles.forEach(function (b) { b.y -= 1; });
    bubbles = bubbles.filter(function (b) { return b.y > top; });

    if (progress > 0.3 && Math.random() < 0.5) fumes.push({ x: 22 + Math.random() * 4, y: 5, life: 8 + Math.random() * 6 });
    fumes.forEach(function (f) {
      f.y -= 0.6;
      f.x += (Math.random() - 0.5) * 1.2;
      f.life -= 1;
    });
    fumes = fumes.filter(function (f) { return f.life > 0 && f.y > 0; });

    draw();
    if (tick >= TOTAL_TICKS + 5) finish();
  }

  function finish() {
    if (done) return;
    done = true;
    clearInterval(timer);
    if (window.desktop) window.desktop.splashDone();
  }

  draw();
  const timer = setInterval(step, 85);
  document.getElementById('splash').addEventListener('click', finish);
  document.addEventListener('keydown', finish);
})();

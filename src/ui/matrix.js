// Decorative background effect only - no game logic. Safe to no-op if the
// canvas, its 2D context, or matchMedia aren't available.

function initMatrixRain() {
  const canvas = document.getElementById("matrix-bg");
  if (!canvas || !canvas.getContext) return;

  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  const fontSize = 15;
  const chars = "01アイウエオカキクケコサシスセソ$#@%&*+-<>/\\|";
  let width, height, columns, drops, timer;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    columns = Math.max(1, Math.floor(width / fontSize));
    drops = new Array(columns).fill(0).map(() => Math.random() * -50);
  }

  function draw() {
    ctx.fillStyle = "rgba(3, 4, 7, 0.09)";
    ctx.fillRect(0, 0, width, height);
    ctx.font = fontSize + "px monospace";
    for (let i = 0; i < columns; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillStyle =
        Math.random() < 0.015
          ? "rgba(239,68,68,0.55)"
          : "rgba(168,85,247,0.32)";
      ctx.fillText(char, x, y);
      if (y > height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  timer = setInterval(draw, 55);

  document.addEventListener("visibilitychange", () => {
    clearInterval(timer);
    if (!document.hidden) timer = setInterval(draw, 55);
  });
}

export { initMatrixRain };

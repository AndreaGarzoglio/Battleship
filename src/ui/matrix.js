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
  const trailLength = 12; // frames a glyph stays visible before being fully dropped
  let width, height, columns, drops, trails, timer;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    columns = Math.max(1, Math.floor(width / fontSize));
    drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    trails = new Array(columns).fill(null).map(() => []); // per column: recent { char, red } entries, oldest first
  }

  // fully redraws every frame from `trails` state alone - no compositing
  // decay, so a glyph's disappearance never depends on display color
  // precision the way painting a translucent rect over it every frame would
  function draw() {
    ctx.fillStyle = "#030407";
    ctx.fillRect(0, 0, width, height);
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < columns; i++) {
      const trail = trails[i];
      trail.push({
        char: chars[Math.floor(Math.random() * chars.length)],
        red: Math.random() < 0.015,
      });
      if (trail.length > trailLength) trail.shift(); // oldest glyph is gone for good, not just dimmed

      const headRow = Math.floor(drops[i]);
      trail.forEach((glyph, idx) => {
        const row = headRow - (trail.length - 1 - idx);
        if (row < 0) return;
        const fade = (idx + 1) / trail.length; // 0 (oldest) -> 1 (current head)
        ctx.fillStyle = glyph.red
          ? `rgba(239,68,68,${0.55 * fade})`
          : `rgba(168,85,247,${0.32 * fade})`;
        ctx.fillText(glyph.char, i * fontSize, row * fontSize);
      });

      const y = drops[i] * fontSize;
      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
        trail.length = 0; // restart clean from the top, no leftover tail jumping there with it
      }
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

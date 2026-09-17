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
  const fontSize = 18;
  const rowsPerSecond = 7; // base fall speed, independent of frame rate
  const chars = "01アイウエオカキクケコサシスセソ$#@%&*+-<>/\\|";
  const trailLength = 24; // rows a glyph stays visible before being fully dropped
  let width, height, columns, drops, speeds, trails, lastRow, rafId, lastTime;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    columns = Math.max(1, Math.floor(width / fontSize));
    drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    // per-column speed variance keeps columns from drifting back into sync
    // after a few respawn cycles, which read as the whole screen pausing
    // and refilling in a visible "wave"
    speeds = new Array(columns)
      .fill(0)
      .map(() => rowsPerSecond * (0.75 + Math.random() * 0.5));
    lastRow = drops.map((d) => Math.floor(d));
    trails = new Array(columns).fill(null).map(() => []); // per column: recent { char, red } entries, oldest first
  }

  // fully redraws every frame from `trails` state alone - no compositing
  // decay, so a glyph's disappearance never depends on display color
  // precision the way painting a translucent rect over it every frame would
  function draw(dt) {
    ctx.fillStyle = "#030407";
    ctx.fillRect(0, 0, width, height);
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < columns; i++) {
      drops[i] += speeds[i] * dt;

      const currentRow = Math.floor(drops[i]);
      const trail = trails[i];
      // spawn one new glyph per row crossed, so glyph cadence stays tied to
      // vertical distance travelled rather than to frame timing
      while (lastRow[i] < currentRow) {
        trail.push({
          char: chars[Math.floor(Math.random() * chars.length)],
          red: Math.random() < 0.015,
        });
        if (trail.length > trailLength) trail.shift(); // oldest glyph is gone for good, not just dimmed
        lastRow[i]++;
      }

      trail.forEach((glyph, idx) => {
        // fractional row (not snapped to currentRow) so the column scrolls
        // smoothly between glyph spawns instead of jumping a full row at a time
        const row = drops[i] - (trail.length - 1 - idx);
        if (row < -1) return;
        const fade = (idx + 1) / trail.length; // 0 (oldest) -> 1 (current head)
        ctx.fillStyle = glyph.red
          ? `rgba(239,68,68,${0.55 * fade})`
          : `rgba(168,85,247,${0.32 * fade})`;
        ctx.fillText(glyph.char, i * fontSize, row * fontSize);
      });

      // only restart once the whole trail (including its tail) has fallen
      // past the bottom edge, so glyphs keep sinking below the screen
      // instead of vanishing the instant the head crosses it
      const tailY = (currentRow - trail.length + 1) * fontSize;
      if (tailY > height) {
        drops[i] = Math.random() * -50; // respawn above the viewport, never below it
        speeds[i] = rowsPerSecond * (0.75 + Math.random() * 0.5); // re-roll so cycles keep drifting apart
        lastRow[i] = Math.floor(drops[i]);
        trail.length = 0;
      }
    }
  }

  function tick(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1); // clamp to avoid jumps after tab was hidden
    lastTime = time;
    draw(dt);
    rafId = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  lastTime = performance.now();
  rafId = requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(rafId);
    if (!document.hidden) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  });
}

export { initMatrixRain };

/**
 * Builds the script the capture injects into the page, as plain JavaScript
 * source.
 *
 * It is a string rather than a function passed to `addInitScript` on purpose:
 * Playwright serialises a function by its source, and this file is TypeScript,
 * so the transpiler's own wrappers (esbuild's `__name` among them) travel with
 * it and blow up in page context where they do not exist. A string sidesteps
 * transpilation entirely.
 *
 * Two jobs:
 *
 * 1. A synthetic pointer. Playwright renders no cursor of any kind, so a
 *    screenshot of a tap looks identical to a screenshot of nothing happening.
 *    This draws a translucent touch ring — a ring rather than an arrow, because
 *    the studio is in its mobile layout here — positioned per frame.
 *
 * 2. Slow-motion CSS. Frame-stepping means ~150-250ms of real time passes
 *    between captured frames, so a 220ms transition would begin and end inside
 *    a single frame and read as a hard snap. Scaling every duration up spreads
 *    the studio's own transitions across several captured frames.
 *
 * Nothing here touches application code: it is injected chrome the app never
 * sees, and `pointer-events: none` keeps it out of every hit test.
 */
export function demoRuntimeScript(motionScale: number): string {
  const transition = (0.22 * motionScale).toFixed(3);
  const animation = (0.9 * motionScale).toFixed(3);

  return `
(function () {
  var css = [
    '#demo-cursor {',
    '  position: fixed; left: 0; top: 0; width: 46px; height: 46px;',
    '  margin: -23px 0 0 -23px; border-radius: 50%;',
    '  border: 2px solid rgba(126, 240, 255, 0.95);',
    '  background: radial-gradient(circle, rgba(126, 240, 255, 0.30),',
    '    rgba(126, 240, 255, 0.07) 60%, transparent 72%);',
    '  box-shadow: 0 0 20px rgba(126, 240, 255, 0.55),',
    '    inset 0 0 14px rgba(126, 240, 255, 0.35);',
    '  pointer-events: none; z-index: 2147483647; opacity: 0;',
    '  transition: none !important;',
    '}',
    '#demo-cursor-ripple {',
    '  position: fixed; left: 0; top: 0; width: 46px; height: 46px;',
    '  margin: -23px 0 0 -23px; border-radius: 50%;',
    '  border: 2px solid rgba(126, 240, 255, 0.85);',
    '  pointer-events: none; z-index: 2147483646; opacity: 0;',
    '  transition: none !important;',
    '}',
    '*:not(#demo-cursor):not(#demo-cursor-ripple) {',
    '  transition-duration: ${transition}s !important;',
    '  animation-duration: ${animation}s !important;',
    '}'
  ].join('\\n');

  var style = null, ring = null, ripple = null, ready = false;

  // An init script runs against a completely empty document: there is no
  // documentElement yet, let alone a body. Everything DOM-shaped is therefore
  // created on first use, which by construction is after the app has rendered.
  function ensure() {
    if (ready || !document.documentElement || !document.body) { return; }
    style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
    ring = document.createElement('div');
    ring.id = 'demo-cursor';
    ripple = document.createElement('div');
    ripple.id = 'demo-cursor-ripple';
    document.body.appendChild(ring);
    document.body.appendChild(ripple);
    ready = true;
  }

  var x = 0, y = 0, press = 0, visible = 0;

  function apply() {
    ensure();
    if (!ready) { return; }
    ring.style.transform =
      'translate(' + x + 'px, ' + y + 'px) scale(' + (1 - 0.2 * press) + ')';
    ring.style.opacity = String(visible);
    ring.style.borderColor =
      'rgba(126, 240, 255, ' + (0.55 + 0.45 * press).toFixed(3) + ')';
  }

  window.__demo = {
    move: function (nx, ny) { x = nx; y = ny; apply(); },
    setPress: function (p) { press = p; apply(); },
    setVisible: function (v) { visible = v; apply(); },
    setRipple: function (p) {
      ensure();
      if (!ready) { return; }
      ripple.style.transform =
        'translate(' + x + 'px, ' + y + 'px) scale(' + (1 + 1.7 * p) + ')';
      ripple.style.opacity =
        (p <= 0 || p >= 1) ? '0' : String((1 - p) * 0.8);
    }
  };

  apply();
})();
`;
}

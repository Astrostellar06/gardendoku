import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import './style.css';
import { Game } from './game';
import { setupNativeApp } from './native';
import { clearSave } from './ui/storage';

// `?reset` in the address starts over as on a first launch (progress, settings, tutorial).
if (new URLSearchParams(location.search).has('reset')) {
  clearSave();
  history.replaceState(null, '', location.pathname);
}

const canvas = document.getElementById('garden') as HTMLCanvasElement;
const game = new Game(canvas);
if (import.meta.env.DEV) (window as unknown as { __game: Game }).__game = game;
setupNativeApp(game);

function fit() {
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  game.renderer.resize(width, height, window.devicePixelRatio || 1);
  game.relayout();
}

window.addEventListener('resize', fit);
window.visualViewport?.addEventListener('resize', fit);
fit();
game.start();
// Fonts change the HUD size once loaded.
document.fonts?.ready.then(() => game.relayout());

// Full frame rate while things move, ~30 fps when only the water shimmers.
const IDLE_FRAME = 1 / 30 - 0.002;
let last = performance.now();
function frame(now: number) {
  // Schedule first: an error in one frame must not stop the game loop.
  requestAnimationFrame(frame);
  const dt = (now - last) / 1000;
  if (dt >= IDLE_FRAME || game.renderer.isBusy()) {
    last = now;
    game.tick(dt);
    game.renderer.update(dt);
    game.renderer.draw();
  }
}
requestAnimationFrame(frame);

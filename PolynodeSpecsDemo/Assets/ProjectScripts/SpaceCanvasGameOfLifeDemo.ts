// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceCanvasGameOfLifeDemo.ts — Conway's Game of Life on SpaceCanvas.
//
// Setup in Lens Studio:
//   1. Add a WebView component (from WebView.lspkg) to a SceneObject
//   2. Set its resolution to 1024x768
//   3. Add this script to another SceneObject
//   4. Drag the WebView component into the "webView" input
//   5. Deploy to Spectacles

import { SpaceCanvas } from './Spacecanvas';
import { WebView } from 'WebView.lspkg/WebView';

@component
export default class SpaceCanvasGameOfLifeDemo extends BaseScriptComponent {

  @input
  @hint('WebView component from WebView.lspkg')
  webView!: WebView;

  async onAwake() {
    print('[GameOfLife] onAwake started');

    if (!this.webView) {
      print('[GameOfLife] ERROR: No webView assigned.');
      return;
    }

    const W = 1024;
    const H = 768;
    const CELL = 8;
    const COLS = Math.floor(W / CELL);
    const ROWS = Math.floor(H / CELL);

    const canvas = new SpaceCanvas(W, H, this.webView, this);
    const ctx = await canvas.getContext('2d');
    print('[GameOfLife] SpaceCanvas ready');

    // Draw initial background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Inject the full Game of Life simulation + render loop via executeRaw.
    // Everything runs inside the WebView at native framerate.
    ctx.executeRaw(`
(function() {
  var W = ${W}, H = ${H}, CELL = ${CELL};
  var COLS = ${COLS}, ROWS = ${ROWS};
  var grid = [];
  var next = [];
  var generation = 0;
  var lastTime = performance.now();
  var fps = 0;
  var stepsPerFrame = 1;
  var palette = [
    '#0a0a1a',
    '#00ff88',
    '#00cc66',
    '#009944',
    '#006622',
    '#003311'
  ];

  // Initialize grids
  for (var i = 0; i < ROWS; i++) {
    grid[i] = [];
    next[i] = [];
    for (var j = 0; j < COLS; j++) {
      // Age 0 = dead, 1 = just born, 2+ = alive for N generations
      grid[i][j] = Math.random() < 0.3 ? 1 : 0;
      next[i][j] = 0;
    }
  }

  function countNeighbors(r, c) {
    var count = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        var nr = (r + dr + ROWS) % ROWS;
        var nc = (c + dc + COLS) % COLS;
        if (grid[nr][nc] > 0) count++;
      }
    }
    return count;
  }

  function step() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var n = countNeighbors(r, c);
        var alive = grid[r][c] > 0;
        if (alive) {
          // Survive: age up (max 5 for palette). Die: 0.
          next[r][c] = (n === 2 || n === 3) ? Math.min(grid[r][c] + 1, 5) : 0;
        } else {
          // Birth
          next[r][c] = (n === 3) ? 1 : 0;
        }
      }
    }
    // Swap
    var tmp = grid;
    grid = next;
    next = tmp;
    generation++;
  }

  function render() {
    // Black background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Draw living cells colored by age
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var age = grid[r][c];
        if (age > 0) {
          ctx.fillStyle = palette[Math.min(age, 5)];
          ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
        }
      }
    }

    // HUD overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 36);

    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00ff88';
    ctx.fillText("Conway's Game of Life", 12, 8);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#66aa88';
    ctx.textAlign = 'right';
    ctx.fillText('gen ' + generation + '  ' + Math.round(fps) + ' fps', W - 12, 11);

    // Age legend
    ctx.textAlign = 'center';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#445566';
    ctx.fillText('age:', W - 220, 26);
    for (var a = 1; a <= 5; a++) {
      ctx.fillStyle = palette[a];
      ctx.fillRect(W - 200 + a * 28, 22, 12, 12);
      ctx.fillStyle = '#445566';
      ctx.fillText(a === 5 ? '5+' : '' + a, W - 194 + a * 28, 26);
    }
  }

  function drawFrame() {
    var now = performance.now();
    var delta = now - lastTime;
    lastTime = now;
    if (delta > 0) fps = fps * 0.9 + (1000 / delta) * 0.1;

    for (var s = 0; s < stepsPerFrame; s++) {
      step();
    }
    render();
    requestAnimationFrame(drawFrame);
  }

  // Start after short delay for initial static content to render
  setTimeout(function() { requestAnimationFrame(drawFrame); }, 200);
})();
`);

    print('[GameOfLife] Flushing...');
    ctx.flush();
    print('[GameOfLife] Done — simulation running in WebView.');
  }
}

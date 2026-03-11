// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceCanvasNokiaSnakesDemo.ts — Classic Noki Snake (1998) on SpaceCanvas.
//
// Renders the game with authentic Noki LCD green monochrome colors
// and an on-screen D-pad for directional control. Sound effects via Web Audio.
//
// Setup in Lens Studio:
//   1. Add a WebView component (from WebView.lspkg) to a SceneObject
//   2. Set its resolution to 1024x768
//   3. Enable "poke" (direct touch) on the WebView component
//   4. Add this script to another SceneObject
//   5. Drag the WebView component into the "webView" input
//   6. Deploy to Spectacles
//
// Optional UIKit integration:
//   - Create four Button scene objects (Up, Down, Left, Right) in the scene
//   - Assign them to the btnUp/btnDown/btnLeft/btnRight inputs
//   - Buttons will send direction commands to the game via executeJavaScript

import { SpaceCanvas } from './Spacecanvas';
import { WebView } from 'WebView.lspkg/WebView';

@component
export default class SpaceCanvasNokiaSnakesDemo extends BaseScriptComponent {

  @input
  @hint('WebView component from WebView.lspkg (enable poke for touch D-pad)')
  webView!: WebView;

  // Optional: AudioComponent inputs for sound effects
  @input
  @hint('(Optional) AudioComponent for eat/pickup sound')
  eatSound?: AudioComponent;

  @input
  @hint('(Optional) AudioComponent for game over sound')
  gameOverSound?: AudioComponent;

  async onAwake() {
    print('[NokiaSnake] onAwake started');

    if (!this.webView) {
      print('[NokiaSnake] ERROR: No webView assigned.');
      return;
    }

    const W = 1024;
    const H = 768;

    const canvas = new SpaceCanvas(W, H, this.webView, this);
    const ctx = await canvas.getContext('2d');
    print('[NokiaSnake] SpaceCanvas ready');

    // Draw initial background
    ctx.fillStyle = '#457802';
    ctx.fillRect(0, 0, W, H);

    // Inject the full Nokia Snake game + D-pad + sound into WebView
    ctx.executeRaw(`
(function() {
  // ══════════════════════════════════════════════════════════
  // Nokia 6110 Color Palette (monochrome green LCD)
  // ══════════════════════════════════════════════════════════
  // Authentic Nokia 6110 LCD — sampled from real device photo
  var COLORS = {
    lightest: '#457802',  // LCD background (deep olive green)
    light:    '#5A8C1A',  // Lighter accents
    dark:     '#2D5000',  // Secondary elements
    darkest:  '#1A2E00'   // Snake, walls, text (near-black on LCD)
  };

  // ══════════════════════════════════════════════════════════
  // Layout Constants
  // ══════════════════════════════════════════════════════════
  var W = ${W}, H = ${H};

  // Layout: everything fits within 768px tall
  //   0-30:    phone bezel top
  //   30:      GAME_Y (screen top)
  //   30-500:  game LCD area (470px)
  //   500-508: screen bezel bottom
  //   514:     soft keys
  //   554:     NOKI text
  //   574-758: D-pad area (center ~666)

  // Game area (top portion — mimics Nokia screen)
  var GAME_X = 62;
  var GAME_Y = 30;
  var GAME_W = 900;
  var GAME_H = 470;

  // Grid cell size (smallest unit)
  var CELL = 10;
  var TOTAL_COLS = Math.floor(GAME_W / CELL);   // 90
  var TOTAL_ROWS = Math.floor(GAME_H / CELL);   // 47

  // Border wall: inset 3 cells from edge, 1 cell thick
  var WALL_INSET = 3;
  var WALL_THICKNESS = 1;

  // Playable area starts inside the wall (inset + thickness)
  var PLAY_OFFSET = WALL_INSET + WALL_THICKNESS;

  // Snake is 3 cells wide, so the logical grid uses 3-cell units
  var SNAKE_W = 3;
  var PLAY_COLS = Math.floor((TOTAL_COLS - PLAY_OFFSET * 2) / SNAKE_W);
  var PLAY_ROWS = Math.floor((TOTAL_ROWS - PLAY_OFFSET * 2) / SNAKE_W);

  // Legacy aliases for collision checks
  var COLS = PLAY_COLS;
  var ROWS = PLAY_ROWS;

  // Screen bezel bottom edge
  var SCREEN_BOTTOM = GAME_Y + GAME_H + 8;

  // D-pad area — compact layout to fit within 768
  var DPAD_CX = W / 2;
  var DPAD_CY = 666;
  var BTN_SIZE = 48;
  var BTN_GAP = 5;

  // ══════════════════════════════════════════════════════════
  // Sound — Web Audio API beeps (no external files needed)
  // ══════════════════════════════════════════════════════════
  var audioCtx = null;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch(e) {
    // Audio not available — silent mode
  }

  function playTone(freq, duration, type) {
    if (!audioCtx) return;
    try {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
  }

  function playEatSound()  { playTone(880, 0.08, 'square'); setTimeout(function() { playTone(1200, 0.06, 'square'); }, 60); }
  function playDieSound()  { playTone(200, 0.3, 'sawtooth'); setTimeout(function() { playTone(120, 0.4, 'sawtooth'); }, 200); }
  function playMoveSound() { playTone(440, 0.02, 'square'); }
  function playStartSound(){ playTone(523, 0.1, 'square'); setTimeout(function() { playTone(659, 0.1, 'square'); }, 100); setTimeout(function() { playTone(784, 0.15, 'square'); }, 200); }

  // ══════════════════════════════════════════════════════════
  // Game State
  // ══════════════════════════════════════════════════════════
  var DIR_UP = 0, DIR_RIGHT = 1, DIR_DOWN = 2, DIR_LEFT = 3;
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  var snake = [];
  var dir = DIR_RIGHT;
  var nextDir = DIR_RIGHT;
  var food = { x: 0, y: 0 };
  var score = 0;
  var highScore = 0;
  var gameOver = false;
  var paused = false;
  var speed = 150;          // ms per tick
  var lastTick = 0;
  var gameStarted = false;
  var flashTimer = 0;

  function initGame() {
    snake = [];
    var startX = Math.floor(COLS / 2);
    var startY = Math.floor(ROWS / 2);
    for (var i = 4; i >= 0; i--) {
      snake.push({ x: startX - i, y: startY });
    }
    dir = DIR_RIGHT;
    nextDir = DIR_RIGHT;
    score = 0;
    gameOver = false;
    paused = false;
    speed = 150;
    flashTimer = 0;
    placeFood();
    playStartSound();
    gameStarted = true;
  }

  function placeFood() {
    var attempts = 0;
    do {
      food.x = Math.floor(Math.random() * COLS);
      food.y = Math.floor(Math.random() * ROWS);
      attempts++;
    } while (isSnakeAt(food.x, food.y) && attempts < 1000);
  }

  function isSnakeAt(x, y) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].x === x && snake[i].y === y) return true;
    }
    return false;
  }

  function tick() {
    if (gameOver || paused) return;

    dir = nextDir;
    var head = snake[snake.length - 1];
    var nx = head.x + DX[dir];
    var ny = head.y + DY[dir];

    // Wall collision
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      gameOver = true;
      if (score > highScore) highScore = score;
      playDieSound();
      return;
    }

    // Self collision
    if (isSnakeAt(nx, ny)) {
      gameOver = true;
      if (score > highScore) highScore = score;
      playDieSound();
      return;
    }

    snake.push({ x: nx, y: ny });

    // Eat food
    if (nx === food.x && ny === food.y) {
      score += 10;
      playEatSound();
      // Speed up slightly
      if (speed > 60) speed -= 2;
      placeFood();
    } else {
      snake.shift();
    }
  }

  // ══════════════════════════════════════════════════════════
  // Rendering
  // ══════════════════════════════════════════════════════════

  function drawPhone() {
    // Phone body background (dark bezel)
    ctx.fillStyle = '#2C2C2C';
    ctx.fillRect(0, 0, W, H);

    // Phone face (slightly lighter)
    var faceMargin = 30;
    ctx.fillStyle = '#3A3A3A';
    roundRect(ctx, faceMargin, faceMargin, W - faceMargin * 2, H - faceMargin * 2, 20);

    // Screen bezel
    ctx.fillStyle = '#1A1A1A';
    roundRect(ctx, GAME_X - 12, GAME_Y - 12, GAME_W + 24, GAME_H + 24, 8);

    // Screen (LCD green)
    ctx.fillStyle = COLORS.lightest;
    ctx.fillRect(GAME_X, GAME_Y, GAME_W, GAME_H);
  }

  function drawBorder() {
    // Wall inset 3 cells from game area edge, 1 cell thick
    var wx = GAME_X + WALL_INSET * CELL;
    var wy = GAME_Y + WALL_INSET * CELL;
    var ww = (TOTAL_COLS - WALL_INSET * 2) * CELL;
    var wh = (TOTAL_ROWS - WALL_INSET * 2) * CELL;

    ctx.fillStyle = COLORS.darkest;
    // Top wall
    ctx.fillRect(wx, wy, ww, WALL_THICKNESS * CELL);
    // Bottom wall
    ctx.fillRect(wx, wy + wh - WALL_THICKNESS * CELL, ww, WALL_THICKNESS * CELL);
    // Left wall
    ctx.fillRect(wx, wy, WALL_THICKNESS * CELL, wh);
    // Right wall
    ctx.fillRect(wx + ww - WALL_THICKNESS * CELL, wy, WALL_THICKNESS * CELL, wh);
  }

  // Convert logical snake coords to pixel position (inside the wall)
  function snakePx(col, row) {
    return {
      x: GAME_X + PLAY_OFFSET * CELL + col * SNAKE_W * CELL,
      y: GAME_Y + PLAY_OFFSET * CELL + row * SNAKE_W * CELL
    };
  }

  var SNAKE_PX = SNAKE_W * CELL;  // pixel size of one snake segment

  function drawSnake() {
    for (var i = 0; i < snake.length; i++) {
      var s = snake[i];
      var isHead = (i === snake.length - 1);
      var p = snakePx(s.x, s.y);

      // Body — 3 cells wide (SNAKE_PX x SNAKE_PX), small gap for segment visibility
      ctx.fillStyle = COLORS.darkest;
      ctx.fillRect(p.x + 1, p.y + 1, SNAKE_PX - 2, SNAKE_PX - 2);

      // Head: eyes based on direction
      if (isHead) {
        var eyeSize = 4;
        var eyeInset = 5;
        var ex1, ey1, ex2, ey2;
        if (dir === DIR_UP)    { ex1 = p.x + eyeInset;             ey1 = p.y + eyeInset;              ex2 = p.x + SNAKE_PX - eyeInset - eyeSize; ey2 = p.y + eyeInset; }
        if (dir === DIR_DOWN)  { ex1 = p.x + eyeInset;             ey1 = p.y + SNAKE_PX - eyeInset - eyeSize; ex2 = p.x + SNAKE_PX - eyeInset - eyeSize; ey2 = p.y + SNAKE_PX - eyeInset - eyeSize; }
        if (dir === DIR_LEFT)  { ex1 = p.x + eyeInset;             ey1 = p.y + eyeInset;              ex2 = p.x + eyeInset;             ey2 = p.y + SNAKE_PX - eyeInset - eyeSize; }
        if (dir === DIR_RIGHT) { ex1 = p.x + SNAKE_PX - eyeInset - eyeSize; ey1 = p.y + eyeInset; ex2 = p.x + SNAKE_PX - eyeInset - eyeSize; ey2 = p.y + SNAKE_PX - eyeInset - eyeSize; }
        ctx.fillStyle = COLORS.lightest;
        ctx.fillRect(ex1, ey1, eyeSize, eyeSize);
        ctx.fillRect(ex2, ey2, eyeSize, eyeSize);
      }
    }
  }

  function drawFood() {
    var p = snakePx(food.x, food.y);
    flashTimer++;
    if (flashTimer % 20 < 14) {
      // Checkerboard diamond pattern (matches original Nokia LCD food)
      var cx = p.x + SNAKE_PX / 2;
      var cy = p.y + SNAKE_PX / 2;
      var dot = CELL;  // size of each checker square
      ctx.fillStyle = COLORS.darkest;
      // Diamond: 4 squares in a cross pattern
      ctx.fillRect(cx - dot / 2, cy - dot,     dot, dot);  // top
      ctx.fillRect(cx - dot,     cy - dot / 2, dot, dot);  // left
      ctx.fillRect(cx,           cy - dot / 2, dot, dot);  // right
      ctx.fillRect(cx - dot / 2, cy,           dot, dot);  // bottom
    }
  }

  function drawHUD() {
    // Score text inside the LCD green area, top margin above the wall
    var textY = GAME_Y + 6;
    var textLeft = GAME_X + WALL_INSET * CELL + CELL;
    var textRight = GAME_X + GAME_W - WALL_INSET * CELL - CELL;

    ctx.fillStyle = COLORS.darkest;
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillText('SNAKE', textLeft, textY);

    ctx.textAlign = 'center';
    ctx.fillText('Score: ' + score, GAME_X + GAME_W / 2, textY);

    ctx.textAlign = 'right';
    ctx.fillText('Hi: ' + highScore, textRight, textY);
  }

  function drawGameOver() {
    // Dim overlay inside the wall
    var wx = GAME_X + (WALL_INSET + WALL_THICKNESS) * CELL;
    var wy = GAME_Y + GAME_H / 2 - 50;
    var ww = (TOTAL_COLS - (WALL_INSET + WALL_THICKNESS) * 2) * CELL;
    ctx.fillStyle = 'rgba(69, 120, 2, 0.85)';
    ctx.fillRect(wx, wy, ww, 100);

    ctx.fillStyle = COLORS.darkest;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', GAME_X + GAME_W / 2, GAME_Y + GAME_H / 2 - 15);

    ctx.font = '18px monospace';
    ctx.fillText('Score: ' + score + '    Tap to restart', GAME_X + GAME_W / 2, GAME_Y + GAME_H / 2 + 20);
  }

  function drawTitleScreen() {
    ctx.fillStyle = COLORS.lightest;
    ctx.fillRect(GAME_X, GAME_Y, GAME_W, GAME_H);

    var cx = GAME_X + GAME_W / 2;
    var cy = GAME_Y + GAME_H / 2;

    ctx.fillStyle = COLORS.darkest;
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAKE', cx, cy - 60);

    // Draw a small snake icon (3-cell-wide segments)
    var iconX = cx - 70;
    var iconY = cy - 10;
    for (var i = 0; i < 7; i++) {
      ctx.fillRect(iconX + i * 22, iconY + Math.sin(i * 0.8) * 10, SNAKE_PX - 2, SNAKE_PX - 2);
    }

    ctx.font = '20px monospace';
    ctx.fillText('Tap to Start', cx, cy + 50);

    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.dark;
    ctx.fillText('Use D-pad or swipe to control', cx, cy + 85);
  }

  // ══════════════════════════════════════════════════════════
  // D-Pad (Nokia-style directional buttons)
  // ══════════════════════════════════════════════════════════

  var dpadButtons = [
    { id: 'up',    x: DPAD_CX - BTN_SIZE / 2, y: DPAD_CY - BTN_SIZE - BTN_GAP,   w: BTN_SIZE, h: BTN_SIZE, dir: DIR_UP,    label: '▲', pressed: false },
    { id: 'down',  x: DPAD_CX - BTN_SIZE / 2, y: DPAD_CY + BTN_GAP,              w: BTN_SIZE, h: BTN_SIZE, dir: DIR_DOWN,  label: '▼', pressed: false },
    { id: 'left',  x: DPAD_CX - BTN_SIZE - BTN_GAP, y: DPAD_CY - BTN_SIZE / 2,   w: BTN_SIZE, h: BTN_SIZE, dir: DIR_LEFT,  label: '◀', pressed: false },
    { id: 'right', x: DPAD_CX + BTN_GAP,             y: DPAD_CY - BTN_SIZE / 2,   w: BTN_SIZE, h: BTN_SIZE, dir: DIR_RIGHT, label: '▶', pressed: false }
  ];

  // Center circle of D-pad
  var dpadCenter = { x: DPAD_CX - BTN_SIZE / 2, y: DPAD_CY - BTN_SIZE / 2, w: BTN_SIZE, h: BTN_SIZE };

  function drawDpad() {
    // D-pad background disc
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.arc(DPAD_CX, DPAD_CY, BTN_SIZE * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Cross shape
    ctx.fillStyle = '#4A4A4A';
    roundRect(ctx, DPAD_CX - BTN_SIZE / 2 - 2, DPAD_CY - BTN_SIZE - BTN_GAP - 2, BTN_SIZE + 4, BTN_SIZE * 2 + BTN_GAP * 2 + 4, 6);
    roundRect(ctx, DPAD_CX - BTN_SIZE - BTN_GAP - 2, DPAD_CY - BTN_SIZE / 2 - 2, BTN_SIZE * 2 + BTN_GAP * 2 + 4, BTN_SIZE + 4, 6);

    // Individual buttons
    for (var i = 0; i < dpadButtons.length; i++) {
      var btn = dpadButtons[i];
      // Button face
      ctx.fillStyle = btn.pressed ? '#888888' : '#6A6A6A';
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);

      // Button border highlight (3D effect)
      if (!btn.pressed) {
        ctx.fillStyle = '#7A7A7A';
        ctx.fillRect(btn.x + 2, btn.y + 2, btn.w - 4, 2);
        ctx.fillRect(btn.x + 2, btn.y + 2, 2, btn.h - 4);
      }

      // Arrow label
      ctx.fillStyle = btn.pressed ? '#CCCCCC' : '#AAAAAA';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }

    // Center dot
    ctx.fillStyle = '#505050';
    ctx.beginPath();
    ctx.arc(DPAD_CX, DPAD_CY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Menu / Select buttons — in the phone body between screen and D-pad
    var softBtnW = 70, softBtnH = 28;
    var softBtnY = SCREEN_BOTTOM + 16;

    // Left soft key
    ctx.fillStyle = '#4A4A4A';
    roundRect(ctx, DPAD_CX - 120 - softBtnW / 2, softBtnY, softBtnW, softBtnH, 6);
    ctx.fillStyle = '#999999';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Menu', DPAD_CX - 120, softBtnY + softBtnH / 2);

    // Right soft key
    ctx.fillStyle = '#4A4A4A';
    roundRect(ctx, DPAD_CX + 120 - softBtnW / 2, softBtnY, softBtnW, softBtnH, 6);
    ctx.fillStyle = '#999999';
    ctx.fillText('Names', DPAD_CX + 120, softBtnY + softBtnH / 2);

    // "NOKI" text between soft keys and D-pad
    ctx.fillStyle = '#777777';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N O K I', DPAD_CX, softBtnY + softBtnH + 22);
  }

  // ══════════════════════════════════════════════════════════
  // Touch Input (WebView poke)
  //
  // Spectacles WebView poke does not reliably deliver touchend
  // events. Instead of depending on touchend to release buttons,
  // we use a short auto-release timer. Each button press sets a
  // timestamp; the render loop clears pressed state after 150ms.
  // This also handles touchmove to update which button is active.
  // ══════════════════════════════════════════════════════════

  var touchStartX = 0, touchStartY = 0;
  var buttonPressTime = 0;
  var BUTTON_RELEASE_MS = 150;  // auto-release after this many ms
  var activeTouchId = -1;

  function getTouchPos(touch) {
    try {
      var cvs = document.querySelector('canvas');
      if (!cvs) return null;
      var rect = cvs.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left) * (W / rect.width),
        y: (touch.clientY - rect.top) * (H / rect.height)
      };
    } catch(e) { return null; }
  }

  function resetAllButtons() {
    for (var i = 0; i < dpadButtons.length; i++) {
      dpadButtons[i].pressed = false;
    }
  }

  function hitTestDpad(tx, ty) {
    for (var i = 0; i < dpadButtons.length; i++) {
      var btn = dpadButtons[i];
      if (tx >= btn.x && tx <= btn.x + btn.w && ty >= btn.y && ty <= btn.y + btn.h) {
        return btn;
      }
    }
    return null;
  }

  function pressButton(btn) {
    resetAllButtons();
    btn.pressed = true;
    buttonPressTime = performance.now();
    handleDirection(btn.dir);
  }

  document.addEventListener('touchstart', function(e) {
    e.preventDefault();
    var touch = e.touches[0];
    activeTouchId = touch.identifier;
    var pos = getTouchPos(touch);
    if (!pos) return;
    touchStartX = pos.x;
    touchStartY = pos.y;

    // Resume AudioContext on first touch (browser autoplay policy)
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    // Check D-pad buttons
    var btn = hitTestDpad(pos.x, pos.y);
    if (btn) {
      pressButton(btn);
      return;
    }

    // Tap on game area: start/restart
    if (pos.x >= GAME_X && pos.x <= GAME_X + GAME_W && pos.y >= GAME_Y && pos.y <= GAME_Y + GAME_H) {
      if (!gameStarted || gameOver) {
        initGame();
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    e.preventDefault();
    // Find the active touch
    for (var t = 0; t < e.touches.length; t++) {
      if (e.touches[t].identifier === activeTouchId) {
        var pos = getTouchPos(e.touches[t]);
        if (!pos) return;
        var btn = hitTestDpad(pos.x, pos.y);
        if (btn) {
          // Moved onto a (possibly different) button
          if (!btn.pressed) pressButton(btn);
        } else {
          // Moved off all buttons
          resetAllButtons();
        }
        return;
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', function(e) {
    e.preventDefault();
    resetAllButtons();
    activeTouchId = -1;

    // Swipe detection on game area
    try {
      if (e.changedTouches && e.changedTouches.length > 0) {
        var pos = getTouchPos(e.changedTouches[0]);
        if (pos) {
          var dx = pos.x - touchStartX;
          var dy = pos.y - touchStartY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
              handleDirection(dx > 0 ? DIR_RIGHT : DIR_LEFT);
            } else {
              handleDirection(dy > 0 ? DIR_DOWN : DIR_UP);
            }
          }
        }
      }
    } catch(err) {}
  }, { passive: false });

  document.addEventListener('touchcancel', function(e) {
    resetAllButtons();
    activeTouchId = -1;
  }, { passive: false });

  // Mouse fallback (for Lens Studio preview / desktop testing)
  document.addEventListener('mousedown', function(e) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    try {
      var cvs = document.querySelector('canvas');
      if (!cvs) return;
      var rect = cvs.getBoundingClientRect();
      var tx = (e.clientX - rect.left) * (W / rect.width);
      var ty = (e.clientY - rect.top) * (H / rect.height);
      var btn = hitTestDpad(tx, ty);
      if (btn) {
        pressButton(btn);
      } else if (tx >= GAME_X && tx <= GAME_X + GAME_W && ty >= GAME_Y && ty <= GAME_Y + GAME_H) {
        if (!gameStarted || gameOver) initGame();
      }
    } catch(err) {}
  });
  document.addEventListener('mouseup', function(e) {
    resetAllButtons();
  });

  // Keyboard fallback (for testing in browser)
  document.addEventListener('keydown', function(e) {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (e.key === 'ArrowUp' || e.key === 'w')    handleDirection(DIR_UP);
    if (e.key === 'ArrowDown' || e.key === 's')   handleDirection(DIR_DOWN);
    if (e.key === 'ArrowLeft' || e.key === 'a')    handleDirection(DIR_LEFT);
    if (e.key === 'ArrowRight' || e.key === 'd')   handleDirection(DIR_RIGHT);
    if (e.key === ' ' || e.key === 'Enter') {
      if (!gameStarted || gameOver) initGame();
    }
  });

  function handleDirection(newDir) {
    if (gameOver) return;
    // Prevent 180-degree reversal
    if (Math.abs(newDir - dir) === 2) return;
    nextDir = newDir;
    playMoveSound();
  }

  // Public API for UIKit buttons to call
  window.snakeSetDir = function(d) {
    if (!gameStarted) initGame();
    handleDirection(d);
  };
  window.snakeRestart = function() { initGame(); };

  // ══════════════════════════════════════════════════════════
  // Utility: Rounded Rectangle
  // ══════════════════════════════════════════════════════════

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
    context.fill();
  }

  // ══════════════════════════════════════════════════════════
  // Main Loop
  // ══════════════════════════════════════════════════════════

  var lastFrameTime = performance.now();
  var fps = 0;

  function gameLoop(now) {
    // FPS tracking
    var delta = now - lastFrameTime;
    lastFrameTime = now;
    if (delta > 0) fps = fps * 0.9 + (1000 / delta) * 0.1;

    // Auto-release stuck buttons after timeout (safety net)
    if (buttonPressTime > 0 && now - buttonPressTime > BUTTON_RELEASE_MS) {
      resetAllButtons();
      buttonPressTime = 0;
    }

    // Game tick at fixed interval
    if (gameStarted && !gameOver && !paused) {
      if (now - lastTick >= speed) {
        tick();
        lastTick = now;
      }
    }

    // ── Render ──
    drawPhone();

    if (!gameStarted) {
      drawTitleScreen();
    } else {
      // Game screen
      ctx.fillStyle = COLORS.lightest;
      ctx.fillRect(GAME_X, GAME_Y, GAME_W, GAME_H);

      drawBorder();
      drawSnake();
      drawFood();
      drawHUD();

      if (gameOver) {
        drawGameOver();
      }
    }

    drawDpad();

    // FPS counter (subtle)
    ctx.fillStyle = '#555555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(Math.round(fps) + ' fps', W - 40, H - 8);

    requestAnimationFrame(gameLoop);
  }

  // Start
  setTimeout(function() { requestAnimationFrame(gameLoop); }, 200);
})();
`);

    print('[NokiaSnake] Flushing...');
    ctx.flush();
    print('[NokiaSnake] Done — Nokia Snake running in WebView.');
    print('[NokiaSnake] Touch D-pad or swipe on game area to control.');
    print('[NokiaSnake] Tap game area to start/restart.');
  }
}

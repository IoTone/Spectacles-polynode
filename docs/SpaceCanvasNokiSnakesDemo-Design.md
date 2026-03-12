# SpaceCanvasNokiSnakesDemo Design

## Overview

A faithful recreation of Noki Snake (1998) from the Noki 6110, rendered via SpaceCanvas on Snap Spectacles. The entire game — rendering, input, sound — runs inside a single WebView via `executeRaw()`.

## Visual Design

### Noki 6110 LCD Color Palette

Sampled from a real device photo. Deep olive green, no visible grid lines.

| Name | Hex | RGB % | Usage |
|---|---|---|---|
| Lightest | `#457802` | 27.1, 47.1, 0.8 | LCD background |
| Light | `#5A8C1A` | — | Lighter accents |
| Dark | `#2D5000` | — | Secondary elements |
| Darkest | `#1A2E00` | — | Snake, walls, text, food |

### Screen Layout

```
┌──────────────────────────────────────┐
│          Phone bezel (#2C2C2C)       │
│  ┌──────────────────────────────┐    │
│  │  SNAKE    Score: 120    Hi: 300│   │  ← HUD bar
│  │                                │   │
│  │     ██                         │   │  ← Game grid (45x24 cells)
│  │     ██████                     │   │    CELL = 20px
│  │          ██                    │   │    900x480 game area
│  │     ◆ (food)                   │   │
│  │                                │   │
│  └──────────────────────────────┘    │
│                                      │
│           N O K I                   │
│      [Menu]       [Names]            │  ← Decorative soft keys
│                                      │
│             ▲                        │
│          ◀  ●  ▶                     │  ← D-pad (52px buttons)
│             ▼                        │
│                                      │
└──────────────────────────────────────┘
```

### Dimensions

- Canvas: 1024 x 768
- Game area: 900 x 480, offset at (62, 40)
- Cell size: 10px (smallest unit)
- Border wall: inset 3 cells from game edge, 1 cell thick
- Snake body: 3 cells wide (30px segments)
- Playable grid: ~26 x 13 logical positions (inside wall)
- D-pad centered at (512, 650), button size 52px

## Game Mechanics

### Core Rules (matching original Noki Snake)

- Snake moves in 4 cardinal directions on a grid
- Eating food (dot) grows snake by 1 segment, adds 10 points
- Wall collision = game over
- Self collision = game over
- No 180-degree direction reversal allowed
- Speed increases slightly with each food eaten (150ms → 60ms minimum)

### States

```
Title Screen → (tap) → Playing → (collision) → Game Over → (tap) → Playing
```

## Input System

### Primary: On-Screen D-Pad (WebView Touch)

Four directional buttons rendered on the canvas, detected via `touchstart` events. The WebView's `poke` (direct touch) mode must be enabled. Touch coordinates are scaled from viewport to canvas space.

### Secondary: Swipe Gestures

Swipe on the game area (>30px distance) triggers directional input. Horizontal vs vertical determined by dominant axis.

### Tertiary: Keyboard (Debug)

Arrow keys and WASD for testing in a browser. Space/Enter to start/restart.

### UIKit Button Integration (Optional)

The game exposes global functions on `window` for external control:

```javascript
window.snakeSetDir(0)  // UP
window.snakeSetDir(1)  // RIGHT
window.snakeSetDir(2)  // DOWN
window.snakeSetDir(3)  // LEFT
window.snakeRestart()  // Restart game
```

UIKit buttons in the Lens Studio scene can call these via `WebView.executeJavaScript()`. This requires:

1. Four Button scene objects (Up/Down/Left/Right) with Interactable components
2. A bridge script that listens to `onTriggerDown` and calls `webView.executeJavaScript('snakeSetDir(N)')`
3. This approach decouples the game rendering from the Lens Studio UI framework

**Note:** The current implementation uses on-canvas D-pad buttons because UIKit buttons require scene configuration in Lens Studio Editor (prefabs, Interactable components) that cannot be created purely from script.

## Sound Design

### Web Audio API (No External Files)

Sound is generated programmatically via `AudioContext` oscillators, matching the Noki 6110's piezo buzzer aesthetic:

| Event | Frequency | Duration | Waveform | Character |
|---|---|---|---|---|
| Move | 440 Hz | 20ms | Square | Subtle click |
| Eat | 880→1200 Hz | 80+60ms | Square | Rising chirp |
| Die | 200→120 Hz | 300+400ms | Sawtooth | Descending buzz |
| Start | 523→659→784 Hz | 100ms each | Square | C-E-G ascending |

Square wave matches the Noki buzzer character. Gain is set low (0.08) with exponential decay.

### Optional: Lens Studio AudioComponent

The script accepts optional `@input` AudioComponent references for `eatSound` and `gameOverSound`. If assigned, these play Lens Studio audio assets alongside or instead of Web Audio. Useful for higher-quality sound effects.

## Architecture

```
SpaceCanvasNokiSnakesDemo.ts (@component)
  │
  ├── SpaceCanvas (Spacecanvas.ts)
  │     └── WebView (WebView.lspkg)
  │           └── executeRaw() injects entire game
  │
  └── Game (runs inside WebView)
        ├── Game State (snake[], food, score, dir)
        ├── Game Logic (tick, collision, food placement)
        ├── Renderer (phone bezel, LCD screen, snake, food, HUD, D-pad)
        ├── Input Handler (touch D-pad, swipe, keyboard)
        └── Sound Engine (Web Audio oscillators)
```

Everything runs inside a single `executeRaw()` call. The game loop uses `requestAnimationFrame` at native browser framerate, with game ticks at a fixed `speed` interval (150ms, decreasing).

## Setup in Lens Studio

1. Add a WebView component (from WebView.lspkg) to a SceneObject
2. Set resolution to 1024x768
3. **Enable "poke"** (direct touch) on the WebView component — required for D-pad
4. Add SpaceCanvasNokiSnakesDemo script to another SceneObject
5. Drag the WebView into the `webView` input
6. (Optional) Add AudioComponent objects and assign to `eatSound` / `gameOverSound`
7. Deploy to Spectacles

## Known Limitations

- **WebView energy**: The game runs a continuous `requestAnimationFrame` loop in WebView, which contributes to device heating (same issue as SpaceCanvas generally)
- **Touch accuracy**: Spectacles touch input via WebView poke may have lower precision than direct screen touch; the D-pad buttons are sized at 52px to accommodate this
- **No persistence**: High score resets when the lens restarts (no localStorage access confirmed)
- **Sound**: Web Audio API availability on Spectacles WebView is not guaranteed; the game works silently if unavailable

## Future Improvements

- Pause/resume via center D-pad button
- Wrap-around mode (snake exits one wall, enters opposite)
- Multiple food types (bonus items with higher points)
- Level progression with increasing difficulty
- Score persistence via Lens Studio PersistentStorageSystem
- Native mesh rendering to reduce WebView energy consumption

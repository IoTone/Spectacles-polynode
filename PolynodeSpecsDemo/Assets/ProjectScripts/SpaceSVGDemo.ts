// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceSVGDemo.ts — Demo exercising SpaceSVG Phase 1 features
//
// Setup in Lens Studio:
//   1. Add this script to a SceneObject
//   2. Assign an unlit material (e.g., LegitUnlit) to the "material" input
//   3. Deploy to Spectacles (MeshBuilder rendering must be verified on device)

import { SVGXMLParser, SpaceSVGMeshBackend } from './SpaceSVG';

// ─── Test SVGs ───────────────────────────────────────

const SVG_BASIC_SHAPES = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="60" height="40" fill="red"/>
  <circle cx="150" cy="30" r="25" fill="blue"/>
  <ellipse cx="60" cy="100" rx="40" ry="20" fill="green"/>
  <rect x="120" y="80" width="50" height="50" rx="10" fill="orange"/>
</svg>`;

const SVG_POLYGON_POLYLINE = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <polygon points="100,10 140,80 60,80" fill="crimson"/>
  <polyline points="20,150 60,120 100,160 140,130 180,170"
    stroke="navy" stroke-width="4" fill="none"/>
</svg>`;

const SVG_PATH_LINES = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M 10 80 L 50 10 L 90 80 Z" fill="purple"/>
  <path d="M 110 80 H 190 V 10 H 110 Z" fill="teal"/>
  <path d="M 10 120 l 40 -30 l 40 60 Z" fill="coral"/>
</svg>`;

const SVG_PATH_CURVES = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M 10 100 C 10 10, 90 10, 90 100 S 170 190, 170 100"
    stroke="dodgerblue" stroke-width="3" fill="none"/>
  <path d="M 10 150 Q 50 100, 100 150 T 190 150"
    stroke="hotpink" stroke-width="3" fill="none"/>
</svg>`;

const SVG_PATH_ARCS = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <path d="M 30 100 A 40 40 0 0 1 110 100 A 40 40 0 0 1 30 100 Z"
    fill="gold"/>
  <path d="M 130 60 A 30 50 30 1 0 170 140"
    stroke="indigo" stroke-width="3" fill="none"/>
</svg>`;

const SVG_TRANSFORMS = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="40" height="40" fill="red"
    transform="translate(20,20)"/>
  <rect x="0" y="0" width="40" height="40" fill="blue"
    transform="translate(100,20) rotate(45,20,20)"/>
  <rect x="0" y="0" width="40" height="40" fill="green"
    transform="translate(20,120) scale(1.5)"/>
  <rect x="0" y="0" width="40" height="40" fill="orange"
    transform="translate(120,120) skewX(20)"/>
</svg>`;

const SVG_GROUPS = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <g fill="royalblue" transform="translate(10,10)">
    <rect x="0" y="0" width="30" height="30"/>
    <rect x="40" y="0" width="30" height="30"/>
    <rect x="80" y="0" width="30" height="30"/>
  </g>
  <g fill="tomato" opacity="0.7" transform="translate(10,60)">
    <circle cx="15" cy="15" r="15"/>
    <circle cx="55" cy="15" r="15"/>
    <circle cx="95" cy="15" r="15"/>
  </g>
</svg>`;

const SVG_DEFS_USE = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <circle id="dot" cx="0" cy="0" r="10"/>
  </defs>
  <use href="#dot" x="30" y="30" fill="red"/>
  <use href="#dot" x="80" y="30" fill="green"/>
  <use href="#dot" x="130" y="30" fill="blue"/>
  <use href="#dot" x="80" y="80" fill="purple"/>
</svg>`;

const SVG_STROKE = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="60" height="60"
    fill="lightyellow" stroke="black" stroke-width="3"/>
  <circle cx="150" cy="50" r="30"
    fill="none" stroke="darkred" stroke-width="4"/>
  <line x1="20" y1="130" x2="180" y2="130"
    stroke="steelblue" stroke-width="5"/>
  <path d="M 20 170 Q 100 120, 180 170"
    fill="none" stroke="forestgreen" stroke-width="3"/>
</svg>`;

const SVG_OPACITY = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="100" height="100" fill="red"/>
  <rect x="80" y="80" width="100" height="100" fill="blue" opacity="0.5"/>
  <circle cx="100" cy="100" r="40" fill="green" fill-opacity="0.6"/>
</svg>`;

const SVG_STYLE_ATTR = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="20" y="20" width="60" height="60"
    style="fill:salmon;stroke:darkslategray;stroke-width:2"/>
  <circle cx="150" cy="50" r="30"
    style="fill:mediumpurple;opacity:0.8"/>
</svg>`;

const SVG_HAVE_A_NICE_DAY_LOGO = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="40" r="25" fill="#FFFC00"/>
  <circle cx="42" cy="35" r="3" fill="black"/>
  <circle cx="58" cy="35" r="3" fill="black"/>
  <path d="M 38 48 Q 50 60, 62 48" stroke="black" stroke-width="2" fill="none"/>
  <polygon points="30,65 50,85 70,65" fill="#FFFC00"/>
</svg>`;

// ─── Fancy SVG Path Text: "SVG" ──────────────────────
// Letters drawn with cubic bezier paths in a decorative style

const SVG_FANCY_TEXT = `
<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background panel -->
  <rect x="5" y="5" width="390" height="190" rx="15" fill="#1a1a2e"/>
  <rect x="10" y="10" width="380" height="180" rx="12" fill="none" stroke="#e94560" stroke-width="2"/>

  <!-- "S" letter -->
  <path d="M 70 55 C 30 55, 30 95, 65 100 C 100 105, 100 145, 60 145"
    stroke="#e94560" stroke-width="8" fill="none"/>
  <!-- "S" decorative dots -->
  <circle cx="70" cy="50" r="4" fill="#0f3460"/>
  <circle cx="55" cy="150" r="4" fill="#0f3460"/>

  <!-- "V" letter -->
  <path d="M 120 55 L 155 145 L 190 55"
    stroke="#e94560" stroke-width="8" fill="none"/>
  <!-- "V" accent -->
  <circle cx="155" cy="150" r="5" fill="#16c79a"/>

  <!-- "G" letter -->
  <path d="M 270 55 C 220 45, 210 100, 210 105 C 210 115, 220 150, 270 145 L 270 110 L 245 110"
    stroke="#e94560" stroke-width="8" fill="none"/>

  <!-- Decorative underline -->
  <path d="M 40 170 Q 100 155, 200 170 Q 300 185, 360 170"
    stroke="#16c79a" stroke-width="3" fill="none"/>

  <!-- Corner accents -->
  <path d="M 20 30 L 20 20 L 30 20" stroke="#0f3460" stroke-width="3" fill="none"/>
  <path d="M 370 30 L 380 20 L 380 30" stroke="#0f3460" stroke-width="3" fill="none" transform="rotate(0)"/>
  <path d="M 20 170 L 20 180 L 30 180" stroke="#0f3460" stroke-width="3" fill="none"/>
  <path d="M 370 170 L 380 180 L 370 180" stroke="#0f3460" stroke-width="3" fill="none"/>

  <!-- Sparkle dots -->
  <circle cx="100" cy="30" r="2" fill="#16c79a"/>
  <circle cx="300" cy="35" r="2" fill="#16c79a"/>
  <circle cx="340" cy="80" r="2" fill="#16c79a"/>
  <circle cx="50" cy="120" r="2" fill="#16c79a"/>
  <circle cx="320" cy="160" r="2" fill="#16c79a"/>
</svg>`;

// ─── Geometric "HELLO" in block letters ──────────────

const SVG_BLOCK_TEXT = `
<svg viewBox="0 0 500 120" xmlns="http://www.w3.org/2000/svg">
  <!-- H -->
  <rect x="10" y="10" width="12" height="100" fill="#ff6b6b"/>
  <rect x="10" y="50" width="50" height="12" fill="#ff6b6b"/>
  <rect x="48" y="10" width="12" height="100" fill="#ff6b6b"/>

  <!-- E -->
  <rect x="80" y="10" width="12" height="100" fill="#feca57"/>
  <rect x="80" y="10" width="45" height="12" fill="#feca57"/>
  <rect x="80" y="50" width="35" height="12" fill="#feca57"/>
  <rect x="80" y="98" width="45" height="12" fill="#feca57"/>

  <!-- L -->
  <rect x="150" y="10" width="12" height="100" fill="#48dbfb"/>
  <rect x="150" y="98" width="45" height="12" fill="#48dbfb"/>

  <!-- L -->
  <rect x="220" y="10" width="12" height="100" fill="#ff9ff3"/>
  <rect x="220" y="98" width="45" height="12" fill="#ff9ff3"/>

  <!-- O -->
  <path d="M 310 10 L 350 10 A 5 5 0 0 1 355 15 L 355 105 A 5 5 0 0 1 350 110
           L 310 110 A 5 5 0 0 1 305 105 L 305 15 A 5 5 0 0 1 310 10 Z"
    fill="none" stroke="#54a0ff" stroke-width="12"/>

  <!-- Decorative shadow rectangles -->
  <rect x="14" y="14" width="12" height="100" fill="#c44569" opacity="0.3"/>
  <rect x="84" y="14" width="12" height="100" fill="#f6b93b" opacity="0.3"/>
  <rect x="154" y="14" width="12" height="100" fill="#0abde3" opacity="0.3"/>
  <rect x="224" y="14" width="12" height="100" fill="#f368e0" opacity="0.3"/>
</svg>`;

// ─── Animated Clock Generator ────────────────────────

function buildClockSVG(hours: number, minutes: number, seconds: number): string {
  const cx = 100, cy = 100, r = 90;

  // Angles (12 o'clock = -90 degrees, clockwise)
  const secAngle = seconds * 6 - 90;
  const minAngle = minutes * 6 + seconds * 0.1 - 90;
  const hrAngle = (hours % 12) * 30 + minutes * 0.5 - 90;

  // Hour markers
  let markers = '';
  for (let i = 0; i < 12; i++) {
    const angle = i * 30 * Math.PI / 180;
    const isQuarter = i % 3 === 0;
    const innerR = isQuarter ? 70 : 75;
    const outerR = 85;
    const x1 = cx + innerR * Math.sin(angle);
    const y1 = cy - innerR * Math.cos(angle);
    const x2 = cx + outerR * Math.sin(angle);
    const y2 = cy - outerR * Math.cos(angle);
    const w = isQuarter ? 3 : 1.5;
    markers += `  <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="silver" stroke-width="${w}"/>\n`;
  }

  // Minute tick marks
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue; // skip hour positions
    const angle = i * 6 * Math.PI / 180;
    const x1 = cx + 82 * Math.sin(angle);
    const y1 = cy - 82 * Math.cos(angle);
    const x2 = cx + 85 * Math.sin(angle);
    const y2 = cy - 85 * Math.cos(angle);
    ticks += `  <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="gray" stroke-width="0.5"/>\n`;
  }

  // Hand endpoints
  const secRad = secAngle * Math.PI / 180;
  const minRad = minAngle * Math.PI / 180;
  const hrRad = hrAngle * Math.PI / 180;

  const secLen = 72, minLen = 60, hrLen = 42;
  const secX = cx + secLen * Math.cos(secRad);
  const secY = cy + secLen * Math.sin(secRad);
  const minX = cx + minLen * Math.cos(minRad);
  const minY = cy + minLen * Math.sin(minRad);
  const hrX = cx + hrLen * Math.cos(hrRad);
  const hrY = cy + hrLen * Math.sin(hrRad);

  // Tail ends (short lines opposite the hand)
  const secTailX = cx - 15 * Math.cos(secRad);
  const secTailY = cy - 15 * Math.sin(secRad);

  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Clock face -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a2e"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e94560" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="87" fill="none" stroke="#0f3460" stroke-width="1"/>

${markers}
${ticks}

  <!-- Hour hand -->
  <line x1="${cx}" y1="${cy}" x2="${hrX.toFixed(1)}" y2="${hrY.toFixed(1)}"
    stroke="white" stroke-width="5"/>

  <!-- Minute hand -->
  <line x1="${cx}" y1="${cy}" x2="${minX.toFixed(1)}" y2="${minY.toFixed(1)}"
    stroke="silver" stroke-width="3"/>

  <!-- Second hand -->
  <line x1="${secTailX.toFixed(1)}" y1="${secTailY.toFixed(1)}" x2="${secX.toFixed(1)}" y2="${secY.toFixed(1)}"
    stroke="#e94560" stroke-width="1.5"/>

  <!-- Center cap -->
  <circle cx="${cx}" cy="${cy}" r="5" fill="#e94560"/>
  <circle cx="${cx}" cy="${cy}" r="2.5" fill="white"/>
</svg>`;
}

// ─── Sinc Plot Chart ─────────────────────────────────
// Based on matplotlib sinc(x) output — curve data extracted from real SVG

const SVG_SINC_CHART = `
<svg viewBox="0 0 432 288" xmlns="http://www.w3.org/2000/svg">
  <!-- Plot background -->
  <rect x="54" y="34" width="335" height="218" fill="white"/>

  <!-- Grid lines -->
  <g stroke="#e0e0e0" stroke-width="0.5">
    <line x1="54" y1="43" x2="389" y2="43"/>
    <line x1="54" y1="76" x2="389" y2="76"/>
    <line x1="54" y1="109" x2="389" y2="109"/>
    <line x1="54" y1="141" x2="389" y2="141"/>
    <line x1="54" y1="174" x2="389" y2="174"/>
    <line x1="54" y1="207" x2="389" y2="207"/>
    <line x1="54" y1="239" x2="389" y2="239"/>
    <line x1="100" y1="34" x2="100" y2="252"/>
    <line x1="161" y1="34" x2="161" y2="252"/>
    <line x1="221" y1="34" x2="221" y2="252"/>
    <line x1="282" y1="34" x2="282" y2="252"/>
    <line x1="343" y1="34" x2="343" y2="252"/>
  </g>

  <!-- Sinc curve -->
  <path d="M 69 207 L 72 204 L 75 200 L 78 198 L 82 196 L 85 195
    L 88 196 L 91 197 L 94 200 L 97 203 L 100 207 L 103 211
    L 106 215 L 109 219 L 112 221 L 115 222 L 118 221 L 121 219
    L 125 216 L 128 211 L 131 206 L 134 200 L 137 195 L 140 190
    L 143 187 L 146 186 L 149 187 L 152 190 L 155 195 L 158 201
    L 161 209 L 165 218 L 168 226 L 171 234 L 174 239 L 177 242
    L 180 242 L 183 237 L 186 229 L 189 216 L 192 200 L 195 181
    L 198 160 L 201 137 L 205 115 L 208 94 L 211 75 L 214 60
    L 217 50 L 220 44 L 223 44 L 226 50 L 229 60 L 232 75
    L 235 94 L 238 115 L 241 137 L 245 160 L 248 181 L 251 200
    L 254 216 L 257 229 L 260 237 L 263 242 L 266 242 L 269 239
    L 272 234 L 275 226 L 278 218 L 281 209 L 284 201 L 288 195
    L 291 190 L 294 187 L 297 186 L 300 187 L 303 190 L 306 195
    L 309 200 L 312 206 L 315 211 L 318 216 L 321 219 L 324 221
    L 327 222 L 331 221 L 334 219 L 337 215 L 340 211 L 343 207
    L 346 203 L 349 200 L 352 197 L 355 196 L 358 195 L 361 196
    L 364 198 L 367 200 L 371 204 L 374 207"
    fill="none" stroke="#1f77b4" stroke-width="2"/>

  <!-- Axes -->
  <line x1="54" y1="252" x2="389" y2="252" stroke="black" stroke-width="1"/>
  <line x1="54" y1="34" x2="54" y2="252" stroke="black" stroke-width="1"/>
  <line x1="389" y1="34" x2="389" y2="252" stroke="black" stroke-width="1"/>
  <line x1="54" y1="34" x2="389" y2="34" stroke="black" stroke-width="1"/>

  <!-- X-axis tick marks -->
  <g stroke="black" stroke-width="1">
    <line x1="100" y1="252" x2="100" y2="256"/>
    <line x1="161" y1="252" x2="161" y2="256"/>
    <line x1="221" y1="252" x2="221" y2="256"/>
    <line x1="282" y1="252" x2="282" y2="256"/>
    <line x1="343" y1="252" x2="343" y2="256"/>
  </g>

  <!-- Y-axis tick marks -->
  <g stroke="black" stroke-width="1">
    <line x1="54" y1="239" x2="50" y2="239"/>
    <line x1="54" y1="207" x2="50" y2="207"/>
    <line x1="54" y1="174" x2="50" y2="174"/>
    <line x1="54" y1="141" x2="50" y2="141"/>
    <line x1="54" y1="109" x2="50" y2="109"/>
    <line x1="54" y1="76" x2="50" y2="76"/>
    <line x1="54" y1="43" x2="50" y2="43"/>
  </g>

  <!-- Zero line -->
  <line x1="54" y1="207" x2="389" y2="207" stroke="#999999" stroke-width="0.5"/>
</svg>`;

// ─── Heatmap (10x10 grid) ────────────────────────────

function buildHeatmapSVG(): string {
  const cols = 10, rows = 10;
  const cellW = 30, cellH = 30;
  const pad = 10;
  const w = cols * cellW + pad * 2;
  const h = rows * cellH + pad * 2;

  let cells = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Generate a smooth 2D pattern: radial gradient from center
      const dx = (c - cols / 2 + 0.5) / (cols / 2);
      const dy = (r - rows / 2 + 0.5) / (rows / 2);
      const v = Math.max(0, Math.min(1, 1 - Math.sqrt(dx * dx + dy * dy)));

      // Blue (cold) → Cyan → Green → Yellow → Red (hot)
      let red: number, green: number, blue: number;
      if (v < 0.25) {
        const t = v / 0.25;
        red = 0; green = Math.round(t * 128); blue = Math.round(128 + t * 127);
      } else if (v < 0.5) {
        const t = (v - 0.25) / 0.25;
        red = 0; green = Math.round(128 + t * 127); blue = Math.round(255 - t * 255);
      } else if (v < 0.75) {
        const t = (v - 0.5) / 0.25;
        red = Math.round(t * 255); green = 255; blue = 0;
      } else {
        const t = (v - 0.75) / 0.25;
        red = 255; green = Math.round(255 - t * 255); blue = 0;
      }

      const hex = '#' + [red, green, blue].map(x =>
        x.toString(16).padStart(2, '0')
      ).join('');
      const x = pad + c * cellW;
      const y = pad + r * cellH;
      cells += `  <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${hex}"/>\n`;
    }
  }

  // Color scale bar
  let legend = '';
  const barX = w + 5;
  const barH = rows * cellH;
  for (let i = 0; i < 20; i++) {
    const v = 1 - i / 19;
    let red: number, green: number, blue: number;
    if (v < 0.25) {
      const t = v / 0.25;
      red = 0; green = Math.round(t * 128); blue = Math.round(128 + t * 127);
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      red = 0; green = Math.round(128 + t * 127); blue = Math.round(255 - t * 255);
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      red = Math.round(t * 255); green = 255; blue = 0;
    } else {
      const t = (v - 0.75) / 0.25;
      red = 255; green = Math.round(255 - t * 255); blue = 0;
    }
    const hex = '#' + [red, green, blue].map(x =>
      x.toString(16).padStart(2, '0')
    ).join('');
    const sy = pad + (i / 19) * (barH - barH / 20);
    legend += `  <rect x="${barX}" y="${sy.toFixed(1)}" width="15" height="${(barH / 19 + 1).toFixed(1)}" fill="${hex}"/>\n`;
  }

  return `<svg viewBox="0 0 ${w + 30} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${w + 30}" height="${h}" fill="#222"/>
${cells}
  <!-- Grid lines -->
  <rect x="${pad}" y="${pad}" width="${cols * cellW}" height="${rows * cellH}" fill="none" stroke="#444" stroke-width="1"/>
  <!-- Color legend -->
${legend}
  <rect x="${barX}" y="${pad}" width="15" height="${barH}" fill="none" stroke="#666" stroke-width="1"/>
</svg>`;
}

// ─── Stylized Tiger Face ─────────────────────────────

const SVG_TIGER = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <circle cx="100" cy="100" r="98" fill="#1a1a1a"/>

  <!-- Head shape -->
  <ellipse cx="100" cy="105" rx="70" ry="65" fill="#e8820c"/>

  <!-- Dark forehead stripes -->
  <path d="M 60 60 Q 70 50, 80 55 Q 85 65, 80 75" fill="#2d1600"/>
  <path d="M 90 48 Q 100 40, 110 48 Q 108 60, 100 65 Q 92 60, 90 48" fill="#2d1600"/>
  <path d="M 120 55 Q 130 50, 140 60 Q 135 70, 120 75" fill="#2d1600"/>

  <!-- Cheek stripes -->
  <path d="M 40 85 Q 50 82, 55 90 Q 48 95, 38 92" fill="#2d1600"/>
  <path d="M 38 100 Q 50 97, 56 105 Q 48 112, 35 108" fill="#2d1600"/>
  <path d="M 145 90 Q 150 82, 160 85 Q 162 92, 152 95" fill="#2d1600"/>
  <path d="M 144 105 Q 150 97, 162 100 Q 165 108, 152 112" fill="#2d1600"/>

  <!-- White face patches -->
  <ellipse cx="80" cy="95" rx="20" ry="15" fill="#ffecd2"/>
  <ellipse cx="120" cy="95" rx="20" ry="15" fill="#ffecd2"/>

  <!-- Eyes -->
  <ellipse cx="80" cy="90" rx="12" ry="9" fill="white"/>
  <ellipse cx="120" cy="90" rx="12" ry="9" fill="white"/>
  <ellipse cx="80" cy="90" rx="7" ry="8" fill="#4a7c2f"/>
  <ellipse cx="120" cy="90" rx="7" ry="8" fill="#4a7c2f"/>
  <circle cx="80" cy="89" r="4" fill="black"/>
  <circle cx="120" cy="89" r="4" fill="black"/>
  <circle cx="82" cy="87" r="1.5" fill="white"/>
  <circle cx="122" cy="87" r="1.5" fill="white"/>

  <!-- Eye liner -->
  <path d="M 68 90 Q 62 85, 58 82" stroke="black" stroke-width="2" fill="none"/>
  <path d="M 132 90 Q 138 85, 142 82" stroke="black" stroke-width="2" fill="none"/>

  <!-- Nose -->
  <path d="M 93 108 Q 100 103, 107 108 Q 107 115, 100 118 Q 93 115, 93 108 Z" fill="#e85d75"/>

  <!-- White muzzle area -->
  <ellipse cx="100" cy="125" rx="25" ry="18" fill="#ffecd2"/>

  <!-- Mouth -->
  <line x1="100" y1="118" x2="100" y2="128" stroke="#2d1600" stroke-width="1.5"/>
  <path d="M 88 130 Q 94 135, 100 128 Q 106 135, 112 130" stroke="#2d1600" stroke-width="1.5" fill="none"/>

  <!-- Whisker dots -->
  <g fill="#2d1600">
    <circle cx="80" cy="115" r="1"/>
    <circle cx="85" cy="118" r="1"/>
    <circle cx="82" cy="121" r="1"/>
    <circle cx="120" cy="115" r="1"/>
    <circle cx="115" cy="118" r="1"/>
    <circle cx="118" cy="121" r="1"/>
  </g>

  <!-- Whiskers -->
  <g stroke="white" stroke-width="0.8" fill="none">
    <line x1="70" y1="112" x2="35" y2="108"/>
    <line x1="70" y1="118" x2="32" y2="120"/>
    <line x1="70" y1="124" x2="35" y2="130"/>
    <line x1="130" y1="112" x2="165" y2="108"/>
    <line x1="130" y1="118" x2="168" y2="120"/>
    <line x1="130" y1="124" x2="165" y2="130"/>
  </g>

  <!-- Ears -->
  <path d="M 45 55 Q 35 25, 55 40 Q 60 50, 50 60 Z" fill="#e8820c"/>
  <path d="M 48 50 Q 42 35, 53 43" fill="#ffc0cb"/>
  <path d="M 155 55 Q 165 25, 145 40 Q 140 50, 150 60 Z" fill="#e8820c"/>
  <path d="M 152 50 Q 158 35, 147 43" fill="#ffc0cb"/>

  <!-- Chin shadow -->
  <ellipse cx="100" cy="145" rx="20" ry="8" fill="#c06800" opacity="0.4"/>
</svg>`;

const SVG_LOGO = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="395" height="125" viewBox="0 0 395 125" version="1.1">
    <!-- Generator: Sketch 46.2 (44496) - http://www.bohemiancoding.com/sketch -->
    <title>Logo</title>
    <desc>Created with Sketch.</desc>
    <defs>
        <polygon id="path-1" points="124.858 124.8408 124.858 0.3378 0.3554 0.3378 0.3554 124.8408"/>
        <polygon id="path-3" points="124.5213 125 0.0003 125 0.0003 0.0351 124.5213 0.0351"/>
    </defs>
    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Logo" transform="translate(0.000000, -1.000000)">
            <g id="Group-3" transform="translate(270.000000, 0.965000)">
                <mask id="mask-2" fill="white">
                    <use xlink:href="#path-1"/>
                </mask>
                <g id="Clip-2"/>
                <path d="M124.8584,113.4668 C124.8584,115.0888 124.5684,116.5928 123.9914,117.9828 C123.4114,119.3708 122.6144,120.5728 121.6024,121.5838 C120.5884,122.5978 119.3884,123.3948 117.9994,123.9728 C116.6104,124.5518 115.1044,124.8408 113.4854,124.8408 L32.0454,124.8408 C29.9624,124.8408 27.7174,124.5958 25.3164,124.1038 C22.9144,123.6118 20.5414,122.8438 18.1974,121.8028 C15.8524,120.7598 13.6094,119.4148 11.4684,117.7648 C9.3264,116.1148 7.4314,114.1178 5.7814,111.7738 C4.1314,109.4298 2.8144,106.7098 1.8314,103.6128 C0.8454,100.5168 0.3554,97.0288 0.3554,93.1508 L0.3554,32.0288 C0.3554,29.9438 0.6004,27.7018 1.0934,25.2988 C1.5844,22.8978 2.3514,20.5238 3.3934,18.1798 C4.4354,15.8358 5.7954,13.5928 7.4744,11.4508 C9.1524,9.3108 11.1644,7.4138 13.5084,5.7638 C15.8524,4.1138 18.5584,2.7978 21.6274,1.8138 C24.6944,0.8298 28.1674,0.3378 32.0454,0.3378 L112.6244,0.3378 L112.6244,22.9108 L32.0454,22.9108 C29.0924,22.9108 26.8364,23.6928 25.2734,25.2558 C23.7114,26.8188 22.9294,29.1338 22.9294,32.2008 L22.9294,93.1508 C22.9294,96.0458 23.7244,98.2878 25.3164,99.8788 C26.9084,101.4718 29.1504,102.2668 32.0454,102.2668 L102.2854,102.2668 L102.2854,73.9638 L51.1944,73.9638 L51.1944,51.2158 L113.4854,51.2158 C115.1044,51.2158 116.6104,51.5198 117.9994,52.1278 C119.3884,52.7348 120.5884,53.5598 121.6024,54.6018 C122.6144,55.6428 123.4114,56.8448 123.9914,58.2048 C124.5684,59.5648 124.8584,61.0258 124.8584,62.5898 L124.8584,113.4668 Z" id="Fill-1" fill="#050505" mask="url(#mask-2)"/>
            </g>
            <g id="Group-6" transform="translate(0.000000, 0.965000)">
                <mask id="mask-4" fill="white">
                    <use xlink:href="#path-3"/>
                </mask>
                <g id="Clip-5"/>
                <path d="M123.7773,76.3271 C123.2823,73.9061 122.5073,71.5131 121.4573,69.1491 C120.4063,66.7851 119.0373,64.5241 117.3423,62.3641 C115.6503,60.2061 113.6233,58.2931 111.2583,56.6301 C108.8943,54.9671 106.1673,53.6401 103.0733,52.6471 C99.9803,51.6551 96.4783,51.1591 92.5683,51.1591 L31.9533,51.3631 C28.9763,51.3631 26.7013,50.3581 25.1253,48.7821 C23.5493,47.2061 22.7613,44.8711 22.7613,41.8811 L22.7933,32.2661 C22.7933,29.0711 23.5813,26.8391 25.1563,25.2621 C26.7323,23.6871 29.0073,22.8981 31.9843,22.8981 L112.0543,22.8981 L112.0543,0.0351 L31.9843,0.0351 C28.0743,0.0351 24.5723,0.5311 21.4803,1.5231 C18.3853,2.5161 15.6583,3.8431 13.2943,5.5071 C10.9293,7.1701 8.9023,9.0821 7.2103,11.2401 C5.5163,13.4001 4.1463,15.6611 3.0953,18.0251 C2.0453,20.3891 1.2703,22.7821 0.7753,25.2031 C0.2793,27.6261 0.0313,29.8871 0.0313,31.9891 L0.0003,41.9981 C0.0003,44.1001 0.2483,46.3611 0.7443,48.7841 C1.2393,51.2051 2.0133,53.5981 3.0643,55.9621 C4.1153,58.3261 5.4853,60.5871 7.1773,62.7471 C8.8713,64.9051 10.8983,66.8181 13.2623,68.4801 C15.6273,70.1441 18.3543,71.4711 21.4493,72.4641 C24.5413,73.4561 28.0433,73.9521 31.9533,73.9521 L92.5683,73.9651 C95.5453,73.9651 97.8203,74.7531 99.3963,76.3281 C100.9723,77.9051 101.7593,80.2401 101.7593,83.3321 L101.7503,92.8721 C101.7503,95.9651 100.9633,98.2991 99.3863,99.8761 C97.8103,101.4511 95.5353,102.4961 92.5583,102.4961 L12.1463,102.4961 L12.1463,125.0001 L92.5583,125.0001 C96.4683,125.0001 99.9703,124.5041 103.0633,123.5121 C106.1573,122.5191 108.8843,121.1921 111.2493,119.5281 C113.6133,117.8661 115.6403,115.9521 117.3343,113.7951 C119.0273,111.6351 120.3963,109.3741 121.4473,107.0101 C122.4983,104.6461 123.2723,102.2531 123.7673,99.8311 C124.2633,97.4091 124.5113,95.1481 124.5113,93.0471 L124.5213,83.1121 C124.5213,81.0101 124.2733,78.7501 123.7773,76.3271" id="Fill-4" fill="#050505" mask="url(#mask-4)"/>
            </g>
            <polygon id="Fill-7" fill="#E02832" points="186.2031 125.9455 135.0171 1.0835 160.1441 1.0835 196.6891 94.5795 233.7871 1.1255 259.7751 1.1255 207.1741 125.9455"/>
        </g>
    </g>
</svg>`;
// ─── Demo List ───────────────────────────────────────

const DEMOS: { name: string; svg?: string; animated?: boolean; generator?: () => string }[] = [
  { name: 'Basic Shapes', svg: SVG_BASIC_SHAPES },
  { name: 'Polygon & Polyline', svg: SVG_POLYGON_POLYLINE },
  { name: 'Path Lines', svg: SVG_PATH_LINES },
  { name: 'Path Curves', svg: SVG_PATH_CURVES },
  { name: 'Path Arcs', svg: SVG_PATH_ARCS },
  { name: 'Transforms', svg: SVG_TRANSFORMS },
  { name: 'Groups', svg: SVG_GROUPS },
  { name: 'Defs & Use', svg: SVG_DEFS_USE },
  { name: 'Stroke', svg: SVG_STROKE },
  { name: 'Opacity', svg: SVG_OPACITY },
  { name: 'Style Attribute', svg: SVG_STYLE_ATTR },
  { name: 'Have a Nice Day Logo', svg: SVG_HAVE_A_NICE_DAY_LOGO },
  { name: 'Fancy Text SVG', svg: SVG_FANCY_TEXT },
  { name: 'Block Text HELLO', svg: SVG_BLOCK_TEXT },
  { name: 'Analog Clock', animated: true },
  { name: 'Sinc Plot Chart', svg: SVG_SINC_CHART },
  { name: 'Heatmap', generator: buildHeatmapSVG },
  { name: 'Tiger Face', svg: SVG_TIGER },
  { name: 'SVG Logo', svg: SVG_LOGO },
];

// ─── Demo Component ──────────────────────────────────

@component
export default class SpaceSVGDemo extends BaseScriptComponent {

  @input
  @hint('Unlit material for mesh rendering (e.g., LegitUnlit)')
  material!: Material;

  @input
  @hint('World-space width')
  worldWidth: number = 20;

  @input
  @hint('World-space height')
  worldHeight: number = 20;

  @input
  @hint('Which demo to show (0-based index)')
  demoIndex: number = 0;

  @input
  @hint('Seconds between demos when cycling (0 to disable)')
  cycleInterval: number = 0;

  @input
  @hint('Optional: Button prefab from SpectaclesUIKit (e.g., FrameButton) for prev/next navigation')
  buttonPrefab: ObjectPrefab;

  private parser = new SVGXMLParser();
  private backend = new SpaceSVGMeshBackend();
  private meshObjects: SceneObject[] = [];
  private currentDemo: number = 0;
  private timer: number = 0;
  private lastSecond: number = -1;
  private isAnimatedDemo: boolean = false;
  private labelText: Text | null = null;
  private navObjects: SceneObject[] = [];

  onAwake() {
    print('[SpaceSVGDemo] onAwake');

    if (!this.material) {
      print('[SpaceSVGDemo] ERROR: No material assigned.');
      return;
    }

    this.currentDemo = Math.max(0, Math.min(this.demoIndex, DEMOS.length - 1));
    this.renderDemo(this.currentDemo);
    this.setupNavigation();

    this.createEvent('UpdateEvent').bind((ev: UpdateEvent) => {
      this.timer += ev.getDeltaTime();

      // Handle animated demos (clock updates every second)
      if (this.isAnimatedDemo) {
        const now = new Date();
        const sec = now.getSeconds();
        if (sec !== this.lastSecond) {
          this.lastSecond = sec;
          this.renderAnimatedFrame();
        }
      }

      // Handle demo cycling
      if (this.cycleInterval > 0 && this.timer >= this.cycleInterval) {
        this.timer = 0;
        this.currentDemo = (this.currentDemo + 1) % DEMOS.length;
        this.renderDemo(this.currentDemo);
        this.updateLabel();
      }
    });
  }

  private renderDemo(index: number): void {
    const demo = DEMOS[index % DEMOS.length];
    print(`[SpaceSVGDemo] Rendering: ${demo.name}`);
    this.clearMeshes();
    this.isAnimatedDemo = !!demo.animated;

    if (demo.animated) {
      this.lastSecond = -1; // force immediate render
      this.renderAnimatedFrame();
    } else if (demo.generator) {
      this.renderSVG(demo.generator(), demo.name);
    } else if (demo.svg) {
      this.renderSVG(demo.svg, demo.name);
    }
  }

  private renderAnimatedFrame(): void {
    const demo = DEMOS[this.currentDemo];
    this.clearMeshes();

    if (demo.name === 'Analog Clock') {
      const now = new Date();
      const svg = buildClockSVG(now.getHours(), now.getMinutes(), now.getSeconds());
      this.renderSVG(svg, 'Clock');
    }
  }

  private renderSVG(svg: string, label: string): void {
    try {
      const tree = this.parser.parse(svg);
      const groups = this.backend.buildMeshes(tree, this.worldWidth, this.worldHeight);
      print(`[SpaceSVGDemo] ${label}: ${groups.length} mesh groups`);

      for (let i = 0; i < groups.length; i++) {
        this.createMeshFromGroup(groups[i], i);
      }
    } catch (e: any) {
      print(`[SpaceSVGDemo] Error: ${e.message || e}`);
    }
  }

  private createMeshFromGroup(group: { vertices: number[]; indices: number[]; color: number[] }, index: number): void {
    const builder = new MeshBuilder([
      { name: 'position', components: 3 },
    ]);
    builder.topology = MeshTopology.Triangles;
    builder.indexType = MeshIndexType.UInt16;

    builder.appendVerticesInterleaved(group.vertices);
    builder.appendIndices(group.indices);

    if (!builder.isValid()) {
      print(`[SpaceSVGDemo] Warning: invalid mesh group ${index}`);
      return;
    }

    builder.updateMesh();
    const mesh = builder.getMesh();

    const obj = global.scene.createSceneObject(`SVGDemo_${index}`);
    obj.setParent(this.getSceneObject());
    // Offset each layer slightly toward the camera (positive Z) to prevent z-fighting
    obj.getTransform().setLocalPosition(new vec3(0, 0, index * 0.01));

    const visual = obj.createComponent('Component.RenderMeshVisual') as RenderMeshVisual;
    visual.mesh = mesh;
    visual.mainMaterial = this.material;

    // Per-instance color override
    const overrides = visual.mainPassOverrides as any;
    overrides.baseColor = new vec4(
      group.color[0], group.color[1], group.color[2], group.color[3]
    );

    this.meshObjects.push(obj);
  }

  // ─── Navigation UI ──────────────────────────────────

  private setupNavigation(): void {
    if (!this.buttonPrefab) {
      print('[SpaceSVGDemo] No buttonPrefab assigned — use demoIndex input or cycleInterval for navigation');
      return;
    }

    const navRoot = global.scene.createSceneObject('NavUI');
    navRoot.setParent(this.getSceneObject());
    navRoot.getTransform().setLocalPosition(new vec3(0, -this.worldHeight / 2 - 3, 0));
    this.navObjects.push(navRoot);

    // Prev button (left side)
    const prevObj = this.buttonPrefab.instantiate(navRoot);
    prevObj.name = 'PrevButton';
    prevObj.getTransform().setLocalPosition(new vec3(-8, 0, 0));
    prevObj.getTransform().setLocalScale(new vec3(0.5, 0.5, 0.5));
    this.navObjects.push(prevObj);
    this.setButtonLabel(prevObj, '\u25C0');
    this.hookButtonEvent(prevObj, () => this.navigateDemo(-1));

    // Demo name label (center) — offset Z forward so it's in front of button surfaces
    const labelObj = global.scene.createSceneObject('DemoLabel');
    labelObj.setParent(navRoot);
    labelObj.getTransform().setLocalPosition(new vec3(0, 0, 0.5));
    const textComp = labelObj.createComponent('Component.Text') as Text;
    textComp.text = this.getDemoLabel();
    try { (textComp as any).textFill.color = new vec4(1, 1, 1, 1); } catch (e) { /* textFill may not be set yet */ }
    this.labelText = textComp;
    this.navObjects.push(labelObj);

    // Next button (right side)
    const nextObj = this.buttonPrefab.instantiate(navRoot);
    nextObj.name = 'NextButton';
    nextObj.getTransform().setLocalPosition(new vec3(8, 0, 0));
    nextObj.getTransform().setLocalScale(new vec3(0.5, 0.5, 0.5));
    this.navObjects.push(nextObj);
    this.setButtonLabel(nextObj, '\u25B6');
    this.hookButtonEvent(nextObj, () => this.navigateDemo(1));

    print(`[SpaceSVGDemo] Navigation buttons created — ${DEMOS.length} demos available`);
  }

  private setButtonLabel(obj: SceneObject, label: string): void {
    // Try immediately first
    const textComp = this.findTextComponent(obj);
    if (textComp) {
      this.applyLabelStyle(textComp, label);
      print(`[SpaceSVGDemo] Set label "${label}" on ${obj.name}`);
      return;
    }
    // Prefab components may not be ready yet — defer to next frame
    print(`[SpaceSVGDemo] Text not found on ${obj.name} yet, deferring...`);
    this.createEvent('UpdateEvent').bind((ev: UpdateEvent) => {
      const deferred = this.findTextComponent(obj);
      if (deferred) {
        this.applyLabelStyle(deferred, label);
        print(`[SpaceSVGDemo] Deferred label "${label}" set on ${obj.name}`);
      } else {
        // Log hierarchy for debugging
        this.logHierarchy(obj, 0);
        print(`[SpaceSVGDemo] Warning: Still no Text component on ${obj.name}`);
      }
    });
  }

  private applyLabelStyle(textComp: Text, label: string): void {
    textComp.text = label;
    // Ensure text is white and visible
    try { (textComp as any).textFill.color = new vec4(1, 1, 1, 1); } catch (e) { /* textFill may not be set yet */ }
    // Push the text's SceneObject forward in Z so it's in front of the button surface
    const textObj = textComp.getSceneObject();
    const pos = textObj.getTransform().getLocalPosition();
    textObj.getTransform().setLocalPosition(new vec3(pos.x, pos.y, pos.z + 0.5));
  }

  private findTextComponent(obj: SceneObject): Text | null {
    const text = obj.getComponent('Component.Text');
    if (text) return text;
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const result = this.findTextComponent(obj.getChild(i));
      if (result) return result;
    }
    return null;
  }

  private logHierarchy(obj: SceneObject, depth: number): void {
    const indent = '  '.repeat(depth);
    const compCount = obj.getComponentCount ? (obj as any).getComponentCount() : '?';
    print(`${indent}[Hierarchy] "${obj.name}" children=${obj.getChildrenCount()}`);
    // Log component types if available
    try {
      const scripts = obj.getComponents('Component.ScriptComponent');
      if (scripts.length > 0) print(`${indent}  scripts: ${scripts.length}`);
    } catch (e) { /* ignore */ }
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      this.logHierarchy(obj.getChild(i), depth + 1);
    }
  }

  private hookButtonEvent(root: SceneObject, callback: () => void): void {
    const api = this.findButtonApi(root);
    if (api) {
      api.onTriggerUp.add(callback);
      print(`[SpaceSVGDemo] Hooked button event: ${root.name}`);
    } else {
      print(`[SpaceSVGDemo] Warning: Could not find button API on ${root.name}`);
    }
  }

  private findButtonApi(obj: SceneObject): any {
    // Search script components on this object for UIKit button API (onTriggerUp event)
    const scripts = obj.getComponents('Component.ScriptComponent');
    for (let i = 0; i < scripts.length; i++) {
      const s = scripts[i] as any;
      if (s.api && s.api.onTriggerUp) return s.api;
      // Some UIKit components expose events directly
      if (s.onTriggerUp) return s;
    }
    // Recurse into children (prefab may have nested button component)
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      const result = this.findButtonApi(obj.getChild(i));
      if (result) return result;
    }
    return null;
  }

  private navigateDemo(direction: number): void {
    this.currentDemo = (this.currentDemo + direction + DEMOS.length) % DEMOS.length;
    this.renderDemo(this.currentDemo);
    this.updateLabel();
    print(`[SpaceSVGDemo] Navigated to: ${DEMOS[this.currentDemo].name}`);
  }

  private getDemoLabel(): string {
    return `${this.currentDemo + 1}/${DEMOS.length} ${DEMOS[this.currentDemo].name}`;
  }

  private updateLabel(): void {
    if (this.labelText) {
      this.labelText.text = this.getDemoLabel();
    }
  }

  private clearMeshes(): void {
    for (const obj of this.meshObjects) {
      obj.destroy();
    }
    this.meshObjects = [];
  }
}

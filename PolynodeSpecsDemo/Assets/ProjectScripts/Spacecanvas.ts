// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceCanvas.ts — Spatial HTML5 Canvas 2D polyfill for Lens Studio / Snap Spectacles
// Renders CanvasRenderingContext2D commands via WebView texture onto 3D geometry.
//
// Usage:
//   const canvas = new SpaceCanvas(1024, 768);
//   const ctx = await canvas.getContext('2d');
//   ctx.fillStyle = 'red';
//   ctx.fillRect(0, 0, 100, 100);
//   ctx.flush();
//   meshVisual.getMaterial(0).mainPass.baseTex = canvas.getTexture();

// ─────────────────────────────────────────────
// btoa polyfill (Lens Studio lacks built-in)
// ─────────────────────────────────────────────
function toUTF8(str: string): string {
  let utf8 = '';
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      utf8 += String.fromCharCode(c);
    } else if (c < 0x800) {
      utf8 += String.fromCharCode(0xc0 | (c >> 6));
      utf8 += String.fromCharCode(0x80 | (c & 0x3f));
    } else {
      utf8 += String.fromCharCode(0xe0 | (c >> 12));
      utf8 += String.fromCharCode(0x80 | ((c >> 6) & 0x3f));
      utf8 += String.fromCharCode(0x80 | (c & 0x3f));
    }
  }
  return utf8;
}

function btoa(input: string): string {
  const bytes = toUTF8(input);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes.charCodeAt(i);
    const b1 = i + 1 < bytes.length ? bytes.charCodeAt(i + 1) : 0;
    const b2 = i + 2 < bytes.length ? bytes.charCodeAt(i + 2) : 0;
    output += chars.charAt(b0 >> 2);
    output += chars.charAt(((b0 & 3) << 4) | (b1 >> 4));
    output += i + 1 < bytes.length ? chars.charAt(((b1 & 15) << 2) | (b2 >> 6)) : '=';
    output += i + 2 < bytes.length ? chars.charAt(b2 & 63) : '=';
  }
  return output;
}

// ─────────────────────────────────────────────
// SpaceCanvasGradient — proxy for CanvasGradient
// ─────────────────────────────────────────────
type GradientKind = 'linear' | 'radial';

class SpaceCanvasGradient {
  private stops: [number, string][] = [];

  constructor(private kind: GradientKind, private args: number[]) {}

  addColorStop(offset: number, color: string): void {
    this.stops.push([offset, color]);
  }

  /** @internal Serialize to inline JS expression that returns a CanvasGradient. */
  _toJS(): string {
    const fn =
      this.kind === 'linear' ? 'createLinearGradient' : 'createRadialGradient';
    let js = `(function(){var g=ctx.${fn}(${this.args.join(',')});`;
    for (const [offset, color] of this.stops) {
      js += `g.addColorStop(${offset},${JSON.stringify(color)});`;
    }
    return js + 'return g;})()';
  }
}

// ─────────────────────────────────────────────
// Command types for the batch queue
// ─────────────────────────────────────────────
type FillStrokeStyle = string | SpaceCanvasGradient;

type CanvasCmd =
  | { t: 'p'; n: string; v: string | number | boolean }
  | { t: 'c'; m: string; a: any[] }
  | { t: 'r'; js: string };

// ─────────────────────────────────────────────
// SpaceContext2D — Canvas 2D context polyfill
// ─────────────────────────────────────────────
export class SpaceContext2D {
  private cmds: CanvasCmd[] = [];
  private canvas: SpaceCanvas | null = null;

  /** Canvas pixel dimensions. */
  public readonly width: number;
  public readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /** @internal Called by SpaceCanvas to link back. */
  _setCanvas(canvas: SpaceCanvas): void {
    this.canvas = canvas;
  }

  // --- internal helpers ---
  private cmd(method: string, args: any[]): void {
    this.cmds.push({ t: 'c', m: method, a: args });
  }
  private prop(name: string, value: string | number | boolean): void {
    this.cmds.push({ t: 'p', n: name, v: value });
  }
  private raw(js: string): void {
    this.cmds.push({ t: 'r', js: js });
  }

  // ───── Flush (render) ─────

  /**
   * Serialize all batched commands into an HTML page, load it into the
   * WebView, and clear the batch. The WebView texture updates on next frame.
   */
  flush(): void {
    if (!this.canvas) {
      print('[SpaceCanvas] flush() called before context ready — ignored.');
      return;
    }

    let js = '';
    for (const c of this.cmds) {
      switch (c.t) {
        case 'c':
          js += 'ctx.' + c.m + '(' + c.a.map((a) => JSON.stringify(a)).join(',') + ');\n';
          break;
        case 'p':
          js += 'ctx.' + c.n + '=' + JSON.stringify(c.v) + ';\n';
          break;
        case 'r':
          js += c.js + '\n';
          break;
      }
    }

    const html =
      '<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:#000000;">' +
      '<canvas id="c" width="' + this.width + '" height="' + this.height + '" ' +
      'style="display:block;width:100%;height:100%;"></canvas>' +
      '<script>' +
      "var canvas=document.getElementById('c');" +
      'canvas.width=' + this.width + ';canvas.height=' + this.height + ';' +
      "var ctx=canvas.getContext('2d');" +
      js +
      '</script></body></html>';

    print('[SpaceCanvas] flush: ' + this.cmds.length + ' cmds, HTML length=' + html.length);

    try {
      const encoded = btoa(html);
      print('[SpaceCanvas] flush: base64 length=' + encoded.length);
      this.canvas.loadUrl('data:text/html;charset=utf-8;base64,' + encoded);
      print('[SpaceCanvas] flush: loadUrl called');
    } catch (e) {
      print('[SpaceCanvas] flush: ERROR: ' + e);
    }

    this.cmds = [];
  }

  // ───── Fill / Stroke style (string or gradient) ─────

  set fillStyle(v: FillStrokeStyle) {
    if (v instanceof SpaceCanvasGradient) {
      this.raw('ctx.fillStyle=' + v._toJS() + ';');
    } else {
      this.prop('fillStyle', v);
    }
  }

  set strokeStyle(v: FillStrokeStyle) {
    if (v instanceof SpaceCanvasGradient) {
      this.raw('ctx.strokeStyle=' + v._toJS() + ';');
    } else {
      this.prop('strokeStyle', v);
    }
  }

  // ───── Line style ─────

  set lineWidth(v: number) { this.prop('lineWidth', v); }
  set lineCap(v: string) { this.prop('lineCap', v); }
  set lineJoin(v: string) { this.prop('lineJoin', v); }
  set miterLimit(v: number) { this.prop('miterLimit', v); }
  set lineDashOffset(v: number) { this.prop('lineDashOffset', v); }

  setLineDash(segments: number[]): void {
    this.raw('ctx.setLineDash(' + JSON.stringify(segments) + ');');
  }

  // ───── Text style ─────

  set font(v: string) { this.prop('font', v); }
  set textAlign(v: string) { this.prop('textAlign', v); }
  set textBaseline(v: string) { this.prop('textBaseline', v); }

  // ───── Compositing & transparency ─────

  set globalAlpha(v: number) { this.prop('globalAlpha', v); }
  set globalCompositeOperation(v: string) { this.prop('globalCompositeOperation', v); }

  // ───── Shadows ─────

  set shadowBlur(v: number) { this.prop('shadowBlur', v); }
  set shadowColor(v: string) { this.prop('shadowColor', v); }
  set shadowOffsetX(v: number) { this.prop('shadowOffsetX', v); }
  set shadowOffsetY(v: number) { this.prop('shadowOffsetY', v); }

  // ───── Image smoothing ─────

  set imageSmoothingEnabled(v: boolean) { this.prop('imageSmoothingEnabled', v); }

  // ───── Rectangles ─────

  fillRect(x: number, y: number, w: number, h: number): void {
    this.cmd('fillRect', [x, y, w, h]);
  }
  strokeRect(x: number, y: number, w: number, h: number): void {
    this.cmd('strokeRect', [x, y, w, h]);
  }
  clearRect(x: number, y: number, w: number, h: number): void {
    this.cmd('clearRect', [x, y, w, h]);
  }

  // ───── Path methods ─────

  beginPath(): void { this.cmd('beginPath', []); }
  closePath(): void { this.cmd('closePath', []); }
  moveTo(x: number, y: number): void { this.cmd('moveTo', [x, y]); }
  lineTo(x: number, y: number): void { this.cmd('lineTo', [x, y]); }

  arc(
    x: number, y: number, radius: number,
    startAngle: number, endAngle: number, counterclockwise?: boolean,
  ): void {
    this.cmd('arc', [x, y, radius, startAngle, endAngle, counterclockwise || false]);
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.cmd('arcTo', [x1, y1, x2, y2, radius]);
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.cmd('quadraticCurveTo', [cpx, cpy, x, y]);
  }

  bezierCurveTo(
    cp1x: number, cp1y: number, cp2x: number, cp2y: number,
    x: number, y: number,
  ): void {
    this.cmd('bezierCurveTo', [cp1x, cp1y, cp2x, cp2y, x, y]);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.cmd('rect', [x, y, w, h]);
  }

  ellipse(
    x: number, y: number, radiusX: number, radiusY: number,
    rotation: number, startAngle: number, endAngle: number,
    counterclockwise?: boolean,
  ): void {
    this.cmd('ellipse', [
      x, y, radiusX, radiusY, rotation, startAngle, endAngle,
      counterclockwise || false,
    ]);
  }

  roundRect(
    x: number, y: number, w: number, h: number,
    radii: number | number[],
  ): void {
    // roundRect's radii argument can be a number or array; pass via raw JS
    this.raw(
      `ctx.roundRect(${x},${y},${w},${h},${JSON.stringify(radii)});`,
    );
  }

  fill(fillRule?: string): void {
    fillRule ? this.cmd('fill', [fillRule]) : this.cmd('fill', []);
  }

  stroke(): void { this.cmd('stroke', []); }

  clip(fillRule?: string): void {
    fillRule ? this.cmd('clip', [fillRule]) : this.cmd('clip', []);
  }

  // ───── Text ─────

  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    maxWidth !== undefined
      ? this.cmd('fillText', [text, x, y, maxWidth])
      : this.cmd('fillText', [text, x, y]);
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    maxWidth !== undefined
      ? this.cmd('strokeText', [text, x, y, maxWidth])
      : this.cmd('strokeText', [text, x, y]);
  }

  // ───── Transformations ─────

  save(): void { this.cmd('save', []); }
  restore(): void { this.cmd('restore', []); }

  translate(x: number, y: number): void { this.cmd('translate', [x, y]); }
  rotate(angle: number): void { this.cmd('rotate', [angle]); }
  scale(x: number, y: number): void { this.cmd('scale', [x, y]); }

  transform(
    a: number, b: number, c: number,
    d: number, e: number, f: number,
  ): void {
    this.cmd('transform', [a, b, c, d, e, f]);
  }

  setTransform(
    a: number, b: number, c: number,
    d: number, e: number, f: number,
  ): void {
    this.cmd('setTransform', [a, b, c, d, e, f]);
  }

  resetTransform(): void { this.cmd('resetTransform', []); }

  // ───── Gradients ─────

  createLinearGradient(
    x0: number, y0: number, x1: number, y1: number,
  ): SpaceCanvasGradient {
    return new SpaceCanvasGradient('linear', [x0, y0, x1, y1]);
  }

  createRadialGradient(
    x0: number, y0: number, r0: number,
    x1: number, y1: number, r1: number,
  ): SpaceCanvasGradient {
    return new SpaceCanvasGradient('radial', [x0, y0, r0, x1, y1, r1]);
  }

  // ───── Escape hatch ─────

  /**
   * Inject arbitrary JavaScript into the canvas script block.
   * Use for any Canvas 2D API surface not yet wrapped (e.g. drawImage with
   * an inline data URI, putImageData, etc.).
   */
  executeRaw(js: string): void {
    this.raw(js);
  }
}

// ─────────────────────────────────────────────
// SpaceCanvas — WebView lifecycle & texture
// ─────────────────────────────────────────────

// Import the WebView component type from the package
import { WebView } from 'WebView.lspkg/WebView';

export class SpaceCanvas {
  private ctx: SpaceContext2D;
  private webViewComponent: WebView;
  private scriptComponent: ScriptComponent;
  private ready: boolean = false;

  /** Pixel width of the canvas. */
  public readonly width: number;
  /** Pixel height of the canvas. */
  public readonly height: number;

  /**
   * @param width   Canvas pixel width
   * @param height  Canvas pixel height
   * @param webViewComponent  A WebView component (from WebView.lspkg) already added to the scene.
   * @param scriptComponent   Pass `this` from your @component class (needed for polling events).
   */
  constructor(width: number, height: number, webViewComponent: WebView, scriptComponent: ScriptComponent) {
    this.width = width;
    this.height = height;
    this.ctx = new SpaceContext2D(width, height);
    this.ctx._setCanvas(this);
    this.webViewComponent = webViewComponent;
    this.scriptComponent = scriptComponent;
  }

  /**
   * Returns the 2D drawing context.
   * Waits for the WebView to be initialized if it isn't already.
   */
  async getContext(type: '2d'): Promise<SpaceContext2D> {
    if (type !== '2d') throw new Error("SpaceCanvas: only '2d' context is supported");

    if (this.webViewComponent.isReady) {
      print('[SpaceCanvas] WebView already ready');
      this.ready = true;
    } else {
      print('[SpaceCanvas] Waiting for WebView.isReady (polling)...');
      await new Promise<void>((resolve) => {
        const checkReady = this.scriptComponent!.createEvent('UpdateEvent');
        checkReady.bind(() => {
          if (this.webViewComponent.isReady) {
            print('[SpaceCanvas] WebView is now ready (polled)');
            this.scriptComponent!.removeEvent(checkReady);
            this.ready = true;
            resolve();
          }
        });
      });
    }

    return this.ctx;
  }

  /**
   * Load HTML content into the WebView. Called by SpaceContext2D.flush().
   * Exposed so the context can trigger loads.
   */
  loadUrl(url: string): void {
    this.webViewComponent.goToUrl(url);
  }
}

// No-op component so the scene's existing ScriptComponent reference doesn't crash.
// The real demo lives in SpaceCanvasDemo.ts.
@component
export default class SpaceCanvasLib extends BaseScriptComponent {}

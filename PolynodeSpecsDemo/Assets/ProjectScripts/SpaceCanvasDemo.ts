// SpaceCanvasDemo.ts — Full demo showcasing all SpaceCanvas features.
//
// Setup in Lens Studio:
//   1. Add a WebView component (from WebView.lspkg) to a SceneObject
//   2. Set its resolution to 1024x720
//   3. Add this script to another SceneObject
//   4. Drag the WebView component into the "webView" input
//   5. Deploy to Spectacles

import { SpaceCanvas } from './Spacecanvas';
import { WebView } from 'WebView.lspkg/WebView';

@component
export default class SpaceCanvasDemo extends BaseScriptComponent {

  @input
  @hint('WebView component from WebView.lspkg')
  webView!: WebView;

  async onAwake() {
    print('[SpaceCanvasDemo] onAwake started');

    if (!this.webView) {
      print('[SpaceCanvasDemo] ERROR: No webView assigned.');
      return;
    }

    const W = 1024;
    const H = 768;
    const PI = Math.PI;

    const canvas = new SpaceCanvas(W, H, this.webView, this);
    const ctx = await canvas.getContext('2d');
    print('[SpaceCanvasDemo] SpaceCanvas ready');

    // ── 1. Background: linear gradient ──
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0a0e27');
    bgGrad.addColorStop(0.5, '#1a1a4e');
    bgGrad.addColorStop(1, '#2d1b3d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── 2. Radial-gradient panel with shadow & roundRect ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,200,255,0.6)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    const panelGrad = ctx.createRadialGradient(160, 140, 20, 160, 140, 140);
    panelGrad.addColorStop(0, '#00d4ff');
    panelGrad.addColorStop(1, '#0044aa');
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(40, 50, 240, 180, 16);
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Radial Gradient', 160, 130);
    ctx.fillText('+ Shadow + RoundRect', 160, 155);

    // ── 3. Five-pointed star (path API) ──
    ctx.save();
    ctx.translate(460, 140);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * PI) / 5 - PI / 2;
      const innerAngle = outerAngle + PI / 5;
      const ox = Math.cos(outerAngle) * 80;
      const oy = Math.sin(outerAngle) * 80;
      const ix = Math.cos(innerAngle) * 35;
      const iy = Math.sin(innerAngle) * 35;
      if (i === 0) { ctx.moveTo(ox, oy); } else { ctx.lineTo(ox, oy); }
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('Star Path', 460, 235);

    // ── 4. Title text with shadow ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,200,255,0.8)';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SpaceCanvas', W / 2, H / 2 - 60);
    ctx.restore();

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#88aacc';
    ctx.textAlign = 'center';
    ctx.fillText('HTML5 Canvas 2D for Spectacles', W / 2, H / 2 - 20);

    // ── 5. Bezier curves ──
    ctx.save();
    ctx.translate(120, 380);
    ctx.strokeStyle = '#ff6ec7';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(80, -60, 20, 80, 100, 20);
    ctx.bezierCurveTo(180, -40, 120, 100, 200, 40);
    ctx.stroke();
    ctx.strokeStyle = '#7bff7b';
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.quadraticCurveTo(100, -20, 200, 60);
    ctx.stroke();
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('Bezier + Quadratic', 220, 480);

    // ── 6. globalAlpha circles ──
    ctx.save();
    const alphaColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff'];
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 1.0 - i * 0.18;
      ctx.fillStyle = alphaColors[i];
      ctx.beginPath();
      ctx.arc(420 + i * 50, 400, 22, 0, PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('globalAlpha', 520, 440);

    // ── 7. Transformed rectangles ──
    ctx.save();
    ctx.translate(800, 160);
    const rectColors = ['#ff5555', '#55ff55', '#5555ff', '#ffaa00'];
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * PI) / 6);
      ctx.scale(1.0 - i * 0.1, 1.0 - i * 0.1);
      ctx.fillStyle = rectColors[i];
      ctx.globalAlpha = 0.6;
      ctx.fillRect(-40, -15, 80, 30);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1.0;

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('rotate + scale', 800, 250);

    // ── 8. Dashed arc ──
    ctx.save();
    ctx.translate(800, 380);
    ctx.setLineDash([8, 4, 2, 4]);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 30, PI * 0.25, PI * 1.75);
    ctx.stroke();
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('setLineDash', 800, 450);

    // ── 9. Ellipse ──
    ctx.save();
    ctx.translate(460, 530);
    ctx.strokeStyle = '#dd88ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 35, PI / 8, 0, PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(221,136,255,0.15)';
    ctx.fill();
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('ellipse', 460, 585);

    // ── 10. Composite operation ──
    ctx.save();
    ctx.translate(160, 600);
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(-20, 0, 35, 0, PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#4488ff';
    ctx.beginPath();
    ctx.arc(20, 0, 35, 0, PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('compositeOperation', 160, 660);

    // ── 11. Clipping ──
    ctx.save();
    ctx.translate(660, 600);
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, PI * 2);
    ctx.clip();
    const stripeColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = stripeColors[i];
      ctx.fillRect(-40, -40 + i * 14, 80, 14);
    }
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(660, 600, 40, 0, PI * 2);
    ctx.stroke();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('clip', 660, 660);

    // ── 12. arcTo + strokeRect ──
    ctx.save();
    ctx.translate(880, 540);
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-50, -30, 100, 60);
    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, 30);
    ctx.arcTo(-40, -30, 40, -30, 15);
    ctx.arcTo(40, -30, 40, 30, 15);
    ctx.stroke();
    ctx.restore();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.fillText('arcTo + strokeRect', 880, 590);

    // ── 13. strokeText + miterLimit ──
    ctx.save();
    ctx.font = 'bold 28px sans-serif';
    ctx.strokeStyle = '#ff66aa';
    ctx.lineWidth = 1.5;
    ctx.miterLimit = 2;
    ctx.textAlign = 'center';
    ctx.strokeText('Outlined Text', W / 2, H - 70);
    ctx.restore();

    // ── 14. setTransform / resetTransform ──
    ctx.save();
    ctx.setTransform(1, 0.3, 0.2, 1, 370, 490);
    ctx.fillStyle = 'rgba(0,255,200,0.3)';
    ctx.fillRect(0, 0, 60, 30);
    ctx.strokeStyle = '#00ffc8';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 60, 30);
    ctx.resetTransform();
    ctx.restore();

    // ── 15. Feature list ──
    ctx.font = '11px monospace';
    ctx.fillStyle = '#667788';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const features = [
      'fillRect + strokeRect + clearRect + roundRect',
      'beginPath + closePath + moveTo + lineTo + arc + arcTo',
      'bezierCurveTo + quadraticCurveTo + ellipse + rect',
      'fill + stroke + clip + fillText + strokeText',
      'save + restore + translate + rotate + scale',
      'transform + setTransform + resetTransform',
      'linearGradient + radialGradient + addColorStop',
      'setLineDash + lineDashOffset + lineCap + lineJoin',
      'globalAlpha + globalCompositeOperation + shadow*',
      'font + textAlign + textBaseline + miterLimit',
    ];
    for (let i = 0; i < features.length; i++) {
      ctx.fillText(features[i], W - 16, H - 12 - (features.length - 1 - i) * 14);
    }

    // ── Flush ──
    print('[SpaceCanvasDemo] Flushing full demo...');
    ctx.flush();
    print('[SpaceCanvasDemo] Done — 15 feature demos rendered.');
  }
}

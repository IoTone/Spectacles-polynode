// Copyright (c) 2026 IoTone, Inc. MIT/X License — see LICENSE.txt
//
// SpaceCanvasDoomDemo.ts — Self-playing NotDoom raycasting demo on SpaceCanvas.
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
export default class SpaceCanvasDoomDemo extends BaseScriptComponent {

  @input
  @hint('WebView component from WebView.lspkg')
  webView!: WebView;

  async onAwake() {
    print('[NotDoom] onAwake started');

    if (!this.webView) {
      print('[NotDoom] ERROR: No webView assigned.');
      return;
    }

    const W = 1024;
    const H = 768;

    const canvas = new SpaceCanvas(W, H, this.webView, this);
    const ctx = await canvas.getContext('2d');
    print('[NotDoom] SpaceCanvas ready');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    ctx.executeRaw(`
(function() {
  var W = ${W}, H = ${H};
  var PI = Math.PI;
  var TWO_PI = PI * 2;
  var TEX = 64;
  var STRIP = 2;
  var NUM_RAYS = Math.ceil(W / STRIP);

  // ── Map ──
  var MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,2,0,0,0,3,3,0,0,0,0,0,0,4,4,4,4,0,0,1],
    [1,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,0,4,0,0,4,0,0,1],
    [1,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,4,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,5,5,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,3,3,3,0,0,0,0,0,0,0,0,6,0,0,0,0,1],
    [1,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,6,0,0,0,0,1],
    [1,0,0,0,0,0,0,3,0,3,0,0,0,0,0,0,0,0,6,6,6,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,2,0,0,2,0,0,0,5,0,0,0,5,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,3,0,0,0,0,0,6,6,6,6,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,3,0,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,3,3,0,0,0,0,6,0,0,6,0,0,0,2,2,2,2,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,6,6,6,6,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ];
  var MAP_H = MAP.length;
  var MAP_W = MAP[0].length;

  // ── Generate procedural wall textures on off-screen canvases ──
  var texCanvases = [null];
  function makeTex(drawFn) {
    var c = document.createElement('canvas');
    c.width = TEX; c.height = TEX;
    var g = c.getContext('2d');
    drawFn(g, TEX);
    return c;
  }

  // 1: Red brick
  texCanvases[1] = makeTex(function(g, S) {
    g.fillStyle = '#6b2020'; g.fillRect(0,0,S,S);
    var bw = S/4, bh = S/8;
    for (var r = 0; r < 8; r++) {
      var off = (r % 2) * (bw / 2);
      for (var c = -1; c < 5; c++) {
        var bx = c * bw + off, by = r * bh;
        var shade = 0.85 + Math.random() * 0.3;
        var rv = Math.floor(140 * shade), gv = Math.floor(35 * shade), bv = Math.floor(30 * shade);
        g.fillStyle = 'rgb('+rv+','+gv+','+bv+')';
        g.fillRect(bx+1, by+1, bw-2, bh-2);
        // Noise per brick
        for (var n = 0; n < 3; n++) {
          g.fillStyle = 'rgba(0,0,0,'+(Math.random()*0.15).toFixed(2)+')';
          g.fillRect(bx+1+Math.random()*(bw-3), by+1+Math.random()*(bh-3), 2, 2);
        }
      }
    }
    // Mortar color
    g.strokeStyle = '#3a1510'; g.lineWidth = 1;
    for (var r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r*bh); g.lineTo(S, r*bh); g.stroke(); }
  });

  // 2: Mossy stone
  texCanvases[2] = makeTex(function(g, S) {
    g.fillStyle = '#2a4a2a'; g.fillRect(0,0,S,S);
    // Irregular stones
    var stones = [[0,0,30,20],[30,0,34,22],[0,20,18,24],[18,18,28,26],[46,0,18,18],[46,18,18,22],
      [0,44,24,20],[24,44,22,20],[46,40,18,24],[0,26,20,18],[20,26,26,18]];
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      var shade = 0.7 + Math.random() * 0.5;
      var rv = Math.floor(50*shade), gv = Math.floor(80*shade), bv = Math.floor(45*shade);
      g.fillStyle = 'rgb('+rv+','+gv+','+bv+')';
      g.fillRect(s[0]+1, s[1]+1, s[2]-2, s[3]-2);
    }
    // Moss spots
    for (var i = 0; i < 20; i++) {
      g.fillStyle = 'rgba(30,100,20,'+(0.2+Math.random()*0.3).toFixed(2)+')';
      g.fillRect(Math.random()*S, Math.random()*S, 3+Math.random()*5, 2+Math.random()*3);
    }
  });

  // 3: Blue tech panel
  texCanvases[3] = makeTex(function(g, S) {
    g.fillStyle = '#1a2244'; g.fillRect(0,0,S,S);
    // Panel inset
    g.fillStyle = '#223366'; g.fillRect(4,4,S-8,S-8);
    g.fillStyle = '#2a4488'; g.fillRect(8,8,S-16,S-16);
    // Horizontal lines
    g.strokeStyle = '#334499'; g.lineWidth = 1;
    for (var y = 12; y < S; y += 8) { g.beginPath(); g.moveTo(8,y); g.lineTo(S-8,y); g.stroke(); }
    // Rivets
    g.fillStyle = '#6688cc';
    var rv = [[6,6],[S-8,6],[6,S-8],[S-8,S-8],[S/2-1,S/2-1]];
    for (var i = 0; i < rv.length; i++) { g.beginPath(); g.arc(rv[i][0],rv[i][1],2,0,TWO_PI); g.fill(); }
    // Glow strip
    g.fillStyle = 'rgba(80,140,255,0.4)'; g.fillRect(12, S/2-2, S-24, 4);
  });

  // 4: Hazard stripes
  texCanvases[4] = makeTex(function(g, S) {
    g.fillStyle = '#8a8a00'; g.fillRect(0,0,S,S);
    g.strokeStyle = '#222200'; g.lineWidth = 6;
    for (var i = -S; i < S*2; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i+S, S); g.stroke();
    }
    // Border
    g.strokeStyle = '#444400'; g.lineWidth = 2;
    g.strokeRect(1,1,S-2,S-2);
    // Scuffs
    for (var i = 0; i < 8; i++) {
      g.fillStyle = 'rgba(0,0,0,'+(0.1+Math.random()*0.15).toFixed(2)+')';
      g.fillRect(Math.random()*S, Math.random()*S, 4+Math.random()*8, 2+Math.random()*4);
    }
  });

  // 5: Dark marble / flesh wall
  texCanvases[5] = makeTex(function(g, S) {
    g.fillStyle = '#3a1a2a'; g.fillRect(0,0,S,S);
    // Veins
    for (var i = 0; i < 12; i++) {
      g.strokeStyle = 'rgba(120,30,60,'+(0.2+Math.random()*0.4).toFixed(2)+')';
      g.lineWidth = 1+Math.random()*2;
      g.beginPath();
      var sx = Math.random()*S, sy = Math.random()*S;
      g.moveTo(sx, sy);
      for (var j = 0; j < 4; j++) {
        sx += (Math.random()-0.5)*20; sy += (Math.random()-0.5)*20;
        g.lineTo(sx, sy);
      }
      g.stroke();
    }
    // Pulsing spots
    for (var i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(180,40,60,'+(0.15+Math.random()*0.2).toFixed(2)+')';
      g.beginPath(); g.arc(Math.random()*S, Math.random()*S, 3+Math.random()*5, 0, TWO_PI); g.fill();
    }
  });

  // 6: Circuit/tech green
  texCanvases[6] = makeTex(function(g, S) {
    g.fillStyle = '#0a2a2a'; g.fillRect(0,0,S,S);
    g.strokeStyle = '#1a6a6a'; g.lineWidth = 1;
    // Circuit traces
    for (var i = 0; i < 8; i++) {
      g.beginPath();
      var cx = Math.floor(Math.random()*8)*8, cy = Math.floor(Math.random()*8)*8;
      g.moveTo(cx, cy);
      for (var j = 0; j < 3; j++) {
        if (Math.random() > 0.5) cx += (Math.random()>0.5?1:-1)*16;
        else cy += (Math.random()>0.5?1:-1)*16;
        cx = Math.max(0,Math.min(S,cx)); cy = Math.max(0,Math.min(S,cy));
        g.lineTo(cx, cy);
      }
      g.stroke();
      // Node
      g.fillStyle = '#2affaa'; g.beginPath(); g.arc(cx,cy,2,0,TWO_PI); g.fill();
    }
    // Grid dots
    g.fillStyle = '#0d4040';
    for (var x = 0; x < S; x+=8) for (var y = 0; y < S; y+=8) g.fillRect(x,y,1,1);
  });

  // ── Create dark (side=1) variants of each texture ──
  var texDark = [null];
  for (var t = 1; t <= 6; t++) {
    var dc = document.createElement('canvas');
    dc.width = TEX; dc.height = TEX;
    var dg = dc.getContext('2d');
    dg.drawImage(texCanvases[t], 0, 0);
    dg.fillStyle = 'rgba(0,0,0,0.35)';
    dg.fillRect(0, 0, TEX, TEX);
    texDark[t] = dc;
  }

  // ── Imp sprite (off-screen canvas, 32x48) ──
  var IMP_W = 32, IMP_H = 48;
  function makeImpFrame(anim) {
    var c = document.createElement('canvas');
    c.width = IMP_W; c.height = IMP_H;
    var g = c.getContext('2d');
    var legOff = anim ? 3 : -3;

    // Shadow on ground
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(16, 46, 10, 3, 0, 0, TWO_PI); g.fill();

    // Left leg
    g.fillStyle = '#6b2a1a';
    g.fillRect(8+legOff, 36, 5, 10);
    g.fillStyle = '#4a1a0a';
    g.fillRect(7+legOff, 44, 7, 3);

    // Right leg
    g.fillStyle = '#6b2a1a';
    g.fillRect(19-legOff, 36, 5, 10);
    g.fillStyle = '#4a1a0a';
    g.fillRect(18-legOff, 44, 7, 3);

    // Body / torso
    g.fillStyle = '#8b3a1a';
    g.beginPath();
    g.moveTo(10, 20); g.lineTo(22, 20);
    g.lineTo(24, 38); g.lineTo(8, 38);
    g.closePath(); g.fill();

    // Chest highlight
    g.fillStyle = '#aa5533';
    g.fillRect(12, 24, 8, 6);

    // Spine ridges
    g.fillStyle = '#5a2010';
    for (var i = 0; i < 3; i++) g.fillRect(15, 22+i*5, 2, 3);

    // Left arm + claw
    g.fillStyle = '#7b3020';
    g.save(); g.translate(8, 22);
    g.rotate(anim ? -0.4 : -0.15);
    g.fillRect(-8, 0, 6, 14);
    // Claws
    g.fillStyle = '#ccaa66';
    g.fillRect(-9, 13, 2, 4); g.fillRect(-7, 14, 2, 4); g.fillRect(-5, 13, 2, 4);
    g.restore();

    // Right arm + claw
    g.fillStyle = '#7b3020';
    g.save(); g.translate(24, 22);
    g.rotate(anim ? 0.4 : 0.15);
    g.fillRect(2, 0, 6, 14);
    g.fillStyle = '#ccaa66';
    g.fillRect(3, 13, 2, 4); g.fillRect(5, 14, 2, 4); g.fillRect(7, 13, 2, 4);
    g.restore();

    // Head
    g.fillStyle = '#8b3a1a';
    g.beginPath();
    g.moveTo(10, 8); g.lineTo(22, 8);
    g.lineTo(24, 20); g.lineTo(8, 20);
    g.closePath(); g.fill();

    // Horns
    g.fillStyle = '#aa6633';
    g.beginPath(); g.moveTo(10,10); g.lineTo(5,0); g.lineTo(12,8); g.fill();
    g.beginPath(); g.moveTo(22,10); g.lineTo(27,0); g.lineTo(20,8); g.fill();

    // Eyes (glowing)
    g.fillStyle = '#ff4400';
    g.fillRect(12, 12, 3, 3);
    g.fillRect(18, 12, 3, 3);
    // Pupils
    g.fillStyle = '#ffff00';
    g.fillRect(13, 13, 1, 1);
    g.fillRect(19, 13, 1, 1);

    // Mouth
    g.fillStyle = '#440000';
    g.fillRect(13, 17, 6, 2);
    // Teeth
    g.fillStyle = '#ccaa88';
    g.fillRect(14, 17, 1, 1); g.fillRect(16, 17, 1, 1); g.fillRect(18, 17, 1, 1);

    return c;
  }
  var impFrames = [makeImpFrame(false), makeImpFrame(true)];

  // Fireball sprite
  function makeFireball() {
    var c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    var g = c.getContext('2d');
    var gr = g.createRadialGradient(8,8,1,8,8,8);
    gr.addColorStop(0, '#ffff44');
    gr.addColorStop(0.3, '#ff6600');
    gr.addColorStop(0.7, '#cc2200');
    gr.addColorStop(1, 'rgba(100,0,0,0)');
    g.fillStyle = gr; g.fillRect(0,0,16,16);
    return c;
  }
  var fireballSprite = makeFireball();

  // ── Imp creatures ──
  var imps = [
    {x:6.5,  y:6.5,  angle:0, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:0, seenT:0},
    {x:12.5, y:3.5,  angle:PI, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:PI, seenT:0},
    {x:18.5, y:8.5,  angle:PI/2, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:PI/2, seenT:0},
    {x:10.5, y:14.5, angle:0, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:0, seenT:0},
    {x:5.5,  y:18.5, angle:PI, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:PI, seenT:0},
    {x:15.5, y:19.5, angle:0, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:0, seenT:0},
    {x:20.5, y:5.5,  angle:PI*1.5, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:PI*1.5, seenT:0},
    {x:8.5,  y:10.5, angle:PI/4, state:'patrol', hp:3, walkT:0, atkT:0, patrolAngle:PI/4, seenT:0}
  ];

  // Fireballs
  var fireballs = [];

  // ── Player state ──
  var px = 2.5, py = 2.5;
  var pAngle = 0;
  var FOV = PI / 3;
  var halfFov = FOV / 2;
  var moveSpeed = 0.03;
  var turnSpeed = 0.008;
  var aiTurnDir = 1, aiTurnTimer = 0;

  var MAX_DEPTH = 24;
  var lastTime = performance.now();
  var fps = 0;
  var frameCount = 0;
  var score = 0;
  var kills = 0;

  function isWall(x, y) {
    var mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return true;
    return MAP[my][mx] > 0;
  }

  function castRay(ox, oy, angle) {
    var dx = Math.cos(angle), dy = Math.sin(angle);
    var mapX = Math.floor(ox), mapY = Math.floor(oy);
    var ddx = Math.abs(1 / (dx || 1e-10)), ddy = Math.abs(1 / (dy || 1e-10));
    var stepX, stepY, sdx, sdy;
    if (dx < 0) { stepX = -1; sdx = (ox - mapX) * ddx; }
    else { stepX = 1; sdx = (mapX + 1 - ox) * ddx; }
    if (dy < 0) { stepY = -1; sdy = (oy - mapY) * ddy; }
    else { stepY = 1; sdy = (mapY + 1 - oy) * ddy; }
    var side = 0;
    for (var i = 0; i < 64; i++) {
      if (sdx < sdy) { sdx += ddx; mapX += stepX; side = 0; }
      else { sdy += ddy; mapY += stepY; side = 1; }
      if (mapX < 0 || mapX >= MAP_W || mapY < 0 || mapY >= MAP_H) break;
      if (MAP[mapY][mapX] > 0) {
        var dist = side === 0
          ? (mapX - ox + (1 - stepX) / 2) / (dx || 1e-10)
          : (mapY - oy + (1 - stepY) / 2) / (dy || 1e-10);
        // Texture coordinate (0..1 along wall face)
        var wallX = side === 0 ? (oy + dist * dy) : (ox + dist * dx);
        wallX = wallX - Math.floor(wallX);
        return { dist:dist, side:side, type:MAP[mapY][mapX], texX:wallX };
      }
    }
    return { dist:MAX_DEPTH, side:0, type:0, texX:0 };
  }

  function hasLineOfSight(x1,y1,x2,y2) {
    var dx=x2-x1, dy=y2-y1;
    var dist = Math.sqrt(dx*dx+dy*dy);
    var steps = Math.ceil(dist * 4);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (isWall(x1+dx*t, y1+dy*t)) return false;
    }
    return true;
  }

  // ── Imp AI ──
  function updateImps() {
    for (var i = 0; i < imps.length; i++) {
      var imp = imps[i];
      if (imp.hp <= 0) continue;
      imp.walkT++;

      var dx = px - imp.x, dy = py - imp.y;
      var dist = Math.sqrt(dx*dx+dy*dy);
      var angleToPlayer = Math.atan2(dy, dx);
      var canSee = dist < 12 && hasLineOfSight(imp.x, imp.y, px, py);

      if (canSee) {
        imp.state = 'chase';
        imp.seenT = frameCount;
        imp.angle = angleToPlayer;

        // Move toward player (stop at distance 2)
        if (dist > 2) {
          var spd = 0.015;
          var nx = imp.x + Math.cos(imp.angle) * spd;
          var ny = imp.y + Math.sin(imp.angle) * spd;
          if (!isWall(nx, imp.y)) imp.x = nx;
          if (!isWall(imp.x, ny)) imp.y = ny;
        }

        // Throw fireball
        if (imp.atkT <= 0 && dist < 10 && dist > 1.5) {
          fireballs.push({
            x: imp.x, y: imp.y,
            dx: Math.cos(angleToPlayer) * 0.08,
            dy: Math.sin(angleToPlayer) * 0.08,
            life: 120
          });
          imp.atkT = 90 + Math.floor(Math.random() * 60);
        }
      } else {
        // Return to patrol after losing sight
        if (imp.state === 'chase' && frameCount - imp.seenT > 120) {
          imp.state = 'patrol';
        }

        if (imp.state === 'patrol') {
          // Wander
          if (imp.walkT % 120 === 0) {
            imp.patrolAngle += (Math.random() - 0.5) * PI;
          }
          imp.angle += (imp.patrolAngle - imp.angle) * 0.02;
          var spd = 0.008;
          var nx = imp.x + Math.cos(imp.angle) * spd;
          var ny = imp.y + Math.sin(imp.angle) * spd;
          if (!isWall(nx, imp.y)) imp.x = nx;
          else imp.patrolAngle = imp.angle + PI * (Math.random() > 0.5 ? 1 : -1) * 0.5;
          if (!isWall(imp.x, ny)) imp.y = ny;
          else imp.patrolAngle = imp.angle + PI * (Math.random() > 0.5 ? 1 : -1) * 0.5;
        }
      }
      if (imp.atkT > 0) imp.atkT--;
    }

    // Update fireballs
    for (var i = fireballs.length - 1; i >= 0; i--) {
      var fb = fireballs[i];
      fb.x += fb.dx; fb.y += fb.dy;
      fb.life--;
      if (fb.life <= 0 || isWall(fb.x, fb.y)) {
        fireballs.splice(i, 1);
      }
    }
  }

  // ── Player AI ──
  function aiUpdate() {
    var lookDist = 1.5;
    var fx = px + Math.cos(pAngle) * lookDist;
    var fy = py + Math.sin(pAngle) * lookDist;
    var wallAhead = isWall(fx, fy);
    var closeFx = px + Math.cos(pAngle) * 0.6;
    var closeFy = py + Math.sin(pAngle) * 0.6;
    var wallClose = isWall(closeFx, closeFy);

    // Steer toward nearest visible imp for engagement
    var nearImp = null, nearDist = 999;
    for (var i = 0; i < imps.length; i++) {
      if (imps[i].hp <= 0) continue;
      var dx = imps[i].x - px, dy = imps[i].y - py;
      var d = Math.sqrt(dx*dx+dy*dy);
      if (d < nearDist && d < 10 && hasLineOfSight(px,py,imps[i].x,imps[i].y)) {
        nearDist = d; nearImp = imps[i];
      }
    }

    if (nearImp && !wallClose) {
      var targetAngle = Math.atan2(nearImp.y - py, nearImp.x - px);
      var diff = targetAngle - pAngle;
      while (diff > PI) diff -= TWO_PI;
      while (diff < -PI) diff += TWO_PI;
      pAngle += diff * 0.04;

      // Auto-fire: damage imp when aimed at it
      if (Math.abs(diff) < 0.15 && nearDist < 8 && frameCount % 15 === 0) {
        nearImp.hp--;
        if (nearImp.hp <= 0) { score += 500; kills++; }
      }
    }

    if (wallClose) {
      aiTurnTimer = 15 + Math.floor(Math.random() * 15);
      aiTurnDir = Math.random() < 0.5 ? 1 : -1;
    } else if (wallAhead && aiTurnTimer <= 0) {
      aiTurnTimer = 12 + Math.floor(Math.random() * 15);
      var lx = px + Math.cos(pAngle - PI/4) * lookDist;
      var ly = py + Math.sin(pAngle - PI/4) * lookDist;
      var rx = px + Math.cos(pAngle + PI/4) * lookDist;
      var ry = py + Math.sin(pAngle + PI/4) * lookDist;
      aiTurnDir = isWall(lx,ly) ? 1 : (isWall(rx,ry) ? -1 : (Math.random()<0.5?1:-1));
    }

    if (Math.random() < 0.001 && aiTurnTimer <= 0 && !nearImp) {
      aiTurnTimer = 8 + Math.floor(Math.random() * 12);
      aiTurnDir = Math.random() < 0.5 ? 1 : -1;
    }

    if (aiTurnTimer > 0) { pAngle += turnSpeed * aiTurnDir; aiTurnTimer--; }
    else if (!nearImp) pAngle += (Math.random() - 0.5) * 0.002;

    var speed = wallAhead ? moveSpeed * 0.3 : moveSpeed;
    var nx = px + Math.cos(pAngle) * speed;
    var ny = py + Math.sin(pAngle) * speed;
    if (!isWall(nx, py)) px = nx;
    if (!isWall(px, ny)) py = ny;
    pAngle = ((pAngle % TWO_PI) + TWO_PI) % TWO_PI;

    // Respawn dead imps after a while
    for (var i = 0; i < imps.length; i++) {
      if (imps[i].hp <= 0 && frameCount % 600 === 0) {
        imps[i].hp = 3;
        imps[i].state = 'patrol';
        imps[i].atkT = 120;
      }
    }
  }

  // ── Wall color lookup for minimap ──
  var WALL_MM = [null,'#cc3333','#33aa33','#3355cc','#cccc33','#aa33aa','#33aaaa'];

  function render() {
    // Sky
    var sky = ctx.createLinearGradient(0,0,0,H/2);
    sky.addColorStop(0,'#110022'); sky.addColorStop(1,'#332244');
    ctx.fillStyle = sky; ctx.fillRect(0,0,W,H/2);
    // Floor
    var flr = ctx.createLinearGradient(0,H/2,0,H);
    flr.addColorStop(0,'#222222'); flr.addColorStop(1,'#444444');
    ctx.fillStyle = flr; ctx.fillRect(0,H/2,W,H/2);

    // ── Textured raycasting ──
    var zbuffer = new Float32Array(W);
    for (var i = 0; i < W; i++) zbuffer[i] = MAX_DEPTH;

    for (var col = 0; col < NUM_RAYS; col++) {
      var rayAngle = pAngle - halfFov + (col / NUM_RAYS) * FOV;
      var hit = castRay(px, py, rayAngle);
      var corrDist = hit.dist * Math.cos(rayAngle - pAngle);
      var screenX = col * STRIP;

      for (var ss = 0; ss < STRIP; ss++) {
        if (screenX + ss < W) zbuffer[screenX + ss] = corrDist;
      }

      if (hit.type === 0) continue;
      var wallHeight = H / (corrDist || 0.01);
      var wallTop = (H - wallHeight) / 2;

      // Pick texture canvas
      var texSrc = hit.side === 1 ? texDark[hit.type] : texCanvases[hit.type];
      var texX = Math.floor(hit.texX * TEX);
      if (texX < 0) texX = 0; if (texX >= TEX) texX = TEX - 1;

      // Draw textured column via drawImage slicing
      ctx.drawImage(texSrc, texX, 0, 1, TEX, screenX, wallTop, STRIP, wallHeight);

      // Distance fog overlay
      var fogAlpha = Math.min(corrDist / MAX_DEPTH, 1) * 0.7;
      if (fogAlpha > 0.01) {
        ctx.fillStyle = 'rgba(0,0,0,' + fogAlpha.toFixed(2) + ')';
        ctx.fillRect(screenX, wallTop, STRIP, wallHeight);
      }
    }

    // ── Collect all sprites to render (imps + fireballs) ──
    var allSprites = [];
    for (var i = 0; i < imps.length; i++) {
      if (imps[i].hp <= 0) continue;
      var dx = imps[i].x - px, dy = imps[i].y - py;
      allSprites.push({type:'imp', idx:i, dist:dx*dx+dy*dy, x:imps[i].x, y:imps[i].y});
    }
    for (var i = 0; i < fireballs.length; i++) {
      var dx = fireballs[i].x - px, dy = fireballs[i].y - py;
      allSprites.push({type:'fb', idx:i, dist:dx*dx+dy*dy, x:fireballs[i].x, y:fireballs[i].y});
    }
    allSprites.sort(function(a,b){ return b.dist - a.dist; });

    for (var si = 0; si < allSprites.length; si++) {
      var sp = allSprites[si];
      var sdx = sp.x - px, sdy = sp.y - py;
      var sDist = Math.sqrt(sp.dist);
      var sAngle = Math.atan2(sdy, sdx) - pAngle;
      while (sAngle > PI) sAngle -= TWO_PI;
      while (sAngle < -PI) sAngle += TWO_PI;
      if (Math.abs(sAngle) > halfFov + 0.3) continue;

      var screenX = (0.5 + sAngle / FOV) * W;
      var fogAlpha = Math.min(sDist / MAX_DEPTH, 1) * 0.7;

      if (sp.type === 'imp') {
        var imp = imps[sp.idx];
        var spriteH = Math.min(H / (sDist || 0.01) * 0.85, H * 1.5);
        var spriteW = spriteH * (IMP_W / IMP_H);
        var spriteTop = (H - spriteH) / 2 + spriteH * 0.08;
        var spriteLeft = screenX - spriteW / 2;
        var frame = Math.floor(imp.walkT / 15) % 2;

        // Column-by-column depth test
        var drawLeft = Math.max(0, Math.floor(spriteLeft));
        var drawRight = Math.min(W, Math.ceil(spriteLeft + spriteW));

        // Find contiguous visible spans for efficiency
        var spanStart = -1;
        for (var sc = drawLeft; sc <= drawRight; sc++) {
          var visible = sc < drawRight && sc < W && sDist < zbuffer[sc];
          if (visible && spanStart < 0) spanStart = sc;
          if (!visible && spanStart >= 0) {
            // Draw this visible span
            var srcLeft = ((spanStart - spriteLeft) / spriteW) * IMP_W;
            var srcRight = ((sc - spriteLeft) / spriteW) * IMP_W;
            ctx.globalAlpha = 1.0 - fogAlpha;
            ctx.drawImage(impFrames[frame],
              srcLeft, 0, srcRight - srcLeft, IMP_H,
              spanStart, spriteTop, sc - spanStart, spriteH);
            ctx.globalAlpha = 1.0;
            spanStart = -1;
          }
        }

        // Health bar above imp
        if (sDist < 10) {
          var barW = spriteW * 0.6;
          var barX = screenX - barW/2;
          var barY = spriteTop - 8;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(barX-1, barY-1, barW+2, 6);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(barX, barY, barW, 4);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(barX, barY, barW * (imp.hp / 3), 4);
        }
      } else {
        // Fireball
        var fbSize = Math.min(H / (sDist || 0.01) * 0.2, 80);
        var fbLeft = Math.floor(screenX - fbSize/2);
        if (fbLeft >= 0 && fbLeft < W && sDist < zbuffer[Math.min(Math.floor(screenX), W-1)]) {
          ctx.globalAlpha = 1.0 - fogAlpha;
          ctx.drawImage(fireballSprite, fbLeft, H/2 - fbSize/2, fbSize, fbSize);
          ctx.globalAlpha = 1.0;
        }
      }
    }

    // ── Weapon ──
    ctx.save();
    var bobX = Math.sin(frameCount * 0.08) * 8;
    var bobY = Math.abs(Math.cos(frameCount * 0.08)) * 6;
    ctx.translate(W/2 + 120 + bobX, H - 180 + bobY);
    ctx.fillStyle = '#cc9966';
    ctx.beginPath();
    ctx.moveTo(0,180); ctx.lineTo(-30,80); ctx.lineTo(-15,40);
    ctx.lineTo(15,40); ctx.lineTo(30,80); ctx.lineTo(20,180);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#555555'; ctx.fillRect(-12,0,24,50);
    ctx.fillStyle = '#777777'; ctx.fillRect(-8,-10,16,15);
    // Muzzle flash when firing
    if (frameCount % 15 < 3) {
      var hasTarget = false;
      for (var i = 0; i < imps.length; i++) {
        if (imps[i].hp > 0) {
          var dx = imps[i].x-px, dy = imps[i].y-py;
          var d = Math.sqrt(dx*dx+dy*dy);
          if (d < 8 && hasLineOfSight(px,py,imps[i].x,imps[i].y)) {
            var ta = Math.atan2(dy,dx), diff = ta - pAngle;
            while(diff>PI)diff-=TWO_PI; while(diff<-PI)diff+=TWO_PI;
            if (Math.abs(diff)<0.15) { hasTarget=true; break; }
          }
        }
      }
      if (hasTarget) {
        ctx.fillStyle = '#ffaa00'; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(0,-18,12,0,TWO_PI); ctx.fill();
        ctx.fillStyle = '#ffff88'; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(0,-18,5,0,TWO_PI); ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
    ctx.fillStyle = '#333333';
    ctx.beginPath(); ctx.arc(0,-10,8,0,TWO_PI); ctx.fill();
    ctx.restore();

    // ── Crosshair ──
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(W/2-12,H/2); ctx.lineTo(W/2-4,H/2);
    ctx.moveTo(W/2+4,H/2); ctx.lineTo(W/2+12,H/2);
    ctx.moveTo(W/2,H/2-12); ctx.lineTo(W/2,H/2-4);
    ctx.moveTo(W/2,H/2+4); ctx.lineTo(W/2,H/2+12);
    ctx.stroke(); ctx.globalAlpha = 1.0;

    // ── Minimap ──
    var mmS = 5, mmX = 12, mmY = H - MAP_H * mmS - 12;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mmX-2, mmY-2, MAP_W*mmS+4, MAP_H*mmS+4);
    for (var r = 0; r < MAP_H; r++) {
      for (var c = 0; c < MAP_W; c++) {
        if (MAP[r][c] > 0) {
          ctx.fillStyle = WALL_MM[MAP[r][c]] || '#888';
          ctx.fillRect(mmX+c*mmS, mmY+r*mmS, mmS, mmS);
        }
      }
    }
    // Imps on minimap
    for (var i = 0; i < imps.length; i++) {
      if (imps[i].hp <= 0) continue;
      ctx.fillStyle = imps[i].state === 'chase' ? '#ff4444' : '#ff8844';
      ctx.fillRect(mmX+imps[i].x*mmS-1.5, mmY+imps[i].y*mmS-1.5, 3, 3);
    }
    // Fireballs on minimap
    ctx.fillStyle = '#ffaa00';
    for (var i = 0; i < fireballs.length; i++) {
      ctx.fillRect(mmX+fireballs[i].x*mmS-1, mmY+fireballs[i].y*mmS-1, 2, 2);
    }
    // Player
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mmX+px*mmS-2, mmY+py*mmS-2, 4, 4);
    ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mmX+px*mmS, mmY+py*mmS);
    ctx.lineTo(mmX+(px+Math.cos(pAngle)*2)*mmS, mmY+(py+Math.sin(pAngle)*2)*mmS);
    ctx.stroke();

    // ── HUD ──
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0,0,W,36);
    ctx.font = 'bold 22px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ff4444'; ctx.fillText('NotDoom', 12, 7);
    ctx.font = '12px monospace'; ctx.fillStyle = '#aa4444';
    ctx.fillText('SpaceCanvas Edition', 108, 11);
    ctx.font = '14px monospace'; ctx.fillStyle = '#ffaa00'; ctx.textAlign = 'center';
    ctx.fillText('SCORE: ' + score + '  KILLS: ' + kills, W/2, 10);
    ctx.fillStyle = '#66aa88'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(fps) + ' fps', W-12, 10);

    // Status bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,H-28,W,28);
    ctx.font = '12px monospace'; ctx.fillStyle = '#888888'; ctx.textAlign = 'center';
    var aliveImps = 0;
    for (var i=0;i<imps.length;i++) if(imps[i].hp>0) aliveImps++;
    ctx.fillText('AUTO-PILOT  |  IMPS: ' + aliveImps + '/' + imps.length + '  |  pos: (' + px.toFixed(1) + ',' + py.toFixed(1) + ')  |  ' + (pAngle*180/PI).toFixed(0) + ' deg', W/2, H-16);
  }

  function drawFrame() {
    var now = performance.now();
    var delta = now - lastTime;
    lastTime = now;
    if (delta > 0) fps = fps * 0.9 + (1000 / delta) * 0.1;
    frameCount++;
    aiUpdate();
    updateImps();
    render();
    requestAnimationFrame(drawFrame);
  }

  setTimeout(function() { requestAnimationFrame(drawFrame); }, 200);
})();
`);

    print('[NotDoom] Flushing...');
    ctx.flush();
    print('[NotDoom] Done — raycasting engine running in WebView.');
  }
}

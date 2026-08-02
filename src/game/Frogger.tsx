import { useEffect, useRef, useCallback, useState } from 'react';
import {
  ROWS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HOME_ROW,
  RIVER_START,
  RIVER_END,
  GRASS_MID,
  ROAD_START,
  ROAD_END,
  START_ROW,
  THEMES,
} from './constants';
import { useGameLoop } from './useGameLoop';
import {
  resumeAudio, startMusic, stopMusic,
  playHop, playSplash, playCrash, playScore,
  playLevelComplete, playGameOver, playTimeWarning,
  playTongue, playEatFly, playGatorSnap, playExtraLife,
} from './audio';
import type { Log, Vehicle, LilyPad, Frog, Particle, CollectibleFly, FloatingText, GameState } from './types';

// ==================== DRAWING HELPERS ====================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w <= 0 || h <= 0) return;
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function darken(hex: string, amt: number): string {
  if (!hex || !hex.startsWith('#')) return '#000000';
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) * (1 - amt));
  const g = Math.max(0, ((n >> 8) & 0xff) * (1 - amt));
  const b = Math.max(0, (n & 0xff) * (1 - amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function lighten(hex: string, amt: number): string {
  if (!hex || !hex.startsWith('#')) return '#ffffff';
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * amt);
  const b = Math.min(255, (n & 0xff) + (255 - (n & 0xff)) * amt);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const cr = i % 2 === 0 ? r : r * 0.4;
    const px = x + Math.cos(a) * cr;
    const py = y + Math.sin(a) * cr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ==================== BACKGROUND ====================

function drawWater(ctx: CanvasRenderingContext2D, row: number, y: number, t: number, state: GameState) {
  const theme = THEMES[state.theme];
  const isDark = row % 2 === 1;
  const wColor = isDark ? theme.water[1] : theme.water[0];
  const wOpp   = isDark ? theme.water[0] : theme.water[1];

  const grd = ctx.createLinearGradient(0, y, 0, y + CELL_SIZE);
  grd.addColorStop(0, wColor);
  grd.addColorStop(1, wOpp);
  ctx.fillStyle = grd;
  ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);

  // Animated sine ripples
  ctx.strokeStyle = theme.sky;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 3; i++) {
    const ry = y + CELL_SIZE * (0.25 + i * 0.25);
    ctx.beginPath();
    ctx.moveTo(0, ry);
    for (let x = 0; x < CANVAS_WIDTH; x += 4) {
      const wave = Math.sin((x + row * 80 + t * 90) * 0.03) * 3 + Math.cos((x + t * 40) * 0.05) * 1;
      ctx.lineTo(x, ry + wave);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Bioluminescent / Shimmer sparkles
  ctx.fillStyle = theme.waterShimmer;
  for (let i = 0; i < 6; i++) {
    const sx = ((i * 181 + row * 73 + t * 35) % CANVAS_WIDTH);
    const sy = y + 8 + ((i * 67 + row * 41) % (CELL_SIZE - 16));
    const sz = 1.5 + Math.sin(t * 4 + i * 3) * 1.2;
    if (sz > 0.6) {
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRoad(ctx: CanvasRenderingContext2D, _row: number, y: number, state: GameState) {
  const theme = THEMES[state.theme];
  const grd = ctx.createLinearGradient(0, y, 0, y + CELL_SIZE);
  grd.addColorStop(0, theme.road[0]);
  grd.addColorStop(0.5, theme.road[1]);
  grd.addColorStop(1, theme.road[0]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);

  // Center dashed line
  ctx.strokeStyle = theme.road[2];
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 16]);
  ctx.beginPath();
  ctx.moveTo(0, y + CELL_SIZE / 2);
  ctx.lineTo(CANVAS_WIDTH, y + CELL_SIZE / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Edge white reflection lines
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  ctx.fillRect(0, y + CELL_SIZE - 1, CANVAS_WIDTH, 1);
}

function drawGrass(ctx: CanvasRenderingContext2D, y: number, state: GameState) {
  const theme = THEMES[state.theme];
  const grd = ctx.createLinearGradient(0, y, 0, y + CELL_SIZE);
  grd.addColorStop(0, theme.grass[0]);
  grd.addColorStop(0.5, theme.grass[1]);
  grd.addColorStop(1, theme.grass[0]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);

  // Premium grass texture blades
  for (let i = 0; i < CANVAS_WIDTH; i += 7) {
    const h = 5 + Math.sin(i * 0.8) * 4;
    ctx.strokeStyle = i % 14 === 0 ? theme.grass[2] : theme.grass[0];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(i, y + CELL_SIZE);
    ctx.lineTo(i + Math.sin(i * 0.3) * 2, y + CELL_SIZE - h);
    ctx.stroke();
  }

  // Neon or tropical flowers
  for (let i = 0; i < CANVAS_WIDTH; i += 35) {
    const fx = i + 18 + Math.sin(i) * 12;
    const fy = y + 15 + Math.cos(i * 0.6) * 10;
    ctx.fillStyle = theme.cyberNeon ? '#ff007f' : i % 70 === 0 ? '#fff176' : '#f48fb1';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (theme.cyberNeon) {
      // Glow
      ctx.fillStyle = 'rgba(255,0,127,0.4)';
      ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ==================== OBJECTS ====================

function drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, state: GameState) {
  const theme = THEMES[state.theme];
  const w = v.width * CELL_SIZE;
  const h = CELL_SIZE - 8;
  const x = v.x;
  const y = v.y - h / 2;

  ctx.save();

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x + 4, y + 6, w - 2, h - 4, 6);
  ctx.fill();

  // Cyberpunk neon underglow
  if (theme.cyberNeon) {
    ctx.shadowColor = v.color;
    ctx.shadowBlur = 15;
  }

  if (v.type === 'car' || v.type === 'sport') {
    const isSport = v.type === 'sport';
    // Body
    ctx.fillStyle = v.color;
    roundRect(ctx, x + 2, y + 6, w - 4, h - 12, isSport ? 12 : 8);
    ctx.fill();
    // Highlight
    ctx.fillStyle = lighten(v.color, 0.3);
    roundRect(ctx, x + 6, y + 7, w - 12, 3, 2);
    ctx.fill();
    // Roof
    ctx.fillStyle = darken(v.color, 0.25);
    roundRect(ctx, x + 8, y + 3, w - 16, h - 14, isSport ? 8 : 5);
    ctx.fill();
    // Windshield
    ctx.fillStyle = isSport ? '#ffffff' : '#87ceeb';
    roundRect(ctx, x + 11, y + 4, Math.max(w - 22, 8), 6, 2);
    ctx.fill();
    // Headlights
    ctx.fillStyle = v.direction === 1 ? '#fff176' : '#ff5252';
    const hlx = v.direction === 1 ? x + w - 5 : x + 3;
    ctx.beginPath(); ctx.arc(hlx, y + h / 2 - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hlx, y + h / 2 + 5, 2.5, 0, Math.PI * 2); ctx.fill();

    // Headlight beams at night
    if (state.theme === 'cyberpunk' || state.theme === 'twilight') {
      ctx.save();
      const beamGrd = ctx.createLinearGradient(hlx, 0, hlx + v.direction * 70, 0);
      beamGrd.addColorStop(0, v.direction === 1 ? 'rgba(255,241,118,0.5)' : 'rgba(255,82,82,0.5)');
      beamGrd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = beamGrd;
      ctx.beginPath();
      ctx.moveTo(hlx, y + h / 2 - 7);
      ctx.lineTo(hlx + v.direction * 70, y + h / 2 - 14);
      ctx.lineTo(hlx + v.direction * 70, y + h / 2 + 14);
      ctx.lineTo(hlx, y + h / 2 + 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Wheels
    ctx.fillStyle = '#111111';
    roundRect(ctx, x + 6, y, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 16, y, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + 6, y + h - 6, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 16, y + h - 6, 10, 6, 2); ctx.fill();
    // Rims
    ctx.fillStyle = isSport ? '#fdd835' : '#777777';
    [x + 11, x + w - 11].forEach((wx) => {
      ctx.beginPath(); ctx.arc(wx, y + 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(wx, y + h - 3, 2, 0, Math.PI * 2); ctx.fill();
    });
  } else if (v.type === 'police') {
    // Police Interceptor
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + 2, y + 5, w - 4, h - 10, 6); ctx.fill();
    ctx.fillStyle = '#111111';
    roundRect(ctx, x + 8, y + 2, w - 16, h - 12, 5); ctx.fill();

    // Emergency Flashing Lights
    const phase = (v.lightPhase || 0) % 20;
    const isRed = phase < 10;
    ctx.fillStyle = isRed ? '#ff5252' : '#00e5ff';
    ctx.shadowColor = isRed ? '#ff5252' : '#00e5ff';
    ctx.shadowBlur = 20;
    roundRect(ctx, x + w / 2 - 6, y + 6, 12, h - 20, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Windshield
    ctx.fillStyle = '#333333';
    roundRect(ctx, x + 12, y + 5, w - 24, 5, 2); ctx.fill();

    // Wheels
    ctx.fillStyle = '#111111';
    roundRect(ctx, x + 6, y, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 16, y, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + 6, y + h - 6, 10, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 16, y + h - 6, 10, 6, 2); ctx.fill();
  } else if (v.type === 'truck') {
    // Cargo Box
    ctx.fillStyle = darken(v.color, 0.15);
    roundRect(ctx, x + 3, y + 2, w - 26, h - 4, 4); ctx.fill();
    ctx.strokeStyle = darken(v.color, 0.35);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const lx = x + 10 + i * ((w - 36) / 4);
      ctx.beginPath(); ctx.moveTo(lx, y + 4); ctx.lineTo(lx, y + h - 4); ctx.stroke();
    }
    // Cab
    ctx.fillStyle = v.color;
    roundRect(ctx, x + w - 25, y + 2, 22, h - 4, 6); ctx.fill();
    ctx.fillStyle = lighten(v.color, 0.25);
    roundRect(ctx, x + w - 23, y + 3, 18, 4, 2); ctx.fill();
    // Windshield
    ctx.fillStyle = '#80cbc4';
    roundRect(ctx, x + w - 20, y + 7, 15, h - 20, 2); ctx.fill();
    // Wheels
    ctx.fillStyle = '#111111';
    roundRect(ctx, x + 8, y, 12, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 18, y, 12, 6, 2); ctx.fill();
    roundRect(ctx, x + 8, y + h - 6, 12, 6, 2); ctx.fill();
    roundRect(ctx, x + w - 18, y + h - 6, 12, 6, 2); ctx.fill();
  } else if (v.type === 'bulldozer') {
    // Heavy Tracks
    ctx.fillStyle = '#333333';
    roundRect(ctx, x + 2, y + 1, w - 4, 9, 3); ctx.fill();
    roundRect(ctx, x + 2, y + h - 10, w - 4, 9, 3); ctx.fill();
    // Engine Body
    ctx.fillStyle = v.color;
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 4); ctx.fill();
    ctx.fillStyle = lighten(v.color, 0.3);
    roundRect(ctx, x + 10, y + 9, w - 20, 4, 2); ctx.fill();
    // Giant Blade
    ctx.fillStyle = '#9e9e9e';
    const bx = v.direction === 1 ? x + w - 6 : x;
    roundRect(ctx, bx, y + 3, 6, h - 6, 2); ctx.fill();
  }

  ctx.restore();
}

function drawLog(ctx: CanvasRenderingContext2D, l: Log, t: number, state: GameState) {
  const theme = THEMES[state.theme];
  const w = l.width * CELL_SIZE;
  const h = CELL_SIZE - 10;
  const x = l.x;
  const y = l.y - h / 2;

  ctx.save();

  if (l.type === 'log') {
    // Water shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundRect(ctx, x + 3, y + 4, w - 2, h - 2, 12); ctx.fill();
    // Wood Main body
    const grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#8d6e63');
    grd.addColorStop(0.5, '#6d4c41');
    grd.addColorStop(1, '#3e2723');
    ctx.fillStyle = grd;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12); ctx.fill();
    // Tree rings
    ctx.strokeStyle = '#271814';
    ctx.lineWidth = 1.5;
    [x + 12, x + w - 12].forEach((cx) => {
      ctx.beginPath(); ctx.ellipse(cx, y + h / 2, 6, h / 3.5, 0, 0, Math.PI * 2); ctx.stroke();
    });
    // Highlights
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRect(ctx, x + 8, y + 4, w - 16, 4, 2); ctx.fill();
    // Border
    ctx.strokeStyle = '#271814';
    ctx.lineWidth = 1.8;
    roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12); ctx.stroke();
  } else if (l.type === 'turtle' || l.type === 'turtle_dive') {
    const isSubmerging = l.type === 'turtle_dive' && (l.diveTimer || 0) < 1.0 && !l.isDiving;
    const isFullyDiving = l.isDiving;

    if (!isFullyDiving) {
      // If about to submerge, flash red and become semi-transparent
      if (isSubmerging) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 15) * 0.4;
      }
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + w / 2 + 2, y + h / 2 + 3, w / 2 - 2, h / 2 - 1, 0, 0, Math.PI * 2); ctx.fill();
      
      // Gorgeous Hex Shell
      const grd = ctx.createRadialGradient(x + w / 2, y + h / 2 - 4, 2, x + w / 2, y + h / 2, w / 2);
      grd.addColorStop(0, isSubmerging ? '#ff5252' : theme.cyberNeon ? '#00e5ff' : '#26a69a');
      grd.addColorStop(1, '#004d40');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 3, h / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
      
      // Pattern
      ctx.strokeStyle = '#002620';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + t * 0.2;
        const pr = w / 4.5;
        ctx.beginPath(); ctx.arc(x + w / 2 + Math.cos(angle) * pr, y + h / 2 + Math.sin(angle) * pr * 0.6, 6, 0, Math.PI * 2); ctx.stroke();
      }

      // Head & Flippers
      ctx.fillStyle = isSubmerging ? '#ff8a80' : '#66bb6a';
      const hd = l.direction;
      const hx = hd === 1 ? x + w - 4 : x + 4;
      ctx.beginPath(); ctx.ellipse(hx, y + h / 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(hx + hd * 3, y + h / 2 - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(hx + hd * 4, y + h / 2 - 2, 1, 0, Math.PI * 2); ctx.fill();

      // Animated flipper paddles
      const fOff = Math.sin(t * 6) * 3;
      [
        { fx: x + w * 0.25, fy: y + 2 + fOff },
        { fx: x + w * 0.75, fy: y + 2 - fOff },
        { fx: x + w * 0.25, fy: y + h - 2 - fOff },
        { fx: x + w * 0.75, fy: y + h - 2 + fOff },
      ].forEach((p) => {
        ctx.beginPath(); ctx.ellipse(p.fx, p.fy, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;
    } else {
      // Submerged dark shadow in water
      ctx.fillStyle = 'rgba(0,30,50,0.2)';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 3, h / 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (l.type === 'gator') {
    // Wild River Alligator
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, x + 3, y + 4, w - 2, h - 2, 10); ctx.fill();
    
    // Textured scaled body
    const grd = ctx.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, '#43a047');
    grd.addColorStop(0.5, '#1b5e20');
    grd.addColorStop(1, '#052309');
    ctx.fillStyle = grd;
    roundRect(ctx, x + 2, y + 4, w - 4, h - 8, 8); ctx.fill();

    // Ridges / scutes along back
    ctx.fillStyle = '#fbc02d';
    for (let i = 0; i < 7; i++) {
      const rx = x + 12 + i * ((w - 30) / 7);
      ctx.beginPath(); ctx.moveTo(rx, y + Math.sin(i) * 2 + 4); ctx.lineTo(rx + 4, y); ctx.lineTo(rx + 8, y + Math.sin(i) * 2 + 4); ctx.fill();
    }

    // Snapping Snout Mouth
    const isRight = l.direction === 1;
    const mouthW = CELL_SIZE * 0.8;
    const snoutX = isRight ? x + w - mouthW : x;
    
    if (l.gatorMouthOpen) {
      // Play violent snap sound when first opening
      if ((l.gatorMouthTimer || 0) > 1.7 && (l.gatorMouthTimer || 0) < 1.75) playGatorSnap();

      // Open scary jaws with sharp teeth
      ctx.fillStyle = '#b71c1c'; // pink/red interior
      roundRect(ctx, snoutX, y + 2, mouthW, h - 4, 4); ctx.fill();

      // Razor white teeth
      ctx.fillStyle = '#ffffff';
      for (let tIdx = 0; tIdx < 5; tIdx++) {
        const tx = snoutX + 4 + tIdx * 7;
        // Top teeth
        ctx.beginPath(); ctx.moveTo(tx, y + 4); ctx.lineTo(tx + 3, y + 10); ctx.lineTo(tx + 6, y + 4); ctx.fill();
        // Bot teeth
        ctx.beginPath(); ctx.moveTo(tx, y + h - 4); ctx.lineTo(tx + 3, y + h - 10); ctx.lineTo(tx + 6, y + h - 4); ctx.fill();
      }
    } else {
      // Closed dark green snout
      ctx.fillStyle = '#1b5e20';
      roundRect(ctx, snoutX, y + 6, mouthW, h - 12, 4); ctx.fill();
    }

    // Glowing menacing Alligator Eyes
    ctx.fillStyle = '#ffca28';
    ctx.shadowColor = '#ffca28';
    ctx.shadowBlur = 10;
    const eyeX = isRight ? x + w - mouthW - 6 : x + mouthW + 6;
    ctx.beginPath(); ctx.arc(eyeX, y + h / 2 - 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX, y + h / 2 + 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ==================== COLLECTIBLE FLIES ====================

function drawFly(ctx: CanvasRenderingContext2D, fly: CollectibleFly, t: number) {
  if (!fly.alive) return;
  const x = fly.x;
  const y = fly.y;

  ctx.save();
  ctx.translate(x, y);

  // Golden Glow
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  glow.addColorStop(0, 'rgba(255,235,59,0.9)');
  glow.addColorStop(1, 'rgba(255,235,59,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();

  // Fat little body
  ctx.fillStyle = '#fbc02d';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e2723';
  ctx.beginPath(); ctx.arc(4, 0, 2, 0, Math.PI * 2); ctx.fill();

  // Flapping buzzing translucent wings
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const wingAngle = Math.sin(t * 50) * 0.6;
  ctx.save();
  ctx.rotate(wingAngle);
  ctx.beginPath(); ctx.ellipse(-2, -5, 3, 6, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.rotate(-wingAngle);
  ctx.beginPath(); ctx.ellipse(-2, 5, 3, 6, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}

// ==================== FROG / TONGUE / DEATH ====================

function drawFrog(ctx: CanvasRenderingContext2D, frog: Frog, t: number, state: GameState) {
  const theme = THEMES[state.theme];
  const x = frog.pixelX;
  const y = frog.pixelY;
  const r = CELL_SIZE * 0.38;

  ctx.save();
  ctx.translate(x, y);

  const rot: Record<string, number> = { up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };
  ctx.rotate(rot[frog.direction]);

  // Hop physics: squash & stretch + jump arc
  let scaleX = 1, scaleY = 1, jumpY = 0;
  if (frog.hopping) {
    const p = frog.hopProgress;
    if (p < 0.3) { scaleX = 1 - p * 0.4; scaleY = 1 + p * 0.6; }
    else if (p < 0.7) { const m = (p - 0.3) / 0.4; scaleX = 0.88 + m * 0.14; scaleY = 1.18 - m * 0.18; }
    else { const end = (p - 0.7) / 0.3; scaleX = 1 + end * 0.14; scaleY = 1 - end * 0.18; }
    jumpY = -Math.sin(p * Math.PI) * 14;
  } else {
    // Juicy idle breathing
    const breath = Math.sin(t * 4) * 0.025;
    scaleX = 1 + breath;
    scaleY = 1 - breath;
  }

  ctx.scale(scaleX, scaleY);
  ctx.translate(0, jumpY);

  // Dynamic jumping Ground Shadow
  ctx.save();
  ctx.translate(0, -jumpY);
  ctx.scale(1 / scaleX, 1 / scaleY);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  const shScale = frog.hopping ? 0.65 + 0.35 * (1 - Math.sin(frog.hopProgress * Math.PI)) : 1;
  ctx.beginPath(); ctx.ellipse(2, 4, r * 0.75 * shScale, r * 0.35 * shScale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Premium Cyberpunk Frog Glow
  if (theme.frogGlow) {
    ctx.shadowColor = theme.frogBody;
    ctx.shadowBlur = 18;
  }

  // Back legs
  ctx.fillStyle = '#1b5e20';
  const lSpread = frog.hopping ? 0.45 + frog.hopProgress * 0.35 : 0.32 + Math.sin(t * 3) * 0.03;
  ctx.beginPath(); ctx.ellipse(-r * 0.75, r * lSpread, r * 0.22, r * 0.45, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.75, r * lSpread, r * 0.22, r * 0.45, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = theme.frogBody;
  ctx.beginPath(); ctx.ellipse(-r * 0.85, r * (lSpread + 0.35), r * 0.16, r * 0.09, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.85, r * (lSpread + 0.35), r * 0.16, r * 0.09, 0.3, 0, Math.PI * 2); ctx.fill();

  // Main Body
  const bGrd = ctx.createRadialGradient(0, 0, r * 0.1, 0, 2, r);
  bGrd.addColorStop(0, '#a5d6a7');
  bGrd.addColorStop(0.4, theme.frogBody);
  bGrd.addColorStop(1, '#2e7d32');
  ctx.fillStyle = bGrd;
  ctx.beginPath(); ctx.ellipse(0, 2, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();

  // Soft light belly
  ctx.fillStyle = '#c8e6c9';
  ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.ellipse(0, 4, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1.0;

  // Cool back spots
  ctx.fillStyle = '#1b5e20';
  for (let i = 0; i < 5; i++) {
    const sx = Math.cos(i * 1.4) * r * 0.45;
    const sy = Math.sin(i * 1.4) * r * 0.32 + 2;
    ctx.beginPath(); ctx.arc(sx, sy, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  // Front legs
  ctx.fillStyle = theme.frogBody;
  ctx.beginPath(); ctx.ellipse(-r * 0.55, -r * 0.3, r * 0.14, r * 0.34, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.3, r * 0.14, r * 0.34, 0.5, 0, Math.PI * 2); ctx.fill();

  // Head
  const hGrd = ctx.createRadialGradient(0, -r * 0.6, r * 0.1, 0, -r * 0.6, r * 0.65);
  hGrd.addColorStop(0, theme.frogBody);
  hGrd.addColorStop(1, '#2e7d32');
  ctx.fillStyle = hGrd;
  ctx.beginPath(); ctx.ellipse(0, -r * 0.65, r * 0.65, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();

  // Eye sockets
  ctx.fillStyle = '#1b5e20';
  ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 1.05, r * 0.28, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 1.05, r * 0.28, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();

  // Animated Blink logic!
  const isBlinking = Math.sin(t * 12) > 0.95;
  if (!isBlinking) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 1.05, r * 0.22, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 1.05, r * 0.22, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(-r * 0.35, -r * 1.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 1.05, r * 0.12, 0, Math.PI * 2); ctx.fill();
    // Glint
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 1.1, r * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.4, -r * 1.1, r * 0.05, 0, Math.PI * 2); ctx.fill();
  } else {
    // Closed green lids
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 1.05, r * 0.22, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.35, -r * 1.05, r * 0.22, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Cute Smile
  ctx.strokeStyle = '#001100';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.26, 0.2, Math.PI - 0.2); ctx.stroke();

  ctx.restore();

  // ==================== TONGUE ANIMATION ====================
  if (frog.tongueFlicking && frog.tongueTarget) {
    if (frog.tongueProgress === 0) playTongue();

    ctx.save();
    // Draw long stretchy pink tongue from frog head to target
    const startX = frog.pixelX;
    const startY = frog.pixelY;
    const endX = frog.tongueTarget.x;
    const endY = frog.tongueTarget.y;

    const tProg = frog.tongueProgress; // 0 to 2.0
    const ext = tProg <= 1.0 ? easeInOutQuad(tProg) : easeInOutQuad(2.0 - tProg);

    const currX = lerp(startX, endX, ext);
    const currY = lerp(startY, endY, ext);

    ctx.strokeStyle = '#ff4081'; // vibrant pink
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(currX, currY);
    ctx.stroke();

    // Sticky wet tongue tip
    ctx.fillStyle = '#f50057';
    ctx.beginPath(); ctx.arc(currX, currY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(currX - 2, currY - 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function drawDeathAnimation(ctx: CanvasRenderingContext2D, frog: Frog, t: number, state: GameState) {
  const x = frog.pixelX;
  const y = frog.pixelY;
  const p = 1 - frog.deathTimer / 1200;

  ctx.save();
  ctx.translate(x, y);

  if (frog.deathType === 'water') {
    ctx.globalAlpha = Math.max(0, 1 - p * 1.2);
    ctx.scale(1 + p * 0.4, 1 - p * 0.9);
    drawFrog(ctx, { ...frog, pixelX: 0, pixelY: 0, hopping: false } as Frog, t, state);
    ctx.globalAlpha = 1.0;
  } else if (frog.deathType === 'car' || frog.deathType === 'time') {
    ctx.globalAlpha = Math.max(0, 1 - p * 0.8);
    ctx.scale(1 + p * 1.8, Math.max(0.05, 1 - p * 0.95));
    ctx.rotate(p * 3);
    drawFrog(ctx, { ...frog, pixelX: 0, pixelY: 0, hopping: false } as Frog, t, state);
  } else if (frog.deathType === 'gator') {
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.scale(Math.max(0.01, 1 - p * 1.5), Math.max(0.01, 1 - p * 1.5));
    ctx.rotate(p * 15);
    drawFrog(ctx, { ...frog, pixelX: 0, pixelY: 0, hopping: false } as Frog, t, state);
  }

  ctx.restore();
}

// ==================== HOME GOALS ====================

function drawHomePad(ctx: CanvasRenderingContext2D, pad: LilyPad, t: number) {
  const x = pad.x;
  const y = pad.y;
  const r = CELL_SIZE * 0.38;

  ctx.save();

  if (pad.occupied) {
    // Beautiful Triumphant Goal Glow
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
    glow.addColorStop(0, 'rgba(129,199,132,0.6)');
    glow.addColorStop(1, 'rgba(129,199,132,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();

    // Leaf
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath(); ctx.ellipse(x, y + 1, r * 1.0, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();

    // Happy Frog
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(x, y + 2, r * 0.6, r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.3, r * 0.35, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 4, y - r * 0.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - r * 0.5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x - 4, y - r * 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y - r * 0.5, 1.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Pulsing Empty Pool
    const pulse = 0.9 + Math.sin(t * 4) * 0.1;
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.85 * pulse, r * 0.65 * pulse, 0, 0, Math.PI * 2); ctx.fill();
    
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.35 + Math.sin(t * 4) * 0.2;
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.9 * pulse, r * 0.7 * pulse, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Optional Fly waiting to be snatched!
    if (pad.hasFly) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.ellipse(-3, -3, 2, 4, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(3, -3, 2, 4, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

// ==================== PARTICLES & FLOATING TEXTS ====================

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.alpha !== undefined ? p.alpha : 1);
    ctx.fillStyle = p.color;
    if (p.type === 'star') {
      drawStar(ctx, p.x, p.y, p.size, 5);
    } else if (p.type === 'bubble') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(p.x - p.size * 0.3, p.y - p.size * 0.3, p.size * 0.3, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === 'ripple') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 3, p.size * 1.5, 0, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, floatingTexts: FloatingText[]) {
  for (const ft of floatingTexts) {
    ctx.save();
    const alpha = Math.min(1, ft.life / ft.maxLife * 1.5);
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(14 * (ft.scale || 1))}px "Courier New", monospace`;
    ctx.fillStyle = ft.color;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x - ft.text.length * 4, ft.y);
    ctx.restore();
  }
}

// ==================== HUD ====================

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, t: number) {
  const hudH = 38;
  const theme = THEMES[state.theme];

  // Elegant dark overlay
  const grd = ctx.createLinearGradient(0, 0, 0, hudH);
  grd.addColorStop(0, 'rgba(0,0,0,0.95)');
  grd.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, CANVAS_WIDTH, hudH);

  // Bottom glowing neon accent line
  ctx.fillStyle = theme.cyberNeon ? '#00e5ff' : '#4caf50';
  ctx.shadowColor = theme.cyberNeon ? '#00e5ff' : '#4caf50';
  ctx.shadowBlur = 10;
  ctx.fillRect(0, hudH - 2, CANVAS_WIDTH, 2);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 12px "Courier New", monospace';

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SCORE', 10, 14);
  ctx.fillStyle = '#fdd835';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(`${state.score}`, 10, 31);

  // High Score
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(`RECORD: ${state.highScore}`, 95, 22);

  // Lives
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px "Courier New", monospace';
  const livesX = CANVAS_WIDTH / 2 - 45;
  ctx.fillText('VIES', livesX, 14);
  for (let i = 0; i < state.lives; i++) {
    const hx = livesX + i * 18;
    const hy = 21;
    ctx.fillStyle = '#ff5252';
    ctx.shadowColor = '#ff5252';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(hx + 7, hy + 12);
    ctx.bezierCurveTo(hx, hy + 6, hx, hy, hx + 7, hy + 3);
    ctx.bezierCurveTo(hx + 14, hy, hx + 14, hy + 6, hx + 7, hy + 12);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Level & Theme Name
  ctx.fillStyle = '#81c784';
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillText(`NIV.${state.level}`, CANVAS_WIDTH / 2 + 50, 16);
  ctx.font = 'normal 10px "Courier New", monospace';
  ctx.fillStyle = '#90caf9';
  ctx.fillText(`${theme.name}`, CANVAS_WIDTH / 2 + 50, 30);

  // Fullscreen hint (subtle, only when not in fullscreen)
  if (!document.fullscreenElement) {
    ctx.fillStyle = '#666';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText('[F] Plein écran', CANVAS_WIDTH - 120, 30);
  }

  // Timer Bar
  const timeW = 90;
  const timeX = CANVAS_WIDTH - timeW - 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillText('TEMPS', timeX, 14);

  const pct = Math.max(0, state.timeLeft / 45);
  const barH = 12;
  const barY = 20;

  ctx.fillStyle = '#222222';
  roundRect(ctx, timeX, barY, timeW, barH, 4); ctx.fill();

  const tColor = pct > 0.4 ? '#4caf50' : pct > 0.2 ? '#ffb300' : '#ff5252';
  ctx.fillStyle = tColor;
  ctx.shadowColor = tColor;
  ctx.shadowBlur = 6;
  if (pct > 0) {
    roundRect(ctx, timeX, barY, timeW * pct, barH, 4); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Flash warning
  if (state.timeLeft <= 5) {
    ctx.fillStyle = `rgba(255,82,82,${0.3 + Math.sin(t * 12) * 0.25})`;
    roundRect(ctx, timeX, barY, timeW, barH, 4); ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px "Courier New", monospace';
  ctx.fillText(`${Math.ceil(Math.max(0, state.timeLeft))}s`, timeX + timeW / 2 - 8, barY + 10);
}

// ==================== MAIN RENDER SCENE ====================

function renderScene(ctx: CanvasRenderingContext2D, state: GameState) {
  const t = state.globalTime;

  ctx.save();
  // Spectacular juicy Screen Shake
  if (state.screenShake > 0) {
    const shakeAmt = state.screenShake * 12;
    ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
  }

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Render Background Grid
  for (let row = 0; row < ROWS; row++) {
    const y = row * CELL_SIZE;
    if (row === HOME_ROW) {
      const grd = ctx.createLinearGradient(0, y, 0, y + CELL_SIZE);
      grd.addColorStop(0, '#052309');
      grd.addColorStop(0.4, '#1b5e20');
      grd.addColorStop(1, '#2e7d32');
      ctx.fillStyle = grd;
      ctx.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE);
    } else if (row >= RIVER_START && row <= RIVER_END) {
      drawWater(ctx, row, y, t, state);
    } else if (row === GRASS_MID) {
      drawGrass(ctx, y, state);
    } else if (row >= ROAD_START && row <= ROAD_END) {
      drawRoad(ctx, row, y, state);
    } else if (row === 12 || row === START_ROW) {
      drawGrass(ctx, y, state);
    }
  }

  // Beautiful Textured Bank Edges
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(0, RIVER_START * CELL_SIZE - 2, CANVAS_WIDTH, 4);
  ctx.fillRect(0, (RIVER_END + 1) * CELL_SIZE - 2, CANVAS_WIDTH, 4);

  // Road Curbs
  ctx.fillStyle = '#616161';
  ctx.fillRect(0, ROAD_START * CELL_SIZE - 2, CANVAS_WIDTH, 3);
  ctx.fillRect(0, (ROAD_END + 1) * CELL_SIZE - 2, CANVAS_WIDTH, 3);
  for (let x = 0; x < CANVAS_WIDTH; x += 18) {
    ctx.fillStyle = '#ffb300';
    ctx.fillRect(x, ROAD_START * CELL_SIZE - 2, 10, 3);
    ctx.fillRect(x + 5, (ROAD_END + 1) * CELL_SIZE - 2, 10, 3);
  }

  // Home Lilypads
  state.lilyPads.forEach((pad) => drawHomePad(ctx, pad, t));

  // River Logs, Gators, and Diving Turtles
  state.logs.forEach((log) => drawLog(ctx, log, t, state));

  // Collectible Golden Roaming Flies
  state.flies.forEach((fly) => drawFly(ctx, fly, t));

  // Dynamic Vehicles
  state.vehicles.forEach((v) => drawVehicle(ctx, v, state));

  // Spectacular Ambient Night Lighting Overlay
  const theme = THEMES[state.theme];
  if (theme.ambientLight && theme.ambientLight !== 'rgba(255,255,255,0)') {
    ctx.fillStyle = theme.ambientLight;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Main Player Frog
  if (state.frog.alive) {
    drawFrog(ctx, state.frog, t, state);
  } else if (state.frog.deathTimer > 0) {
    drawDeathAnimation(ctx, state.frog, t, state);
  }

  // Spectacular Particles & Popups
  drawParticles(ctx, state.particles);
  drawFloatingTexts(ctx, state.floatingTexts);

  // Top HUD Overlay
  drawHUD(ctx, state, t);

  ctx.restore();
}

// ==================== REACT MASTER COMPONENT ====================

export default function Frogger() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state: gameState, dispatch } = useGameLoop();
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  const lastEventRef = useRef<string>('none');
  const timeWarnedRef = useRef(false);
  const [musicOn, setMusicOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const musicOnRef = useRef(musicOn);
  const sfxOnRef = useRef(sfxOn);
  musicOnRef.current = musicOn;
  sfxOnRef.current = sfxOn;

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen?.();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Erreur plein écran:', err);
      }
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Juicy Audio FX triggers
  useEffect(() => {
    const ev = gameState.lastEvent;
    if (ev === lastEventRef.current && ev === 'none') return;
    lastEventRef.current = ev;

    if (!sfxOnRef.current) return;

    switch (ev) {
      case 'hop': playHop(); break;
      case 'score': playScore(); break;
      case 'eat_fly': playEatFly(true); break;
      case 'extra_life': playExtraLife(); break;
      case 'die_water': playSplash(); break;
      case 'die_car': playCrash(); break;
      case 'die_gator': playGatorSnap(); playCrash(); break;
      case 'die_time': playCrash(); break;
      case 'level_complete': playLevelComplete(); break;
      case 'game_over': playGameOver(); break;
    }
  }, [gameState.lastEvent, gameState.globalTime]);

  // Low timer FX
  useEffect(() => {
    if (gameState.timeLeft <= 5 && gameState.timeLeft > 0 && !timeWarnedRef.current && gameState.started && !gameState.showingMessage) {
      timeWarnedRef.current = true;
      if (sfxOnRef.current) playTimeWarning();
    }
    if (gameState.timeLeft > 5) timeWarnedRef.current = false;
  }, [gameState.timeLeft, gameState.started, gameState.showingMessage]);

  // Arcade Chiptune Engine
  useEffect(() => {
    if (gameState.started && musicOn && !gameState.showingMessage) {
      resumeAudio();
      startMusic();
    } else {
      stopMusic();
    }
    return () => stopMusic();
  }, [gameState.started, musicOn, gameState.showingMessage]);

  // RequestAnimationFrame Render Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;
    const render = () => {
      renderScene(ctx, stateRef.current);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Premium Mobile Swipe & Touch Handlers
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const minDist = 25;
    touchStart.current = null;

    if (gameState.showingMessage || gameState.gameOver) {
      if (gameState.showingMessage === 'start' || gameState.showingMessage === 'dead') {
        resumeAudio(); dispatch({ type: 'START' });
      } else if (gameState.showingMessage === 'won' || gameState.showingMessage === 'levelComplete') {
        dispatch({ type: 'NEXT_LEVEL' });
      } else if (gameState.gameOver) {
        dispatch({ type: 'RESET' });
      }
      return;
    }

    // If tap is very small, trigger tongue!
    if (Math.hypot(dx, dy) < minDist) {
      dispatch({ type: 'TONGUE' }); return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      dispatch({ type: 'MOVE', direction: dx > 0 ? 'right' : 'left' });
    } else {
      dispatch({ type: 'MOVE', direction: dy > 0 ? 'down' : 'up' });
    }
  }, [gameState.showingMessage, gameState.gameOver, dispatch]);

  const { showingMessage, gameOver, score, lives, level, highScore } = gameState;

  // Keyboard shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F' || e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setMusicOn(v => !v);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSfxOn(v => !v);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [toggleFullscreen]);

  // Premium Modal Overlays
  let overlay: React.ReactNode = null;

  if (showingMessage === 'start') {
    overlay = (
      <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-10 backdrop-blur-md">
        <div className="text-center px-8 py-8 rounded-3xl bg-gradient-to-b from-gray-900/95 via-green-950/95 to-black border-2 border-green-500 shadow-2xl shadow-green-500/40 max-w-sm mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-6xl mb-2 animate-bounce">🐸</div>
          <h1 className="text-4xl font-extrabold text-green-400 mb-2 tracking-widest" style={{ fontFamily: '"Courier New", monospace', textShadow: '0 0 25px rgba(76,175,80,0.7)' }}>
            COÂ COÂ EXPRESS
          </h1>
          <div className="h-1 w-28 mx-auto bg-gradient-to-r from-transparent via-green-400 to-transparent my-3 rounded-full"></div>
          
          <div className="bg-green-900/30 border border-green-500/30 rounded-2xl p-4 mb-5 text-left space-y-2 shadow-inner">
            <p className="text-green-300 text-xs flex items-center gap-2">
              <span className="text-lg">🎮</span> <span><strong className="text-white">Flèches / ZQSD</strong> : Sauter</span>
            </p>
            <p className="text-green-300 text-xs flex items-center gap-2">
              <span className="text-lg">👅</span> <span><strong className="text-white">Touche E / Espace</strong> : Gobes-mouches (+200)</span>
            </p>
            <p className="text-green-300 text-xs flex items-center gap-2">
              <span className="text-lg">🐊</span> <span><strong className="text-white">Alligators & Tortues</strong> : Attention !</span>
            </p>
            <p className="text-green-300 text-xs flex items-center gap-2">
              <span className="text-lg">📱</span> <span><strong className="text-white">Tactile</strong> : Balaye ou Tapote</span>
            </p>
            <p className="text-green-300 text-xs flex items-center gap-2">
              <span className="text-lg">🖥️</span> <span><strong className="text-white">Touche F / F11</strong> : Plein écran</span>
            </p>
          </div>

          <button
            onClick={() => { resumeAudio(); dispatch({ type: 'START' }); }}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-extrabold text-base rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-green-600/40 tracking-wider cursor-pointer"
            style={{ fontFamily: '"Courier New", monospace' }}
          >
            ▶ JOUER ARCADE
          </button>
          <p className="mt-3 text-[11px] text-green-600/80 font-mono">ou appuie sur ESPACE / ENTRÉE</p>
          {highScore > 0 && <p className="mt-2 text-xs font-bold text-yellow-400 font-mono animate-pulse">🏆 MEILLEUR RECORD : {highScore}</p>}
        </div>
      </div>
    );
  } else if (showingMessage === 'dead') {
    overlay = (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
        <div className="text-center px-8 py-8 rounded-3xl bg-gradient-to-b from-gray-900 via-red-950 to-black border-2 border-red-500 shadow-2xl shadow-red-500/40 max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-6xl mb-3 animate-spin">💀</div>
          <h1 className="text-3xl font-extrabold text-red-400 mb-2 tracking-wider" style={{ fontFamily: '"Courier New", monospace', textShadow: '0 0 20px rgba(244,67,54,0.6)' }}>
            OUCH !
          </h1>
          <p className="text-red-200 text-sm mb-2 font-mono">Vies restantes : <span className="text-red-400 font-extrabold text-base">{lives}</span></p>
          <p className="text-red-300/60 text-xs mb-6 font-mono">Score actuel : {score}</p>
          <button
            onClick={() => dispatch({ type: 'START' })}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-red-600/40 font-mono cursor-pointer"
          >
            ▶ CONTINUER
          </button>
        </div>
      </div>
    );
  } else if (showingMessage === 'won') {
    overlay = (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-md">
        <div className="text-center px-8 py-8 rounded-3xl bg-gradient-to-b from-gray-900 via-yellow-950 to-black border-2 border-yellow-500 shadow-2xl shadow-yellow-500/40 max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-6xl mb-3 animate-bounce">👑</div>
          <h1 className="text-3xl font-extrabold text-yellow-400 mb-2 tracking-wider" style={{ fontFamily: '"Courier New", monospace', textShadow: '0 0 20px rgba(253,216,53,0.6)' }}>
            NIVEAU {level} !
          </h1>
          <p className="text-yellow-200 text-sm mb-2 font-mono">Score fabuleux : <span className="text-yellow-400 font-extrabold text-base">{score}</span></p>
          <p className="text-yellow-300/80 text-xs mb-6 font-mono">Vitesse et obstacles accrus !</p>
          <button
            onClick={() => dispatch({ type: 'NEXT_LEVEL' })}
            className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-gray-900 font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-yellow-500/40 font-mono cursor-pointer"
          >
            ▶ NIVEAU SUIVANT
          </button>
        </div>
      </div>
    );
  } else if (gameOver) {
    overlay = (
      <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-10 backdrop-blur-md">
        <div className="text-center px-8 py-8 rounded-3xl bg-gradient-to-b from-gray-900 via-gray-950 to-black border-2 border-gray-600 shadow-2xl max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-6xl mb-3">☠️</div>
          <h1 className="text-3xl font-extrabold text-gray-300 mb-3 tracking-widest" style={{ fontFamily: '"Courier New", monospace' }}>
            GAME OVER
          </h1>
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-4 mb-6 space-y-1 font-mono">
            <p className="text-gray-300 text-xs">Score final : <strong className="text-yellow-400 text-base">{score}</strong></p>
            <p className="text-gray-400 text-xs">Niveau atteint : {level}</p>
            {score >= highScore && score > 0 && <p className="text-amber-400 text-xs font-bold pt-2 animate-pulse">✨ NOUVEAU RECORD ABSOLU ! ✨</p>}
          </div>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-green-600/40 font-mono cursor-pointer"
          >
            🔄 REJOUER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center select-none p-2 font-mono"
      style={{ touchAction: 'none' }}
    >
      {/* Elegantly styled Top Title */}
      <div className="mb-3 text-center">
        <h1 className="text-3xl font-black text-emerald-400 tracking-widest flex items-center justify-center gap-3" style={{ textShadow: '0 0 20px rgba(16,185,129,0.5)' }}>
          <span>🐸</span> <span>COÂ COÂ EXPRESS</span> <span>🐸</span>
        </h1>
      </div>

      {/* Arcade Polished Canvas Container */}
      <div 
        className="relative rounded-2xl overflow-hidden shadow-2xl transition-all"
        style={{ 
          border: '4px solid #10b981', 
          boxShadow: '0 0 40px rgba(16,185,129,0.25), inset 0 0 30px rgba(0,0,0,0.5)',
          background: '#000000',
          maxWidth: isFullscreen ? '100%' : undefined,
          maxHeight: isFullscreen ? '100%' : undefined
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block cursor-crosshair"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ maxWidth: '100%', height: 'auto', imageRendering: 'pixelated' }}
        />
        {overlay}
      </div>

      {/* Modern Retro Arcade Controls */}
      <div className="mt-4 flex items-center gap-3 flex-wrap justify-center">
        <button
          onClick={() => { resumeAudio(); setMusicOn(v => !v); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            musicOn ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/50' : 'bg-gray-900 text-gray-600 border border-gray-800'
          }`}
          title="Activer/désactiver la musique (M)"
        >
          <span>{musicOn ? '🎵' : '🔇'}</span> <span>Musique</span>
        </button>
        <button
          onClick={() => { resumeAudio(); setSfxOn(v => !v); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            sfxOn ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/50' : 'bg-gray-900 text-gray-600 border border-gray-800'
          }`}
          title="Activer/désactiver les sons (S)"
        >
          <span>{sfxOn ? '🔊' : '🔇'}</span> <span>Sons</span>
        </button>
        <button
          onClick={toggleFullscreen}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            isFullscreen ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-950/50' : 'bg-gray-900 text-gray-600 border border-gray-800'
          }`}
          title="Plein écran (F ou F11)"
        >
          <span>{isFullscreen ? '🖥️' : '⛶'}</span> <span>{isFullscreen ? 'Quitter' : 'Plein Écran'}</span>
        </button>
        <button
          onClick={() => setShowInfo(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 bg-gray-900 text-gray-300 border border-gray-800 hover:border-emerald-500/50"
          title="Comment ce jeu a été fait"
        >
          <span>ℹ️</span> <span>Infos</span>
        </button>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-950 border border-emerald-500/30 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-3.5 text-sm leading-relaxed text-gray-300">
              <h3 className="text-emerald-400 text-xl font-black tracking-wide" style={{ textShadow: '0 0 20px rgba(16,185,129,0.5)' }}>Comment ce jeu a été fait</h3>
              <p><strong className="text-white">Stack :</strong> React 19, TypeScript 5.9, Tailwind CSS 4, Vite 7, compilé en un seul fichier HTML, aucune dépendance chargée depuis l'extérieur.</p>
              <p><strong className="text-white">Graphismes :</strong> tout est dessiné en Canvas 2D à chaque image (route, rivière, véhicules, nénuphars), aucun sprite ni image externe.</p>
              <p><strong className="text-white">Musique &amp; sons :</strong> synthétisés en direct avec l'API Web Audio, aucun fichier audio chargé.</p>
              <p><strong className="text-white">Interactions :</strong> flèches ou ZQSD pour sauter case par case, touche E ou Espace pour tirer la langue et gober une mouche à distance sans se déplacer.</p>
              <p><strong className="text-white">Architecture :</strong> boucle de jeu dédiée (<code>useGameLoop.ts</code>) séparée du rendu Canvas, l'état de la grenouille et des obstacles vit dans des refs pour éviter les re-rendus React à chaque frame.</p>
              <p><strong className="text-white">Algorithmes notables :</strong> la grenouille doit rester posée sur un tronc ou nénuphar flottant tant qu'elle est sur la rivière (elle dérive avec son support et se noie si elle en tombe), tandis que la traversée de la route est mortelle au contact d'un véhicule. Alligators à éviter en plus des troncs, mouches bonus attrapées à la langue.</p>
            </div>
            <div className="border-t border-gray-800 p-4 text-center">
              <button onClick={() => setShowInfo(false)} className="px-6 py-2.5 rounded-xl font-bold text-black bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Sub-Footer Credits */}
      <div className="mt-4 text-center space-y-1.5 max-w-md opacity-80">
        <p className="text-gray-400 text-xs">
          Flèches / ZQSD : Sauter · Touche E / Espace : Langue
        </p>
        <p className="text-gray-500 text-[11px]">
          Créé par <strong className="text-emerald-400">Hylst - Geoffroy</strong> avec l'aide d'une IA
        </p>
      </div>
    </div>
  );
}

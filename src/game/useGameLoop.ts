import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  COLS,
  ROWS,
  CELL_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HOP_DURATION,
  LEVEL_TIME,
  VEHICLE_ROWS_CONFIG,
  LOG_ROWS_CONFIG,
  BASE_VEHICLE_SPEED,
  BASE_LOG_SPEED,
  HOME_ROW,
  RIVER_START,
  RIVER_END,
  GRASS_MID,
  START_ROW,
  ROAD_START,
  ROAD_END,
  DEATH_ANIM_TIME,
} from './constants';
import { setMusicSpeed } from './audio';
import type { Frog, GameState, LilyPad, Log, Particle, Vehicle, CollectibleFly, FloatingText, ThemeName, Direction } from './types';

let nextId = 1;
function genId() { return nextId++; }

function getThemeForLevel(level: number): ThemeName {
  const themes: ThemeName[] = [
    'noon',      // Niv 1
    'arctic',    // Niv 2
    'sunset',    // Niv 3
    'desert',    // Niv 4
    'cyberpunk', // Niv 5
    'nuclear',   // Niv 6
    'twilight',  // Niv 7
    'candy',     // Niv 8
    'forest',    // Niv 9
    'deepsea'    // Niv 10
  ];
  return themes[(level - 1) % themes.length];
}

function createVehicles(level: number): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const speedMul = 1 + (level - 1) * 0.2;

  VEHICLE_ROWS_CONFIG.forEach((cfg) => {
    const y = cfg.row * CELL_SIZE + CELL_SIZE / 2;
    const speed = BASE_VEHICLE_SPEED * cfg.speed * speedMul;
    const spacing = (COLS + 3) / cfg.density;
    const offset = Math.random() * COLS;

    for (let i = 0; i < cfg.density; i++) {
      const x = ((i * spacing + offset) % (COLS + 3)) * CELL_SIZE;
      const type = cfg.types[i % cfg.types.length];
      const width = type === 'truck' ? 2.3 : type === 'bulldozer' ? 1.7 : type === 'sport' ? 1.2 : 1.0;
      
      const colorMap: Record<string, string> = {
        car: cfg.direction === 1 ? '#e53935' : '#1e88e5',
        sport: cfg.direction === 1 ? '#ff007f' : '#00e5ff',
        truck: '#fb8c00',
        bulldozer: '#fdd835',
        police: '#111111',
      };

      vehicles.push({
        id: genId(), x: x - (width * CELL_SIZE) / 2, y, row: cfg.row,
        width, speed, direction: cfg.direction, type, color: colorMap[type],
        lightPhase: type === 'police' ? i * 10 : undefined,
      });
    }
  });
  return vehicles;
}

function createLogs(level: number): Log[] {
  const logs: Log[] = [];
  const speedMul = 1 + (level - 1) * 0.15;

  LOG_ROWS_CONFIG.forEach((cfg) => {
    const y = cfg.row * CELL_SIZE + CELL_SIZE / 2;
    const speed = BASE_LOG_SPEED * cfg.speed * speedMul;
    const spacing = (COLS + 3) / cfg.density;
    const offset = Math.random() * COLS * 1.5;

    for (let i = 0; i < cfg.density; i++) {
      const x = ((i * spacing + offset) % (COLS * 2)) * CELL_SIZE;
      const type = cfg.types[i % cfg.types.length];
      const width = type === 'log' ? 2.6 : type === 'gator' ? 2.8 : type === 'turtle_dive' ? 1.8 : 1.4;
      
      logs.push({
        id: genId(), x: x - (width * CELL_SIZE) / 2, y, row: cfg.row,
        width, speed, direction: cfg.direction, type,
        diveTimer: type === 'turtle_dive' ? Math.random() * 4 : undefined,
        isDiving: false,
        gatorMouthOpen: false,
        gatorMouthTimer: type === 'gator' ? Math.random() * 3 : undefined,
      });
    }
  });
  return logs;
}

function createLilyPads(): LilyPad[] {
  const pads: LilyPad[] = [];
  const positions = [1, 3, 5, 7, 9, 11];
  positions.forEach((col) => {
    pads.push({
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: HOME_ROW * CELL_SIZE + CELL_SIZE / 2,
      occupied: false, frogHere: false,
      hasFly: Math.random() < 0.35,
    });
  });
  return pads;
}

function createFlies(): CollectibleFly[] {
  const flies: CollectibleFly[] = [];
  [GRASS_MID, START_ROW - 1].forEach((row, i) => {
    flies.push({
      id: genId(),
      x: (2 + i * 4) * CELL_SIZE,
      y: row * CELL_SIZE + CELL_SIZE / 2,
      vx: (i % 2 === 0 ? 1 : -1) * 45,
      vy: 0,
      row,
      golden: true,
      alive: true,
    });
  });
  return flies;
}

function createInitialFrog(): Frog {
  const gx = Math.floor(COLS / 2);
  return {
    gridX: gx, gridY: START_ROW,
    pixelX: gx * CELL_SIZE + CELL_SIZE / 2,
    pixelY: START_ROW * CELL_SIZE + CELL_SIZE / 2,
    hopping: false, hopProgress: 0,
    hopFromX: 0, hopFromY: 0, hopToX: 0, hopToY: 0,
    direction: 'up', alive: true, onLog: false,
    deathType: 'none', deathTimer: 0, furthestRow: START_ROW,
    tongueFlicking: false, tongueProgress: 0, tongueTarget: null,
  };
}

function loadHighScore(): number {
  try { return parseInt(localStorage.getItem('coacoaexpress_hs') || '0', 10); } catch { return 0; }
}
function saveHighScore(s: number) {
  try { localStorage.setItem('coacoaexpress_hs', String(s)); } catch { /* noop */ }
}

function createInitialState(level: number = 1, score: number = 0, lives: number = 3): GameState {
  return {
    frog: createInitialFrog(),
    vehicles: createVehicles(level),
    logs: createLogs(level),
    lilyPads: createLilyPads(),
    flies: createFlies(),
    particles: [],
    floatingTexts: [],
    score,
    highScore: Math.max(score, loadHighScore()),
    lives,
    level,
    theme: getThemeForLevel(level),
    screenShake: 0,
    gameOver: false,
    gameWon: false,
    timeLeft: LEVEL_TIME,
    started: false,
    showingMessage: 'start',
    globalTime: 0,
    combo: 0,
    lastEvent: 'none',
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOutQuad(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

function isOnVehicle(fx: number, fy: number, vehicles: Vehicle[]): boolean {
  const r = CELL_SIZE * 0.28;
  return vehicles.some((v) => {
    const vR = v.x + v.width * CELL_SIZE;
    return fx + r > v.x && fx - r < vR && fy + r > v.y - CELL_SIZE / 2 && fy - r < v.y + CELL_SIZE / 2;
  });
}

function getLogAt(fx: number, fy: number, logs: Log[]): Log | null {
  const r = CELL_SIZE * 0.22;
  for (const l of logs) {
    if (l.isDiving) continue;
    const lR = l.x + l.width * CELL_SIZE;
    if (fx + r > l.x && fx - r < lR && fy + r > l.y - CELL_SIZE / 2 + 4 && fy - r < l.y + CELL_SIZE / 2 - 4) {
      return l;
    }
  }
  return null;
}

function checkGatorMouthDeath(fx: number, _fy: number, log: Log): boolean {
  if (log.type !== 'gator' || !log.gatorMouthOpen) return false;
  const mouthW = CELL_SIZE * 0.8;
  const mouthX = log.direction === 1 ? log.x + log.width * CELL_SIZE - mouthW : log.x;
  return fx > mouthX && fx < mouthX + mouthW;
}

function isInRiver(gy: number) { return gy >= RIVER_START && gy <= RIVER_END; }
// ROAD_START/ROAD_END manquaient ici : la route (lignes 7 a 11) n'etait donc jamais
// consideree comme "terre ferme", et le seul appel a isOnVehicle() plus bas se trouvait
// dans le if(isOnLand(gy)) qui ne se declenchait donc jamais pour ces lignes. Les
// voitures traversaient l'ecran mais ne pouvaient litteralement jamais toucher le joueur.
function isOnLand(gy: number) {
  return gy === GRASS_MID || gy === START_ROW || gy === HOME_ROW || gy === 12 || (gy >= ROAD_START && gy <= ROAD_END);
}

function isAtHome(fx: number, gy: number, pads: LilyPad[]): number {
  if (gy !== HOME_ROW) return -1;
  for (let i = 0; i < pads.length; i++) {
    if (Math.abs(fx - pads[i].x) < CELL_SIZE * 0.55 && !pads[i].occupied) return i;
  }
  return -1;
}

function isOutOfBounds(px: number, py: number) {
  return px < -CELL_SIZE / 2 || px > COLS * CELL_SIZE + CELL_SIZE / 2 || py < -CELL_SIZE || py > ROWS * CELL_SIZE + CELL_SIZE;
}

function spawnParticles(x: number, y: number, type: Particle['type'], countOverride?: number, colorOverride?: string): Particle[] {
  const ps: Particle[] = [];
  const count = countOverride || (type === 'star' ? 14 : type === 'sparkle' ? 16 : type === 'splash' ? 12 : 10);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = type === 'smoke' ? 10 + Math.random() * 20 : 35 + Math.random() * 85;
    const colors: Record<string, string[]> = {
      splash: ['#4fc3f7', '#0288d1', '#b3e5fc', '#ffffff'],
      sparkle: ['#ffd54f', '#ffeb3b', '#fff9c4', '#ff9800'],
      debris: ['#795548', '#5d4037', '#8d6e63', '#999999', '#ff5252'],
      star: ['#fff176', '#ffeb3b', '#fdd835', '#ffffff', '#4caf50', '#00e5ff'],
      smoke: ['#757575', '#9e9e9e', '#bdbdbd', '#eeeeee'],
      rain: ['#94a3b8', '#cbd5e1', '#38bdf8'],
      bubble: ['#81d4fa', '#b3e5fc', '#ffffff'],
      ripple: ['#ffffff'],
    };
    const cList = colors[type] || ['#ffffff'];
    const color = colorOverride || cList[Math.floor(Math.random() * cList.length)];
    ps.push({
      id: genId(), x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - (type === 'star' ? 45 : 0),
      life: 0.4 + Math.random() * 0.5, maxLife: 0.4 + Math.random() * 0.5,
      color,
      size: type === 'star' ? 4 + Math.random() * 4 : type === 'smoke' ? 4 + Math.random() * 6 : 2 + Math.random() * 3,
      type: type === 'splash' ? 'bubble' : type,
    });
  }
  return ps;
}

type Action =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'TONGUE' }
  | { type: 'TICK'; dt: number }
  | { type: 'RESET' }
  | { type: 'START' }
  | { type: 'NEXT_LEVEL' };

function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START':
      return { ...state, started: true, showingMessage: null, lastEvent: 'none' };

    case 'TONGUE': {
      if (state.gameOver || state.gameWon || state.frog.hopping || state.frog.tongueFlicking || !state.frog.alive || state.showingMessage) return state;
      
      const fx = state.frog.pixelX;
      const fy = state.frog.pixelY;
      let target: { x: number; y: number } | null = null;
      let eatFlyId: number | null = null;
      let eatLilyFlyIdx: number | null = null;

      const tDist = CELL_SIZE * 1.8;

      state.flies.forEach((f) => {
        if (!f.alive) return;
        const dist = Math.hypot(f.x - fx, f.y - fy);
        if (dist < tDist) {
          if (
            (state.frog.direction === 'up' && f.y < fy) ||
            (state.frog.direction === 'down' && f.y > fy) ||
            (state.frog.direction === 'left' && f.x < fx) ||
            (state.frog.direction === 'right' && f.x > fx)
          ) { target = { x: f.x, y: f.y }; eatFlyId = f.id; }
        }
      });

      if (!target && state.frog.gridY === 1) {
        state.lilyPads.forEach((pad, idx) => {
          if (pad.hasFly && Math.hypot(pad.x - fx, pad.y - fy) < tDist) {
            target = { x: pad.x, y: pad.y }; eatLilyFlyIdx = idx;
          }
        });
      }

      if (!target) {
        const dOff = CELL_SIZE * 1.2;
        target = {
          x: fx + (state.frog.direction === 'right' ? dOff : state.frog.direction === 'left' ? -dOff : 0),
          y: fy + (state.frog.direction === 'down' ? dOff : state.frog.direction === 'up' ? -dOff : 0),
        };
      }

      let newScore = state.score;
      let fTexts: FloatingText[] = [...state.floatingTexts];
      let lastEv: GameState['lastEvent'] = 'none';
      let flies = [...state.flies];
      let lilyPads = [...state.lilyPads];

      if (eatFlyId !== null) {
        newScore += 200;
        fTexts.push({ id: genId(), x: target.x, y: target.y, text: '+200', color: '#ffeb3b', life: 1.0, maxLife: 1.0, scale: 1.3 });
        flies = flies.map(f => f.id === eatFlyId ? { ...f, alive: false } : f);
        lastEv = 'eat_fly';
      } else if (eatLilyFlyIdx !== null) {
        newScore += 200;
        fTexts.push({ id: genId(), x: target.x, y: target.y, text: '+200', color: '#ffeb3b', life: 1.0, maxLife: 1.0, scale: 1.3 });
        lilyPads[eatLilyFlyIdx] = { ...lilyPads[eatLilyFlyIdx], hasFly: false };
        lastEv = 'eat_fly';
      }

      return {
        ...state, score: newScore, floatingTexts: fTexts, flies, lilyPads, lastEvent: lastEv,
        frog: { ...state.frog, tongueFlicking: true, tongueProgress: 0, tongueTarget: target },
      };
    }

    case 'MOVE': {
      if (state.gameOver || state.gameWon || state.frog.hopping || state.frog.tongueFlicking || !state.frog.alive || state.showingMessage) return state;
      const { direction } = action;
      let { gridX, gridY } = state.frog;
      switch (direction) {
        case 'up': gridY = Math.max(0, gridY - 1); break;
        case 'down': gridY = Math.min(ROWS - 1, gridY + 1); break;
        case 'left': gridX = Math.max(0, gridX - 1); break;
        case 'right': gridX = Math.min(COLS - 1, gridX + 1); break;
      }
      if (gridY > START_ROW) return state;
      if (gridX === state.frog.gridX && gridY === state.frog.gridY) {
        return { ...state, frog: { ...state.frog, direction } };
      }

      const toX = gridX * CELL_SIZE + CELL_SIZE / 2;
      const toY = gridY * CELL_SIZE + CELL_SIZE / 2;

      let bonus = 0;
      let fTexts: FloatingText[] = [...state.floatingTexts];
      const newFurthest = Math.min(state.frog.furthestRow, gridY);
      if (gridY < state.frog.furthestRow) {
        bonus = 10;
        fTexts.push({ id: genId(), x: toX, y: toY, text: '+10', color: '#a5d6a7', life: 0.7, maxLife: 0.7 });
      }

      return {
        ...state, score: state.score + bonus, floatingTexts: fTexts, lastEvent: 'hop',
        frog: {
          ...state.frog, gridX, gridY, hopping: true, hopProgress: 0,
          hopFromX: state.frog.pixelX, hopFromY: state.frog.pixelY,
          hopToX: toX, hopToY: toY, direction, onLog: false,
          furthestRow: newFurthest,
        },
      };
    }

    case 'TICK': {
      const dt = action.dt;
      const globalTime = state.globalTime + dt / 1000;
      let particles = [...state.particles];
      let floatingTexts: FloatingText[] = [...state.floatingTexts];
      let screenShake = Math.max(0, state.screenShake - dt / 1000);

      particles = particles
        .map(p => ({
          ...p, x: p.x + p.vx * dt / 1000, y: p.y + p.vy * dt / 1000,
          vy: p.vy + (p.type === 'smoke' ? -30 : p.type === 'rain' ? 300 : 130) * dt / 1000,
          life: p.life - dt / 1000,
          size: p.type === 'smoke' ? p.size + dt / 200 : p.size,
        }))
        .filter(p => p.life > 0);

      floatingTexts = floatingTexts
        .map(ft => ({ ...ft, y: ft.y - 45 * dt / 1000, life: ft.life - dt / 1000 }))
        .filter(ft => ft.life > 0);

      if (state.theme === 'twilight' && Math.random() < 0.4) {
        particles.push({
          id: genId(), x: Math.random() * CANVAS_WIDTH, y: -10,
          vx: -60 + Math.random() * 20, vy: 500 + Math.random() * 200,
          life: 0.8, maxLife: 0.8, color: '#38bdf8', size: 2, type: 'rain',
        });
      }

      if (state.showingMessage || state.gameOver || state.gameWon) {
        return { ...state, particles, floatingTexts, screenShake, globalTime };
      }

      let { frog, vehicles, logs, flies } = state;
      let lilyPads = [...state.lilyPads];
      let score = state.score;
      let lives = state.lives;
      let timeLeft = state.timeLeft;
      let gameWon: boolean = state.gameWon;
      let gameOver: boolean = state.gameOver;
      let combo = state.combo;
      let lastEvent: GameState['lastEvent'] = 'none';

      const oldTimeLeft = timeLeft;
      timeLeft -= dt / 1000;
      setMusicSpeed(timeLeft <= 12);
      if (oldTimeLeft > 5 && timeLeft <= 5) lastEvent = 'none';

      if (timeLeft <= 0) {
        lives -= 1;
        screenShake = 0.5;
        if (lives <= 0) {
          saveHighScore(Math.max(state.highScore, score));
          return { ...state, gameOver: true, showingMessage: null, timeLeft: 0, particles, floatingTexts, screenShake, globalTime, lastEvent: 'game_over', highScore: Math.max(state.highScore, score) };
        }
        return { ...state, frog: createInitialFrog(), lives, timeLeft: LEVEL_TIME, showingMessage: 'dead', particles, floatingTexts, screenShake, globalTime, lastEvent: 'die_time', combo: 0 };
      }

      flies = flies.map((f) => {
        let nx = f.x + f.vx * dt / 1000;
        let nv = f.vx;
        if (nx < CELL_SIZE) { nx = CELL_SIZE; nv = -nv; }
        else if (nx > CANVAS_WIDTH - CELL_SIZE) { nx = CANVAS_WIDTH - CELL_SIZE; nv = -nv; }
        return { ...f, x: nx, vx: nv, y: f.y + Math.sin(globalTime * 8 + f.id) * 1.5 };
      });

      let newFrog = { ...frog };
      if (frog.tongueFlicking) {
        newFrog.tongueProgress += dt / 100;
        if (newFrog.tongueProgress >= 2.0) {
          newFrog.tongueFlicking = false;
          newFrog.tongueTarget = null;
          newFrog.tongueProgress = 0;
        }
      }

      if (frog.hopping) {
        newFrog.hopProgress = frog.hopProgress + dt / HOP_DURATION;
        if (newFrog.hopProgress >= 1) {
          newFrog.hopProgress = 1;
          newFrog.hopping = false;
          newFrog.pixelX = frog.hopToX;
          newFrog.pixelY = frog.hopToY;
          if (isInRiver(newFrog.gridY)) particles.push(...spawnParticles(newFrog.pixelX, newFrog.pixelY, 'ripple', 5));
          else particles.push(...spawnParticles(newFrog.pixelX, newFrog.pixelY + CELL_SIZE * 0.3, 'smoke', 4));
        } else {
          const e = easeInOutQuad(newFrog.hopProgress);
          newFrog.pixelX = lerp(frog.hopFromX, frog.hopToX, e);
          newFrog.pixelY = lerp(frog.hopFromY, frog.hopToY, e);
        }
      }

      const newVehicles = vehicles.map((v) => {
        let nx = v.x + v.speed * v.direction * dt / 1000;
        if (v.direction === 1 && nx > COLS * CELL_SIZE + 30) nx = -v.width * CELL_SIZE - 30;
        else if (v.direction === -1 && nx < -v.width * CELL_SIZE - 30) nx = COLS * CELL_SIZE + 30;
        if ((v.type === 'truck' || v.type === 'bulldozer') && Math.random() < 0.15) {
          const sOff = v.direction === 1 ? 2 : v.width * CELL_SIZE - 2;
          particles.push({
            id: genId(), x: v.x + sOff, y: v.y + 10, vx: -v.direction * 15, vy: -20,
            life: 0.4, maxLife: 0.4, color: '#757575', size: 3, type: 'smoke',
          });
        }
        return { ...v, x: nx, lightPhase: v.lightPhase !== undefined ? (v.lightPhase + 1) % 40 : undefined };
      });

      const newLogs = logs.map((l) => {
        let nx = l.x + l.speed * l.direction * dt / 1000;
        if (l.direction === 1 && nx > COLS * CELL_SIZE + 40) nx = -l.width * CELL_SIZE - 40;
        else if (l.direction === -1 && nx < -l.width * CELL_SIZE - 40) nx = COLS * CELL_SIZE + 40;

        let diving = l.isDiving;
        let dTimer = l.diveTimer;
        if (l.type === 'turtle_dive' && dTimer !== undefined) {
          dTimer -= dt / 1000;
          if (dTimer <= 0) {
            diving = !diving;
            dTimer = diving ? 1.5 : 3.5;
            if (diving) particles.push(...spawnParticles(l.x + l.width * CELL_SIZE / 2, l.y, 'splash', 8));
          }
        }

        let mOpen = l.gatorMouthOpen;
        let mTimer = l.gatorMouthTimer;
        if (l.type === 'gator' && mTimer !== undefined) {
          mTimer -= dt / 1000;
          if (mTimer <= 0) {
            mOpen = !mOpen;
            mTimer = mOpen ? 1.8 : 2.5;
          }
        }

        if (Math.random() < 0.2) {
          const wOff = l.direction === 1 ? 0 : l.width * CELL_SIZE;
          particles.push({
            id: genId(), x: l.x + wOff, y: l.y + (Math.random() - 0.5) * 15, vx: -l.direction * 10, vy: 0,
            life: 0.5, maxLife: 0.5, color: '#81d4fa', size: 2, type: 'ripple',
          });
        }

        return { ...l, x: nx, isDiving: diving, diveTimer: dTimer, gatorMouthOpen: mOpen, gatorMouthTimer: mTimer };
      });

      if (!newFrog.hopping && newFrog.alive) {
        const fx = newFrog.pixelX;
        const fy = newFrog.pixelY;
        const gy = newFrog.gridY;

        flies.forEach((f) => {
          if (f.alive && Math.hypot(f.x - fx, f.y - fy) < CELL_SIZE * 0.6) {
            f.alive = false;
            score += 200;
            floatingTexts.push({ id: genId(), x: f.x, y: f.y, text: '+200', color: '#ffeb3b', life: 1.0, maxLife: 1.0, scale: 1.3 });
            lastEvent = 'eat_fly';
          }
        });

        if (isInRiver(gy)) {
          const log = getLogAt(fx, fy, newLogs);
          if (log) {
            if (checkGatorMouthDeath(fx, fy, log)) {
              newFrog.alive = false;
              newFrog.deathType = 'gator';
              particles.push(...spawnParticles(fx, fy, 'debris'));
              screenShake = 0.4;
              lastEvent = 'die_gator';
            } else {
              newFrog.pixelX = fx + log.speed * log.direction * dt / 1000;
              newFrog.gridX = Math.round(newFrog.pixelX / CELL_SIZE);
              newFrog.onLog = true;
            }
          } else {
            newFrog.alive = false;
            newFrog.deathType = 'water';
            particles.push(...spawnParticles(fx, fy, 'splash', 16));
            lastEvent = 'die_water';
          }
        } else if (isOnLand(gy)) {
          if (isOnVehicle(fx, fy, newVehicles)) {
            newFrog.alive = false;
            newFrog.deathType = 'car';
            particles.push(...spawnParticles(fx, fy, 'debris', 18));
            screenShake = 0.5;
            lastEvent = 'die_car';
          }
        }

        const homeIdx = isAtHome(fx, gy, lilyPads);
        if (homeIdx >= 0) {
          lilyPads[homeIdx] = { ...lilyPads[homeIdx], occupied: true, frogHere: true };
          combo++;
          const timeBonus = Math.floor(timeLeft) * 5;
          const comboBonus = combo * 50;
          const addedPts = 100 + timeBonus + comboBonus;
          score += addedPts;
          
          floatingTexts.push({ id: genId(), x: fx, y: fy, text: `+${addedPts}!`, color: '#81c784', life: 1.2, maxLife: 1.2, scale: 1.4 });
          if (combo > 1) floatingTexts.push({ id: genId(), x: fx, y: fy - 20, text: `COMBO x${combo}!`, color: '#fdd835', life: 1.2, maxLife: 1.2, scale: 1.5 });
          
          particles.push(...spawnParticles(fx, fy, 'star', 22));
          lastEvent = 'score';

          if (Math.floor((score - addedPts) / 3000) < Math.floor(score / 3000)) {
            lives++;
            floatingTexts.push({ id: genId(), x: fx, y: fy - 40, text: '❤️ 1-UP! ❤️', color: '#ff5252', life: 1.5, maxLife: 1.5, scale: 1.6 });
            lastEvent = 'extra_life';
          }

          const allOccupied = lilyPads.every(p => p.occupied);
          if (allOccupied) {
            gameWon = true;
            const levelBonus = state.level * 500;
            score += levelBonus;
            floatingTexts.push({ id: genId(), x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, text: `PARFAIT ! +${levelBonus}`, color: '#fdd835', life: 2.0, maxLife: 2.0, scale: 2.0 });
            screenShake = 0.6;
            lastEvent = 'level_complete';
          } else {
            newFrog = createInitialFrog();
          }
        } else if (gy === HOME_ROW) {
          // Berge atteinte hors d'un nenuphar libre (mauvaise colonne, ou nenuphar deja
          // pris) : c'est un raté, pas un refuge sans risque. Sans ce cas, la grenouille
          // reste indéfiniment plantée sur la berge, bien vivante et hors de portée de
          // tout danger, jusqu'à ce que le chrono du niveau l'achève tout seul.
          newFrog.alive = false;
          newFrog.deathType = 'water';
          particles.push(...spawnParticles(fx, fy, 'splash', 14));
          lastEvent = 'die_water';
        }

        if (isOutOfBounds(newFrog.pixelX, newFrog.pixelY)) {
          newFrog.alive = false;
          newFrog.deathType = 'water';
          lastEvent = 'die_water';
        }
      }

      if (!newFrog.alive && newFrog.deathTimer === 0) {
        newFrog.deathTimer = DEATH_ANIM_TIME;
      }
      if (!newFrog.alive && newFrog.deathTimer > 0) {
        newFrog.deathTimer -= dt;
        if (newFrog.deathTimer <= 0) {
          lives -= 1;
          const hs = Math.max(state.highScore, score);
          if (lives <= 0) {
            saveHighScore(hs);
            return { ...state, frog: newFrog, vehicles: newVehicles, logs: newLogs, lilyPads, flies, score, lives: 0, timeLeft, gameOver: true, particles, floatingTexts, screenShake, globalTime, lastEvent: 'game_over', highScore: hs, combo: 0 };
          }
          saveHighScore(hs);
          return { ...state, frog: createInitialFrog(), vehicles: newVehicles, logs: newLogs, lilyPads, flies, score, lives, timeLeft: LEVEL_TIME, showingMessage: 'dead', particles, floatingTexts, screenShake, globalTime, lastEvent, highScore: hs, combo: 0 };
        }
        return { ...state, frog: newFrog, vehicles: newVehicles, logs: newLogs, lilyPads, flies, score, lives, timeLeft, particles, floatingTexts, screenShake, globalTime, gameOver, gameWon, combo };
      }

      if (gameWon) {
        const hs = Math.max(state.highScore, score);
        saveHighScore(hs);
        return { ...state, frog: newFrog, vehicles: newVehicles, logs: newLogs, lilyPads, flies, score, lives, timeLeft, gameWon, showingMessage: 'won', particles, floatingTexts, screenShake, globalTime, lastEvent, highScore: hs, combo };
      }

      return { ...state, frog: newFrog, vehicles: newVehicles, logs: newLogs, lilyPads, flies, score, lives, timeLeft, gameOver, gameWon, particles, floatingTexts, screenShake, globalTime, lastEvent, combo, highScore: Math.max(state.highScore, score) };
    }

    case 'RESET':
      return createInitialState(1, 0, 3);

    case 'NEXT_LEVEL': {
      const nl = state.level + 1;
      return {
        ...createInitialState(nl, state.score, state.lives),
        started: true, showingMessage: null,
      };
    }

    default: return state;
  }
}

export function useGameLoop() {
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState(1, 0, 3));
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state.showingMessage === 'start' && (e.key === ' ' || e.key === 'Enter')) { dispatch({ type: 'START' }); return; }
      if (state.showingMessage === 'dead' && (e.key === ' ' || e.key === 'Enter')) { dispatch({ type: 'START' }); return; }
      if (state.showingMessage === 'won' && (e.key === ' ' || e.key === 'Enter')) { dispatch({ type: 'NEXT_LEVEL' }); return; }
      if (state.showingMessage === 'levelComplete' && (e.key === ' ' || e.key === 'Enter')) { dispatch({ type: 'NEXT_LEVEL' }); return; }
      if (state.gameOver && (e.key === ' ' || e.key === 'Enter')) { dispatch({ type: 'RESET' }); return; }
      if (state.gameOver || state.gameWon || state.showingMessage) return;

      if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        e.preventDefault(); dispatch({ type: 'TONGUE' }); return;
      }

      const dirMap: Record<string, Direction> = {
        ArrowUp: 'up', w: 'up', W: 'up', z: 'up', Z: 'up',
        ArrowDown: 'down', s: 'down', S: 'down',
        ArrowLeft: 'left', a: 'left', A: 'left', q: 'left', Q: 'left',
        ArrowRight: 'right', d: 'right', D: 'right',
      };
      const dir = dirMap[e.key];
      if (dir) { e.preventDefault(); dispatch({ type: 'MOVE', direction: dir }); }
    },
    [state.showingMessage, state.gameOver, state.gameWon]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const loop = (ts: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = ts;
      const dt = Math.min(ts - lastTimeRef.current, 50);
      lastTimeRef.current = ts;
      dispatch({ type: 'TICK', dt });
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return { state, dispatch };
}

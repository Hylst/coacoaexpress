export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Frog {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  hopping: boolean;
  hopProgress: number;
  hopFromX: number;
  hopFromY: number;
  hopToX: number;
  hopToY: number;
  direction: Direction;
  alive: boolean;
  onLog: boolean;
  deathType: 'none' | 'car' | 'water' | 'time' | 'gator';
  deathTimer: number;
  furthestRow: number;
  tongueFlicking: boolean;
  tongueProgress: number;
  tongueTarget: { x: number; y: number } | null;
}

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  row: number;
  width: number;
  speed: number;
  direction: 1 | -1;
  type: 'car' | 'truck' | 'bulldozer' | 'police' | 'sport';
  color: string;
  lightPhase?: number;
}

export interface Log {
  id: number;
  x: number;
  y: number;
  row: number;
  width: number;
  speed: number;
  direction: 1 | -1;
  type: 'log' | 'turtle' | 'turtle_dive' | 'lilypad' | 'gator';
  diveTimer?: number;
  isDiving?: boolean;
  gatorMouthOpen?: boolean;
  gatorMouthTimer?: number;
}

export interface LilyPad {
  x: number;
  y: number;
  occupied: boolean;
  frogHere: boolean;
  hasFly?: boolean;
}

export interface CollectibleFly {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  row: number;
  golden: boolean;
  alive: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'splash' | 'sparkle' | 'debris' | 'bubble' | 'star' | 'smoke' | 'rain' | 'ripple';
  alpha?: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
}

export type ThemeName = 'noon' | 'sunset' | 'cyberpunk' | 'twilight' | 'arctic' | 'desert' | 'nuclear' | 'candy' | 'forest' | 'deepsea';

export interface GameState {
  frog: Frog;
  vehicles: Vehicle[];
  logs: Log[];
  lilyPads: LilyPad[];
  flies: CollectibleFly[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  theme: ThemeName;
  screenShake: number;
  gameOver: boolean;
  gameWon: boolean;
  timeLeft: number;
  started: boolean;
  showingMessage: 'start' | 'dead' | 'won' | 'levelComplete' | null;
  globalTime: number;
  combo: number;
  lastEvent: 'none' | 'hop' | 'score' | 'die_car' | 'die_water' | 'die_time' | 'die_gator' | 'level_complete' | 'game_over' | 'eat_fly' | 'extra_life';
}

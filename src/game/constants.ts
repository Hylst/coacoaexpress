import type { ThemeName } from './types';

// Grid & board dimensions
export const COLS = 13;
export const ROWS = 14;
export const CELL_SIZE = 50;

export const HOME_ROW = 0;
export const RIVER_START = 1;
export const RIVER_END = 5;
export const GRASS_MID = 6;
export const ROAD_START = 7;
export const ROAD_END = 11;
export const START_GRASS = 12;
export const START_ROW = 13;

// Timing & Easing
export const HOP_DURATION = 110; // ms per hop (very responsive & snappy)
export const LEVEL_TIME = 45; // seconds per level
export const DEATH_ANIM_TIME = 1200;

// Speeds (pixels per second)
export const BASE_VEHICLE_SPEED = 60;
export const BASE_LOG_SPEED = 42;

// Canvas dimensions
export const CANVAS_WIDTH = COLS * CELL_SIZE;
export const CANVAS_HEIGHT = ROWS * CELL_SIZE;

// Row configurations for road
export const VEHICLE_ROWS_CONFIG = [
  { row: 7,  speed: 0.75, direction: 1 as const, types: ['car', 'sport'] as const, density: 3 },
  { row: 8,  speed: 1.1,  direction: -1 as const, types: ['truck', 'car'] as const, density: 2.5 },
  { row: 9,  speed: 0.6,  direction: 1 as const, types: ['bulldozer', 'truck'] as const, density: 2 },
  { row: 10, speed: 1.25, direction: -1 as const, types: ['sport', 'car', 'police'] as const, density: 3 },
  { row: 11, speed: 0.9,  direction: 1 as const, types: ['police', 'truck'] as const, density: 2 },
];

// Row configurations for river
export const LOG_ROWS_CONFIG = [
  { row: 1, speed: 0.7,  direction: 1 as const, types: ['log', 'gator'] as const, density: 2.5 },
  { row: 2, speed: 0.95, direction: -1 as const, types: ['turtle', 'turtle_dive'] as const, density: 3 },
  { row: 3, speed: 0.55, direction: 1 as const, types: ['log', 'log'] as const, density: 2 },
  { row: 4, speed: 1.2,  direction: -1 as const, types: ['turtle_dive', 'turtle'] as const, density: 3 },
  { row: 5, speed: 0.8,  direction: 1 as const, types: ['log', 'gator'] as const, density: 2.5 },
];

// Visual Themes for spectacular variety
export const THEMES: Record<ThemeName, {
  name: string;
  sky: string;
  water: [string, string];
  waterShimmer: string;
  road: [string, string, string]; // top gradient, bot gradient, line
  grass: [string, string, string]; // dark, base, light
  frogBody: string;
  frogGlow: boolean;
  ambientLight: string;
  rain: boolean;
  cyberNeon: boolean;
}> = {
  noon: {
    name: 'Midi Tropical 🌴',
    sky: '#4fc3f7',
    water: ['#1565a0', '#0e4a78'],
    waterShimmer: '#64b5f6',
    road: ['#424242', '#303030', '#ffc107'],
    grass: ['#1b5e20', '#2e7d32', '#43a047'],
    frogBody: '#4caf50',
    frogGlow: false,
    ambientLight: 'rgba(255,255,255,0)',
    rain: false,
    cyberNeon: false,
  },
  sunset: {
    name: 'Coucher de Soleil 🌅',
    sky: '#ff7043',
    water: ['#790c5a', '#4a0b38'],
    waterShimmer: '#ffb74d',
    road: ['#35222e', '#23151e', '#ff9800'],
    grass: ['#3a1700', '#7a3b00', '#a15300'],
    frogBody: '#81c784',
    frogGlow: false,
    ambientLight: 'rgba(255,100,0,0.1)',
    rain: false,
    cyberNeon: false,
  },
  cyberpunk: {
    name: 'Nuit Cyberpunk 🏙️',
    sky: '#0f051d',
    water: ['#100b2b', '#080517'],
    waterShimmer: '#b338ff',
    road: ['#151a28', '#0c101a', '#e91e63'],
    grass: ['#002233', '#004d66', '#0088b3'],
    frogBody: '#00e5ff',
    frogGlow: true,
    ambientLight: 'rgba(150,0,255,0.12)',
    rain: false,
    cyberNeon: true,
  },
  twilight: {
    name: 'Orage au Crépuscule ⚡',
    sky: '#263238',
    water: ['#1e293b', '#0f172a'],
    waterShimmer: '#94a3b8',
    road: ['#27272a', '#18181b', '#38bdf8'],
    grass: ['#064e3b', '#047857', '#10b981'],
    frogBody: '#34d399',
    frogGlow: false,
    ambientLight: 'rgba(0,0,0,0.25)',
    rain: true,
    cyberNeon: false,
  },
  arctic: {
    name: 'Banquise Arctique ❄️',
    sky: '#e0f7fa',
    water: ['#00acc1', '#006064'],
    waterShimmer: '#ffffff',
    road: ['#cfd8dc', '#b0bec5', '#2196f3'],
    grass: ['#f5f5f5', '#ffffff', '#e0e0e0'],
    frogBody: '#4fc3f7',
    frogGlow: false,
    ambientLight: 'rgba(150,200,255,0.05)',
    rain: false,
    cyberNeon: false,
  },
  desert: {
    name: 'Désert de Feu 🏜️',
    sky: '#ffd54f',
    water: ['#006064', '#004d40'], // Oasis
    waterShimmer: '#4db6ac',
    road: ['#5d4037', '#4e342e', '#ffeb3b'],
    grass: ['#ffb74d', '#ffa726', '#fb8c00'], // Sand
    frogBody: '#8d6e63',
    frogGlow: false,
    ambientLight: 'rgba(255,200,0,0.15)',
    rain: false,
    cyberNeon: false,
  },
  nuclear: {
    name: 'Zone Nucléaire ☢️',
    sky: '#1a1a1a',
    water: ['#2e7d32', '#1b5e20'], // Acid
    waterShimmer: '#76ff03',
    road: ['#212121', '#111111', '#c6ff00'],
    grass: ['#33691e', '#1b5e20', '#c0ca33'],
    frogBody: '#ccff00',
    frogGlow: true,
    ambientLight: 'rgba(50,255,0,0.1)',
    rain: false,
    cyberNeon: true,
  },
  candy: {
    name: 'Monde de Sucreries 🍭',
    sky: '#fce4ec',
    water: ['#f06292', '#ad1457'], // Juice
    waterShimmer: '#ffffff',
    road: ['#ba68c8', '#7b1fa2', '#f48fb1'],
    grass: ['#f48fb1', '#f06292', '#ec407a'],
    frogBody: '#ffffff',
    frogGlow: false,
    ambientLight: 'rgba(255,192,203,0.1)',
    rain: false,
    cyberNeon: false,
  },
  forest: {
    name: 'Forêt Mystique 🌳',
    sky: '#1b5e20',
    water: ['#004d40', '#00241a'],
    waterShimmer: '#1de9b6',
    road: ['#3e2723', '#271814', '#4caf50'],
    grass: ['#1b5e20', '#2e7d32', '#43a047'],
    frogBody: '#81c784',
    frogGlow: false,
    ambientLight: 'rgba(0,50,0,0.2)',
    rain: false,
    cyberNeon: false,
  },
  deepsea: {
    name: 'Abysses Profonds 🌊',
    sky: '#010a14',
    water: ['#01579b', '#00253d'],
    waterShimmer: '#00e5ff',
    road: ['#00101a', '#000508', '#00b0ff'],
    grass: ['#002137', '#013a52', '#0277bd'],
    frogBody: '#00e5ff',
    frogGlow: true,
    ambientLight: 'rgba(0,10,50,0.4)',
    rain: false,
    cyberNeon: true,
  },
};

// Colors
export const COLORS = {
  white: '#ffffff',
  black: '#000000',
  startGrass: '#256d28',
  frogDark: '#1b5e20',
  frogLight: '#a5d6a7',
  frogBelly: '#c8e6c9',
  frogEye: '#ffffff',
  frogPupil: '#1a1a1a',
  log: '#795548',
  logLight: '#8d6e63',
  logDark: '#4e342e',
  logRing: '#3e2723',
  turtle: '#00897b',
  turtleDark: '#004d40',
  turtleShell: '#26a69a',
  lilypadPad: '#66bb6a',
  lilypadFlower: '#f48fb1',
  homeGoal: '#81c784',
  homeEmpty: '#0d47a1',
  homeGlow: '#4caf50',
  gatorGreen: '#2e7d32',
  gatorDark: '#1b5e20',
  gatorTeeth: '#fff9c4',
  gatorEye: '#ffca28',
};

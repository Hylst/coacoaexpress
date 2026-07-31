// Web Audio API retro arcade sound engine : chiptune avance + effets sonores riches
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

let musicPlaying = false;
let musicSpeedMul = 1.0;
let musicStep = 0;
let nextStepTime = 0.0;
let musicTimerId: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.4;
    sfxGain.connect(masterGain);
  }
  return audioCtx;
}

export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

// ==================== JUICY SFX ====================

export function playHop() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Snappy retro pitch jump
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  const baseFreq = 320 + Math.random() * 60;
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.07);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.11);

  // Soft triangle overtone
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.09);
  gain2.gain.setValueAtTime(0.25, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc2.connect(gain2);
  gain2.connect(sfxGain!);
  osc2.start(now);
  osc2.stop(now + 0.1);
}

export function playTongue() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.1);
}

export function playEatFly(golden: boolean) {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = golden ? [659, 880, 1318, 1760] : [523, 784, 1047]; // E5 A5 E6 A6 or C5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = golden ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.06);
    gain.gain.setValueAtTime(0.25, now + i * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.2);
  });
}

export function playSplash() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Rich filtered noise burst
  const bufferSize = ctx.sampleRate * 0.45;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.frequency.exponentialRampToValueAtTime(250, now + 0.35);
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain!);
  noise.start(now);
  noise.stop(now + 0.4);

  // Glug bubbles
  [0.08, 0.18, 0.28].forEach((delay, idx) => {
    const osc = ctx.createOscillator();
    const bg = ctx.createGain();
    osc.type = 'sine';
    const f = 400 - idx * 90 + Math.random() * 50;
    osc.frequency.setValueAtTime(f, now + delay);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, now + delay + 0.06);
    bg.gain.setValueAtTime(0.25, now + delay);
    bg.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.08);
    osc.connect(bg);
    bg.connect(sfxGain!);
    osc.start(now + delay);
    osc.stop(now + delay + 0.08);
  });
}

export function playCrash() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Heavy metal distortion crunch
  const bufferSize = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.05));
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, now);
  filter.frequency.exponentialRampToValueAtTime(150, now + 0.35);
  filter.Q.value = 5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.8, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain!);
  noise.start(now);
  noise.stop(now + 0.38);

  // Deep sub impact
  const osc = ctx.createOscillator();
  const subGain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);
  subGain.gain.setValueAtTime(0.5, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(subGain);
  subGain.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playGatorSnap() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Violent jaw snap
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g);
  g.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.15);
}

export function playScore() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Ultra satisfying 8-bit shiny chord
  const notes = [523, 659, 784, 1047, 1318]; // C5 E5 G5 C6 E6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    const t = now + i * 0.05;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(t);
    osc.stop(t + 0.28);
  });
}

export function playExtraLife() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Awesome 1-UP jingle
  const notes = [659, 784, 1318, 1047, 1175, 1568]; // E5 G5 E6 C6 D6 G6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = now + i * 0.09;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(t);
    osc.stop(t + 0.38);
  });
}

export function playLevelComplete() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Triumphant retro fanfare
  const melody = [
    { f: 523, t: 0.0, d: 0.12 },
    { f: 659, t: 0.14, d: 0.12 },
    { f: 784, t: 0.28, d: 0.12 },
    { f: 1047, t: 0.42, d: 0.25 },
    { f: 784, t: 0.7,  d: 0.14 },
    { f: 1047, t: 0.86, d: 0.6 },
  ];

  melody.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = note.f;
    const t = now + note.t;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.25, t + note.d * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);
    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(t);
    osc.stop(t + note.d + 0.05);
  });
}

export function playGameOver() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Tragic descending Game Over line
  const notes = [440, 415, 392, 370, 330, 220, 165];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const t = now + i * 0.16;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  });
}

export function playTimeWarning() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 980;
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain);
  gain.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.09);
}

// ==================== ADVANCED CHIPTUNE MUSIC ENGINE ====================

export function setMusicSpeed(faster: boolean) {
  musicSpeedMul = faster ? 1.25 : 1.0;
}

export function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  musicStep = 0;
  const ctx = getCtx();
  nextStepTime = ctx.currentTime + 0.05;

  // Catchy 16-step Chiptune Arcade Sequence
  // C major / A minor upbeat arcade retro jam
  const bassSequence = [130, 130, 164, 130,  196, 130, 164, 146,   110, 110, 130, 110,  164, 110, 146, 130];
  const leadSequence = [523, 0,   659, 0,    784, 880, 0,   784,   659, 0,   587, 0,    659, 587, 523, 0];
  const arpSequence  = [261, 329, 392, 523,  329, 392, 523, 659,   220, 261, 329, 440,  261, 329, 440, 523];

  function scheduleStep() {
    if (!musicPlaying) return;
    const now = ctx.currentTime;

    // Schedule any steps that fall within the next 100ms lookahead
    while (nextStepTime < now + 0.15) {
      const stepIdx = musicStep % 16;
      const t = nextStepTime;
      const stepDuration = (0.13) / musicSpeedMul;

      // 1. Bass (Sawtooth)
      const bFreq = bassSequence[stepIdx];
      if (bFreq > 0) {
        const bOsc = ctx.createOscillator();
        const bGain = ctx.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bFreq, t);
        bGain.gain.setValueAtTime(0.12, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.95);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800 * musicSpeedMul, t);
        bOsc.connect(filter);
        filter.connect(bGain);
        bGain.connect(musicGain!);
        bOsc.start(t);
        bOsc.stop(t + stepDuration);
      }

      // 2. Lead (Square)
      const lFreq = leadSequence[stepIdx];
      if (lFreq > 0) {
        const lOsc = ctx.createOscillator();
        const lGain = ctx.createGain();
        lOsc.type = 'square';
        lOsc.frequency.setValueAtTime(lFreq, t);
        lGain.gain.setValueAtTime(0.08, t);
        lGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.5);
        lOsc.connect(lGain);
        lGain.connect(musicGain!);
        lOsc.start(t);
        lOsc.stop(t + stepDuration * 1.5);
      }

      // 3. Arp (Triangle)
      const aFreq = arpSequence[stepIdx];
      if (aFreq > 0) {
        const aOsc = ctx.createOscillator();
        const aGain = ctx.createGain();
        aOsc.type = 'triangle';
        aOsc.frequency.setValueAtTime(aFreq, t);
        aGain.gain.setValueAtTime(0.06, t);
        aGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.8);
        aOsc.connect(aGain);
        aGain.connect(musicGain!);
        aOsc.start(t);
        aOsc.stop(t + stepDuration);
      }

      // 4. Snappy Retro Percussion
      // High hat every odd step, Snare every 4th step
      if (stepIdx % 2 === 0) {
        // Closed hi-hat (white noise short pulse)
        const bufferSize = ctx.sampleRate * 0.02;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const hh = ctx.createBufferSource();
        hh.buffer = buffer;
        const hhGain = ctx.createGain();
        hhGain.gain.setValueAtTime(0.04, t);
        hhGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
        hh.connect(hhGain);
        hhGain.connect(musicGain!);
        hh.start(t);
        hh.stop(t + 0.02);
      }
      if (stepIdx % 4 === 2) {
        // Retro Snare
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const sn = ctx.createBufferSource();
        sn.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, t);
        const snGain = ctx.createGain();
        snGain.gain.setValueAtTime(0.1, t);
        snGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        sn.connect(filter);
        filter.connect(snGain);
        snGain.connect(musicGain!);
        sn.start(t);
        sn.stop(t + 0.08);
      }

      nextStepTime += stepDuration;
      musicStep++;
    }
  }

  // Schedule periodically
  scheduleStep();
  musicTimerId = setInterval(scheduleStep, 25);
}

export function stopMusic() {
  musicPlaying = false;
  if (musicTimerId) {
    clearInterval(musicTimerId);
    musicTimerId = null;
  }
}

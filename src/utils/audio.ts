// Synthesized Web Audio API camera sound effects & haptic triggers
// Zero external mp3 dependencies, works 100% offline and cross-platform

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Mechanical camera shutter sound:
 * Stage 1: Fast mirror up impulse
 * Stage 2: Curtain travel click
 * Stage 3: Return dampening
 */
export function playShutterSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. First click (Mirror up / Shutter open)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const filter1 = ctx.createBiquadFilter();

  filter1.type = 'highpass';
  filter1.frequency.setValueAtTime(1200, now);

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(450, now);
  osc1.frequency.exponentialRampToValueAtTime(120, now + 0.04);

  gain1.gain.setValueAtTime(0.4, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc1.connect(filter1);
  filter1.connect(gain1);
  gain1.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.05);

  // 2. White noise burst (Mechanical curtain slit)
  try {
    const bufferSize = ctx.sampleRate * 0.06;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2800, now + 0.035);
    noiseFilter.Q.setValueAtTime(3, now + 0.035);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.setValueAtTime(0.6, now + 0.035);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now + 0.035);
    whiteNoise.stop(now + 0.1);
  } catch {
    // Noise buffer fallback
  }

  // 3. Second click (Mirror return)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(320, now + 0.08);
  osc2.frequency.exponentialRampToValueAtTime(80, now + 0.13);

  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.setValueAtTime(0.3, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now + 0.08);
  osc2.stop(now + 0.15);

  // Trigger tactile vibration
  triggerHaptic([35, 25, 45]);
}

/**
 * Short crisp beep for countdown timer (3..2..1)
 */
export function playCountdownBeep(isFinal = false) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const freq = isFinal ? 1480 : 980;
  const duration = isFinal ? 0.18 : 0.09;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);

  triggerHaptic(isFinal ? [60] : [25]);
}

/**
 * Soft confirmation chirp for camera switch or zoom change
 */
export function playChirp() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(1100, now + 0.06);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);

  triggerHaptic([20]);
}

/**
 * Trigger mobile haptic feedback if supported
 */
export function triggerHaptic(pattern: number | number[] = 30) {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Non-blocking on browsers without vibration
  }
}

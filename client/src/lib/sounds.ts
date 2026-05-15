"use client";

type SoundType = "join" | "start" | "reveal" | "ready" | "nextRound" | "gameOver" | "error" | "tick";

const audioCache: Record<string, AudioBuffer> = {};
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  gainValue = 0.3,
  delay = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  setTimeout(() => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, ctx.currentTime + duration);

    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, delay);
}

const sounds: Record<SoundType, () => void> = {
  join: () => {
    playTone(440, 0.1, "sine", 0.2);
    playTone(550, 0.1, "sine", 0.2, 100);
    playTone(660, 0.15, "sine", 0.2, 200);
  },
  start: () => {
    playTone(220, 0.1, "square", 0.15);
    playTone(330, 0.1, "square", 0.15, 100);
    playTone(440, 0.1, "square", 0.15, 200);
    playTone(660, 0.2, "square", 0.15, 300);
  },
  reveal: () => {
    playTone(880, 0.08, "sawtooth", 0.1);
    playTone(660, 0.08, "sawtooth", 0.1, 80);
    playTone(440, 0.08, "sawtooth", 0.1, 160);
    playTone(330, 0.3, "sawtooth", 0.1, 240);
  },
  ready: () => {
    playTone(523, 0.1, "sine", 0.15);
    playTone(659, 0.15, "sine", 0.15, 100);
  },
  nextRound: () => {
    playTone(440, 0.1, "triangle", 0.2);
    playTone(550, 0.1, "triangle", 0.2, 150);
    playTone(440, 0.15, "triangle", 0.2, 300);
  },
  gameOver: () => {
    playTone(440, 0.2, "sine", 0.25);
    playTone(330, 0.2, "sine", 0.25, 200);
    playTone(220, 0.4, "sine", 0.25, 400);
  },
  error: () => {
    playTone(200, 0.1, "sawtooth", 0.2);
    playTone(180, 0.2, "sawtooth", 0.15, 100);
  },
  tick: () => {
    playTone(800, 0.05, "square", 0.1);
  },
};

export function playSound(type: SoundType): void {
  try {
    sounds[type]?.();
  } catch (e) {
    // Silently fail if audio context not available
  }
}

export function resumeAudio(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    ctx.resume();
  }
}

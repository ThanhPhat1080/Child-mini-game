/**
 * Small synthesized sound effects + a child-like voice (Web Audio / speechSynthesis).
 * No files needed; call only after a user gesture (ADR-016). Swap for recorded files later if wanted.
 */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, t: number, f0: number, f1: number, dur: number, type: OscillatorType, gain = 0.25) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Child-like voice: high pitch, slightly slow, English female voice if present. */
export function speakKid(text: string, opts: { pitch?: number; rate?: number } = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  u.voice = voices.find((v) => /samantha|zira|female|google us english|karen|victoria/i.test(v.name)) ?? voices[0] ?? null;
  u.pitch = opts.pitch ?? 1.9;
  u.rate = opts.rate ?? 0.95;
  u.volume = 1;
  synth.speak(u);
}

/** Soft descending "oh-oh" (two wobbly notes). */
export function ohOh(): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  tone(c, t, 520, 400, 0.28, 'triangle', 0.28);
  tone(c, t + 0.34, 420, 300, 0.4, 'triangle', 0.28);
  speakKid('Oh-oh!', { pitch: 1.6, rate: 0.8 });
}

/** Happy rising sparkle plus a cheerful "Yay, hooray!". */
export function yay(): void {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.09, f, f * 1.01, 0.3, 'sine', 0.2));
  speakKid('Yay! Hooray!', { pitch: 2, rate: 1.05 });
}

/** Audience applause: many tiny band-passed noise claps over `seconds`. */
export function applause(seconds = 3): void {
  const c = ac();
  if (!c) return;
  const len = Math.floor(c.sampleRate * 0.06);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const t0 = c.currentTime + 0.05;
  const claps = Math.floor(seconds * 55);
  for (let n = 0; n < claps; n++) {
    const phase = n / claps;
    const level = Math.sin(Math.min(1, phase * 1.15) * Math.PI) * 0.9 + 0.1; // swell then fade
    if (Math.random() > level) continue;
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200 + Math.random() * 2400;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = 0.35 * level * (0.4 + Math.random() * 0.6);
    s.connect(f).connect(g).connect(c.destination);
    s.start(t0 + phase * seconds + Math.random() * 0.02);
  }
}

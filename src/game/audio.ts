// Tiny chiptune sound effects synthesized with WebAudio (no files to load).
import type { GameEvent } from "./sim/world";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.35;
}

function tone(
  f0: number,
  f1: number,
  dur: number,
  { type = "square" as OscillatorType, vol = 0.25, delay = 0 } = {},
) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function notes(freqs: number[], step: number, opts: { type?: OscillatorType; vol?: number } = {}) {
  freqs.forEach((f, i) => tone(f, f, step * 0.95, { ...opts, delay: i * step }));
}

function noise(dur: number, vol = 0.3) {
  if (!ctx || !master) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(g).connect(master);
  src.start();
}

export function playSfx(e: GameEvent) {
  if (!ctx) return;
  switch (e) {
    case "jump":
      tone(320, 780, 0.16, { vol: 0.16 });
      break;
    case "coin":
      tone(988, 988, 0.07, { vol: 0.18 });
      tone(1319, 1319, 0.3, { vol: 0.18, delay: 0.07 });
      break;
    case "stomp":
    case "kick":
      tone(500, 90, 0.12, { type: "triangle", vol: 0.4 });
      break;
    case "bump":
      tone(140, 70, 0.08, { type: "triangle", vol: 0.4 });
      break;
    case "break":
      noise(0.25, 0.35);
      tone(200, 60, 0.15, { type: "triangle", vol: 0.3 });
      break;
    case "sprout":
      notes([392, 494, 587, 784], 0.06, { vol: 0.15 });
      break;
    case "powerup":
      notes([523, 659, 784, 1047, 784, 1047, 1319], 0.055, { vol: 0.15 });
      break;
    case "shrink":
      notes([784, 587, 440, 330], 0.07, { vol: 0.15 });
      break;
    case "oneup":
      notes([659, 784, 1319, 1047, 1175, 1568], 0.08, { vol: 0.15 });
      break;
    case "die":
      notes([494, 698, 698, 698, 659, 587, 523, 330, 262], 0.13, { vol: 0.16 });
      break;
    case "flag":
      tone(1400, 260, 1.0, { vol: 0.12 });
      break;
    case "win":
      notes([392, 523, 659, 784, 1047, 1319, 1568, 1319], 0.11, { vol: 0.15 });
      break;
  }
}

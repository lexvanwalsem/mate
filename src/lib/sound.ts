// Move sounds are the Lichess sounds that Chesskit ships (AGPL). The success chime is synthesized.
export type Sound = "move" | "capture" | "error" | "success";

const FILES: Partial<Record<Sound, string>> = { move: "sounds/move.mp3", capture: "sounds/capture.mp3", error: "sounds/error.mp3" };
const buffers = new Map<string, AudioBuffer>();
let context: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};

async function ctx(): Promise<AudioContext> {
  context ??= new AudioContext();
  if (context.state === "suspended") await context.resume();
  return context;
}

async function playFile(url: string, volume: number) {
  const audio = await ctx();
  let buffer = buffers.get(url);
  if (!buffer) {
    buffer = await audio.decodeAudioData(await (await fetch(url)).arrayBuffer());
    buffers.set(url, buffer);
  }
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain).connect(audio.destination);
  source.start();
}

/** A quick rising two-note chime. */
async function chime() {
  const audio = await ctx();
  [659.25, 987.77].forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + i * 0.11;
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + 0.4);
  });
}

export function play(sound: Sound) {
  if (!enabled) return;
  const run = sound === "success" ? chime() : playFile(FILES[sound]!, 0.35);
  run.catch(() => {
    // no audio device or autoplay blocked: staying silent is fine
  });
}

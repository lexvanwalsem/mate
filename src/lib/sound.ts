// All sounds are made on the spot with the Web Audio API: no sound files, so nothing with an unclear license.
export type Sound = "move" | "capture" | "error" | "success";

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

/** A wooden "tock": a very short burst of noise through a band-pass filter, like a piece set down on a board. */
function tock(audio: AudioContext, at: number, pitch: number, volume: number) {
  const length = Math.floor(audio.sampleRate * 0.06);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = pitch;
  filter.Q.value = 6;
  const gain = audio.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(at);
}

/** A soft tone that slides down: "not this one". */
function slide(audio: AudioContext) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(330, now);
  osc.frequency.exponentialRampToValueAtTime(196, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

/** A quick rising two-note chime. */
function chime(audio: AudioContext) {
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
  ctx()
    .then((audio) => {
      const now = audio.currentTime;
      if (sound === "move") tock(audio, now, 1400, 0.9);
      else if (sound === "capture") {
        tock(audio, now, 900, 1);
        tock(audio, now + 0.045, 1600, 0.7);
      } else if (sound === "error") slide(audio);
      else chime(audio);
    })
    .catch(() => {
      // no audio device or autoplay blocked: staying silent is fine
    });
}

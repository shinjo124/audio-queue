import { mountAudioControls } from './audio-controls.ts';
import { getSharedAudioContext, getSharedAudioGraph } from './audio-context.ts';
import { createAudioTaskQueue } from './audio-task-queue.ts';
import { startVisualizer, type AudioVisualizer } from './audio-visualizer.ts';
import './styles.css';

const audioContext = getSharedAudioContext();
const audioGraph = getSharedAudioGraph(audioContext);
const canvas = document.querySelector<HTMLCanvasElement>('#visualizer');
const root = document.querySelector<HTMLElement>('#track-list');

if (canvas === null || root === null) {
  throw new Error('The audio demo page is missing a required element.');
}

const queue = createAudioTaskQueue(2);
const demoTracks = [
  { id: 'warmup-440', title: 'Warm-up · 440 Hz', frequency: 440 },
  { id: 'bright-660', title: 'Bright · 660 Hz', frequency: 660 },
  { id: 'high-880', title: 'High · 880 Hz', frequency: 880 },
].map((track) => ({
  id: track.id,
  title: track.title,
  url: makeToneUrl(track.frequency),
}));

let activePlaybackCount = 0;
let visualizer: AudioVisualizer | null = null;

const controls = mountAudioControls(root, {
  tracks: demoTracks,
  queue,
  audioContext,
  onPlaybackChange(playing) {
    activePlaybackCount = Math.max(0, activePlaybackCount + (playing ? 1 : -1));
    if (activePlaybackCount > 0 && visualizer === null) {
      visualizer = startVisualizer(canvas, audioGraph);
    } else if (activePlaybackCount === 0 && visualizer !== null) {
      visualizer.stop();
      visualizer = null;
    }
  },
});

window.addEventListener('pagehide', () => {
  controls.destroy();
  visualizer?.stop();
  for (const track of demoTracks) URL.revokeObjectURL(track.url);
}, { once: true });

function makeToneUrl(frequency: number): string {
  const sampleRate = 22050;
  const durationSeconds = 2;
  const sampleCount = sampleRate * durationSeconds;
  const bytes = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(bytes);
  const writeText = (offset: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, bytes.byteLength - 8, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, sampleCount * 2, true);

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const envelope = Math.min(1, sample / 500, (sampleCount - sample) / 500);
    const value = Math.sin((2 * Math.PI * frequency * sample) / sampleRate) * envelope * 0.35;
    view.setInt16(44 + sample * 2, Math.round(value * 32767), true);
  }

  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

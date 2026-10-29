import type { AudioGraph } from './audio-context.ts';

export interface VisualizerOptions {
  devicePixelRatio?: number;
  requestAnimationFrame?: typeof requestAnimationFrame;
  cancelAnimationFrame?: typeof cancelAnimationFrame;
}

export interface AudioVisualizer {
  readonly isRunning: boolean;
  stop: () => void;
}

export function startVisualizer(
  canvas: HTMLCanvasElement,
  graph: AudioGraph,
  options: VisualizerOptions = {},
): AudioVisualizer {
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('A 2D canvas context is required.');

  const pixelRatio = options.devicePixelRatio ?? window.devicePixelRatio ?? 1;
  const requestFrame = options.requestAnimationFrame ?? requestAnimationFrame;
  const cancelFrame = options.cancelAnimationFrame ?? cancelAnimationFrame;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  let running = true;
  let frameId = 0;

  const draw = (): void => {
    if (!running) return;

    graph.analyser.getByteFrequencyData(graph.frequencyData);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#2563eb';
    const binWidth = width / graph.frequencyData.length;
    for (let index = 0; index < graph.frequencyData.length; index += 1) {
      const barHeight = (graph.frequencyData[index] / 255) * height;
      context.fillRect(index * binWidth, height - barHeight, Math.max(1, binWidth - 1), barHeight);
    }

    frameId = requestFrame(draw);
  };

  frameId = requestFrame(draw);

  return {
    get isRunning() {
      return running;
    },
    stop() {
      if (!running) return;
      running = false;
      cancelFrame(frameId);
    },
  };
}

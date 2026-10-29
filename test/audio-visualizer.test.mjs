import assert from 'node:assert/strict';
import test from 'node:test';
import { startVisualizer } from '../audio-visualizer.ts';

function createCanvas() {
  const calls = [];
  const context = {
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    clearRect(...args) { calls.push(['clearRect', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    set fillStyle(value) { calls.push(['fillStyle', value]); },
  };
  return {
    calls,
    width: 0,
    height: 0,
    clientWidth: 100,
    clientHeight: 50,
    getContext: () => context,
  };
}

test('draws analyser data directly on one loop and scales the canvas for DPR', () => {
  const canvas = createCanvas();
  const scheduled = [];
  const analyser = {
    frequencyBinCount: 4,
    getByteFrequencyData(data) { data.set([0, 64, 128, 255]); },
  };
  const graph = { analyser, frequencyData: new Uint8Array(4) };
  const visualizer = startVisualizer(canvas, graph, {
    devicePixelRatio: 2,
    requestAnimationFrame(callback) {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancelAnimationFrame() {},
  });

  assert.equal(scheduled.length, 1);
  scheduled[0]();

  assert.equal(canvas.width, 200);
  assert.equal(canvas.height, 100);
  assert.ok(canvas.calls.some(([name, ...args]) => name === 'setTransform' && args[0] === 2));
  assert.ok(canvas.calls.some(([name]) => name === 'fillRect'));
  assert.equal(scheduled.length, 2);
  visualizer.stop();
  assert.equal(visualizer.isRunning, false);
});

test('stop cancels the pending frame and prevents another frame from being scheduled', () => {
  const canvas = createCanvas();
  const scheduled = [];
  const cancelled = [];
  const graph = {
    analyser: { frequencyBinCount: 1, getByteFrequencyData() {} },
    frequencyData: new Uint8Array(1),
  };
  const visualizer = startVisualizer(canvas, graph, {
    devicePixelRatio: 1,
    requestAnimationFrame(callback) {
      scheduled.push(callback);
      return scheduled.length;
    },
    cancelAnimationFrame(id) { cancelled.push(id); },
  });

  visualizer.stop();
  assert.deepEqual(cancelled, [1]);
  assert.equal(scheduled.length, 1);
});

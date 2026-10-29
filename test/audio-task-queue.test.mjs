import assert from 'node:assert/strict';
import test from 'node:test';
import { ConcurrentAudioTaskQueue } from '../audio-task-queue.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('starts asynchronous tasks in FIFO order', async () => {
  const started = [];
  const gates = new Map();
  const queue = new ConcurrentAudioTaskQueue((trackUrl) => {
    started.push(trackUrl);
    const gate = deferred();
    gates.set(trackUrl, gate);
    return gate.promise;
  });

  const first = queue.enqueue('first');
  const second = queue.enqueue('second');
  const third = queue.enqueue('third');

  assert.deepEqual(started, ['first']);
  gates.get('first').resolve('decoded first');
  assert.equal(await first.promise, 'decoded first');
  assert.deepEqual(started, ['first', 'second']);
  gates.get('second').resolve('decoded second');
  assert.equal(await second.promise, 'decoded second');
  assert.deepEqual(started, ['first', 'second', 'third']);
  gates.get('third').resolve('decoded third');
  assert.equal(await third.promise, 'decoded third');
});

test('never exceeds the configured concurrency limit', async () => {
  const started = [];
  const active = new Set();
  let maximumActive = 0;
  const gates = new Map();
  const queue = new ConcurrentAudioTaskQueue((trackUrl) => {
    started.push(trackUrl);
    active.add(trackUrl);
    maximumActive = Math.max(maximumActive, active.size);
    const gate = deferred();
    gates.set(trackUrl, gate);
    return gate.promise.finally(() => active.delete(trackUrl));
  }, 2);

  const first = queue.enqueue('first');
  const second = queue.enqueue('second');
  const third = queue.enqueue('third');

  assert.deepEqual(started, ['first', 'second']);
  gates.get('second').resolve('decoded second');
  await second.promise;
  assert.deepEqual(started, ['first', 'second', 'third']);
  assert.equal(maximumActive, 2);
  gates.get('first').resolve('decoded first');
  gates.get('third').resolve('decoded third');
  await Promise.all([first.promise, third.promise]);
  assert.equal(active.size, 0);
});

test('cancels a queued task without running its executor', async () => {
  const started = [];
  const firstGate = deferred();
  const queue = new ConcurrentAudioTaskQueue((trackUrl) => {
    started.push(trackUrl);
    return trackUrl === 'first' ? firstGate.promise : Promise.resolve(trackUrl);
  });

  const first = queue.enqueue('first');
  const second = queue.enqueue('second');
  const secondRejected = assert.rejects(second.promise, { name: 'AbortError' });
  second.cancel();

  await secondRejected;
  assert.deepEqual(started, ['first']);
  firstGate.resolve('decoded first');
  await first.promise;
  assert.deepEqual(started, ['first']);
});

test('aborts an active task and ignores its late result', async () => {
  const gate = deferred();
  let taskSignal;
  const queue = new ConcurrentAudioTaskQueue((_trackUrl, signal) => {
    taskSignal = signal;
    return gate.promise;
  });
  const request = queue.enqueue('active');
  const requestRejected = assert.rejects(request.promise, { name: 'AbortError' });

  request.cancel();
  await requestRejected;
  assert.equal(taskSignal.aborted, true);
  gate.resolve('late result');
  await Promise.resolve();
  assert.equal(taskSignal.aborted, true);
});

test('requires a positive integer concurrency limit', () => {
  assert.throws(() => new ConcurrentAudioTaskQueue(async () => 'result', 0), RangeError);
  assert.throws(() => new ConcurrentAudioTaskQueue(async () => 'result', 1.5), RangeError);
});

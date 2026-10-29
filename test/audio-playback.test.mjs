import assert from 'node:assert/strict';
import test from 'node:test';
import { playAudioBuffer } from '../audio-playback.ts';

function createPlaybackContext() {
  const sources = [];
  let resumeCalls = 0;
  return {
    destination: {},
    get sources() { return sources; },
    get resumeCalls() { return resumeCalls; },
    resume() {
      resumeCalls += 1;
      return Promise.resolve();
    },
    createBufferSource() {
      const source = {
        connectCalls: [],
        disconnectCalls: 0,
        startCalls: 0,
        stopCalls: 0,
        connect(target) { this.connectCalls.push(target); },
        disconnect() { this.disconnectCalls += 1; },
        start() { this.startCalls += 1; },
        stop() { this.stopCalls += 1; },
      };
      sources.push(source);
      return source;
    },
  };
}

test('resumes from the call and creates a fresh one-shot source for each play', () => {
  const context = createPlaybackContext();
  const firstBuffer = { duration: 1 };
  const secondBuffer = { duration: 2 };

  playAudioBuffer(context, firstBuffer);
  playAudioBuffer(context, secondBuffer);

  assert.equal(context.resumeCalls, 2);
  assert.equal(context.sources.length, 2);
  assert.equal(context.sources[0].buffer, firstBuffer);
  assert.equal(context.sources[1].buffer, secondBuffer);
  assert.equal(context.sources[0].startCalls, 1);
  assert.equal(context.sources[1].startCalls, 1);
});

test('stops and disconnects on ended, then releases the active source reference', () => {
  const context = createPlaybackContext();
  const playback = playAudioBuffer(context, { duration: 1 });
  const source = context.sources[0];

  source.onended();

  assert.equal(source.stopCalls, 1);
  assert.equal(source.disconnectCalls, 1);
  assert.equal(playback.isActive, false);
});

test('stop handle cleans up an active source and can be called repeatedly', () => {
  const context = createPlaybackContext();
  const playback = playAudioBuffer(context, { duration: 1 });
  const source = context.sources[0];

  playback.stop();
  playback.stop();

  assert.equal(source.stopCalls, 1);
  assert.equal(source.disconnectCalls, 1);
  assert.equal(playback.isActive, false);
});

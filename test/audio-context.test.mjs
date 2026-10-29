import assert from 'node:assert/strict';
import test from 'node:test';
import { getSharedAudioContext, loadAudioBuffer } from '../audio-context.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('creates one shared context and returns it on later calls', () => {
  const context = {};
  let creations = 0;
  const createContext = () => {
    creations += 1;
    return context;
  };

  assert.equal(getSharedAudioContext(createContext), context);
  assert.equal(getSharedAudioContext(createContext), context);
  assert.equal(creations, 1);
});

test('decodes fetched bytes and returns the AudioBuffer', async () => {
  const controller = new AbortController();
  const bytes = new ArrayBuffer(8);
  const audioBuffer = { duration: 2 };
  let decodedBytes;
  const context = {
    decodeAudioData: async (input) => {
      decodedBytes = input;
      return audioBuffer;
    },
  };
  const fakeFetch = async (url, options) => {
    assert.equal(url, '/track.ogg');
    assert.equal(options.signal, controller.signal);
    return { ok: true, status: 200, arrayBuffer: async () => bytes };
  };

  const result = await loadAudioBuffer('/track.ogg', controller.signal, context, fakeFetch);

  assert.equal(decodedBytes, bytes);
  assert.equal(result, audioBuffer);
});

test('rejects with AbortError when cancelled during non-cancellable decoding', async () => {
  const controller = new AbortController();
  const decodeGate = deferred();
  const bytes = new ArrayBuffer(8);
  let markDecodeStarted;
  const decodeStarted = new Promise((resolve) => { markDecodeStarted = resolve; });
  const context = {
    decodeAudioData: () => {
      markDecodeStarted();
      return decodeGate.promise;
    },
  };
  const fakeFetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => bytes });
  const pending = loadAudioBuffer('/track.ogg', controller.signal, context, fakeFetch);
  const pendingRejected = assert.rejects(pending, { name: 'AbortError' });

  await decodeStarted;
  controller.abort();
  decodeGate.resolve({ duration: 2 });
  await pendingRejected;
});

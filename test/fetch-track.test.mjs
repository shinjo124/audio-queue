import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchTrack } from '../fetch-track.ts';

test('forwards the task signal to fetch and returns the downloaded bytes', async () => {
  const controller = new AbortController();
  const bytes = new ArrayBuffer(4);
  let request;
  const fakeFetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, arrayBuffer: async () => bytes };
  };

  const result = await fetchTrack('/track.ogg', controller.signal, fakeFetch);

  assert.equal(request.url, '/track.ogg');
  assert.equal(request.options.signal, controller.signal);
  assert.equal(result, bytes);
});

test('reports unsuccessful HTTP responses with their status', async () => {
  const fakeFetch = async () => ({ ok: false, status: 503 });

  await assert.rejects(
    fetchTrack('/missing.ogg', new AbortController().signal, fakeFetch),
    /503/,
  );
});

test('preserves AbortError as cancellation rather than wrapping it as a download failure', async () => {
  const abortError = new Error('cancelled');
  abortError.name = 'AbortError';
  const fakeFetch = async () => { throw abortError; };

  await assert.rejects(
    fetchTrack('/track.ogg', new AbortController().signal, fakeFetch),
    (error) => error === abortError,
  );
});

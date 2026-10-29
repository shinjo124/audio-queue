import { fetchTrack } from './fetch-track.ts';

let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(
  create: () => AudioContext = () => new AudioContext(),
): AudioContext {
  if (sharedAudioContext === null) {
    sharedAudioContext = create();
  }
  return sharedAudioContext;
}

export async function loadAudioBuffer(
  url: string,
  signal: AbortSignal,
  context: AudioContext = getSharedAudioContext(),
  fetcher: typeof fetch = fetch,
): Promise<AudioBuffer> {
  const encodedAudio = await fetchTrack(url, signal, fetcher);
  if (signal.aborted) throw createAbortError();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await context.decodeAudioData(encodedAudio);
  } catch (error) {
    if (signal.aborted) throw createAbortError();
    throw error;
  }

  // Decoding cannot be aborted, so discard its result if cancellation arrived meanwhile.
  if (signal.aborted) throw createAbortError();
  return audioBuffer;
}

function createAbortError(): Error {
  const error = new Error('Audio task was cancelled.');
  error.name = 'AbortError';
  return error;
}

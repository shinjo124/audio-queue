import { fetchTrack } from './fetch-track.ts';

let sharedAudioContext: AudioContext | null = null;
let sharedAudioGraph: AudioGraph | null = null;

export interface AudioGraph {
  analyser: AnalyserNode;
  frequencyData: Uint8Array;
}

export function getSharedAudioContext(
  create: () => AudioContext = () => new AudioContext(),
): AudioContext {
  if (sharedAudioContext === null) {
    sharedAudioContext = create();
  }
  return sharedAudioContext;
}

export function getSharedAudioGraph(
  context: AudioContext = getSharedAudioContext(),
): AudioGraph {
  if (sharedAudioGraph === null) {
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    sharedAudioGraph = {
      analyser,
      frequencyData: new Uint8Array(analyser.frequencyBinCount),
    };
    analyser.connect(context.destination);
  }
  return sharedAudioGraph;
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

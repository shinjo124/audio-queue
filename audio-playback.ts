export interface AudioPlayback {
  readonly isActive: boolean;
  stop: () => void;
}

export function playAudioBuffer(
  audioContext: AudioContext,
  audioBuffer: AudioBuffer,
  analyser: AnalyserNode = getSharedAudioGraph(audioContext).analyser,
): AudioPlayback {
  // Call this function directly from a user gesture handler to unlock audio playback.
  void audioContext.resume().catch(() => undefined);

  let source: AudioBufferSourceNode | null = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(analyser);

  const cleanup = (): void => {
    const activeSource = source;
    if (activeSource === null) return;

    source = null;
    activeSource.stop();
    activeSource.disconnect();
  };

  source.onended = cleanup;
  source.start();

  return {
    get isActive() {
      return source !== null;
    },
    stop: cleanup,
  };
}
import { getSharedAudioGraph } from './audio-context.ts';

export interface AudioTask {
  trackUrl: string;
  controller: AbortController;
  resolve: (buffer: AudioBuffer) => void;
  reject: (reason?: unknown) => void;
}

export interface EnqueuedAudio {
  promise: Promise<AudioBuffer>;
  cancel: () => void;
}

export interface AudioTaskQueue {
  enqueue(trackUrl: string): EnqueuedAudio;
}

export interface AudioTask<TResult = AudioBuffer> {
  trackUrl: string;
  controller: AbortController;
  resolve: (result: TResult) => void;
  reject: (reason?: unknown) => void;
}

export interface EnqueuedAudio<TResult = AudioBuffer> {
  promise: Promise<TResult>;
  cancel: () => void;
}

export interface AudioTaskQueue<TResult = AudioBuffer> {
  enqueue(trackUrl: string): EnqueuedAudio<TResult>;
}

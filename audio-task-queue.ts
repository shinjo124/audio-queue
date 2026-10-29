import type { AudioTask, AudioTaskQueue, EnqueuedAudio } from './audio-queue-contract.ts';

export type AudioTaskExecutor<TResult> = (
  trackUrl: string,
  signal: AbortSignal,
) => Promise<TResult>;

type QueuedAudioTask<TResult> = AudioTask<TResult> & { settled: boolean };

export class ConcurrentAudioTaskQueue<TResult = AudioBuffer> implements AudioTaskQueue<TResult> {
  private readonly tasks: QueuedAudioTask<TResult>[] = [];
  private readonly executor: AudioTaskExecutor<TResult>;
  private activeCount = 0;
  readonly concurrencyLimit: number;

  constructor(executor: AudioTaskExecutor<TResult>, concurrencyLimit = 1) {
    if (!Number.isInteger(concurrencyLimit) || concurrencyLimit < 1) {
      throw new RangeError('Concurrency limit must be a positive integer.');
    }

    this.executor = executor;
    this.concurrencyLimit = concurrencyLimit;
  }

  enqueue(trackUrl: string): EnqueuedAudio<TResult> {
    let task!: QueuedAudioTask<TResult>;
    const promise = new Promise<TResult>((resolve, reject) => {
      task = {
        trackUrl,
        controller: new AbortController(),
        resolve,
        reject,
        settled: false,
      };
      this.tasks.push(task);
    });

    this.processNext();
    return { promise, cancel: () => this.cancel(task) };
  }

  private cancel(task: QueuedAudioTask<TResult>): void {
    if (task.settled) return;

    task.controller.abort();
    const queuedIndex = this.tasks.indexOf(task);
    if (queuedIndex !== -1) this.tasks.splice(queuedIndex, 1);
    this.rejectTask(task, createAbortError());
    this.processNext();
  }

  private processNext(): void {
    while (this.activeCount < this.concurrencyLimit && this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (!task) return;
      if (task.controller.signal.aborted) {
        this.rejectTask(task, createAbortError());
        continue;
      }

      this.activeCount += 1;
      void this.runTask(task);
    }
  }

  private async runTask(task: QueuedAudioTask<TResult>): Promise<void> {
    try {
      const result = await this.executor(task.trackUrl, task.controller.signal);
      if (task.controller.signal.aborted) {
        this.rejectTask(task, createAbortError());
      } else {
        this.resolveTask(task, result);
      }
    } catch (error) {
      this.rejectTask(task, task.controller.signal.aborted ? createAbortError() : error);
    } finally {
      this.activeCount -= 1;
      this.processNext();
    }
  }

  private resolveTask(task: QueuedAudioTask<TResult>, result: TResult): void {
    if (task.settled) return;
    task.settled = true;
    task.resolve(result);
  }

  private rejectTask(task: QueuedAudioTask<TResult>, reason: unknown): void {
    if (task.settled) return;
    task.settled = true;
    task.reject(reason);
  }
}

function createAbortError(): Error {
  const error = new Error('Audio task was cancelled.');
  error.name = 'AbortError';
  return error;
}

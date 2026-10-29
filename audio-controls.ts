import type { AudioTaskQueue, EnqueuedAudio } from './audio-queue-contract.ts';
import { getSharedAudioContext, getSharedAudioGraph } from './audio-context.ts';
import { playAudioBuffer, type AudioPlayback } from './audio-playback.ts';

export interface AudioTrack {
  id: string;
  title: string;
  url: string;
}

export interface AudioControlsOptions {
  tracks: AudioTrack[];
  queue: AudioTaskQueue<AudioBuffer>;
  audioContext?: AudioContext;
}

interface TrackState {
  status: string;
  request: EnqueuedAudio<AudioBuffer> | null;
  buffer: AudioBuffer | null;
  playback: AudioPlayback | null;
}

export interface AudioControls {
  destroy: () => void;
}

export function mountAudioControls(
  root: HTMLElement,
  options: AudioControlsOptions,
): AudioControls {
  const context = options.audioContext ?? getSharedAudioContext();
  const trackStates = new Map<string, TrackState>();
  const list = document.createElement('ul');
  list.setAttribute('aria-label', 'Audio tracks');

  for (const track of options.tracks) {
    const item = document.createElement('li');
    item.dataset.trackId = track.id;

    const title = document.createElement('span');
    title.textContent = track.title;
    item.append(title);

    const status = document.createElement('span');
    status.dataset.role = 'status';
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Ready to queue';
    item.append(status);

    for (const [action, label] of [
      ['queue', 'Queue'],
      ['play', 'Play'],
      ['stop', 'Stop'],
      ['cancel', 'Cancel'],
    ]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.textContent = label;
      button.disabled = action !== 'queue';
      item.append(button);
    }

    list.append(item);
    trackStates.set(track.id, { status: 'Ready to queue', request: null, buffer: null, playback: null });
  }

  root.replaceChildren(list);

  const updateStatus = (item: HTMLElement, state: TrackState, statusText: string): void => {
    state.status = statusText;
    const status = item.querySelector<HTMLElement>('[data-role="status"]');
    if (status !== null) status.textContent = statusText;

    const buttons = item.querySelectorAll<HTMLButtonElement>('button[data-action]');
    for (const button of buttons) {
      const action = button.dataset.action;
      button.disabled = action === 'queue'
        ? state.request !== null || state.playback !== null
        : action === 'play'
          ? state.buffer === null || state.playback !== null
          : action === 'stop'
            ? state.playback === null
            : state.request === null;
    }
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    const item = button?.closest<HTMLElement>('li[data-track-id]');
    if (button === null || button === undefined || item === null || item === undefined) return;

    const track = options.tracks.find((candidate) => candidate.id === item.dataset.trackId);
    const state = trackStates.get(item.dataset.trackId ?? '');
    if (track === undefined || state === undefined) return;

    if (button.dataset.action === 'queue') {
      state.buffer = null;
      const request = options.queue.enqueue(track.url);
      state.request = request;
      updateStatus(item, state, 'Queued');
      void request.promise.then((buffer) => {
        if (state.request !== request) return;
        state.request = null;
        state.buffer = buffer;
        updateStatus(item, state, 'Ready');
      }).catch((error: unknown) => {
        if (state.request !== request) return;
        state.request = null;
        updateStatus(item, state, isAbortError(error) ? 'Cancelled' : 'Failed');
      });
      return;
    }

    if (button.dataset.action === 'cancel' && state.request !== null) {
      state.request.cancel();
      return;
    }

    if (button.dataset.action === 'play' && state.buffer !== null) {
      state.playback = playAudioBuffer(
        context,
        state.buffer,
        getSharedAudioGraph(context).analyser,
        () => {
          state.playback = null;
          updateStatus(item, state, 'Ready');
        },
      );
      updateStatus(item, state, 'Playing');
      return;
    }

    if (button.dataset.action === 'stop' && state.playback !== null) {
      state.playback.stop();
      state.playback = null;
      updateStatus(item, state, 'Ready');
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    for (const item of list.querySelectorAll<HTMLElement>('li[data-track-id]')) {
      const state = trackStates.get(item.dataset.trackId ?? '');
      if (state?.playback === null || state?.playback === undefined) continue;
      state.playback.stop();
      state.playback = null;
      updateStatus(item, state, 'Ready');
    }
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return {
    destroy() {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
      for (const item of list.querySelectorAll<HTMLElement>('li[data-track-id]')) {
        const state = trackStates.get(item.dataset.trackId ?? '');
        state?.request?.cancel();
        state?.playback?.stop();
      }
      root.replaceChildren();
    },
  };
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'name' in error
    && error.name === 'AbortError';
}

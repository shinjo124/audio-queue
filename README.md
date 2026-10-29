# Concurrent Audio Queue

A Vite + TypeScript lab demo for a FIFO audio task queue, Web Audio playback, and a Canvas frequency visualizer. The page generates three short local tone tracks in memory, so the demo does not depend on a remote audio host.

## Run

```sh
npm install
npm run dev
```

For a production build and preview:

```sh
npm run build
npm run preview
```

Run the queue and browser API unit tests with Node 24 or later:

```sh
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test
```

## Design decisions

- **FIFO and concurrency:** `enqueue` adds work at the tail and returns `{ promise, cancel }`. The queue starts tasks from the head, up to its configured concurrency limit. Dispatch is FIFO; tasks may finish in a different order. The reusable queue defaults to one concurrent task, while the demo uses two.
- **Fetch and decode:** Each task passes its `AbortSignal` to `fetch`. HTTP errors reject the task. Since `decodeAudioData` cannot be aborted, the loader checks the signal after decoding and discards the decoded buffer if cancellation arrived meanwhile.
- **Shared audio graph:** The app obtains one `AudioContext` through a singleton accessor and reuses one `AnalyserNode`. The analyser uses `fftSize = 256`, connects to the context destination, and owns one preallocated frequency `Uint8Array`.
- **Playback lifecycle:** Each play creates a new one-shot `AudioBufferSourceNode`, connects it through the analyser, and calls `AudioContext.resume()` from the Play click. Stop and `ended` stop and disconnect the source and release its reference.
- **Visualizer:** One `requestAnimationFrame` loop reads into the shared frequency array and draws directly to Canvas. The canvas backing size is scaled for `devicePixelRatio`. The loop starts during playback and is cancelled when playback stops.
- **Controls:** Rows and buttons are created with DOM APIs and text content. Click and `keydown` handlers are delegated from the controls root; Escape stops active playback. No `innerHTML`, inline event handlers, `keypress`, or `keyCode` are used.

## Keyboard and screen-reader use

- Use Tab and Shift+Tab to move among the native Queue, Play, Stop, and Cancel buttons.
- Press Enter or Space to activate the focused button.
- Press Escape while focus is inside the controls to stop active playback.
- Each track row exposes its current queue/playback status through a polite live region.

## Verification

See [AUDIT.md](./AUDIT.md) for the recorded build, test, preview, and outstanding manual browser checks. The current controls take a fixed track list; a user-editable track URL input is still future work.

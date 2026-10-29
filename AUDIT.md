# Implementation audit

## Decisions recorded

1. Queue insertion and dispatch are FIFO. The concurrency limit defaults to one; the demo configures two active downloads/decodes.
2. `enqueue` returns a promise and a cancellation function. Cancellation aborts fetch and prevents success from being reported. A decode already in progress is allowed to finish, then its result is discarded if the signal is aborted.
3. All tracks share one singleton `AudioContext`, `AnalyserNode`, and analyser frequency buffer. The analyser FFT size is 256.
4. Every play creates a fresh one-shot source node. Playback resume is requested in the Play click path; ended/stopped sources are stopped and disconnected, and their references are released.
5. The visualizer owns one animation loop, draws directly to Canvas, scales its backing store for device pixel ratio, and cancels its pending frame on stop.
6. Controls use text-only DOM construction, delegated click and keydown handlers, and native buttons. Escape stops active playback.

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript and production build | Pass | `npm run build` completed with `tsc --noEmit` and Vite production bundling. |
| Unit tests | Pass | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test`: 17 passed, 0 failed. Covers queue concurrency/FIFO/cancellation, fetch errors, decode cancellation, shared analyser, playback cleanup, and visualizer scheduling/stop. |
| Production preview response | Pass | `http://127.0.0.1:4174/` returned HTTP 200 and the expected page title. |
| Banned source patterns | Pass | Source scan found no `var`, `keypress`, `keyCode`, `innerHTML`, or inline `onclick`. |

## Browser audit status

- **Play/Stop endurance cycles:** Not run in DevTools. No FPS or frame-time results recorded.
- **Memory and detached DOM nodes/listeners:** Not inspected in the DevTools Memory panel.
- **Requested DevTools screenshots:** Not captured.
- **Reason:** The available browser automation failed to initialize, so these checks could not be performed or evidenced. The preview URL was opened in the Codex browser panel; the checks remain outstanding.
- **Lifecycle/manual cases:** Real browser checks for rapid queueing, cancellation in a live request, natural playback end, page teardown, and suspended/unsupported audio contexts remain outstanding.

## Scope gaps

- Controls use a fixed list of local generated tones; there is no user-entered URL field yet.
- The browser DevTools Performance and Memory audit is still required before HW2 verification can be marked complete.

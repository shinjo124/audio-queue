# HW2: Concurrent FIFO Audio Visualizer Queue — Task Decomposition

## Goal

Build a Vite + TypeScript audio task queue that accepts simultaneous track requests, processes them in FIFO order, downloads and decodes audio with the Web Audio API, supports cancellation, cleans up audio nodes, and drives a Canvas or SVG visualizer with `requestAnimationFrame`.

## Working rules

- Complete one task at a time. One AI prompt must request exactly one sub-task below.
- Define or follow the TypeScript contract before implementing each task.
- Review every AI-generated diff and verify its behavior before accepting it.
- Follow `project-rules.md`: no `var`, `keypress`/`keyCode`, raw `innerHTML`, or inline `onclick` handlers.
- Keep changes and commits small and focused; use Conventional Commit messages when committing.

## Work breakdown

- [ ] **2.1 — Bootstrap the app:** Create the Vite + TypeScript shell and confirm the dev server starts.
- [ ] **2.2 — Define contracts:** Specify track request, queued task, task status, cancellation, queue result, and visualizer data types. Decide how callers identify/cancel a request and how task errors are reported.
- [x] **2.3 — Set the concurrency policy:** Define FIFO ordering for concurrent enqueue calls and how many downloads/decodes may be active at once. Keep enqueue order deterministic and document the policy.
- [ ] **2.4 — Initialize Web Audio safely:** Create or resume a shared `AudioContext` only from a user gesture; handle unsupported or suspended contexts.
- [x] **2.5 — Implement queue insertion:** Add task records in arrival order and return a promise for each requested decoded `AudioBuffer`.
- [x] **2.6 — Implement download and decode:** Fetch each track, check HTTP failures, decode the returned `ArrayBuffer`, and route success or failure to the matching queued promise.
- [x] **2.7 — Implement cancellation:** Use `AbortController` to cancel queued and active work. Ensure a cancelled task cannot later resolve successfully or be played if decoding finishes after cancellation.
- [x] **2.8 — Implement the queue processor:** Advance through FIFO tasks after success, failure, or cancellation without leaving the queue stuck or processing one task twice.
- [x] **2.9 — Implement playback and node cleanup:** Create `AudioBufferSourceNode`s for playback, connect them to the shared graph, then stop/disconnect and release references on end, cancellation, or teardown. Remember that a source node is one-shot.
- [x] **2.10 — Add the analyser:** Connect an `AnalyserNode` into the audio graph and use an `fftSize` of 256 or 512 as required by the lab.
- [x] **2.11 — Build the visualizer:** Render frequency data to Canvas or SVG with `requestAnimationFrame`, avoiding per-frame framework state updates. Cancel the animation frame when stopped or unmounted.
- [ ] **2.12 — Build the user controls:** Add track URL input, enqueue/cancel/play controls, and text status for queued, loading, ready, playing, cancelled, and failed tasks.
- [ ] **2.13 — Handle lifecycle and errors:** Cover invalid URLs, network and decode failures, repeated cancellation, empty queues, rapid enqueue calls, AudioContext suspension, and page/component teardown.
- [ ] **2.14 — Audit security and resource use:** Check that input is handled as text, no banned patterns exist, abort controllers are released, source nodes are disconnected, and animation frames stop when no longer needed.
- [ ] **2.15 — Verify behavior:** Check FIFO results under simultaneous enqueue calls, cancellation before and during fetch, cancellation during decode, continuation after failure, node cleanup, analyser data, and visualizer start/stop. Use browser DevTools to inspect network, console, and audio activity.
- [ ] **2.16 — Final review:** Review the diff and record the concurrency policy, tested cases, and any remaining browser-specific limitations.

## Acceptance checklist

- [ ] Runs as a Vite + TypeScript application.
- [ ] Concurrent enqueue requests enter and complete according to a documented FIFO policy.
- [ ] Each successful request resolves with its decoded `AudioBuffer`; failures and cancellations settle the correct request without hanging the queue.
- [ ] Cancellation uses `AbortController` and prevents cancelled work from being played or reported as successful.
- [ ] `AnalyserNode` is configured with `fftSize` 256 or 512.
- [ ] Visualizer is driven by `requestAnimationFrame` and does not update framework state on each frame.
- [ ] Audio source nodes, controllers, and animation frames are cleaned up on completion, cancellation, and teardown.
- [ ] No banned patterns from `project-rules.md` are present.
- [ ] AI-generated changes have been reviewed and their behavior verified before acceptance.

## Implementation note

The browser's `decodeAudioData` operation cannot be aborted once started. Cancellation during decode must invalidate the task result and prevent playback or state updates when that decode eventually completes; do not claim that the native decode itself was stopped.

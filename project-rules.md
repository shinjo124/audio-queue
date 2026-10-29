# Project Rules

## Stack
- Vite + TypeScript.

## Banned patterns
- Do not use `var`; use `const` or `let`.
- Do not use `keypress`, `keyCode`, or inline event handlers such as `onclick`.
- Do not use raw `innerHTML`; build DOM safely or use framework rendering.

## AI workflow
- One AI prompt = one sub-task. Do not ask AI to implement multiple tasks at once.
- Verify every AI output before accepting it, including reviewing the diff and checking behavior.

## Homework scope
- Build a FIFO audio task queue using the Web Audio API, including an AnalyserNode (256 or 512 FFT bins), cancellation with AbortController, explicit audio node cleanup, and a requestAnimationFrame-driven Canvas or SVG visualizer targeting 60 fps.

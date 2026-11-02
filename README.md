# How Things Work

A personal, laptop-based learning platform that teaches science through interactive models of
real systems: predict, explore a model, name what you saw, apply it. Version 1 is the platform
engine plus one module, **EM Fundamentals**: current makes a magnetic field, and a changing
magnetic field makes current.

The canonical spec is [`docs/spec-v1.md`](docs/spec-v1.md). How Claude works on this repo is in
[`CLAUDE.md`](CLAUDE.md).

## Requirements

- Node 24 (see `.nvmrc`; Node 22 or later works)
- A desktop browser on a laptop, minimum 1280 × 720

## Getting started

```bash
npm install
npx playwright install chromium   # once, for the end-to-end tests
npm run dev                       # http://localhost:5180
```

| Command          | What it does                        |
| ---------------- | ----------------------------------- |
| `npm run dev`    | Dev server on port 5180             |
| `npm run check`  | Lint, typecheck and unit tests      |
| `npm test`       | Unit tests (Vitest)                 |
| `npm run e2e`    | End-to-end smoke tests (Playwright) |
| `npm run build`  | Production build into `dist/`       |
| `npm run format` | Format with Prettier                |

## Status

Phase 2 of 8 (Physics core) is built and awaiting gate review.

| Phase | Name                 | Status               |
| ----- | -------------------- | -------------------- |
| 1     | Setup                | Complete             |
| 2     | Physics core         | Awaiting gate review |
| 3     | Engine shell         | Not started          |
| 4     | Experiment 1         | Not started          |
| 5     | Experiment 2, Part A | Not started          |
| 6     | Experiment 2, Part B | Not started          |
| 7     | Capstone and review  | Not started          |
| 8     | Polish               | Not started          |

What exists now: the toolchain (Vite, React, TypeScript, ESLint, Prettier, Vitest, Playwright,
CI), placeholder routes for the module map, module page, experiment, glossary and review, and
the physics core in `src/physics/` with all of the spec's required physics tests passing. How the
physics is modelled is in [`docs/physics-model.md`](docs/physics-model.md). There is no lesson
content or 3D yet.

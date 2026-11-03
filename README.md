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

Phase 3 of 8 (Engine shell) is built and awaiting gate review.

| Phase | Name                 | Status               |
| ----- | -------------------- | -------------------- |
| 1     | Setup                | Complete             |
| 2     | Physics core         | Complete             |
| 3     | Engine shell         | Awaiting gate review |
| 4     | Experiment 1         | Not started          |
| 5     | Experiment 2, Part A | Not started          |
| 6     | Experiment 2, Part B | Not started          |
| 7     | Capstone and review  | Not started          |
| 8     | Polish               | Not started          |

What exists now:

- **Physics core** (`src/physics/`), with all of the spec's required physics tests passing. How
  it models the spec is in [`docs/physics-model.md`](docs/physics-model.md).
- **Engine:** the module map, module pages, and an experiment runner that renders the eight-step
  flow from a content file. Glossary terms are one hover away, and progress is kept in this
  browser's localStorage.
- **Content** (`content/`): typed data files checked by Zod schemas and cross-reference tests.
- **Placeholder:** EM Fundamentals currently holds one dummy experiment, a grey wire and compass
  on the real physics core. It carries the engine through every step until Experiment 1
  replaces it in Phase 4.
- Not built yet: the Review page (spaced review) and the personal glossary page, both in Phase
  7, and JSON export and import, in Phase 8.

# How Things Work

A personal, laptop-based learning platform that teaches science through interactive models of
real systems: look at a model, try it, see why it behaved that way. Version 1 is the platform
engine plus one module, **EM Fundamentals**: ten short lessons, opening and closing on a wind
turbine, on how current makes a magnetic field and a changing magnetic field makes current.

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

Phase 6 of 9 (Induction) is next. Phase 5 is complete: lessons 5 to 7 are built.

| Phase | Name                       | Status                                |
| ----- | -------------------------- | ------------------------------------- |
| 1     | Setup                      | Complete                              |
| 2     | Physics core               | Complete                              |
| 3     | Engine shell               | Complete                              |
| 4     | Style, magnets and fields  | Complete                              |
| 5     | Current and electromagnets | Complete                              |
| 6     | Induction                  | Not started                           |
| 7     | The wind turbine           | Not started (turbine review by owner) |
| 8     | Review and glossary        | Not started                           |
| 9     | Polish                     | Not started                           |

Only the Phase 4 style decision (made) and the Phase 7 turbine review wait for the owner.
Every other phase merges once CI is green and is followed by a short report.

What exists now:

- **Physics core** (`src/physics/`), with all of the spec's required physics tests passing. How
  it models the spec is in [`docs/physics-model.md`](docs/physics-model.md).
- **Engine:** the module map, module pages, and a lesson runner that renders any lesson from a
  content file: Look, Try and Why, then any optional In the world, Challenge or Pattern step.
  Explorer lessons take a machine apart (exploded view, one part at a time, click a part for
  what it does). Glossary terms are one hover away, and progress is kept in this browser's
  localStorage.
- **Content** (`content/`): typed data files checked by Zod schemas and cross-reference tests,
  including EM Fundamentals' no-numbers rule.
- **Models** are technical illustrations: realistic parts in flat colours with dark outlines,
  each bench framed to fill the model view at any window size.
- **EM Fundamentals:** lesson 1 (The windmill) runs on a stand-in turbine made of plain blocks
  until the realistic turbine arrives in Phase 7. Lessons 2 to 4 are built:
  - **What magnets do:** a magnet on a rail between two magnets on rolling carts, moved by the
    physics core's magnet forces.
  - **The invisible field:** a magnet slides past a wooden peg, a copper coin and a steel paper
    clip (only the clip jumps across), and iron filings settle into the field around a magnet
    under glass. The field-lines overlay draws the same field.
  - **What a compass is:** a compass dragged around a magnet follows its field, and far away
    lines up with Earth's. Overlays show the field lines and Earth's field.
  - **What current is:** a battery, a switch and a bulb; the current-flow overlay shows the
    current going round the loop, and stopping everywhere when the switch opens.
  - **Current makes a field:** sixteen compasses round a tall wire turn to circle it when current
    flows, and the other way when the battery is reversed.
  - **Coil it:** a coil over a tray of paper clips; with the iron core in, clips jump up and cling
    to both ends, and drop when the switch opens.
  - Lessons 8 to 10 are listed as coming later.
- Not built yet: the Review page (spaced review) and the personal glossary page, both in Phase
  8, and JSON export and import, in Phase 9.

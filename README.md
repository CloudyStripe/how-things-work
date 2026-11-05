# How Things Work

A personal, laptop-based learning platform that teaches science through interactive models of
real systems: look at a model, try it, see why it behaved that way. Version 1 is the platform
engine plus one module, **EM Fundamentals**: ten short lessons, opening and closing on a wind
turbine, on how current makes a magnetic field and a changing magnetic field makes current.

The app is live at https://cloudystripe.github.io/how-things-work/, and every merge to `main`
redeploys it. Progress stays in the browser you use, so the live site and a local copy each keep
their own. To move it between them, save a backup on one's Progress page and load it on the other.

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

To measure the frame rate, add `?debug` before the `#` in a lesson's address, for example
`http://localhost:5180/?debug#/module/em-fundamentals/lesson/current-makes-a-field`. A readout in
the corner of the model shows frames per second, time per frame and the graphics chip drawing it.
Keep the window in front: a hidden tab stops drawing.

## Status

All nine phases are built. Phase 9 (Polish) added saving, loading and resetting progress, and a
visual consistency pass. Version 1 now waits on the owner: frame rates from the owner's laptop
(see the `?debug` readout above), then a check of the spec's acceptance criteria.

| Phase | Name                       | Status   |
| ----- | -------------------------- | -------- |
| 1     | Setup                      | Complete |
| 2     | Physics core               | Complete |
| 3     | Engine shell               | Complete |
| 4     | Style, magnets and fields  | Complete |
| 5     | Current and electromagnets | Complete |
| 6     | Induction                  | Complete |
| 7     | The wind turbine           | Complete |
| 8     | Review and glossary        | Complete |
| 9     | Polish                     | Complete |

The owner has made both review stops: the Phase 4 style decision and the Phase 7 turbine review.

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
- **EM Fundamentals:** all ten lessons:
  - **The windmill:** a realistic three-blade turbine to run in the wind and take apart: blades,
    hub, nacelle cover, main shaft, gearbox and generator, each with what it does.
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
  - **Move a magnet:** a magnet pushed into and pulled out of a coil swings a centre-zero meter
    opposite ways, and a quick push lights a red or a green LED; held still, nothing. The flux
    overlay shows the field lines threading the coil.
  - **Spin it:** a hand-cranked magnet beside an iron-cored coil makes a current that keeps
    reversing: a generator.
  - **Back to the windmill:** the turbine again, every part explained with the ideas of lessons 2
    to 9, and an overlay inside the generator showing its magnets passing its coils and the
    current each coil makes.
- **Review:** finishing a lesson queues its recall cards and two cards for each term it named.
  They come back after one, three, seven, fourteen and thirty days as you remember them, and back
  to a day when you don't. The Review link shows how many are due; prediction cards can open
  their lesson's model to try first.
- **Glossary:** every term you have met, by module, with where it was named, and confusable pairs
  side by side.
- **Your progress:** the Progress page sums up what this browser keeps. It saves it all to a
  backup file, loads a backup back (after a confirm, since it replaces what is there) and resets
  everything. Resetting one module stays on that module's page.

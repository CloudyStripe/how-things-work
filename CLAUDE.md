# CLAUDE.md

How Claude works on **How Things Work**: a personal, laptop-based platform that teaches science
through interactive models of real systems. Version 1 is the platform engine plus one module,
EM Fundamentals.

---

## 1. Source of truth

- **`docs/spec-v1.md` is the canonical spec.** No other copy (a chat paste, a doc elsewhere,
  notes, memory) is authoritative. When this file and the spec disagree, the spec wins and this
  file gets fixed.
- If work needs the spec to change, propose the change to the owner first. Once agreed, update
  `docs/spec-v1.md` in the same PR as the code it governs.
- When a design choice is unclear, the spec's Teaching principles decide it.

## 2. Build phases and gates

| Phase | Name                 | Gate                                               |
| ----- | -------------------- | -------------------------------------------------- |
| 1     | Setup                | The app runs and an empty test suite passes        |
| 2     | Physics core         | All physics tests pass                             |
| 3     | Engine shell         | Owner clicks through a dummy experiment end to end |
| 4     | Experiment 1         | Owner review of the look and feel of the model     |
| 5     | Experiment 2, Part A | Owner review                                       |
| 6     | Experiment 2, Part B | Owner review                                       |
| 7     | Capstone and review  | Owner completes the whole module                   |
| 8     | Polish               | v1 accepted                                        |

- Phases are numbered 1 to 8 everywhere: spec, README, branches, commits.
- Stop at every gate and report back. **Never start the next phase without the owner's
  approval.** The README's Status section records where the build stands.
- From Phase 2 on, each phase is built on its own branch, `phase-N-short-name` (for example
  `phase-2-physics-core`), and lands through a PR. The PR review is the gate.
- **Phase 4 opens with a style decision:** render the wire-board scene in both styles
  (photorealistic and clean technical illustration) and get the owner's pick before building
  the rest of Experiment 1.
- Within a phase, plan before coding anything non-trivial: summarize the change, name the
  affected areas, list tradeoffs, and ask when the spec leaves a requirement open.

## 3. Architecture rules

These hold unless the owner explicitly changes them. If a change risks one, flag it first.

- **Physics core is pure.** `src/physics/` is plain TypeScript with no React, three.js, R3F,
  Zustand, UI or content imports. ESLint enforces this (`no-restricted-imports` in
  `eslint.config.js`); never loosen that rule to get code through. Physics tests run in a Node
  environment (the `physics` Vitest project), with no DOM.
- **SI units internally**, with realistic values (Earth's field about 50 µT). Display may be
  qualitative (low, medium, high).
- **Read, don't animate.** Models, overlays and instruments only read from the physics core.
  Physical behavior is never hand-animated.
- **Exaggeration is display-only.** Relationships between readings stay correct, and an
  exaggerated visual carries a "not to scale" tag.
- **Experiments are data.** A content file under `content/` names the model, controls,
  instruments, overlays, steps, prediction, prompts, terms, challenge and review cards; the
  engine renders it. No per-lesson custom pages. Content is validated with Zod schemas.
- **Registered by ID.** Models, instruments and overlays are reusable components looked up by
  ID, so later modules can reuse them.
- **Challenges are state functions.** A challenge's success condition is a function of
  simulation state, checked every frame.
- **Modules are self-contained.** Each declares its prerequisites and does not re-teach another
  module. An unfinished prerequisite gets a one-line nudge, never a block.

## 4. Physics accuracy

- Every relationship in the spec's Physics accuracy section lives in the core and is covered by
  tests. The spec's required-test list must stay green; an experiment does not ship with a
  failing one.
- Any change to physics behavior comes with a test that proves its direction, proportion or
  timing.
- `docs/physics-model.md` describes the models, their approximations, and the tuning notes for
  each scene. Read it before building a scene, and update it when the model changes.
- One frame everywhere: +x east, +y up, +z south (three.js world space). Scenes use physics
  vectors as they are, with no conversion layer.
- Induction is step-averaged: `inducedEmf` takes the change in flux linkage across a step.
  Instruments take those step-averaged values, so a stationary magnet reads exactly zero and a
  pulse shorter than a frame still delivers the right kick.

## 5. Teaching and copy

- Models first: text supports the model. A Reveal explanation stays under about 80 words.
- Use full technical terms. Each term is named in the Reveal step of exactly one experiment and
  registered in the glossary.
- Keep the tone plain and restrained: no hype, no persuasive framing.
- Math appears only when it has an everyday consequence (Teaching principle 5).
- **No em dashes in user-facing copy:** labels, prompts, help text, toasts, errors, anything a
  learner reads. Use a comma, a colon, parentheses or two sentences. Exempt: a standalone em
  dash used as an empty-value glyph. The rule does not cover code comments, commit messages,
  this file, the README or the spec.

## 6. UI

- Laptop only, minimum 1280 × 720. No phone or tablet layouts in v1.
- The visual style is chosen early in Phase 4. Until then keep styling minimal and built on the
  `:root` tokens in `src/index.css`.
- Reuse existing spacing, type and structural patterns. Avoid new visual styles and premature
  component abstraction.

## 7. Code

- Explicitness over cleverness, readability over abstraction, stable boundaries between
  physics, rendering and content.
- Add a dependency in the phase that first uses it, not before. Planned: Zod and Zustand
  (Phase 3); three.js, React Three Fiber and drei (Phase 3 placeholder model, then Phase 4);
  a chart library (Phase 5 or 6, uPlot vs Recharts decided then).
- **Version pins:** `typescript ~6.0`, because typescript-eslint supports only `<6.1` (move to
  TS 7 once it does). `react` and `react-dom ~19.3`, because React Three Fiber 9 requires
  `<19.4`.

## 8. Layout

```
src/
  physics/       pure TS: fields, induction, circuits, needles (+ tests)
  engine/        app shell, map, module page, experiment runner, steps
  models/        3D scenes registered by ID                             (Phase 3+)
  instruments/   compass, galvanometer, ammeter, oscilloscope, clips    (Phase 4+)
  overlays/      field lines, current flow, flux, induced field, Earth  (Phase 4+)
  glossary/      hover terms, glossary page
  review/        scheduler, review page, card views
  test/          Vitest setup
content/         map, glossary terms, module and experiment files       (Phase 3)
e2e/             Playwright smoke tests
docs/spec-v1.md        the canonical spec
docs/physics-model.md  how the physics core models the spec, and its limits
```

Import aliases: `@/` is `src/`, `@content/` is `content/`.

## 9. Commands

| Command          | What it does                                                   |
| ---------------- | -------------------------------------------------------------- |
| `npm run dev`    | Dev server at http://localhost:5180 (fixed port, `strictPort`) |
| `npm run check`  | Lint, typecheck and unit tests                                 |
| `npm test`       | Vitest: `physics` project (Node) and `app` project (jsdom)     |
| `npm run e2e`    | Playwright smoke tests in Chromium at 1280 × 720               |
| `npm run build`  | Typecheck and production build                                 |
| `npm run format` | Prettier                                                       |

- Routing is hash-based (`/#/module/...`), so a built copy needs no server rewrites.
- Port 5180 is fixed because other local projects hold 3001, 3002 and 5173.
- Text files are LF everywhere (`.gitattributes`).

## 10. When in doubt

If a request is ambiguous, or risks weakening the physics boundary, the data-driven engine or
the teaching principles, stop and ask before proceeding.

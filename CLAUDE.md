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

## 2. Build phases and review stops

| Phase | Name                       | Owner review                                 |
| ----- | -------------------------- | -------------------------------------------- |
| 1     | Setup                      | Done                                         |
| 2     | Physics core               | Done                                         |
| 3     | Engine shell               | Done (owner clicked through lessons 1 and 2) |
| 4     | Style, magnets and fields  | Done (technical illustration chosen)         |
| 5     | Current and electromagnets | None                                         |
| 6     | Induction                  | None                                         |
| 7     | The wind turbine           | Done (owner reviewed the turbine)            |
| 8     | Review and glossary        | None                                         |
| 9     | Polish                     | The owner accepts v1 after the phase merges  |

- Phases are numbered 1 to 9 everywhere: spec, README, branches, commits.
- Each phase is built on its own branch, `phase-N-short-name` (for example
  `phase-4-style-magnets-fields`), and lands through a PR.
- **Only two points wait for the owner:**
  - **The style decision, at the start of Phase 4.** Done: the owner chose technical
    illustration (section 6).
  - **The turbine review, in Phase 7.** Done: the owner reviewed it and asked for camera
    flights, a rounded nacelle, a compass in lesson 7 and a frame-rate readout before it merged.
- **Every other phase runs straight through:** build it, open the PR, get CI green (fix any
  failure on the branch), merge, post a short report, then start the next phase without waiting.
  The report says what was built, any decision made on the owner's behalf, and anything that
  worries you.
- **Still stop and ask** when a decision would change the spec, the teaching principles or the
  one-idea-per-lesson rule, or when you hit something you can't resolve.
  - **Lesson outlines are spec.** Adding, removing or rewording a lesson's prediction, prompts,
    key observations, objects on its bench or overlays in `docs/spec-v1.md` is a spec
    change: propose it and wait for the owner's yes before writing it, even when it only fills
    in a detail. (The owner kept the predictions added to lessons 3 to 9 in Phases 4 to 6, and
    asked for this from then on.)
- The README's Status section records where the build stands; each phase's PR updates it.
- Within a phase, plan before coding anything non-trivial: summarize the change, name the
  affected areas and list tradeoffs. Where the spec leaves a detail open that is not part of a
  lesson outline (code, tuning, layout), decide it by the Teaching principles and list the
  decision in the phase report.

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
- **Lessons are data.** A content file under `content/` names the model, controls,
  instruments, overlays, steps, labels, prediction, prompts, terms, challenge, review cards and,
  for an explorer lesson, its part descriptions; the engine renders it. No per-lesson custom
  pages.
  - The schemas are in `src/engine/content/schema.ts`. A lesson is a `model` lesson (Look, Try,
    Why, then optional Pattern, In the world and Challenge) or an `explorer` lesson (Look, Try,
    optional Why, around a model with parts to take apart).
  - `src/engine/content/validate.ts` checks every file, every cross-reference (models, controls,
    readings, overlays, labels, parts, terms, the map) and the copy rules. It runs at load, so
    the app refuses to start on bad content, and in the test suite.
  - A module with `numbers: false` (EM Fundamentals) may not use Pattern steps, instruments that
    show numbers, or digits in lesson copy. Validation enforces it.
  - Content may import only the schema, model definitions and the physics core (ESLint
    enforces this).
- **Registered by ID.** Models, instruments and overlays are reusable components looked up by
  ID, so later modules can reuse them.
- **3D code loads only with the lesson viewport.** Each model has two parts:
  - a pure definition (`src/models/*/definition.ts`: controls, state, `step`, readings, field
    sources) that content and the engine import;
  - a 3D scene, registered in `src/models/scenes.ts`.

  Overlays split the same way: `src/overlays/catalog.ts` holds the labels and
  `src/overlays/layers.ts` holds the 3D layers. Only the lazily loaded viewport imports the
  scene and layer registries, so three.js stays out of the map and module pages.

- **Challenges are state functions.** A challenge's success condition is a function of
  simulation state, checked every frame. The model resets when the Challenge step opens, so
  nothing carried over from Try can solve it.
- **Modules are self-contained.** Each declares its prerequisites and does not re-teach another
  module. An unfinished prerequisite gets a one-line nudge, never a block.

## 4. Physics accuracy

- Every relationship in the spec's Physics accuracy section lives in the core and is covered by
  tests. The spec's required-test list must stay green; a lesson does not ship with a
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

- Models first: text supports the model. A Why explanation stays under about 80 words.
- Look before you try: every lesson's Look step says what the learner is looking at before
  anything is asked of them. A prediction appears only where it helps.
- One idea per lesson, and each lesson adds at most one new control (checked in review; models
  don't share control ids, so validation can't compare them).
- EM Fundamentals has no numbers, units, data tables or Pattern steps; those belong to the
  Magnetism and Electricity modules.
- Use full technical terms. Each term is named in the Why step of exactly one lesson and
  registered in the glossary.
- Keep the tone plain and restrained: no hype, no persuasive framing.
- Math appears only when it has an everyday consequence (Teaching principle 5).
- **No em dashes in user-facing copy:** labels, prompts, help text, toasts, errors, anything a
  learner reads. Use a comma, a colon, parentheses or two sentences. Exempt: a standalone em
  dash used as an empty-value glyph. The rule does not cover code comments, commit messages,
  this file, the README or the spec.

## 6. UI

- Laptop only, minimum 1280 × 720. No phone or tablet layouts in v1.
- **Models are technical illustrations** (spec, Teaching principle 3): realistic in shape,
  proportion and parts, drawn with flat colours, three tones of shading and dark outlines.
  - Scenes build parts from `src/models/shared/surfaces.tsx` (`Block`, `Cylinder`,
    `SurfaceMaterial`) and name a kind of surface, never a colour. A new material gets a new
    surface kind there, so every model draws from one palette.
  - Light and backdrop come from `src/models/shared/Stage.tsx`. The canvas is `flat`, with no
    shadows or tone mapping.
  - Overlays and labels must stay clearly readable against the model: pick overlay colours
    that differ from the palette (not the magnets' red and blue, not the wood tones).
- **Every scene frames its camera with a `CameraFrame`** (`src/models/shared/cameraFrame.ts`):
  the box that must fill the view (for a bench, the apparatus from end to end, up to the labels
  over it) and the angle to see it from. The viewport fits the distance to the model view's real
  size, so the apparatus fills it at 1280 × 720 and on any larger window. Benches look from in
  front and to the right (about 30° round, 25° up), with a bench top large enough that its edges
  stay out of view. Check the framing with a screenshot at 1280 × 720.
- Around the models, keep the page styling minimal and built on the `:root` tokens in
  `src/index.css`.
- Reuse existing spacing, type and structural patterns. Avoid new visual styles and premature
  component abstraction.

## 7. Code

- Explicitness over cleverness, readability over abstraction, stable boundaries between
  physics, rendering and content.
- Add a dependency in the phase that first uses it, not before. Zod, Zustand, three.js, React
  Three Fiber and drei arrived in Phase 3. The chart library (uPlot vs Recharts) is chosen when
  the first of the Magnetism and Electricity modules is built. EM Fundamentals has no plots, so
  v1 has no chart library.
- **Version pins:** `typescript ~6.0`, because typescript-eslint supports only `<6.1` (move to
  TS 7 once it does). `react` and `react-dom ~19.3`, because React Three Fiber 9 requires
  `<19.4`.

## 8. Layout

```
src/
  physics/       pure TS: fields, forces, induction, circuits, needles, motion (+ tests)
  engine/        app shell, map, module page, lesson runner and explorer tools, content
                 loading, simulation and progress stores, Progress page and backup files
  models/        model definitions (pure) and their 3D scenes, by ID
  instruments/   side-panel readouts by ID: ammeter (for later modules). Instruments that sit
                 in a scene (compass, bulb, clip tray; the meter and LEDs next) are shared
                 scene parts in src/models/shared/
  overlays/      overlay catalog and 3D layers, by ID
  glossary/      term matching, hover terms, glossary page
  review/        spaced-review scheduler, Review page, card views
  test/          Vitest setup
content/         map, glossary terms, module and lesson files
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

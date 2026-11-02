# Interactive Learning Platform — Spec v1: EM Fundamentals

Nov 1, 2026 · @Skyler

## Overview

We are building a personal, laptop-based learning platform that teaches science through interactive models of real systems. Version 1 delivers the platform engine plus one module: EM Fundamentals.

The learner is one adult (the owner) who wants practical understanding of how physics powers society. They want little math, but full technical terminology.

## Goals for v1

- Prove the learning loop: predict, explore a model, name what you saw, apply it.
- Teach the two core principles of electromagnetism so they stick: current makes a magnetic field, and a changing magnetic field makes current.
- Build an engine that later modules (Magnetism, Electricity, applications such as generators) can plug into without rework.

## Scope

v1 builds only the engine and the EM Fundamentals module; everything else appears on the map as locked, not built.

| In v1                                                      | Not in v1 (shown as "coming later" on the map) |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Module map home screen                                     | Magnetism module                               |
| Experiment flow engine                                     | Electricity module                             |
| EM Fundamentals: intro, 2 experiments, capstone            | Applications: generator, transformer, motor    |
| Virtual instruments: compass, galvanometer, current source | Wind to Wall Socket journey                    |
| Field and current overlays                                 | AI tutor                                       |
| Glossary with hover definitions                            | Accounts, sync, hosting                        |
| Local progress and spaced review                           | Phone or tablet layouts                        |

Platform: desktop browser on a laptop, minimum 1280 × 720. Runs locally; no server or login.

## Teaching principles

Every screen in the platform follows these rules; when a design choice is unclear, these decide it.

1. **Models first.** Learning happens by manipulating interactive models, not by reading. Text supports the model, never the reverse.
2. **Predict before you see.** Each experiment asks for a committed prediction before the learner can run it.
3. **Realistic models with overlays.** Models look like real equipment. Invisible physics (field lines, current flow, flux) is drawn as toggleable overlays on top, never by replacing the realistic view.
4. **Practical over theoretical.** Every concept is tied to a real device or system in society within the same experiment.
5. **Math only when it earns its place.** A relationship appears only if it has an everyday consequence, shown as a pattern the learner discovers with a slider and a data table. No derivations.
6. **Full terminology.** Use the real technical terms (induction, conduction, flux, solenoid). Name each term at the moment the learner sees the thing it describes.
7. **Modular.** Each module is self-contained, declares its prerequisites, and does not re-teach other modules.
8. **Observable before abstract.** In EM Fundamentals, field and current are shown only through what they do (a compass turns, a meter needle moves, a bulb glows). Units and deeper mechanics belong to the Magnetism and Electricity modules.

## Platform structure

The platform is a map of modules; a module is a set of experiments; an experiment is a fixed sequence of steps around one interactive model.

- **Module map (home screen).** Shows every module as a node with prerequisite arrows. EM Fundamentals sits at the root. Magnetism and Electricity branch from it, and the applications (Generator, Transformer, Motor) sit below both. In v1 only EM Fundamentals is unlocked; the rest render as "coming later."
- **Module page.** A short real-world intro, the list of experiments with completion state, the capstone challenge, and the module's glossary terms.
- **Experiment.** One model, one question, and the standard step sequence below.
- **Prerequisites.** Each module declares the modules it builds on. The learner can open any unlocked module; if a prerequisite is unfinished, the app shows a one-line nudge but does not block.
- **Glossary and Review.** Two global pages reachable from every screen.

Dashed modules appear on the map but are not built in v1; arrows point from a module to the modules that build on it.

## Experiment flow

Every experiment runs the same eight steps, so the engine renders any experiment from a content file without custom code per lesson.

1. **Hook.** One or two sentences tying the experiment to a real device ("Every scrapyard crane magnet starts here.").
2. **Predict.** A multiple-choice or click-on-the-model question. The learner must commit before the model unlocks. The prediction is saved.
3. **Explore.** The model unlocks with its controls and instruments. Two to four guided prompts ("Flip the battery. Watch the compass.") lead the learner to the key observation. Free play is always allowed.
4. **Reveal and name.** The app compares the observation to the prediction, names the technical term on screen, and turns on the matching overlay. Explanation stays under about 80 words.
5. **Pattern** (only when a relationship earns it). The learner varies one control while the app logs readings to a table and a small plot. The pattern is stated in words; a formula appears only if it has a practical consequence.
6. **In the world.** Two or three real applications of what was just seen, each one line, with a pointer to the future module that covers it.
7. **Challenge.** A goal-based task inside the same model ("Make the compass point east."). The app checks success automatically from model state.
8. **Recall.** Two to four review cards (concept, term, prediction) are added to the spaced-review queue.

## EM Fundamentals module

The module teaches one idea in two directions: current makes a magnetic field, and a changing magnetic field makes current. It has a short intro, two experiments and a capstone challenge.

### Module intro

- **Hook:** Almost every power station on Earth, whether coal, nuclear, hydro or wind, ends the same way: it spins magnets past coils of wire. This module shows why that works.
- **History, one line each:** In 1820 Hans Christian Ørsted saw a compass needle twitch near a live wire. In 1831 Michael Faraday made current by moving a magnet near a coil.
- **Prerequisites:** none. This is the root module.

### Experiment 1: Current makes a magnetic field

**Part A, the straight wire.** A vertical copper wire passes through a horizontal board, with a battery, switch and current source on the bench. Four to eight compasses sit on the board around the wire.

- **Controls:** switch on/off; reverse current direction; current level (low, medium, high); drag compasses to any position; toggle Earth's magnetic field on/off.
- **Instruments:** compasses; current source with a simple ammeter readout.
- **Prediction:** "When you close the switch, what will the compasses do?" (nothing / all point at the wire / form a circle / all point north harder).
- **Guided prompts:** close the switch; reverse the current; raise the current; move one compass farther away.
- **Key observations:** compasses line up in a circle around the wire; reversing current reverses the circle; more current turns them harder against Earth's field; farther compasses turn less.
- **Overlay:** circular magnetic field lines around the wire, with direction arrows; current-flow dots in the wire.
- **Pattern:** field strength vs. distance from the wire. Doubling the distance halves the field. Practical consequence: fields from household wiring fade within centimeters. A short note says this is not the inverse-square law; that law (for light, sound and radio) comes in a later module.

**Part B, coil it.** The same wire wound into a coil (solenoid), then fitted with an iron core.

- **Controls:** number of turns (10, 50, 200); current level; iron core in/out; a tray of paper clips.
- **Key observations:** a coil concentrates the field and acts like a bar magnet with north and south poles; more turns and more current make it stronger; the iron core multiplies the strength; switching off drops the clips.
- **Measurement:** number of paper clips lifted.

**Terms named:** electric current, magnetic field, field lines, compass deflection, right-hand rule, coil, solenoid, magnetic poles, iron core, electromagnet.

**In the world:** scrapyard crane magnets, doorbells and relays, loudspeakers, MRI scanners.

**Challenge:** lift exactly 10 paper clips with the current set to low.

### Experiment 2: A changing magnetic field makes current

**Part A, the moving magnet.** A coil of wire on the bench is connected to a center-zero galvanometer and a pair of LEDs wired in opposite directions, so each current direction lights one LED. A bar magnet can be dragged along the coil's axis with the mouse; drag speed matters.

- **Controls:** drag the magnet in and out; hold it still; flip the magnet (swap poles); number of turns (50, 100, 200); switch to "move the coil" mode instead of the magnet.
- **Instruments:** galvanometer; the two LEDs.
- **Prediction:** "If you push the magnet into the coil and hold it there, what does the meter do?"
- **Guided prompts:** push in; hold still inside; pull out; repeat faster; add turns; flip the magnet; move the coil instead.
- **Key observations:** current flows only while something is moving; in and out give opposite directions; faster motion and more turns give more current; a still magnet inside the coil gives zero; moving the coil works the same as moving the magnet.
- **Overlay:** magnetic field lines threading the coil, with a live readout of how many pass through it (magnetic flux); current-flow dots; the coil's own induced field, shown pushing back against the magnet.
- **Feel it (nice to have):** the dragged magnet resists slightly when current flows, so the learner feels Lenz's law.

**Part B, spin it.** The magnet is mounted on a shaft beside the coil and turned by a hand crank, and the galvanometer is joined by an oscilloscope trace.

- **Controls:** crank speed (rotations per second); number of turns.
- **Key observations:** the needle swings back and forth continuously; the oscilloscope shows a repeating wave, which is alternating current.
- **Pattern:** doubling the crank speed doubles both the peak voltage and the frequency. Practical consequence: grid power is 60 Hz in North America and 50 Hz in most other countries because that is how fast the generators turn.

**Terms named:** electromagnetic induction, induced current, magnetic flux, Faraday's law (in words: the faster the flux changes, the larger the voltage), Lenz's law, galvanometer, alternating current, frequency, hertz, oscilloscope, generator.

**In the world:** every power station, bicycle dynamos, induction cooktops, wireless phone charging, tap-to-pay cards, electric guitar pickups.

**Challenge:** push the needle into the green zone while moving the magnet at the slowest speed setting. (Solved by adding turns.)

### Capstone: Electricity from electricity

Two coils sit side by side with no permanent magnet. Coil A is wired to a battery and switch; coil B is wired to the galvanometer. The task: make coil B's needle move without touching coil B.

- **Discovery:** the needle kicks only at the moment the switch closes or opens; a steady current in coil A produces nothing in coil B.
- **Why it matters:** it joins both principles. Coil A's current makes a field (experiment 1); that field changing makes current in coil B (experiment 2). This is the working principle of the transformer and wireless charging.
- **Wrap-up card:** a one-screen summary of the two directions, and a teaser that a generator and a motor are the same machine run in opposite directions.

## Models, overlays and instruments

Every model is a realistic 3D lab-bench scene driven by a shared physics core, with overlays and instruments that read from that core rather than being animated by hand.

### Experiment screen layout (laptop)

- **Left panel** (about 30% width): the current step's text, prediction choices, guided prompts and the Next button.
- **Center:** the 3D model, with an overlay toggle bar along its top edge and a Reset view button.
- **Right panel:** controls (switches, sliders, selectors) and instrument readouts.
- **Bottom drawer:** the data table and plot, opened during the Pattern step.

### Models

- Realistic materials: copper wire, steel and iron, wood bench, glass-faced meters. Clean, well lit, no clutter.
- Orbit, zoom and pan within limits; one default camera angle per experiment.
- Draggable objects (magnet, coil, compasses) move with the mouse, constrained to sensible paths.

### Overlays (toggleable, all computed from the physics core)

| Overlay       | Shows                                                      | Used in                  |
| ------------- | ---------------------------------------------------------- | ------------------------ |
| Field lines   | Magnetic field lines with direction arrows                 | Exp. 1, Exp. 2, capstone |
| Current flow  | Moving dots in wires; speed scales with current            | All                      |
| Flux          | Field lines through a coil, highlighted, with a live count | Exp. 2, capstone         |
| Induced field | The coil's own field opposing the change                   | Exp. 2                   |
| Earth's field | A faint uniform northward field                            | Exp. 1                   |

### Virtual instruments (reusable components)

| Instrument      | Behavior                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| Compass         | Needle aligns with the net field at its position (wire field plus Earth's field), with light damping |
| Galvanometer    | Center-zero needle; deflection proportional to current; damped so it settles realistically           |
| Ammeter readout | Shows current from the source as low, medium or high plus a number                                   |
| Oscilloscope    | Scrolling voltage-vs-time trace with an adjustable time scale                                        |
| Paper clip tray | Counts clips lifted, based on electromagnet strength                                                 |

When a visual is exaggerated for visibility (for example, field line density), a small "not to scale" tag appears.

## Terminology and glossary

Technical terms are used freely; the system makes every term one hover away and records where the learner first met it.

- **Term registry.** One shared data file defines each term: name, one-line definition (under 25 words), a longer plain-language note, related terms, and the experiment where it is introduced.
- **Naming moment.** Each term is introduced in the Reveal step of exactly one experiment, highlighted the first time it appears.
- **Hover definitions.** Any registered term in any text is automatically underlined; hovering shows the one-line definition and a link to where it was introduced.
- **Personal glossary page.** Lists terms the learner has encountered, grouped by module, each linking back to its experiment.
- **Confusable pairs.** The registry can mark pairs that are easily mixed up; the glossary shows them side by side. v1 pairs: induction vs. conduction; magnetic field vs. magnetic flux; current vs. voltage (a preview for the Electricity module); generator vs. motor.
- **In review.** Terms feed the spaced-review queue as "What is this called?" and "Explain this term" cards.

## Progress and review

All progress is stored locally in the browser, with export and import to a JSON file as a backup.

- **Tracked per experiment:** steps completed, the saved prediction and whether it was right, challenge completed, and the date.
- **Module completion:** all experiments and the capstone completed.
- **Spaced review.** Cards are scheduled with a simple Leitner-style system (intervals of 1, 3, 7, 14 and 30 days). A Review page shows cards that are due, with a count badge on the home screen.
- **Card types:** concept ("What happens to the meter if the magnet stops inside the coil?"), term ("What is this called?"), and model-based prediction cards that open a small live model to answer.
- **Reset:** a settings option clears progress for one module or for everything.

## Physics accuracy

The models must behave like the real world in direction, proportion and timing; the learner never sees these formulas in v1, but the code must obey them and tests must prove it.

- **Separate physics core.** All physics lives in a pure TypeScript module with no rendering code. Models, overlays and instruments only read from it.
- **SI units internally.** Display can be qualitative (low, medium, high), but calculations use real units and realistic values (for example, Earth's field about 50 µT).
- **Exaggeration is display-only.** Visual scaling may be exaggerated for visibility, but relationships between readings must stay correct.

### Relationships the core must implement

Field around a long straight wire (falls off as 1 / distance):

$$
B = \frac{\mu_0 I}{2 \pi r}
$$

Field inside a solenoid, multiplied by a capped factor when the iron core is in (simplified saturation):

$$
B = \mu_0 \, n \, I
$$

Compass direction: aligns with the vector sum of the wire's field and Earth's field. Bar magnet: a dipole field (far field falls off as 1 / distance³).

Faraday's law of induction (the sign gives Lenz's law):

$$
\varepsilon = -N \frac{d\Phi}{dt}
$$

Rotating magnet: peak voltage scales with turns × field × area × angular speed, and frequency equals rotations per second.

### Required tests (each must pass before an experiment ships)

- Doubling distance from the wire halves the field.
- Reversing current reverses every compass.
- A stationary magnet produces exactly zero induced current.
- Inserting and withdrawing give opposite signs; flipping the magnet reverses both.
- Moving the coil gives the same result as moving the magnet at the same relative speed.
- Doubling turns doubles induced voltage.
- Doubling crank speed doubles both peak voltage and frequency.
- Capstone: coil B shows current only while coil A's current is changing (switching on or off, with a realistic short rise time), and zero during steady current.

## Technical architecture

A local single-page web app in TypeScript, with lesson content stored as typed data files and physics isolated from rendering.

| Layer              | Choice                                                                | Why                                                             |
| ------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| App                | Vite + React + TypeScript                                             | Fast local dev; strong typing for content files                 |
| 3D models          | three.js via React Three Fiber and drei                               | Realistic scenes with React components                          |
| State              | Zustand                                                               | Simple shared state between model, instruments and lesson panel |
| Content validation | Zod schemas                                                           | Catches malformed experiment and glossary files at build time   |
| Charts             | A light chart library (e.g. uPlot or Recharts)                        | Pattern-step plots and the oscilloscope                         |
| Math display       | KaTeX                                                                 | Rare formulas, reserved for later modules                       |
| Storage            | localStorage, versioned schema, JSON export/import                    | No server needed                                                |
| Tests              | Vitest (physics, content); Playwright (smoke test of each experiment) | Enforces the accuracy requirements                              |

### Key rules

- **Experiments are data, not custom pages.** A content file names its model, controls, instruments, overlays, steps, prediction, prompts, terms, challenge success condition, and review cards. The engine renders it.
- **Models, instruments and overlays are reusable components registered by ID,** so later modules can reuse the coil, magnet and galvanometer.
- **Challenge success conditions are functions of simulation state,** checked every frame.

### Folder layout

```
src/
  physics/       pure TS: fields, induction, circuits (+ tests)
  engine/        map, module page, experiment runner, step views
  models/        3D scenes: wire-board, solenoid, coil-magnet, crank-generator, two-coils
  instruments/   compass, galvanometer, ammeter, oscilloscope, clip-tray
  overlays/      field-lines, current-flow, flux, induced-field, earth-field
  glossary/      hover terms, glossary page
  review/        scheduler, review page, card views
content/
  map.ts
  glossary/terms.ts
  modules/em-fundamentals/
    module.ts
    exp1-current-makes-field.ts
    exp2-changing-field-makes-current.ts
    capstone.ts
```

## Build phases for Claude Code

Claude Code builds in eight phases and stops for the owner's review at the end of each; it does not start the next phase without approval.

1. **Setup.** Repository, Vite + React + TypeScript, linting, Vitest and Playwright, CLAUDE.md, empty routes. Gate: the app runs and an empty test suite passes.
2. **Physics core.** Fields, induction and simple circuits as pure TypeScript, with every required test from Physics accuracy. Gate: all physics tests pass.
3. **Engine shell.** Module map, module page, experiment runner driven by a content file with a placeholder model, glossary hover, local progress storage. Gate: the owner clicks through a dummy experiment end to end.
4. **Experiment 1.** Wire-board and solenoid scenes, compass, ammeter and clip tray, field-line, current-flow and Earth's-field overlays, both parts, challenge. Gate: owner review of the look and feel of the model.
5. **Experiment 2, Part A.** Coil-and-magnet scene, galvanometer, LEDs, flux and induced-field overlays, move-the-coil mode, challenge. Gate: owner review.
6. **Experiment 2, Part B.** Crank generator scene and oscilloscope with the Pattern step. Gate: owner review.
7. **Capstone and review.** Two-coil scene, wrap-up card, spaced-review scheduler and Review page, personal glossary page. Gate: the owner completes the whole module.
8. **Polish.** Visual consistency pass, 60 fps on the owner's laptop, Playwright smoke test for every experiment, JSON export/import. Gate: v1 accepted.

## Acceptance criteria

v1 is done when the owner can complete EM Fundamentals end to end and every item below is true.

- [ ] Home map shows all planned modules; only EM Fundamentals is unlocked.
- [ ] Both experiments and the capstone run through all eight steps from content files alone.
- [ ] Every prediction must be answered before its model unlocks.
- [ ] Every overlay is toggleable and drawn from the physics core.
- [ ] All required physics tests pass.
- [ ] Every term in the Terms named lists has a glossary entry and hover definition.
- [ ] Review cards are generated and scheduled; due cards appear on the Review page.
- [ ] Progress survives a browser restart and can be exported and imported.
- [ ] Models run smoothly (target 60 fps) on the owner's laptop.

## Open questions

- [ ] Visual style: photorealistic, or clean "technical illustration" realism? Decide early in Phase 4: render the wire-board scene in both styles and pick one before building the rest of Experiment 1.
- [ ] Should the Lenz's law drag feel be in v1, or deferred?
- [ ] Grid frequency example: show 60 Hz, 50 Hz, or both based on a setting?
- [x] Where does the repository live (local folder or GitHub)? Resolved: a private GitHub repository, `CloudyStripe/how-things-work`, cloned locally at `C:\Users\savar\Git\how-things-work`.

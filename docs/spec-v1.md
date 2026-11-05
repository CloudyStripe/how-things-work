# Interactive Learning Platform — Spec v1: EM Fundamentals

Nov 1, 2026 · @Skyler · Revised Nov 3, 2026: lesson redesign (Look, Try, Why; ten short lessons; the explorer lesson type); owner review only at the Phase 4 style decision and the Phase 7 turbine; models drawn as technical illustrations

## Overview

We are building a personal, laptop-based learning platform that teaches science through interactive models of real systems. Version 1 delivers the platform engine plus one module: EM Fundamentals.

The learner is one adult (the owner) who wants practical understanding of how physics powers society. They want little math, but full technical terminology.

## Goals for v1

- Prove the learning loop: look at a model, try it, see why it behaved that way, apply it.
- Teach the two core principles of electromagnetism so they stick: current makes a magnetic field, and a changing magnetic field makes current.
- Build an engine that later modules (Magnetism, Electricity, applications such as generators) can plug into without rework.

## Scope

v1 builds only the engine and the EM Fundamentals module; everything else appears on the map as locked, not built.

| In v1                                                                         | Not in v1 (shown as "coming later" on the map) |
| ----------------------------------------------------------------------------- | ---------------------------------------------- |
| Module map home screen                                                        | Magnetism module                               |
| Lesson engine (model lessons and explorer lessons)                            | Electricity module                             |
| EM Fundamentals: intro and ten lessons, opening and closing on a wind turbine | Applications: generator, transformer, motor    |
| Virtual instruments: compass, centre-zero meter, LEDs, bulb, paper clip tray  | Wind to Wall Socket journey                    |
| Field and current overlays                                                    | AI tutor                                       |
| Glossary with hover definitions                                               | Accounts, sync, a server                       |
| Local progress and spaced review                                              | Phone or tablet layouts                        |

Platform: desktop browser on a laptop, minimum 1280 × 720. A static site on GitHub Pages (https://cloudystripe.github.io/how-things-work/), which also runs locally. No server or login.

## Teaching principles

Every screen in the platform follows these rules; when a design choice is unclear, these decide it.

1. **Models first.** Learning happens by manipulating interactive models, not by reading. Text supports the model, never the reverse.
2. **Look before you try.** Every lesson starts by showing the learner what they are looking at, in plain words, with the parts labelled. A prediction is asked only where it helps (where everyday intuition may mislead), and never about something the learner has not yet been shown.
3. **Realistic models, drawn as technical illustrations.** Models are realistic in shape, proportion and parts, drawn in a technical illustration style: flat colors, limited shading, dark outlines. Invisible physics (field lines, current flow, flux) is drawn as toggleable overlays on top, never by replacing the model. Overlays and labels must stay clearly readable against it.
4. **Practical over theoretical.** Each module opens with a real machine and comes back to it at the end. Lessons may add real uses of what was just seen.
5. **Math only when it earns its place.** A relationship appears only if it has an everyday consequence, shown as a pattern the learner discovers with a control and a data table. No derivations. Patterns, tables and plots belong to the Magnetism and Electricity modules, never to EM Fundamentals.
6. **Full terminology.** Use the real technical terms (induction, conduction, flux, solenoid). Name each term at the moment the learner sees the thing it describes.
7. **Modular.** Each module is self-contained, declares its prerequisites, and does not re-teach other modules.
8. **Observable before abstract.** In EM Fundamentals, field and current are shown only through what they do (a cart rolls, a compass turns, a meter needle moves, a bulb glows). EM Fundamentals has no numbers, units, data tables or Pattern steps; units and deeper mechanics belong to the Magnetism and Electricity modules.
9. **One idea per lesson.** Each lesson teaches one idea and adds at most one new control. An explorer lesson's take-apart tools are not controls.

## Platform structure

The platform is a map of modules; a module is a set of lessons; a lesson is a short sequence of steps around one interactive model.

- **Module map (home screen).** Shows every module as a node with prerequisite arrows. EM Fundamentals sits at the root. Magnetism and Electricity branch from it, and the applications (Generator, Transformer, Motor) sit below both. In v1 only EM Fundamentals is unlocked; the rest render as "coming later."
- **Module page.** A short real-world intro, the numbered list of lessons with completion state, and the module's glossary terms.
- **Lesson.** One model, one idea, and the lesson steps below.
- **Prerequisites.** Each module declares the modules it builds on. The learner can open any unlocked module; if a prerequisite is unfinished, the app shows a one-line nudge but does not block.
- **Glossary and Review.** Two global pages reachable from every screen.

Dashed modules appear on the map but are not built in v1; arrows point from a module to the modules that build on it.

## Lesson flow

Every lesson runs the same short pattern, so the engine renders any lesson from a content file without custom code per lesson. Three steps are always present; three are optional.

1. **Look.** What the learner is looking at, in plain words: the objects on the bench and what they are made of. Labels are pinned to the model's parts. The learner can turn and zoom the view; the controls are off.
2. **Try.** Two to four guided prompts ("Slide your magnet toward the cart on the right.") that tick off as the learner does them. Free play is always allowed. A prediction is optional and used only where it helps; when a lesson has one, it comes first and the controls unlock once it is answered. The prediction is saved.
3. **Why.** What happened and why, under about 80 words. The technical terms are named on screen at that moment, and the matching overlay turns on. If there was a prediction, it is compared with what happened.
4. **Pattern** (optional; never in EM Fundamentals). The learner varies one control while the app logs readings to a table and a small plot. The pattern is stated in words; a formula appears only if it has a practical consequence.
5. **In the world** (optional). Two or three real applications of what was just seen, each one line, with a pointer to the future module that covers it.
6. **Challenge** (optional). A goal-based task inside the same model ("Push the cart to the end of the rail without touching it."). The model resets to its starting state when the step opens, and the app checks success automatically from model state.

When the learner finishes a lesson, two to four review cards (concept, term, prediction) are added quietly to the spaced-review queue. There is no separate Recall screen.

### Lesson types

- **Model lesson.** The pattern above, around one interactive model.
- **Explorer lesson.** A realistic machine the learner takes apart. It runs Look, then Try, then an optional Why. The take-apart tools are an exploded-view slider and a step-by-step removal (Remove next part, Put back). Clicking any part shows its name and a one-line description of what it does; a lesson may add a fuller explanation for each part. Explorer lessons may use overlays.

## EM Fundamentals module

The module teaches one idea in two directions: current makes a magnetic field, and a changing magnetic field makes current. It opens and closes on a wind turbine, and builds up to it in ten short lessons, one idea each.

### Module intro

- **Hook:** Almost every power station on Earth, whether coal, nuclear, hydro or wind, ends the same way: it spins magnets past coils of wire. This module shows why that works.
- **History, one line each:** In 1820 Hans Christian Ørsted saw a compass needle twitch near a live wire. In 1831 Michael Faraday made current by moving a magnet near a coil.
- **Prerequisites:** none. This is the root module.

### Lessons

| #   | Lesson                | The one idea                                                                                                              | Model, and the new control                                                                                                                                     | Terms named                                                             |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | The windmill          | This machine turns wind into electricity, and this module explains how                                                    | Explorer: the wind turbine. Wind on, take it apart, click parts                                                                                                | none                                                                    |
| 2   | What magnets do       | Magnets push and pull across a gap: like poles repel, unlike poles attract                                                | A magnet on a rail between two magnets on carts. New: slide the magnet                                                                                         | magnetic pole, attraction, repulsion                                    |
| 3   | The invisible field   | Magnets pull iron and steel but not copper or wood; iron filings, being iron, show the shape of the field around a magnet | A wooden peg, a copper coin and a steel paper clip beside the magnet (slide it, already known), then a glass sheet over the magnet. New: sprinkle iron filings | ferromagnetic, magnetic field, field lines                              |
| 4   | What a compass is     | A compass is a small magnet on a pivot that lines up with the field where it sits; alone, it lines up with Earth's        | A compass and a magnet on a bench. New: move the compass                                                                                                       | compass, Earth's magnetic field                                         |
| 5   | What current is       | Current flows around a closed loop of conductor; break the loop and it stops                                              | Battery, switch, bulb and wires. New: the switch                                                                                                               | electric current, electric circuit, conductor, insulator                |
| 6   | Current makes a field | A wire carrying current has a circular field around it; reverse the current and the field reverses                        | A wire through a board, with compasses around it. New: reverse the battery                                                                                     | compass deflection, right-hand rule                                     |
| 7   | Coil it               | A coil gathers that field into a magnet you can switch off; an iron core makes it much stronger                           | A coil above a tray of paper clips. New: iron core in or out                                                                                                   | coil, solenoid, iron core, electromagnet                                |
| 8   | Move a magnet         | A moving magnet makes current in a coil, only while it moves; in and out give opposite directions                         | A coil with a centre-zero meter (no scale) and two LEDs wired opposite ways. Slide the magnet (already known)                                                  | electromagnetic induction, induced current, magnetic flux, galvanometer |
| 9   | Spin it               | A magnet spinning past a coil makes current that keeps reversing; that machine is a generator                             | A hand-cranked magnet beside a coil, with the meter and LEDs. New: crank speed (slow, fast)                                                                    | generator, alternating current                                          |
| 10  | Back to the windmill  | Every part of the turbine, explained with the ideas from lessons 2 to 9                                                   | Explorer with full part explanations and the generator overlay                                                                                                 | electric motor                                                          |

### Lesson outlines

**1. The windmill (explorer).** A realistic wind turbine running in the wind.

- **Look:** this is a wind turbine; wind turns its blades, and somewhere inside, that turning becomes electricity; by the end of this module you will understand how.
- **Try:** turn on the wind; pull the turbine apart with the slider; click a part to see its name; take parts off one at a time until you reach the generator.
- **Parts, in removal order:** blades, hub, nacelle cover, main shaft, gearbox, generator. The tower stays. Each has a one-line description of what it does.
- **Why:** a short closing that points ahead: the next lessons build, one idea at a time, to how the generator works.

**2. What magnets do.** A bar magnet in a holder slides along a wooden rail; its red end is marked N and its blue end S. At each end of the rail, another bar magnet sits on a cart that rolls freely. The left cart's magnet faces the same way as the learner's (blue end toward the learner's red end); the right cart's faces the other way (red end to red end).

- **Try:** prediction: "Your magnet's red end faces the red end of the magnet on the right-hand cart. What will that cart do as your magnet slides close?" (roll toward your magnet / roll away / stay where it is). Prompts: slide toward the right cart; slide toward the left cart.
- **Key observations:** the right cart rolls away before the magnets touch; the left cart rolls in and sticks; both happen across a gap.
- **In the world:** magnetic clasps on bags and phone cases; wooden toy trains whose magnet couplings snap together one way round and push apart the other; maglev trains.
- **Challenge:** push the right-hand cart to the end of the rail without letting the magnets touch.

**3. The invisible field.** At the front of the bench, a wooden peg, a copper coin and a steel paper clip lie beside the learner's magnet; at the back, a glass sheet sits over a second bar magnet.

- **Try:** prediction: "Which of them will your magnet pull?" (all three / the coin and the paper clip / only the paper clip / none of them); most people expect every metal to be pulled. Prompts: slide the magnet past the peg, the coin and the clip (only the clip jumps across); sprinkle iron filings on the glass and watch them settle into a pattern.
- **Key observations:** magnets pull iron and steel but not copper or wood; filings, being iron, line up in curves from pole to pole, crowded near the poles.
- **Overlay:** field lines with direction arrows, turned on by Why.

**4. What a compass is.** A compass on a bench, with a bar magnet nearby.

- **Try:** prediction: "When you bring the compass to your magnet's red end, which way will the needle's red end point?" (toward the magnet / away from it / still north); "north points to north" misleads. Prompts: drag the compass to the red end; take it round to the blue end; move it far away again.
- **Key observations:** the needle is a small magnet on a pivot and lines up with the field where it sits; far from any magnet it lines up with Earth's field and points north.
- **Overlay:** Earth's field.

**5. What current is.** A battery, a switch, a bulb and copper wires with plastic coating.

- **Try:** prediction: "When you close the switch, how will the current flow?" (out of one end of the battery, round through the bulb and back into the other end / out of both ends, meeting at the bulb / out to the bulb, where it is used up). Prompts: close the switch; open it.
- **Key observations:** the bulb glows only while the loop is closed; current flows all the way around through the copper, not the coating.
- **Overlay:** current flow (moving dots in the wires).

**6. Current makes a field.** A vertical copper wire passes through a horizontal board, with compasses on the board around it, and the switch from lesson 5.

- **Try:** prediction: "Copper is not pulled by a magnet. When current flows up the wire, what will the compasses near it do?" (point toward the wire / point away / turn to point round it, in a circle / stay pointing north). Prompts: close the switch; reverse the battery; open the switch and watch the compasses swing back. Why compares the compasses nearest the wire with the farthest.
- **Key observations:** the compasses turn to form a circle around the wire; reversing the battery reverses the circle; compasses farther out turn less.
- **Overlay:** circular field lines with arrows; current flow.

**7. Coil it.** The wire wound into a coil above a tray of paper clips, with the switch, and a small compass beside the coil's end.

- **Try:** prediction: "The iron rod is not a magnet. With current flowing, what will pushing it into the coil do?" (lift more clips / make no difference / lift fewer clips). Prompts: close the switch and watch the compass and the clips; push the iron core in; open the switch.
- **Key observations:** the coil acts like a bar magnet with north and south poles: alone it turns the compass but is too weak to lift a clip; the iron core makes it lift many clips; switching off drops them and the compass swings back to north.
- **Overlay:** field lines.

**8. Move a magnet.** A coil connected to a centre-zero meter with no scale and two LEDs wired opposite ways. The learner slides a bar magnet along the coil's axis.

- **Try:** prediction: "What will the meter show while the magnet sits still inside the coil?" (a steady current / no current at all / a current that keeps swinging back and forth). Prompts: push the magnet in; hold it still inside; pull it out; push it in again, quickly. The two LEDs are red and green, so each direction has its own colour.
- **Key observations:** current flows only while the magnet moves; in and out light opposite LEDs; a still magnet gives nothing; faster motion swings the needle further.
- **Overlay:** field lines threading the coil (magnetic flux); current flow.

**9. Spin it.** A magnet on a shaft beside a coil with an iron core, turned by a hand crank, with the meter and LEDs.

- **Try:** prediction: "As the magnet spins, which way will the current in the coil flow?" (always the same way / one way, then the other, over and over / not at all). Prompts: turn the crank slowly; turn it fast.
- **Key observations:** the needle swings back and forth continuously and the LEDs take turns; faster cranking swings it harder and faster.
- **Overlay:** current flow.

**10. Back to the windmill (explorer).** The turbine again, with every part explained using lessons 2 to 9.

- **Try:** take it apart again; open each part's full explanation; turn on the generator overlay and watch magnets spin past coils.
- **Why:** wind turns the blades; the gearbox speeds up the turning; the generator spins magnets past coils, and the changing field makes alternating current. Teaser: an electric motor is the same machine run the other way.
- **Overlay:** generator field and current.

Moved out of EM Fundamentals: Faraday's law and Lenz's law (to Magnetism); frequency, hertz and the oscilloscope (to Electricity); the two-coil capstone (to Transformer).

## Magnetism module (scope outline; not in v1)

Prerequisite: EM Fundamentals. Puts numbers and units on what EM Fundamentals showed.

- Field strength in tesla, measured with a magnetometer.
- Fall-off with distance: doubling the distance from a long wire halves the field. Practical consequence: fields from household wiring fade within centimetres. A short note says this is not the inverse-square law; that law (for light, sound and radio) comes in a later module. A magnet's field falls off much faster.
- Coil strength with turns and current; the iron core's multiplier and saturation; a paper clip challenge with a set current.
- Earth's field: strength, dip, and the horizontal part a compass feels.
- Magnetic flux in webers; Faraday's law (the faster the flux changes, the larger the voltage) and Lenz's law, with the optional drag felt on a moving magnet.

## Electricity module (scope outline; not in v1)

Prerequisite: EM Fundamentals.

- Charge, and current in amperes, measured with an ammeter.
- Voltage in volts, resistance in ohms, Ohm's law, and power in watts.
- Series and parallel circuits.
- Direct and alternating current; frequency in hertz; the oscilloscope.
- The crank generator in numbers: doubling the crank speed doubles both the peak voltage and the frequency. Practical consequence: grid power is 60 Hz in North America and 50 Hz in most other countries because that is how fast the generators turn.

## Transformer module (first lesson outline; not in v1)

Prerequisites: Magnetism and Electricity. Its first lesson is the former EM Fundamentals capstone.

**Electricity from electricity.** Two coils sit side by side with no permanent magnet. Coil A is wired to a battery and switch; coil B is wired to the meter. The task: make coil B's needle move without touching coil B.

- **Discovery:** the needle kicks only at the moment the switch closes or opens; a steady current in coil A produces nothing in coil B.
- **Why it matters:** it joins both principles. Coil A's current makes a field; that field changing makes current in coil B. This is the working principle of the transformer and wireless charging.

## Models, overlays and instruments

Every model is a realistic 3D scene driven by a shared physics core, with overlays and instruments that read from that core rather than being animated by hand.

### Lesson screen layout (laptop)

- **Left panel** (about 30% width): the current step's text, the prediction choices, the guided prompts, and Back and Next.
- **Center:** the 3D model, with an overlay toggle bar along its top edge, a Labels toggle, Reset model and Reset view.
- **Right panel:** controls (switches, sliders, selectors) and instrument readouts; for an explorer, the take-apart tools, the part list and the selected part's card.
- **Bottom drawer:** the data table and plot, opened during a Pattern step (later modules only).

### Models

- Real equipment in real proportions, in the technical illustration style (Teaching principle 3): each material (copper wire, steel and iron, wood bench, glass) has its own flat color, and parts are outlined. Clean, evenly lit, no clutter.
- Orbit, zoom and pan within limits; one default camera angle per lesson. The default view is fitted to the model view at the screen's size, so the apparatus fills it.
- Draggable objects (magnet, compass) move with the mouse, constrained to sensible paths, and every drag has a keyboard equivalent in the right panel.
- Scenes by lesson: the wind turbine (1, 10), the magnet rail (2), the magnet and filings bench (3), the compass bench (4), the circuit board (5), the wire board (6), the coil and clip tray (7), the coil and magnet (8), the crank generator (9).

### Overlays (toggleable, all computed from the physics core)

| Overlay                     | Shows                                                   | Used in     |
| --------------------------- | ------------------------------------------------------- | ----------- |
| Field lines                 | Magnetic field lines with direction arrows              | Lessons 3–8 |
| Earth's field               | A faint uniform northward field                         | Lesson 4    |
| Current flow                | Moving dots in wires; speed scales with current         | Lessons 5–9 |
| Flux                        | Field lines through a coil, highlighted                 | Lesson 8    |
| Generator field and current | Magnets spinning past coils, with the current they make | Lesson 10   |

### Virtual instruments (reusable components)

| Instrument        | Behavior                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Compass           | Needle aligns with the net field at its position, including Earth's field, with light damping |
| Centre-zero meter | Needle deflects either way in proportion to current, damped; no scale in EM Fundamentals      |
| LEDs              | Two LEDs wired opposite ways, so each current direction lights one                            |
| Bulb              | Glows while current flows                                                                     |
| Paper clip tray   | Clips lift according to the electromagnet's strength; no count shown                          |

Later modules add the ammeter readout, the oscilloscope and a magnetometer, each with numbers and units.

When a visual is exaggerated for visibility (for example, field line density), a small "not to scale" tag appears.

## Terminology and glossary

Technical terms are used freely; the system makes every term one hover away and records where the learner first met it.

- **Term registry.** One shared data file defines each term: name, one-line definition (under 25 words), a longer plain-language note, related terms, and the lesson where it is introduced.
- **Naming moment.** Each term is introduced in the Why step of exactly one lesson, highlighted the first time it appears.
- **Hover definitions.** Any registered term in any text is automatically underlined; hovering shows the one-line definition and a link to where it was introduced.
- **Personal glossary page.** Lists terms the learner has encountered, grouped by module, each linking back to its lesson.
- **Confusable pairs.** The registry can mark pairs that are easily mixed up; the glossary shows them side by side. v1 pairs: induction vs. conduction; magnetic field vs. magnetic flux; generator vs. electric motor. (Current vs. voltage arrives with the Electricity module.)
- **In review.** Terms feed the spaced-review queue as "What is this called?" and "Explain this term" cards.

## Progress and review

All progress is stored locally in the browser, with export and import to a JSON file as a backup.

- **Tracked per lesson:** steps completed, the saved prediction and whether it was right, challenge completed, and the date.
- **Module completion:** all lessons completed.
- **Spaced review.** Cards are scheduled with a simple Leitner-style system (intervals of 1, 3, 7, 14 and 30 days). A Review page shows cards that are due, with a count badge on the home screen.
- **Card types:** concept ("What happens when two north poles are brought together?"), term ("What is this called?"), and model-based prediction cards that open a small live model to answer.
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

Force between two bar magnets: each pole pushes or pulls each pole of the other magnet, falling off as 1 / distance² (the pole model). Like poles repel, unlike poles attract, and far apart the force matches two dipoles (falling off as 1 / distance⁴).

Steel in a field: it takes on a magnetic moment along the field, proportional to the field until it saturates, and is pulled toward the stronger field. Copper and wood respond about 100,000 times more weakly and are treated as feeling no force.

Rolling and sliding objects: static friction holds an object until the force on it exceeds the friction; then it moves against kinetic friction.

Faraday's law of induction (the sign gives Lenz's law):

$$
\varepsilon = -N \frac{d\Phi}{dt}
$$

Rotating magnet: peak voltage scales with turns × field × area × angular speed, and frequency equals rotations per second.

Wind turbine rotor: in steady wind the rotor turns at a speed proportional to the wind speed (a fixed tip-speed ratio), and it spins up and down with a realistic delay.

### Required tests (always green; a lesson does not ship with one failing)

- Doubling distance from the wire halves the field.
- Reversing current reverses every compass.
- A stationary magnet produces exactly zero induced current.
- Inserting and withdrawing give opposite signs; flipping the magnet reverses both.
- Moving the coil gives the same result as moving the magnet at the same relative speed.
- Doubling turns doubles induced voltage.
- Doubling crank speed doubles both peak voltage and frequency.
- Two coils: coil B shows current only while coil A's current is changing (switching on or off, with a realistic short rise time), and zero during steady current.
- Like poles repel and unlike poles attract; turning either magnet around reverses the force.
- The forces two magnets exert on each other are equal and opposite.
- Steel is pulled toward the stronger field; copper and wood feel no force.
- A turbine rotor's steady speed is proportional to the wind speed.

## Technical architecture

A local single-page web app in TypeScript, with lesson content stored as typed data files and physics isolated from rendering.

| Layer              | Choice                                                            | Why                                                                                                                   |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| App                | Vite + React + TypeScript                                         | Fast local dev; strong typing for content files                                                                       |
| 3D models          | three.js via React Three Fiber and drei                           | Realistic scenes with React components                                                                                |
| State              | Zustand                                                           | Simple shared state between model, instruments and lesson panel                                                       |
| Content validation | Zod schemas                                                       | Catches malformed lesson and glossary files at build time                                                             |
| Charts             | A light chart library (e.g. uPlot or Recharts)                    | Pattern-step plots and the oscilloscope. Chosen when the first of Magnetism and Electricity is built; v1 has no plots |
| Math display       | KaTeX                                                             | Rare formulas, reserved for later modules                                                                             |
| Storage            | localStorage, versioned schema, JSON export/import                | No server needed                                                                                                      |
| Tests              | Vitest (physics, content); Playwright (smoke test of each lesson) | Enforces the accuracy requirements                                                                                    |

### Key rules

- **Lessons are data, not custom pages.** A content file names its model, controls, instruments, overlays, steps, labels, prediction, prompts, terms, challenge success condition, review cards and, for an explorer, its part descriptions. The engine renders it.
- **Models, instruments and overlays are reusable components registered by ID,** so later modules can reuse the coil, magnet and meter.
- **Challenge success conditions are functions of simulation state,** checked every frame.
- **A module can be marked qualitative** (EM Fundamentals is): content validation then rejects Pattern steps, instruments that show numbers, and digits in lesson copy.

### Folder layout

```
src/
  physics/       pure TS: fields, forces, induction, circuits, motion (+ tests)
  engine/        map, module page, lesson runner, step views, explorer tools
  models/        3D scenes: wind-turbine, magnet-rail, filings bench, compass bench,
                 circuit board, wire board, coil and clips, coil and magnet, crank generator
  instruments/   compass, meter, LEDs, bulb, clip tray (ammeter, oscilloscope for later modules)
  overlays/      field-lines, current-flow, flux, earth-field, generator
  glossary/      hover terms, glossary page
  review/        scheduler, review page, card views
content/
  map.ts
  glossary/terms.ts
  modules/em-fundamentals/
    module.ts
    01-the-windmill.ts
    02-what-magnets-do.ts
    ...
    10-back-to-the-windmill.ts
```

## Build phases for Claude Code

Claude Code builds in nine phases, each on its own branch and landing through a pull request. Two points stop for the owner's review: the style decision at the start of Phase 4, and the turbine review in Phase 7. Every other phase runs straight through: once CI is green, Claude Code merges it, posts a short report (what was built, decisions made on the owner's behalf, anything that worries it) and starts the next phase. It still stops to ask whenever a decision would change this spec, the teaching principles or the one-idea-per-lesson rule, or when it hits something it can't resolve.

1. **Setup.** Repository, Vite + React + TypeScript, linting, Vitest and Playwright, CLAUDE.md, empty routes. Done when the app runs and an empty test suite passes.
2. **Physics core.** Fields, induction and simple circuits as pure TypeScript, with every required test from Physics accuracy. Done when all physics tests pass.
3. **Engine shell.** Module map, module page, the lesson runner (Look, Try, Why, optional steps, explorer lessons) driven by content files, glossary hover, local progress storage. Lesson 2 built for real; lesson 1 on a stand-in turbine. Done when the owner had clicked through lessons 1 and 2.
4. **Style, magnets and fields.** **Owner review at the start:** render lesson 2's bench in both styles (photorealistic and clean technical illustration) and the owner picks one (they chose technical illustration). Then restyle lesson 2 and build lessons 3 and 4: the filings bench, the compass bench, the field-line and Earth's-field overlays.
5. **Current and electromagnets.** Lessons 5, 6 and 7: the circuit board, the wire board, the coil and clip tray, the bulb and the current-flow overlay.
6. **Induction.** Lessons 8 and 9: the coil and magnet, the meter and LEDs, the flux overlay, the crank generator.
7. **The wind turbine.** The realistic turbine model with its rotor physics, the take-apart tools, part descriptions and the generator overlay; lessons 1 and 10 on it. It comes after lesson 9 because the generator overlay reuses that lesson's spinning-magnet physics and visuals. **Owner review before the phase merges:** the turbine.
8. **Review and glossary.** Spaced-review scheduler and Review page, personal glossary page.
9. **Polish.** Visual consistency pass, 60 fps on the owner's laptop, Playwright smoke test for every lesson, JSON export/import, reset everything. Once it merges, the owner checks the acceptance criteria and accepts v1.

## Acceptance criteria

v1 is done when the owner can complete EM Fundamentals end to end and every item below is true.

- [ ] Home map shows all planned modules; only EM Fundamentals is unlocked.
- [ ] All ten lessons run from content files alone.
- [ ] Every lesson starts with Look; every prediction a lesson has must be answered before its controls unlock.
- [ ] The wind turbine can be taken apart, and every part shows its name and what it does.
- [ ] EM Fundamentals shows no numbers, units or data tables.
- [ ] Every overlay is toggleable and drawn from the physics core.
- [ ] All required physics tests pass.
- [ ] Every term in the Terms named column has a glossary entry and hover definition.
- [ ] Review cards are generated and scheduled; due cards appear on the Review page.
- [ ] Progress survives a browser restart and can be exported and imported.
- [ ] Models run smoothly (target 60 fps) on the owner's laptop.

## Open questions

- [x] Visual style: photorealistic, or clean "technical illustration" realism? Resolved at the start of Phase 4: technical illustration (Teaching principle 3).
- [ ] Should the Lenz's law drag feel be in the Magnetism module, or deferred further?
- [ ] Grid frequency example in the Electricity module: show 60 Hz, 50 Hz, or both based on a setting?
- [x] Where does the repository live (local folder or GitHub)? Resolved: a public GitHub repository, `CloudyStripe/how-things-work`, published to GitHub Pages. It was private until the owner chose to publish the app (GitHub's Free plan serves Pages only from public repositories).

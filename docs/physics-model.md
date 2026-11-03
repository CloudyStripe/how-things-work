# Physics model

How the physics core in `src/physics/` models EM Fundamentals, which approximations it makes,
and what later phases must know before reading from it. The spec (`docs/spec-v1.md`, Physics
accuracy) sets the requirements; this file explains how the code meets them.

## Ground rules

- **Pure TypeScript, SI units.** No rendering, React, three.js or app-state imports (enforced by
  ESLint). Physics tests run in plain Node with no DOM.
- **One frame for everything:** +x east, +y up, +z south (north is -z), right-handed. It is
  three.js world space, so scenes use physics vectors directly with no conversion.
- **Read, don't animate.** Scenes, overlays and instruments call these functions and draw the
  result. If something moves on screen because of physics, its motion comes from here.
- **Step-averaged induction.** Faraday's law is applied across each simulation step as
  `emf = -(change in flux linkage) / dt`. That is the exact average emf over the step, so:
  - a stationary magnet gives exactly zero (the spec requires exact zero), and
  - the total charge pushed through a meter is right at any frame rate, even for a pulse
    shorter than one frame (the capstone's switching kick). Instruments take these step-averaged
    values.

## Field sources

| Source                | Model                                                                                                                                                                             | Code                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Long straight wire    | B = μ0 I / (2π r), circling by the right-hand rule; linear inside the copper so it never diverges                                                                                 | `straightWireField`                    |
| Circular current loop | Exact closed form in complete elliptic integrals (computed by the arithmetic-geometric mean)                                                                                      | `currentLoopField`                     |
| Coil (solenoid)       | A uniform winding: current loops integrated along its length (24-point Gauss-Legendre)                                                                                            | `coilWinding`, `windingField`          |
| Bar magnet            | The same winding model. A uniformly magnetized cylinder has the field of a surface current equal to its magnetization (Ampèrian model), so the field inside correctly runs S to N | `barMagnetWinding`, `barMagnetField`   |
| Iron core             | Multiplies the coil's whole field by an effective permeability (30 for an open soft-iron rod), capped so the field never exceeds saturation (1.6 T)                               | `ironCoreGain`, `electromagnetWinding` |
| Earth                 | 50 µT dipping 60° below horizontal (mid-latitude North America): 25 µT north, 43 µT down                                                                                          | `earthField`                           |

A compass on a level board responds only to the horizontal part of the field, so the wire's
field competes with Earth's 25 µT, not the full 50 µT. A 5 A wire makes 33 µT at 3 cm.

## Induction

- **Flux linkage, coaxial.** For a magnet or coil on a coil's axis, `coaxialFluxLinkage`
  integrates Maxwell's exact loop-to-loop mutual inductance over both windings (16 × 16
  Gauss-Legendre). It is valid with the source outside, entering, or fully inside the coil. Moving
  the coil or the magnet changes only their separation, so the two give the same emf by
  construction.
- **Flux linkage, point dipole.** For a small magnet anywhere, `dipoleFluxLinkage` uses
  reciprocity: moment · (the coil's field per ampere at the magnet). The crank generator uses this.
- **Faraday and Lenz.** `inducedEmf` is the step-averaged Faraday's law above. Its minus sign is
  Lenz's law: the induced current's field (`coilWinding(coil, current)`) opposes the change.
- **Lenz drag.** `axialForceOnSource` gives the force the coil's current exerts on the magnet,
  -I dλ/dz. Driven by induced current it always opposes the motion, and the work done against it
  equals the heat I²R in the circuit (tested). This is what the optional "feel it" drag would use.

## Circuits

- **Ohm's law:** `circuitCurrent(emf, totalResistance)`. A coil's resistance comes from its
  copper (`coilResistance`); the galvanometer adds its own.
- **Switched coil (capstone coil A):** an RL circuit, `stepSwitchedCoil`. Closing the switch, the
  current rises toward V / R with time constant L / R (inductance from Wheeler's formula,
  `coilInductance`). Opening it, the current collapses through the spark across the contacts,
  modelled as a large resistance, so it falls fast but not instantly. The update is exact for any
  step size.
- **Capstone coil B:** emf = -M dI_A/dt, using the same flux linkage and `inducedEmf`. Coil B's own
  inductance and its pull back on coil A are neglected. Coil B's own time constant (0.93 mH over
  the meter circuit's 56 Ω, about 17 µs) is far shorter than coil A's 0.35 ms rise, so its
  inductance only rounds the brief current peak. The galvanometer needle responds to the charge
  the pulse moves, and that charge does not depend on coil B's inductance.

## Crank generator

The spinning magnet is a point dipole on a shaft beside the coil (`rotatingMagnetDipole`). Its
flux linkage is a cosine of the shaft angle, so the emf is a sine wave with peak
moment × (coil field per ampere in the plane of rotation) × angular speed (`generatorPeakEmf`),
and frequency equal to rotations per second (`generatorFrequency`).

## Instruments' needles

Needle motion is physics too, so it lives here (`needles.ts`), integrated in substeps of at most
1 ms.

- **Compass:** torque proportional to the horizontal field and the sine of the misalignment, with
  light damping. Stronger fields swing it faster (natural frequency grows with the square root of
  the field). About 1.5 swings per second in Earth's field alone.
- **Galvanometer:** a damped spring centred on zero. It settles at a deflection proportional to
  the current, overshoots about 10% first, and rests on its end stops just past full scale
  (default ±500 µA over ±40°). Feed it the step-averaged current so short pulses give the right
  kick.

## Spec relationships and where they live

| Spec relationship                                                             | Code                                                             |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| B = μ0 I / (2π r) around a long straight wire                                 | `straightWireField`                                              |
| B = μ0 n I inside a solenoid, times a capped factor with the core             | `coilCenterField` (finite coil, tends to μ0 n I), `ironCoreGain` |
| Compass aligns with the sum of wire and Earth fields                          | `compassBearing`, `stepCompassNeedle`                            |
| Bar magnet: dipole field, far field as 1 / distance³                          | `barMagnetField`, `pointDipoleField`                             |
| ε = -N dΦ/dt (sign gives Lenz's law)                                          | `coaxialFluxLinkage` / `dipoleFluxLinkage` with `inducedEmf`     |
| Peak ∝ turns × field × area × angular speed; frequency = rotations per second | `generatorPeakEmf`, `generatorFrequency`                         |

The spec's eight required tests are `src/physics/spec-required.test.ts`, one test per bullet.
Supporting tests check the maths against independent results: reference elliptic-integral
values, the textbook on-axis loop field, a direct flux integral against Maxwell's formula, the
closed-form thin-magnet solution, dipole limits, and energy conservation for the Lenz drag.
`known-values.test.ts` checks absolute magnitudes against textbook numbers written as literals
(20 µT at 1 cm from a 1 A wire, and others), so a wrong constant or unit cannot cancel out.

## Approximations and limits

- Fields are accurate everywhere except within a few millimetres of a winding's own surface, where
  the 24-loop integration is coarse. This only matters for field lines drawn right against a coil.
- The iron core scales the coil's field everywhere by one factor, as if the magnetized core had the
  coil's shape. It has no hysteresis or remanence: no current, no field.
- The straight wire is infinitely long, which holds while compasses sit close beside it.
- Earth's field has no declination: north on the board is magnetic north.
- The crank generator's magnet is a point dipole, good while it is small beside the coil.
- Flux linkage between two windings needs them on one axis. A magnet that enters a coil must be
  narrower than the coil (enforced).
- A coil driven only by induction carries I = emf / R, with its own inductance neglected. With the
  meter, a 100-turn coil's L / R is about 4 µs, far shorter than any hand movement.
- Copper resistance is the room-temperature value, with no heating.
- The only force computed is the Lenz drag. Magnets do not pull on each other or on iron, and
  compass needles do not disturb the field or each other.

## Left for later phases

- **Paper clip count (Phase 4):** depends on the electromagnet's field at its pole, but the
  mapping to a clip count is calibrated together with the "exactly 10 clips on low" challenge.
- **LED pair (Phase 5):** a forward-voltage threshold across the coil, tuned with the scene.
- **Field-line tracing and the flux line count (Phases 4 and 5):** pure maths on these fields; may
  live in `src/physics/` when built.

## Tuning notes for the scenes

Scene parameters must stay physical; these are the starting magnitudes with the test bench values:

- **Experiment 2 Part A:** pushing the 3 A·m² magnet into a 100-turn coil at 0.25 m/s gives about
  23 mV and 440 µA, close to full scale on the ±500 µA meter. Good as is.
- **Experiment 2 Part B:** a 0.5 A·m² magnet 6 cm from a 200-turn coil at 2 rotations per second
  peaks at only about 1.7 mV. The scene will need a stronger magnet, closer spacing, more turns,
  or a more sensitive meter.
- **Capstone:** two 200-turn coils 2 cm apart, a 1.5 V battery: coil A's current rises in
  0.35 ms, and the kick moves about 0.46 µC through the meter, a barely visible twitch. Phase 7
  will likely need an iron core through both coils or many more turns, as real classroom
  versions use.

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
    shorter than one frame (the two-coil switching kick). Instruments take these step-averaged
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

A model lists its sources (`FieldSources`: wires, bar magnets, coils carrying current, and
whether Earth's field counts), and `netField` adds them up. Overlays read a model's field only this
way.

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
- **Switched coil (two-coil lesson, coil A):** an RL circuit, `stepSwitchedCoil`. Closing the switch, the
  current rises toward V / R with time constant L / R (inductance from Wheeler's formula,
  `coilInductance`). Opening it, the current collapses through the spark across the contacts,
  modelled as a large resistance, so it falls fast but not instantly. The update is exact for any
  step size.
- **Two-coil lesson, coil B:** emf = -M dI_A/dt, using the same flux linkage and `inducedEmf`. Coil B's own
  inductance and its pull back on coil A are neglected. Coil B's own time constant (0.93 mH over
  the meter circuit's 56 Ω, about 17 µs) is far shorter than coil A's 0.35 ms rise, so its
  inductance only rounds the brief current peak. The galvanometer needle responds to the charge
  the pulse moves, and that charge does not depend on coil B's inductance.

## Crank generator

The spinning magnet is a point dipole on a shaft beside the coil (`rotatingMagnetDipole`). Its
flux linkage is a cosine of the shaft angle, so the emf is a sine wave with peak
moment × (coil field per ampere in the plane of rotation) × angular speed (`generatorPeakEmf`),
and frequency equal to rotations per second (`generatorFrequency`).

## Forces between magnets

`barMagnetForce` uses the pole (Gilbert) model: each bar magnet is a north pole and a south pole
of strength moment / length at its two ends, and every pole pushes or pulls every pole of the
other magnet as μ0 q1 q2 / (4π r²). It is exactly equal and opposite on the two magnets,
reverses exactly when either magnet is turned around, and far apart it matches the force between
two dipoles (falling off as 1 / distance⁴; within 1% at 20 magnet lengths). Two 6 cm classroom
magnets 1 cm apart pull with a few tenths of a newton.

The field model and the force model differ on purpose: the field uses the Ampèrian winding
(accurate inside and right beside the magnet, which field lines and coils need), while the force
uses poles (simple, accurate between separate magnets, and finite at contact).

## Steel in a field

`softIronForce` treats a small piece of iron or steel as a body that takes on a moment along the
field, proportional to the field (an effective susceptibility, limited by the object's shape)
until it saturates. The force is that moment times the gradient of the field's strength, so the
object is pulled toward the stronger field whichever way the field points, and feels nothing in a
uniform field. Before saturation this is (χV / 2μ0) ∇(B²), so doubling the field quadruples the
pull; once saturated it only doubles. A 0.4 g steel paper clip on wood jumps to a classroom
magnet from about 1.5 cm. Copper and wood respond about 100,000 times more weakly and are given
no response at all (`magnetizableBody`).

## Sliding and rolling

`stepSlidingBody` moves an object along a surface: static friction holds it until the push
exceeds it, then kinetic friction (rolling resistance, for a cart) slows it, and it stops rather
than reverse when friction alone would carry it past zero speed. Callers pass only the force
along the surface, so a cart on a rail gets the force projected onto the rail. Integrated in
substeps of at most 1 ms.

## Field lines

`traceHorizontalFieldLine` follows the horizontal part of the field across a level surface, the
line a compass needle or a filing lying flat would follow there. It is fourth-order Runge-Kutta on
the field's direction, so its step sets the spacing of the points along the line, not the field's
strength. The field-lines overlay starts lines evenly round each north pole and runs them to a
south pole or out of the area; lines that arrive at a south pole from elsewhere (from Earth's field,
or from beyond the area) are traced back from it. How many lines leave a pole is a choice, so the
overlay is tagged "not to scale", but the lines still crowd where the field is strongest.

## Iron filings

A filing is a tiny piece of iron (`IRON_FILING`: 4 mm long, 0.45 mm across, 5 mg). The field
magnetizes it along its length, so:

- **It turns into line** with the horizontal field where it lies (`filingAxis`, `turnFiling`),
  either way round, since it has no north end of its own. It is overdamped: it swings into line in
  a fraction of a second without overshooting. Where the field is under 0.8 mT (about 30 times
  Earth's) friction wins and it stays as it fell, so the pattern fades toward the corners of the
  glass.
- **It is pulled toward the stronger field** (`softIronForce`), and slides where that pull beats
  friction on the glass. Filings lie tangled with their neighbours, so the friction is about ten
  times what a lone filing would feel; with it, only the filings within a centimetre or so of a pole
  slide to it, and they pile up there. A sliding filing stops where it passes the strongest field,
  in the pile.

The magnets under the glass do not move while the filings settle, so lesson 3 samples their field
once on a 2 mm grid over the glass (`sampledPlaneField`, bilinear, within 2% of the exact field) and
every filing reads that. The filings settle as they land, while the glass is tapped; afterwards
friction holds them, so moving the other magnet leaves them be.

## Bulbs

`stepBulbGlow` gives a filament bulb's glow from 0 (dark) to 1 (its rated current). The power heating
the filament goes as current squared, so the glow settles at (current / rated)², whichever way the
current flows, and follows a change with the filament's warm-up time (about 0.05 s for a torch bulb).
The filament's resistance is taken as its hot value throughout.

## The turbine's generator

The gearbox turns the generator a hundred times for each turn of the blades. The generator
overlay models its inside as four magnet poles on the generator's rotor, north and south in turn,
passing six coils round it. Each pole is a point dipole, so each coil's flux linkage comes from
`dipoleFluxLinkage` (the same physics as the crank generator), and its emf is minus the linkage's
rate of change: the linkage's rate with shaft angle times the shaft's speed. The overlay shows each
coil's current as a share of the most it makes in the lesson's breeze, and shows the generator
turning forty times slower than it does, since at its real speed it would be a blur.

## Wind turbine rotor

`stepRotor` is a first-order model: in a steady wind the rotor settles at tip-speed ratio × wind
speed / blade length (a large three-blade turbine holds a tip-speed ratio near 7), and it follows a
change in wind with one time constant (about 8 s for a large rotor). The update is exact for any
step size. The lessons run the turbine in one steady breeze (10 m/s), inside its working range, so
the model leaves out the cut-in speed below which a turbine stands still and the rated speed above
which its blades pitch to hold the rotor steady.

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
| Force between bar magnets: poles, 1 / distance²; dipoles far apart            | `barMagnetForce`, `barMagnetPoles`                               |
| Steel pulled toward stronger field; copper and wood feel none                 | `softIronForce`, `magnetizableBody`                              |
| Static friction holds, kinetic friction slows                                 | `stepSlidingBody`                                                |
| Field lines, as filings and compasses show them                               | `traceHorizontalFieldLine`, `filingAxis`, `turnFiling`           |
| Rotor speed proportional to wind speed, with a delay                          | `stepRotor`, `steadyRotorSpeed`                                  |

The spec's twelve required tests are `src/physics/spec-required.test.ts`, one test per bullet.
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
- Forces are computed between bar magnets (poles at their ends; real magnets' effective poles sit
  a little inside the ends), on small pieces of iron and steel (treated as points), and the Lenz
  drag. Compass needles do not disturb the field or each other, and a magnetized clip adds no
  field of its own.
- A magnet the learner holds is moved by the hand: the force on it is computed but not felt.
- A clip that jumps to an electromagnet moves straight to its place there; the cored coil has no
  surface of its own in the field model, so where clips cling is set by the scene.
- A sampled field (iron filings) has no vertical gradient, so a filing feels only the horizontal
  part of its pull; the vertical part only presses it on the glass harder or lifts it slightly.
- Objects stuck to a magnet ride with it: once a paper clip touches, the grip far exceeds anything
  the hand's motion asks of it.

## LEDs and the meter circuit

An LED passes no current below its forward voltage (1.8 V for a red indicator), then current rising
steeply, modelled as a straight line through 25 Ω (`ledPairCurrent`). Two wired opposite ways
light one for each direction. A high-brightness LED glows plainly at a milliamp; the scenes treat
5 mA as full brightness.

In lessons 8 and 9 the coil drives the meter and the LED pair side by side
(`solveInductionCircuit`, solved exactly). The meter with its series resistor takes 4000 Ω, so full
scale (500 µA) is 2 V, just past where the LEDs light. Below 1.8 V only the meter takes current;
above it the LEDs take most of it, which holds the voltage near 1.8 V. So a jerky push lights an LED
and moves the needle less than a smooth one: the LEDs take the brief high voltage.

The flux overlay draws the same field lines as the field-lines overlay, with those that pass inside
the coil bold.

## Tuning notes for the scenes

Scene parameters must stay physical; these are the starting magnitudes with the test bench values:

- **Lesson 2 (What magnets do):** three 3 A·m² magnets, 6 cm long; carts of 100 g with 30 mN of
  static and 20 mN of rolling friction.
- **Lesson 3 (The invisible field):** the same magnets. The objects' centres sit 2.2 cm from the
  sliding magnet's axis (the clip's edge about 1 cm from its face). The 0.4 g clip, held by 2 mN of
  friction, feels about 6 mN as a pole passes and jumps; at 3 cm it would feel 1.4 mN and stay. The
  magnet under the glass sits 17 cm behind the sliding one, whose field adds at most about a quarter
  at the near edge of the glass. 1,800 filings land over 1.2 s and settle within a few seconds.
- **Lesson 4 (What a compass is):** a weak 0.4 A·m² magnet, 5 cm long. Its field equals Earth's
  horizontal 25 µT about 12 cm out from its side and 15 cm out from its ends. The compass starts
  36 cm away, off its end, about four degrees off north; a full-strength 3 A·m² magnet would turn it
  more than twenty degrees there.

- **Lesson 5 (What current is):** two AA cells (3 V, 0.8 Ω inside) and a torch bulb (8.3 Ω hot):
  0.33 A, so the bulb glows a little past its rating. The wires' 0.05 Ω hardly matter. The circuit's
  inductance is far too small to see, so the current switches at once.
- **Lesson 6 (Current makes a field):** one D cell (1.5 V, 0.1 Ω inside) through a short, thick wire
  (0.05 Ω): 10 A, about what a fresh cell drives into a near short. Its field is 57 µT at 3.5 cm,
  27 µT at 7.5 cm and 17 µT at 12 cm, against Earth's 25 µT, so the near compasses point round the
  wire and the far ones turn less. Only the tall wire's field counts: its leads run up and over,
  35 cm above the board, and down beyond its left edge, and are left out. No compass sits due east
  or west of the wire, where reversing the current would leave a needle balanced exactly backwards.
  With Earth's field added, the field lines close round the wire out to about 8 cm on the side where
  the two fields oppose, but only about 2 cm on the side where they add; the overlay starts its lines
  on the far side.
- **Lesson 7 (Coil it):** 200 turns of 0.5 mm copper, 24 mm across and 6 cm long (1.3 Ω), on three
  AA cells (4.5 V, 0.6 Ω inside): 2.4 A. Air-cored it pulls a clip in the tray, 22 mm below its axis,
  with at most 0.2 mN against the clip's 3.9 mN weight, so none lifts: a few amps through a small
  coil make a weak magnet. With the soft-iron core (gain 30), the upward pull at the tray floor
  below an end reaches about 13 times the weight, and about fourteen of thirty clips lift. A clip
  pressed against the iron stays while the pull on it is more than its weight; the core's surface
  takes any sideways part. The winding is drawn as thirty turns.
- **Lesson 8 (Move a magnet):** a strong (neodymium) 6.5 A·m² magnet, 5 cm long, into a coil of 2000
  turns of 0.15 mm copper (4 cm across, 240 Ω). The flux linkage changes by up to 4.6 Wb per metre
  of travel, so a steady push at 13 cm/s makes about 0.6 V and swings the needle about 11 degrees,
  and a push faster than about 40 cm/s lights an LED. Held still, the emf is exactly zero.
- **Lesson 9 (Spin it):** a 2.5 A·m² magnet, 3 cm long, spun beside a coil of 3000 turns of 0.2 mm
  copper (3 cm across, 150 Ω) on a soft-iron core, its end 2.5 cm from the shaft. At half a turn a
  second the emf peaks near 0.9 V and the needle swings about 18 degrees each way; at 1.2 turns a
  second it peaks near 2.2 V and the LEDs take turns. The magnet is long for a point dipole that
  close, so the emf's size is approximate; its shape, and its proportion to speed, hold.
- **Two coils (the Transformer module's first lesson):** two 200-turn coils 2 cm apart, a 1.5 V battery: coil A's current rises in
  0.35 ms, and the kick moves about 0.46 µC through the meter, a barely visible twitch. That lesson
  will likely need an iron core through both coils or many more turns, as real classroom
  versions use.

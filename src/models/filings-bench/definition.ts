import {
  EAST,
  filingAxis,
  IRON_FILING,
  magnetizableBody,
  netField,
  sampledPlaneField,
  softIronForce,
  stepSlidingBody,
  turnFiling,
  vec3,
  ZERO,
  type BarMagnet,
  type FieldSources,
  type FrictionParams,
  type MagnetizableBody,
  type SlidingBody,
  type Vec3,
} from '@/physics';
import type { ModelDefinition, SimSnapshot } from '../types';

// Lesson 3's bench. At the front, the learner's bar magnet lies against a wooden guide and slides
// from side to side past a wooden peg, a copper coin and a steel paper clip lying in front of it.
// Each object is pulled as the physics core says (softIronForce): the field magnetizes the steel
// clip and pulls it across to the magnet against friction on the bench, and once it touches it
// sticks and rides along. Copper and wood feel no force, so they never move. At the back, a second
// bar magnet lies under a sheet of glass, where the learner sprinkles iron filings.

/** Classroom ceramic bar magnets, as in lesson 2: 6 cm long, 15 mm across. */
export const MAGNET = { length: 0.06, side: 0.015 } as const;
const MAGNET_RADIUS = 0.0075;
const MAGNET_MOMENT = 3;
/** The magnets lie on the bench: their centres are this high (m). */
export const MAGNET_HEIGHT = MAGNET.side / 2;

/** The learner's magnet slides along this line (z, m), its centre between these x positions. */
export const PATH_Z = 0.06;
export const MAGNET_TRAVEL = { min: -0.2, max: 0.2 } as const;

export type ObjectId = 'peg' | 'coin' | 'clip';

interface ObjectSpec {
  readonly x: number;
  /** Footprint on the bench (m): along the path, and across it. */
  readonly length: number;
  readonly width: number;
  /** Height of its centre above the bench (m). */
  readonly height: number;
  readonly body: MagnetizableBody;
  readonly friction: FrictionParams;
}

/**
 * The three objects, in a row in front of the path, each centre 2.2 cm from the magnet's axis.
 * Friction is a coefficient of about 0.4 on wood times each one's weight.
 */
export const OBJECTS: Readonly<Record<ObjectId, ObjectSpec>> = {
  /** A beech peg, 4 cm long and 1 cm across: about 2 g. */
  peg: {
    x: -0.08,
    length: 0.04,
    width: 0.01,
    height: 0.005,
    body: magnetizableBody('wood', 3.1e-6),
    friction: { mass: 0.002, staticFriction: 8e-3, kineticFriction: 6e-3 },
  },
  /** A copper coin, 19 mm across and 1.5 mm thick: about 4 g. */
  coin: {
    x: 0,
    length: 0.019,
    width: 0.019,
    height: 0.00075,
    body: magnetizableBody('copper', 4.3e-7),
    friction: { mass: 0.0038, staticFriction: 1.5e-2, kineticFriction: 1.1e-2 },
  },
  /** A steel paper clip, 32 mm long and 8 mm wide: about 0.4 g. */
  clip: {
    x: 0.08,
    length: 0.032,
    width: 0.008,
    height: 0.00045,
    body: magnetizableBody('steel', 5e-8),
    friction: { mass: 4e-4, staticFriction: 2e-3, kineticFriction: 1.5e-3 },
  },
};
const OBJECT_IDS = ['peg', 'coin', 'clip'] as const;
export const OBJECT_Z = PATH_Z + 0.022;

/** The magnet under the glass, behind the guide, and the glass over it (m). */
export const GLASS_MAGNET_Z = -0.11;
export const GLASS = { halfWidth: 0.1, halfDepth: 0.065, top: 0.02 } as const;

export const FILING_COUNT = 1800;
/** Filings leave the hand over this long (s), from this high above the glass (m). */
const SPRINKLE_TIME = 1.2;
const DROP_HEIGHT = 0.04;
const GRAVITY = 9.81;
/** Filings rest just on the glass and pile on each other: between these heights above it (m). */
const REST_HEIGHT = { min: 0.0002, max: 0.0006 };
/** A filing this close to its line (rad) has finished turning. */
const TURNED = 1e-3;

/** Physics substeps (s): the pull on the clip grows steeply as it closes in. */
const SUBSTEP = 1e-3;
const FILING_SUBSTEP = 2e-3;

export type FilingsBenchControls = {
  /** Where the learner's magnet is, from 0 (left) to 1 (right). */
  readonly position: number;
  /** Whether iron filings have been sprinkled on the glass. */
  readonly filings: boolean;
};

/** An object on the bench, lying free or stuck to the learner's magnet. */
export interface BenchObject {
  readonly body: SlidingBody;
  /** Where along the magnet it is stuck (m from the magnet's centre), or null while free. */
  readonly stuckAt: number | null;
}

/**
 * One iron filing. While it falls it has only a height; once it lands it slides if the pull
 * beats friction, then lies still and turns into line with the field.
 */
export interface Filing {
  /** On the glass (x, z); y is the height above the glass top (m). */
  readonly position: Vec3;
  readonly velocity: Vec3;
  /** Bearing of its length (rad), as a compass bearing. */
  readonly angle: number;
  /** When it leaves the hand (s of model time). */
  readonly releasedAt: number;
  readonly restHeight: number;
  readonly phase: 'falling' | 'sliding' | 'resting' | 'settled';
  /** While resting: the line it turns to, or null where the field is too weak to turn it. */
  readonly axis: number | null;
}

export interface FilingsBenchState {
  /** Centre of the learner's magnet along its path (x, m). */
  readonly magnet: number;
  readonly objects: Readonly<Record<ObjectId, BenchObject>>;
  /**
   * When the filings were sprinkled and where the learner's magnet was then, or null while the
   * glass is clear.
   */
  readonly sprinkle: { readonly at: number; readonly magnet: number } | null;
  readonly filings: readonly Filing[];
}

export type FilingsBenchSnapshot = SimSnapshot<FilingsBenchState, FilingsBenchControls>;

export function magnetPosition(slider: number): number {
  const clamped = Math.min(1, Math.max(0, slider));
  return MAGNET_TRAVEL.min + clamped * (MAGNET_TRAVEL.max - MAGNET_TRAVEL.min);
}

function barMagnet(x: number, z: number): BarMagnet {
  return {
    center: vec3(x, MAGNET_HEIGHT, z),
    axis: EAST,
    radius: MAGNET_RADIUS,
    length: MAGNET.length,
    moment: MAGNET_MOMENT,
  };
}

/** Both magnets point N to the right (+x). */
function benchSources(learnerMagnet: number): FieldSources {
  return {
    wires: [],
    magnets: [barMagnet(learnerMagnet, PATH_Z), barMagnet(0, GLASS_MAGNET_Z)],
    earth: false,
  };
}

let glassFieldCache: { magnet: number; field: (point: Vec3) => Vec3 } | undefined;

/**
 * The field across the glass, sampled once when the filings are sprinkled (both magnets,
 * with the learner's where it was then). The filings settle while the glass is tapped as they
 * land, then friction holds them, so moving the other magnet afterwards leaves them be.
 */
function glassField(learnerMagnet: number): (point: Vec3) => Vec3 {
  if (glassFieldCache?.magnet !== learnerMagnet) {
    const sources = benchSources(learnerMagnet);
    glassFieldCache = {
      magnet: learnerMagnet,
      field: sampledPlaneField((point) => netField(sources, point), {
        center: vec3(0, GLASS.top, GLASS_MAGNET_Z),
        halfWidth: GLASS.halfWidth,
        halfDepth: GLASS.halfDepth,
        spacing: 0.002,
      }),
    };
  }
  return glassFieldCache.field;
}

function objectAt(id: ObjectId, x: number, z: number): SlidingBody {
  return { position: vec3(x, OBJECTS[id].height, z), velocity: ZERO };
}

function horizontal(force: Vec3): Vec3 {
  return vec3(force.x, 0, force.z);
}

/** One substep for one object: pulled by the field, held by friction, stuck once it touches. */
function stepObject(
  id: ObjectId,
  object: BenchObject,
  magnet: number,
  sources: FieldSources,
  dt: number,
): BenchObject {
  const spec = OBJECTS[id];
  const faceZ = PATH_Z + MAGNET.side / 2 + spec.width / 2;
  if (object.stuckAt !== null) {
    // Held against the magnet's front face: the hand carries it along.
    return { body: objectAt(id, magnet + object.stuckAt, faceZ), stuckAt: object.stuckAt };
  }
  const force = softIronForce(spec.body, (point) => netField(sources, point), object.body.position);
  const body = stepSlidingBody(object.body, horizontal(force), dt, spec.friction);
  // It touches the magnet once their footprints meet.
  const along = body.position.x - magnet;
  const touching =
    Math.abs(along) <= (MAGNET.length + spec.length) / 2 &&
    body.position.z - PATH_Z <= (MAGNET.side + spec.width) / 2;
  if (!touching) return { body, stuckAt: null };
  const stuckAt = Math.min(MAGNET.length / 2, Math.max(-MAGNET.length / 2, along));
  return { body: objectAt(id, magnet + stuckAt, faceZ), stuckAt };
}

/** A fixed scatter, so a sprinkle always lands the same way (the model stays pure). */
function scatter(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sprinkleFilings(at: number): Filing[] {
  const random = scatter(31);
  const margin = 0.003;
  return Array.from({ length: FILING_COUNT }, () => {
    const x = (random() * 2 - 1) * (GLASS.halfWidth - margin);
    const z = GLASS_MAGNET_Z + (random() * 2 - 1) * (GLASS.halfDepth - margin);
    return {
      position: vec3(x, DROP_HEIGHT, z),
      velocity: ZERO,
      angle: random() * Math.PI,
      releasedAt: at + random() * SPRINKLE_TIME,
      restHeight: REST_HEIGHT.min + random() * (REST_HEIGHT.max - REST_HEIGHT.min),
      phase: 'falling',
      axis: null,
    };
  });
}

/** A filing comes to rest: it keeps the line the field gives it there, if any. */
function rest(filing: Filing, field: (point: Vec3) => Vec3): Filing {
  return { ...filing, velocity: ZERO, phase: 'resting', axis: filingAxis(field(filing.position)) };
}

function pullOn(filing: Filing, field: (point: Vec3) => Vec3): Vec3 {
  return horizontal(softIronForce(IRON_FILING.body, field, filing.position));
}

function onGlass(position: Vec3): Vec3 {
  return vec3(
    Math.min(GLASS.halfWidth, Math.max(-GLASS.halfWidth, position.x)),
    position.y,
    Math.min(
      GLASS_MAGNET_Z + GLASS.halfDepth,
      Math.max(GLASS_MAGNET_Z - GLASS.halfDepth, position.z),
    ),
  );
}

/** Advances one filing to model time `now`, a step of dt. */
function stepFiling(filing: Filing, field: (point: Vec3) => Vec3, now: number, dt: number): Filing {
  switch (filing.phase) {
    case 'settled':
      return filing;
    case 'falling': {
      if (now <= filing.releasedAt) return filing;
      const fallen = 0.5 * GRAVITY * (now - filing.releasedAt) ** 2;
      const height = Math.max(filing.restHeight, DROP_HEIGHT - fallen);
      const position = vec3(filing.position.x, height, filing.position.z);
      if (height > filing.restHeight) return { ...filing, position };
      const landed = { ...filing, position };
      // Near a pole the pull beats friction and the filing slides; elsewhere it lies still.
      const pull = pullOn(landed, field);
      return Math.hypot(pull.x, pull.z) > IRON_FILING.friction.staticFriction
        ? { ...landed, phase: 'sliding' }
        : rest(landed, field);
    }
    case 'sliding': {
      const steps = Math.max(1, Math.ceil(dt / FILING_SUBSTEP));
      let moving = filing;
      for (let step = 0; step < steps; step++) {
        const h = dt / steps;
        const body = stepSlidingBody(moving, pullOn(moving, field), h, IRON_FILING.friction);
        const position = onGlass(body.position);
        const angle = turnFiling(moving.angle, filingAxis(field(position)), h);
        // Turning back means it has passed the strongest field, where the filings that got
        // there first have piled up: it stops in the pile.
        const turnedBack =
          body.velocity.x * moving.velocity.x + body.velocity.z * moving.velocity.z < 0;
        moving = { ...moving, position, velocity: body.velocity, angle };
        if (turnedBack) return rest(moving, field);
      }
      const pull = pullOn(moving, field);
      const still =
        moving.velocity.x === 0 &&
        moving.velocity.z === 0 &&
        Math.hypot(pull.x, pull.z) <= IRON_FILING.friction.staticFriction;
      return still ? rest(moving, field) : moving;
    }
    case 'resting': {
      const angle = turnFiling(filing.angle, filing.axis, dt);
      const offset = filing.axis === null ? 0 : angle - filing.axis;
      const turned = Math.abs(offset - Math.PI * Math.round(offset / Math.PI)) < TURNED;
      return { ...filing, angle, phase: turned ? 'settled' : 'resting' };
    }
  }
}

function stepFilings(
  filings: readonly Filing[],
  field: (point: Vec3) => Vec3,
  now: number,
  dt: number,
): readonly Filing[] {
  let changed = false;
  const next = filings.map((filing) => {
    const stepped = stepFiling(filing, field, now, dt);
    if (stepped !== filing) changed = true;
    return stepped;
  });
  return changed ? next : filings;
}

export const filingsBench: ModelDefinition<FilingsBenchState, FilingsBenchControls> = {
  id: 'filings-bench',
  title:
    'A bar magnet sliding past a wooden peg, a copper coin and a steel paper clip, and a second magnet under a sheet of glass',
  controls: {
    position: {
      kind: 'slider',
      label: 'Your magnet',
      minLabel: 'Left',
      maxLabel: 'Right',
      default: 0.075,
    },
    filings: {
      kind: 'switch',
      label: 'Iron filings',
      onLabel: 'Sprinkled',
      offLabel: 'Sprinkle',
      default: false,
    },
  },

  createState(controls) {
    return {
      magnet: magnetPosition(controls.position),
      objects: {
        peg: { body: objectAt('peg', OBJECTS.peg.x, OBJECT_Z), stuckAt: null },
        coin: { body: objectAt('coin', OBJECTS.coin.x, OBJECT_Z), stuckAt: null },
        clip: { body: objectAt('clip', OBJECTS.clip.x, OBJECT_Z), stuckAt: null },
      },
      sprinkle: null,
      filings: [],
    };
  },

  step({ state, controls, time }, dt) {
    // The hand moves the magnet; spread the move over the frame so a fast slide still passes
    // close to each object on the way.
    const target = magnetPosition(controls.position);
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    let magnet = state.magnet;
    let objects = state.objects;
    for (let i = 1; i <= steps; i++) {
      magnet = state.magnet + ((target - state.magnet) * i) / steps;
      const sources = benchSources(magnet);
      const moved: Record<ObjectId, BenchObject> = { ...objects };
      for (const id of OBJECT_IDS) {
        moved[id] = stepObject(id, objects[id], magnet, sources, dt / steps);
      }
      objects = moved;
    }

    // Turning the switch on sprinkles the filings; turning it off wipes the glass.
    let { sprinkle, filings } = state;
    if (controls.filings && sprinkle === null) {
      sprinkle = { at: time, magnet };
      filings = sprinkleFilings(time);
    } else if (!controls.filings && sprinkle !== null) {
      sprinkle = null;
      filings = [];
    }
    if (sprinkle !== null)
      filings = stepFilings(filings, glassField(sprinkle.magnet), time + dt, dt);

    return { magnet, objects, sprinkle, filings };
  },

  readings: {},

  fieldSources({ state }) {
    return benchSources(state.magnet);
  },

  // Field overlays draw across the glass, just above it.
  overlayRegion: {
    center: vec3(0, GLASS.top, GLASS_MAGNET_Z),
    halfWidth: GLASS.halfWidth,
    halfDepth: GLASS.halfDepth,
  },

  anchors: {
    magnet: ({ state }) => vec3(state.magnet, MAGNET.side + 0.012, PATH_Z),
    peg: ({ state }) => labelAbove(state.objects.peg.body.position),
    coin: ({ state }) => labelAbove(state.objects.coin.body.position),
    clip: ({ state }) => labelAbove(state.objects.clip.body.position),
    glass: () => vec3(0, GLASS.top + 0.012, GLASS_MAGNET_Z - GLASS.halfDepth * 0.5),
  },
};

function labelAbove(position: Vec3): Vec3 {
  return vec3(position.x, position.y + 0.012, position.z);
}

/** Whether a filing has left the hand: still in it, it is not drawn. */
export function filingReleased(filing: Filing): boolean {
  return filing.phase !== 'falling' || filing.position.y < DROP_HEIGHT;
}

/** The clip has jumped to the learner's magnet and stuck. */
export function clipStuck(state: FilingsBenchState): boolean {
  return state.objects.clip.stuckAt !== null;
}

/** The magnet has passed beside an object (its centre has gone by the object's centre). */
export function magnetPassed(state: FilingsBenchState, id: Exclude<ObjectId, 'clip'>): boolean {
  return state.magnet > OBJECTS[id].x;
}

/** Filings are on the glass and every one has landed and turned into line. */
export function filingsSettled(state: FilingsBenchState): boolean {
  return state.sprinkle !== null && state.filings.every((filing) => filing.phase === 'settled');
}

import {
  add,
  barMagnetForce,
  EAST,
  scale,
  stepSlidingBody,
  vec3,
  ZERO,
  type BarMagnet,
  type FrictionParams,
  type SlidingBody,
  type Vec3,
} from '@/physics';
import type { ModelDefinition, SimSnapshot } from '../types';

// Lesson 2's bench: a wooden rail with the learner's bar magnet in a sliding holder, and a bar
// magnet on a rolling cart at each end. The left cart's magnet faces the same way as the
// learner's (unlike poles facing), the right cart's the other way (like poles facing). The
// carts move only by the forces between the magnets (physics core), against rolling friction.

/** Classroom ceramic bar magnets: 6 cm long, 15 mm across (about 0.36 T remanence). */
const MAGNET_LENGTH = 0.06;
const MAGNET_RADIUS = 0.0075;
const MAGNET_MOMENT = 3;
/** Height of every magnet's centre above the rail (m). */
export const MAGNET_HEIGHT = 0.03;

/** The learner's magnet slides between these centre positions (m along the rail). */
export const HOLDER_TRAVEL = { min: -0.16, max: 0.16 } as const;
/** Each cart's centre stops here at the ends of the rail. */
export const RAIL_END = 0.23;
export const CART_START = 0.2;
/**
 * Centre-to-centre distance at which two magnets meet: their length plus the carts' rubber
 * bumpers, which keep the faces about 5 mm apart.
 */
export const CONTACT_DISTANCE = MAGNET_LENGTH + 0.005;
/** How far a cart must roll before a prompt counts it as moved (m). */
const MOVED = 0.01;

/** A wooden cart with a magnet on it, about 100 g, on a wooden rail. */
const CART: FrictionParams = { mass: 0.1, staticFriction: 0.03, kineticFriction: 0.02 };

/** Physics substep (s): the pull grows steeply as the magnets close in. */
const SUBSTEP = 1e-3;

export type MagnetRailControls = {
  /** Where the learner's magnet is, from 0 (left) to 1 (right). */
  readonly position: number;
};

export interface MagnetRailState {
  /** Centre of the learner's magnet along the rail (m). */
  readonly holder: number;
  readonly leftCart: SlidingBody;
  readonly rightCart: SlidingBody;
  /** Whether the learner's magnet has ever touched the right cart's magnet. */
  readonly touchedRight: boolean;
}

export type MagnetRailSnapshot = SimSnapshot<MagnetRailState, MagnetRailControls>;

export function holderPosition(slider: number): number {
  const clamped = Math.min(1, Math.max(0, slider));
  return HOLDER_TRAVEL.min + clamped * (HOLDER_TRAVEL.max - HOLDER_TRAVEL.min);
}

/** A bar magnet lying along the rail with its centre at x; `reversed` puts its N pole left. */
function magnetAt(x: number, reversed: boolean): BarMagnet {
  return {
    center: vec3(x, MAGNET_HEIGHT, 0),
    axis: reversed ? scale(EAST, -1) : EAST,
    radius: MAGNET_RADIUS,
    length: MAGNET_LENGTH,
    moment: MAGNET_MOMENT,
  };
}

/** The three magnets: the learner's and the left cart's point N to the right; the right cart's, left. */
export function railMagnets(state: MagnetRailState): {
  holder: BarMagnet;
  left: BarMagnet;
  right: BarMagnet;
} {
  return {
    holder: magnetAt(state.holder, false),
    left: magnetAt(state.leftCart.position.x, false),
    right: magnetAt(state.rightCart.position.x, true),
  };
}

/** A cart at rest at x: where it starts, or held against a rail end or a magnet it has met. */
function cartAt(x: number): SlidingBody {
  return { position: vec3(x, MAGNET_HEIGHT, 0), velocity: ZERO };
}

function alongRail(force: Vec3): Vec3 {
  return vec3(force.x, 0, 0);
}

function substep(state: MagnetRailState, holder: number, dt: number): MagnetRailState {
  const moved = { ...state, holder };
  const { holder: held, left, right } = railMagnets(moved);
  const onLeft = alongRail(add(barMagnetForce(held, left), barMagnetForce(right, left)));
  const onRight = alongRail(add(barMagnetForce(held, right), barMagnetForce(left, right)));
  let leftCart = stepSlidingBody(state.leftCart, onLeft, dt, CART);
  let rightCart = stepSlidingBody(state.rightCart, onRight, dt, CART);
  let touchedRight = state.touchedRight;

  // The rail ends stop the carts.
  if (leftCart.position.x < -RAIL_END) leftCart = cartAt(-RAIL_END);
  if (rightCart.position.x > RAIL_END) rightCart = cartAt(RAIL_END);
  // A cart cannot pass the learner's magnet: it stops against it (bumper to magnet), and the
  // hand pushes it along if the learner slides into it.
  if (leftCart.position.x > holder - CONTACT_DISTANCE) leftCart = cartAt(holder - CONTACT_DISTANCE);
  if (rightCart.position.x < holder + CONTACT_DISTANCE) {
    rightCart = cartAt(holder + CONTACT_DISTANCE);
    touchedRight = true;
  }
  return { holder, leftCart, rightCart, touchedRight };
}

export const magnetRail: ModelDefinition<MagnetRailState, MagnetRailControls> = {
  id: 'magnet-rail',
  title: 'A bar magnet on a wooden rail, between two magnets on rolling carts',
  controls: {
    position: {
      kind: 'slider',
      label: 'Your magnet',
      minLabel: 'Left',
      maxLabel: 'Right',
      default: 0.5,
    },
  },

  createState(controls) {
    return {
      holder: holderPosition(controls.position),
      leftCart: cartAt(-CART_START),
      rightCart: cartAt(CART_START),
      touchedRight: false,
    };
  },

  step({ state, controls }, dt) {
    // The hand moves the holder; spread the move over the frame so a fast slide still meets
    // the carts' magnets on the way.
    const target = holderPosition(controls.position);
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    let next = state;
    for (let i = 1; i <= steps; i++) {
      const holder = state.holder + ((target - state.holder) * i) / steps;
      next = substep(next, holder, dt / steps);
    }
    return next;
  },

  readings: {},

  fieldSources({ state }) {
    const { holder, left, right } = railMagnets(state);
    return { wires: [], magnets: [holder, left, right], earth: false };
  },

  overlayRegion: { center: vec3(0, MAGNET_HEIGHT, 0), halfWidth: RAIL_END },

  anchors: {
    holder: ({ state }) => vec3(state.holder, MAGNET_HEIGHT + 0.03, 0),
    leftCart: ({ state }) => vec3(state.leftCart.position.x, MAGNET_HEIGHT + 0.03, 0),
    rightCart: ({ state }) => vec3(state.rightCart.position.x, MAGNET_HEIGHT + 0.03, 0),
  },
};

/** The right cart has rolled away from where it started. */
export function rightCartMoved(state: MagnetRailState): boolean {
  return state.rightCart.position.x - CART_START >= MOVED;
}

/** The left cart has met the learner's magnet and is held against it. */
export function leftCartTouching(state: MagnetRailState): boolean {
  return state.leftCart.position.x >= state.holder - CONTACT_DISTANCE - 1e-9;
}

/** The right cart is against the end of the rail. */
export function rightCartAtEnd(state: MagnetRailState): boolean {
  return state.rightCart.position.x >= RAIL_END - 1e-9;
}

/**
 * A vector in the physics frame, in SI units.
 *
 * The frame matches three.js world space so models can use physics values directly:
 * +x is east, +y is up, +z is south (north is -z). It is right-handed.
 */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export const ZERO: Vec3 = vec3(0, 0, 0);
export const EAST: Vec3 = vec3(1, 0, 0);
export const UP: Vec3 = vec3(0, 1, 0);
export const NORTH: Vec3 = vec3(0, 0, -1);

export function add(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function scale(a: Vec3, factor: number): Vec3 {
  return vec3(a.x * factor, a.y * factor, a.z * factor);
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

export function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a: Vec3): Vec3 {
  const size = length(a);
  if (size === 0) {
    throw new RangeError('Cannot normalize a zero vector');
  }
  return scale(a, 1 / size);
}

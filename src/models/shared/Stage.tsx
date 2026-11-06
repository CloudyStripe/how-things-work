import type { SceneView } from '../scenes';

// The light and backdrop around every model: even light on a pale cool backdrop, so the flat
// colours read as drawn. The backdrop is also the bench top: with one colour for both, a bench has
// no edge to see at any zoom. The turbine's sky hides it.

const BACKGROUND = '#dfe4ea';

/**
 * The light sits nearly overhead: tops take the lit tone and every side the middle one, and the
 * outlines separate them. three.js divides diffuse light by pi, so these intensities carry it
 * back: a lit top shows its colour exactly.
 */
export function Stage({ view }: { view: SceneView }) {
  const [x, y, z] = view.light;
  const overhead: [number, number, number] = [x * 0.4, Math.hypot(x, y, z), z * 0.4];
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight intensity={0.4 * Math.PI} />
      <directionalLight position={overhead} intensity={0.6 * Math.PI} />
    </>
  );
}

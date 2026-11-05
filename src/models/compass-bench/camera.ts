import { boxFrame, type CameraFrame } from '../shared/cameraFrame';
import type { SimSnapshot } from '../types';
import { COMPASS, MAGNET, MAGNET_X, type CompassBenchState } from './definition';

// Lesson 4's camera follows the compass. It frames the magnet and the compass together, so it is
// close in while the compass is beside the magnet and widens as the compass is taken far away,
// out to where Earth's field wins.

/** Room left round the compass's centre (m), so the compass never sits at the edge of the view. */
const ROOM = COMPASS.radius + 0.03;
/** The top of what must show (m): the compass, with room for its label. */
const TOP = 0.03;

export function compassBenchFrame(snapshot: SimSnapshot<unknown>): CameraFrame {
  const { compass } = snapshot.state as CompassBenchState;
  const ends = MAGNET.length / 2;
  const sides = MAGNET.side / 2;
  return boxFrame(
    [Math.min(MAGNET_X - ends, compass.x - ROOM), 0, Math.min(-sides, compass.z - ROOM)],
    [Math.max(MAGNET_X + ends, compass.x + ROOM), TOP, Math.max(sides, compass.z + ROOM)],
    { azimuth: 24, elevation: 40, margin: 0.04 },
  );
}

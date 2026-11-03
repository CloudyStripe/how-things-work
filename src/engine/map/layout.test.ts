import { describe, expect, it } from 'vitest';
import { moduleMap } from '@content/map';
import { CELL_HEIGHT, CELL_WIDTH, NODE_HEIGHT, NODE_WIDTH, mapLayout } from './layout';

describe('mapLayout', () => {
  const layout = mapLayout(moduleMap.nodes);

  it('sizes the map to its grid', () => {
    expect(layout.width).toBe(3 * CELL_WIDTH);
    expect(layout.height).toBe(3 * CELL_HEIGHT);
  });

  it('draws one arrow per builtOn link, from a module down to the module that builds on it', () => {
    expect(layout.arrows).toHaveLength(8);
    const arrow = layout.arrows.find((a) => a.from === 'em-fundamentals' && a.to === 'magnetism');
    const em = layout.boxes.find((box) => box.node.moduleId === 'em-fundamentals');
    const magnetism = layout.boxes.find((box) => box.node.moduleId === 'magnetism');
    if (arrow === undefined || em === undefined || magnetism === undefined) {
      throw new Error('missing node or arrow');
    }
    expect(arrow.x1).toBe(em.left + NODE_WIDTH / 2);
    expect(arrow.y1).toBeGreaterThan(em.top + NODE_HEIGHT);
    expect(arrow.x2).toBe(magnetism.left + NODE_WIDTH / 2);
    expect(arrow.y2).toBeLessThan(magnetism.top);
  });

  it('dashes arrows into modules that are not built yet', () => {
    expect(layout.arrows.every((arrow) => arrow.dashed)).toBe(true);
  });
});

import type { MapNode } from '@/engine/content/schema';

// Places map nodes on a fixed grid and draws an arrow from each module to every module that
// builds on it. Fixed sizes mean the arrows can be computed without measuring the page.

export const CELL_WIDTH = 260;
export const CELL_HEIGHT = 150;
export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 84;
const ARROW_GAP = 6;

export interface NodeBox {
  readonly node: MapNode;
  readonly left: number;
  readonly top: number;
}

export interface Arrow {
  readonly from: string;
  readonly to: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** Dashed when the module it points to is not built yet. */
  readonly dashed: boolean;
}

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly boxes: readonly NodeBox[];
  readonly arrows: readonly Arrow[];
}

export function mapLayout(nodes: readonly MapNode[]): MapLayout {
  const boxes = nodes.map((node) => ({
    node,
    left: node.column * CELL_WIDTH + (CELL_WIDTH - NODE_WIDTH) / 2,
    top: node.row * CELL_HEIGHT + (CELL_HEIGHT - NODE_HEIGHT) / 2,
  }));
  const byId = new Map(boxes.map((box) => [box.node.moduleId, box]));

  const arrows: Arrow[] = [];
  for (const target of boxes) {
    for (const baseId of target.node.builtOn) {
      const base = byId.get(baseId);
      if (base === undefined) continue;
      arrows.push({
        from: baseId,
        to: target.node.moduleId,
        x1: base.left + NODE_WIDTH / 2,
        y1: base.top + NODE_HEIGHT + ARROW_GAP,
        x2: target.left + NODE_WIDTH / 2,
        y2: target.top - ARROW_GAP,
        dashed: target.node.status === 'coming-later',
      });
    }
  }

  const columns = Math.max(...nodes.map((node) => node.column)) + 1;
  const rows = Math.max(...nodes.map((node) => node.row)) + 1;
  return { width: columns * CELL_WIDTH, height: rows * CELL_HEIGHT, boxes, arrows };
}

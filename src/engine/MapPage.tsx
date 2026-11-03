import { Link } from 'react-router';
import { findModule, moduleMap } from '@/engine/content';
import { isModuleComplete, isModuleStarted } from '@/engine/lesson/flow';
import { NODE_HEIGHT, NODE_WIDTH, mapLayout } from '@/engine/map/layout';
import { useProgressStore } from '@/engine/progress/store';

const layout = mapLayout(moduleMap.nodes);

export function MapPage() {
  const lessons = useProgressStore((state) => state.lessons);

  return (
    <section className="page">
      <h1>Module map</h1>
      <p className="page-note">
        Each module builds on the ones its arrows come from. Start with EM Fundamentals.
      </p>
      <div className="module-map" style={{ width: layout.width, height: layout.height }}>
        <svg className="module-map-arrows" width={layout.width} height={layout.height} aria-hidden>
          <defs>
            <marker
              id="map-arrowhead"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="module-map-arrowhead" />
            </marker>
          </defs>
          {layout.arrows.map((arrow) => (
            <line
              key={`${arrow.from}-${arrow.to}`}
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              className={arrow.dashed ? 'module-map-arrow is-dashed' : 'module-map-arrow'}
              markerEnd="url(#map-arrowhead)"
            />
          ))}
        </svg>
        <ul className="module-map-nodes">
          {layout.boxes.map(({ node, left, top }) => {
            const module = findModule(node.moduleId);
            const style = { left, top, width: NODE_WIDTH, height: NODE_HEIGHT };
            if (node.status === 'coming-later' || module === undefined) {
              return (
                <li key={node.moduleId} className="module-node is-locked" style={style}>
                  <span className="module-node-title">{node.title}</span>
                  <span className="module-node-status">Coming later</span>
                </li>
              );
            }
            const status = isModuleComplete(module, lessons)
              ? 'Complete'
              : isModuleStarted(module, lessons)
                ? 'In progress'
                : 'Not started';
            return (
              <li key={node.moduleId} className="module-node" style={style}>
                <Link to={`/module/${module.id}`} className="module-node-link">
                  <span className="module-node-title">{module.title}</span>
                  <span className="module-node-status">{status}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

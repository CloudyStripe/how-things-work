import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { findTerm, termIntroduction } from '@/engine/content';

interface TermProps {
  readonly termId: string;
  /** True where this term is being named, so it stands out. */
  readonly named?: boolean;
  readonly children: ReactNode;
}

const POPOVER_WIDTH = 288;
const CLOSE_DELAY_MS = 150;

/**
 * A glossary term in running text. Hover or keyboard focus opens its one-line definition and a
 * link to where it is introduced. The popover is portalled to the page body so scrolling panels
 * cannot clip it, and stays open while the pointer is over it.
 */
export function Term({ termId, named = false, children }: TermProps) {
  const term = findTerm(termId);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const popoverId = useId();

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // While open: Escape dismisses it wherever focus is, and scrolling or resizing closes it
  // rather than leaving it stranded.
  useEffect(() => {
    if (position === null) return;
    const close = () => setPosition(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [position]);

  if (term === undefined) return children;
  const introduction = termIntroduction(term);

  function open() {
    window.clearTimeout(closeTimer.current);
    const rect = trigger.current?.getBoundingClientRect();
    if (rect === undefined) return;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8));
    setPosition({ left, top: rect.bottom + 6 });
  }

  function closeSoon() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setPosition(null), CLOSE_DELAY_MS);
  }

  function keepOpen() {
    window.clearTimeout(closeTimer.current);
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={named ? 'term term-named' : 'term'}
        aria-expanded={position !== null}
        aria-controls={position !== null ? popoverId : undefined}
        onPointerEnter={open}
        onPointerLeave={closeSoon}
        onFocus={open}
        onBlur={closeSoon}
        onClick={open}
      >
        {children}
      </button>
      {position !== null &&
        createPortal(
          <div
            id={popoverId}
            role="group"
            aria-label={term.name}
            className="term-popover"
            style={{ left: position.left, top: position.top, width: POPOVER_WIDTH }}
            onPointerEnter={keepOpen}
            onPointerLeave={closeSoon}
            onFocus={keepOpen}
            onBlur={closeSoon}
          >
            <p className="term-popover-name">{term.name}</p>
            <p className="term-popover-definition">{term.definition}</p>
            {introduction !== undefined && (
              <Link
                className="term-popover-link"
                to={`/module/${introduction.module.id}/lesson/${introduction.lesson.id}`}
              >
                Introduced in {introduction.lesson.title}
              </Link>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

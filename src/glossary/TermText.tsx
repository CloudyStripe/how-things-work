import { Term } from './Term';
import { matchTerms } from './terms';

interface TermTextProps {
  readonly text: string;
  /** Terms being named here: the first appearance of each is highlighted. */
  readonly naming?: readonly string[];
}

/** Renders text with every registered term underlined and one hover away from its definition. */
export function TermText({ text, naming = [] }: TermTextProps) {
  const highlighted = new Set<string>();
  return matchTerms(text).map((segment, index) => {
    if (segment.termId === undefined) return segment.text;
    const highlight = naming.includes(segment.termId) && !highlighted.has(segment.termId);
    if (highlight) highlighted.add(segment.termId);
    return (
      <Term key={index} termId={segment.termId} named={highlight}>
        {segment.text}
      </Term>
    );
  });
}

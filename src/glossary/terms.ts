import { glossary } from '@/engine/content';
import { createTermMatcher } from './matcher';

/** Splits any learner-facing text into plain runs and registered glossary terms. */
export const matchTerms = createTermMatcher(glossary.terms);

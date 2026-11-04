import { findLessonAnywhere, findTerm } from '@/engine/content';
import type { Lesson, Module } from '@/engine/content/schema';
import { reviewCardKey, type ReviewCard } from '@/engine/progress/store';

// What a queued review card shows: its kind, the question, the answer, and the lesson it came
// from. Recall cards come from the lesson's content file; term cards from the glossary.

export interface ShownCard {
  readonly key: string;
  /** The heading over the question, such as "What is this called?". */
  readonly heading: string;
  readonly prompt: string;
  readonly answer: string;
  readonly module: Module;
  readonly lesson: Lesson;
  /** A prediction card from a lesson with a model can open that model to try before answering. */
  readonly canTryModel: boolean;
}

const RECALL_HEADINGS = {
  concept: 'Concept',
  term: 'Term',
  prediction: 'Prediction',
} as const;

/** The card as the Review page shows it, or undefined if its lesson or term no longer exists. */
export function showCard(card: ReviewCard): ShownCard | undefined {
  const found = findLessonAnywhere(card.lessonId);
  if (found === undefined) return undefined;
  const key = reviewCardKey(card);

  if (card.source === 'recall') {
    const recall = (found.lesson.recall ?? []).find((candidate) => candidate.id === card.cardId);
    if (recall === undefined) return undefined;
    return {
      key,
      heading: RECALL_HEADINGS[recall.kind],
      prompt: recall.prompt,
      answer: recall.answer,
      ...found,
      canTryModel: recall.kind === 'prediction' && found.lesson.kind === 'model',
    };
  }

  const term = findTerm(card.termId);
  if (term === undefined) return undefined;
  const name = term.name.charAt(0).toUpperCase() + term.name.slice(1);
  return card.ask === 'name'
    ? {
        key,
        heading: 'What is this called?',
        prompt: term.definition,
        answer: name,
        ...found,
        canTryModel: false,
      }
    : {
        key,
        heading: 'Explain this term',
        prompt: name,
        answer: term.definition,
        ...found,
        canTryModel: false,
      };
}

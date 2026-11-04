import { useState } from 'react';
import { Link } from 'react-router';
import { LiveModel } from '@/engine/lesson/LiveModel';
import { useProgressStore, type ReviewCard } from '@/engine/progress/store';
import { TermText } from '@/glossary/TermText';
import { showCard, type ShownCard } from './cards';
import { isDue } from './scheduler';
import { useNow } from './useNow';

// The Review page: the cards that are due, one at a time. The learner thinks of the answer,
// shows it, and says whether they remembered; the scheduler then sends the card back to wait a
// longer or a shorter time.

export function ReviewPage() {
  const queue = useProgressStore((state) => state.reviewQueue);
  const now = useNow();
  const due = queue
    .filter((card) => isDue(card, now))
    .map(showCard)
    .filter((card): card is ShownCard => card !== undefined);
  const current = due[0];

  return (
    <section className="page review-page">
      <h1>Review</h1>
      {current === undefined ? (
        <NothingDue queue={queue} now={now} />
      ) : (
        <>
          <p className="page-note">
            {due.length === 1 ? 'One card is due.' : `${due.length} cards are due.`} Think of the
            answer before you show it.
          </p>
          {/* Keyed by card, so each one starts with its answer hidden. */}
          <ReviewCardView key={current.key} card={current} />
        </>
      )}
    </section>
  );
}

function ReviewCardView({ card }: { card: ShownCard }) {
  const [shown, setShown] = useState(false);
  const [trying, setTrying] = useState(false);
  const answerCard = useProgressStore((state) => state.answerCard);

  return (
    <article className="review-card" aria-label={card.heading}>
      <p className="review-card-kind">{card.heading}</p>
      <p className="review-card-prompt">
        <TermText text={card.prompt} />
      </p>
      <p className="review-card-from">
        From{' '}
        <Link to={`/module/${card.module.id}/lesson/${card.lesson.id}`}>{card.lesson.title}</Link>
      </p>

      {card.canTryModel && card.lesson.kind === 'model' && (
        <>
          <button
            type="button"
            className="toggle"
            aria-pressed={trying}
            onClick={() => setTrying(!trying)}
          >
            Try it on the model
          </button>
          {trying && <LiveModel lesson={card.lesson} />}
        </>
      )}

      {shown ? (
        <>
          <p className="review-card-answer">
            <TermText text={card.answer} />
          </p>
          <div className="review-card-actions">
            <button type="button" className="button" onClick={() => answerCard(card.key, true)}>
              I remembered
            </button>
            <button
              type="button"
              className="button-quiet"
              onClick={() => answerCard(card.key, false)}
            >
              Not yet
            </button>
          </div>
        </>
      ) : (
        <div className="review-card-actions">
          <button type="button" className="button" onClick={() => setShown(true)}>
            Show the answer
          </button>
        </div>
      )}
    </article>
  );
}

/** With nothing due: when the next card comes, or how cards arrive at all. */
function NothingDue({ queue, now }: { queue: readonly ReviewCard[]; now: Date }) {
  if (queue.length === 0) {
    return (
      <p className="page-note">
        Nothing to review yet. Each lesson you finish adds a few cards here, due a day later.
      </p>
    );
  }
  const next = Math.min(...queue.map((card) => new Date(card.dueAt).getTime()));
  return (
    <p className="page-note">
      Nothing is due. The next card is due {whenFrom(new Date(next), now)}.
    </p>
  );
}

/** "later today", "tomorrow", or "in 5 days". */
function whenFrom(due: Date, now: Date): string {
  const days = Math.round(
    (startOfDay(due).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function startOfDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

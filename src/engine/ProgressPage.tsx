import { useState, type ChangeEvent } from 'react';
import { modules } from '@/engine/content';
import { progressBackup, readProgressBackup } from '@/engine/progress/backup';
import { useProgressStore, type ProgressData } from '@/engine/progress/store';

// Your progress: what this browser has kept, a backup file to save it to or load it from, and
// resetting everything. Resetting one module stays on that module's page.

const LESSON_COUNT = modules.reduce((total, module) => total + module.lessons.length, 0);

function counted(count: number, one: string, many: string): string {
  return count === 1 ? `one ${one}` : `${count} ${many}`;
}

/** The progress in a sentence: lessons finished, terms met and cards in review. */
function describeProgress(data: ProgressData): string {
  const finished = Object.values(data.lessons).filter(
    (lesson) => lesson.completedAt !== undefined,
  ).length;
  return (
    `${finished} of ${LESSON_COUNT} lessons finished, ` +
    `${counted(Object.keys(data.terms).length, 'term', 'terms')} met and ` +
    `${counted(data.reviewQueue.length, 'card', 'cards')} in review.`
  );
}

export function ProgressPage() {
  const lessons = useProgressStore((state) => state.lessons);
  const terms = useProgressStore((state) => state.terms);
  const reviewQueue = useProgressStore((state) => state.reviewQueue);
  const [done, setDone] = useState<string | null>(null);
  const progress = { lessons, terms, reviewQueue };

  return (
    <section className="page progress-page">
      <h1>Your progress</h1>
      <p className="page-note">
        Your progress is kept in this browser only. Save a backup to keep it safe, or to move it to
        another browser.
      </p>
      <p className="progress-summary">{describeProgress(progress)}</p>
      {done !== null && (
        <p className="progress-done" role="status">
          {done}
        </p>
      )}

      <h2>Save a backup</h2>
      <p>A small file with your lessons, terms met and review cards, saved to your downloads.</p>
      <SaveBackup progress={progress} />

      <h2>Load a backup</h2>
      <p>Loading a backup replaces the progress in this browser with the progress in the file.</p>
      <LoadBackup onLoaded={() => setDone('Backup loaded.')} />

      <h2>Reset everything</h2>
      <p>To clear just one module, use the reset at the foot of that module&rsquo;s page.</p>
      <ResetEverything onReset={() => setDone('All progress cleared.')} />
    </section>
  );
}

function SaveBackup({ progress }: { progress: ProgressData }) {
  function save() {
    const file = progressBackup(progress);
    const url = URL.createObjectURL(new Blob([file.text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" className="button-quiet" onClick={save}>
      Save a backup
    </button>
  );
}

type Loading =
  | { readonly kind: 'idle' }
  | { readonly kind: 'problem'; readonly problem: string }
  | { readonly kind: 'confirming'; readonly data: ProgressData; readonly from: string | null };

function LoadBackup({ onLoaded }: { onLoaded: () => void }) {
  const [loading, setLoading] = useState<Loading>({ kind: 'idle' });
  const replaceProgress = useProgressStore((state) => state.replaceProgress);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Cleared so choosing the same file again still counts as a choice.
    input.value = '';
    if (file === undefined) return;
    const reading = readProgressBackup(await file.text());
    setLoading(
      reading.ok
        ? { kind: 'confirming', data: reading.data, from: reading.exportedAt }
        : { kind: 'problem', problem: reading.problem },
    );
  }

  if (loading.kind === 'confirming') {
    const day =
      loading.from === null
        ? null
        : new Date(loading.from).toLocaleDateString(undefined, { dateStyle: 'long' });
    const saved = day === null ? 'This backup has' : `This backup, saved on ${day}, has`;
    return (
      <div className="confirm-box" role="group" aria-label="Confirm loading">
        <p>
          {saved} {describeProgress(loading.data)} Loading it replaces the progress in this browser.
          It cannot be undone.
        </p>
        <button
          type="button"
          className="button"
          onClick={() => {
            replaceProgress(loading.data);
            setLoading({ kind: 'idle' });
            onLoaded();
          }}
        >
          Load it
        </button>{' '}
        <button type="button" className="button-quiet" onClick={() => setLoading({ kind: 'idle' })}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <label className="button-quiet progress-file">
        Choose a backup file
        <input
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          onChange={(event) => void choose(event)}
        />
      </label>
      {loading.kind === 'problem' && (
        <p className="progress-problem" role="alert">
          {loading.problem}
        </p>
      )}
    </>
  );
}

function ResetEverything({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const resetEverything = useProgressStore((state) => state.resetEverything);

  if (!confirming) {
    return (
      <button type="button" className="button-quiet" onClick={() => setConfirming(true)}>
        Reset everything
      </button>
    );
  }

  return (
    <div className="confirm-box" role="group" aria-label="Confirm reset">
      <p>
        This clears your steps, predictions, challenges, terms met and review cards in every module.
        It cannot be undone, so save a backup first if you may want it back.
      </p>
      <button
        type="button"
        className="button"
        onClick={() => {
          resetEverything();
          setConfirming(false);
          onReset();
        }}
      >
        Reset
      </button>{' '}
      <button type="button" className="button-quiet" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}

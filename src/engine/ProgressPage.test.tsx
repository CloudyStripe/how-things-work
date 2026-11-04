import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { progressBackup } from '@/engine/progress/backup';
import {
  clearProgressForTests,
  useProgressStore,
  type ProgressData,
} from '@/engine/progress/store';
import { routes } from '@/routes';

const AT = '2026-01-05T09:00:00.000Z';

const SAVED: ProgressData = {
  lessons: {
    'what-magnets-do': {
      step: 'challenge',
      completedSteps: ['look', 'try', 'why', 'world', 'challenge'],
      startedAt: AT,
      updatedAt: AT,
      completedAt: AT,
    },
  },
  terms: { repulsion: { lessonId: 'what-magnets-do', at: AT } },
  reviewQueue: [
    {
      source: 'recall',
      cardId: 'two-north-poles',
      lessonId: 'what-magnets-do',
      addedAt: AT,
      box: 0,
      dueAt: AT,
    },
  ],
};

function renderPage() {
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/progress'] })} />);
}

function backupFile(text: string) {
  return new File([text], 'backup.json', { type: 'application/json' });
}

beforeEach(() => {
  clearProgressForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('progress page', () => {
  it('sums up the progress kept in this browser', () => {
    useProgressStore.setState(SAVED);
    renderPage();
    expect(
      screen.getByText('1 of 10 lessons finished, one term met and one card in review.'),
    ).toBeInTheDocument();
  });

  it('saves a backup file of the progress', async () => {
    const user = userEvent.setup();
    useProgressStore.setState(SAVED);
    const blobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob);
      return 'blob:backup';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Save a backup' }));
    expect(click).toHaveBeenCalledOnce();
    const written = JSON.parse(await blobs[0]!.text()) as { state: ProgressData };
    expect(written.state).toEqual(SAVED);
  });

  it('loads a backup only once the learner confirms', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.upload(
      screen.getByLabelText('Choose a backup file'),
      backupFile(progressBackup(SAVED, new Date(AT)).text),
    );

    const confirm = screen.getByRole('group', { name: 'Confirm loading' });
    expect(confirm).toHaveTextContent('1 of 10 lessons finished');
    expect(useProgressStore.getState().lessons).toEqual({});

    await user.click(within(confirm).getByRole('button', { name: 'Load it' }));
    expect(useProgressStore.getState().lessons).toEqual(SAVED.lessons);
    expect(screen.getByRole('status')).toHaveTextContent('Backup loaded.');
  });

  it('says why a file cannot be loaded, and changes nothing', async () => {
    const user = userEvent.setup();
    useProgressStore.setState(SAVED);
    renderPage();
    await user.upload(screen.getByLabelText('Choose a backup file'), backupFile('{"lessons": {}}'));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'That file is not a progress backup from How Things Work.',
    );
    expect(useProgressStore.getState().lessons).toEqual(SAVED.lessons);
  });

  it('resets everything only once the learner confirms', async () => {
    const user = userEvent.setup();
    useProgressStore.setState(SAVED);
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Reset everything' }));
    const confirm = screen.getByRole('group', { name: 'Confirm reset' });
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(useProgressStore.getState().lessons).toEqual(SAVED.lessons);

    await user.click(screen.getByRole('button', { name: 'Reset everything' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    const { lessons, terms, reviewQueue } = useProgressStore.getState();
    expect({ lessons, terms, reviewQueue }).toEqual({ lessons: {}, terms: {}, reviewQueue: [] });
    expect(
      screen.getByText('0 of 10 lessons finished, 0 terms met and 0 cards in review.'),
    ).toBeInTheDocument();
  });
});

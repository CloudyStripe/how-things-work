import { describe, expect, it } from 'vitest';
import { progressBackup, readProgressBackup } from './backup';
import type { ProgressData } from './store';

const AT = '2026-11-04T09:00:00.000Z';
const DATA: ProgressData = {
  lessons: {
    'what-magnets-do': {
      step: 'why',
      completedSteps: ['look', 'try'],
      startedAt: AT,
      updatedAt: AT,
    },
  },
  terms: { repulsion: { lessonId: 'what-magnets-do', at: AT } },
  reviewQueue: [
    {
      source: 'recall',
      cardId: 'two-north-poles',
      lessonId: 'what-magnets-do',
      addedAt: AT,
      box: 1,
      dueAt: AT,
    },
  ],
};

describe('progress backups', () => {
  it('names the file by day and reads back exactly what it wrote', () => {
    const file = progressBackup(DATA, new Date(AT));
    expect(file.name).toBe('how-things-work-progress-2026-11-04.json');
    expect(readProgressBackup(file.text)).toEqual({ ok: true, data: DATA, exportedAt: AT });
  });

  it('brings a version 2 backup forward', () => {
    const older = JSON.stringify({
      kind: 'how-things-work progress',
      version: 2,
      state: {
        lessons: {},
        terms: {},
        reviewQueue: [{ lessonId: 'what-magnets-do', cardId: 'two-north-poles', addedAt: AT }],
      },
    });
    const reading = readProgressBackup(older);
    expect(reading.ok && reading.data.reviewQueue[0]?.box).toBe(0);
  });

  it('refuses anything else, saying why', () => {
    expect(readProgressBackup('{not json')).toEqual({
      ok: false,
      problem: 'That file is not a progress backup: it is not JSON.',
    });
    expect(readProgressBackup(JSON.stringify({ lessons: {} }))).toMatchObject({ ok: false });
    expect(
      readProgressBackup(
        JSON.stringify({ kind: 'how-things-work progress', version: 99, state: {} }),
      ),
    ).toMatchObject({ ok: false, problem: expect.stringContaining('could not be read') });
  });
});

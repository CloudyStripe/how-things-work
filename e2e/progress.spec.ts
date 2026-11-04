import { expect, test } from '@playwright/test';
import { collectConsoleErrors } from './console';

// Saving a backup, resetting everything and loading the backup back, in a browser, from
// progress saved as a learner who finished lesson 2 would have it.

const FINISHED = '2026-01-05T09:00:00.000Z';

const PROGRESS = {
  version: 3,
  state: {
    lessons: {
      'what-magnets-do': {
        step: 'challenge',
        completedSteps: ['look', 'try', 'why', 'world', 'challenge'],
        startedAt: FINISHED,
        updatedAt: FINISHED,
        completedAt: FINISHED,
      },
    },
    terms: {
      'magnetic-pole': { lessonId: 'what-magnets-do', at: FINISHED },
      repulsion: { lessonId: 'what-magnets-do', at: FINISHED },
      attraction: { lessonId: 'what-magnets-do', at: FINISHED },
    },
    reviewQueue: [
      {
        source: 'recall',
        cardId: 'two-north-poles',
        lessonId: 'what-magnets-do',
        addedAt: FINISHED,
        box: 0,
        dueAt: '2026-01-06T09:00:00.000Z',
      },
    ],
  },
};

const SUMMARY = '1 of 10 lessons finished, 3 terms met and one card in review.';

test('a learner saves a backup, resets everything and loads the backup back', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  await page.addInitScript((stored) => {
    // Only on the first load, so the page's own saves survive a reload.
    if (localStorage.getItem('how-things-work:progress') === null) {
      localStorage.setItem('how-things-work:progress', JSON.stringify(stored));
    }
  }, PROGRESS);
  await page.goto('/#/progress');
  await expect(page.getByText(SUMMARY)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Save a backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^how-things-work-progress-.+\.json$/);
  const backup = testInfo.outputPath('backup.json');
  await download.saveAs(backup);

  await page.getByRole('button', { name: 'Reset everything' }).click();
  await page
    .getByRole('group', { name: 'Confirm reset' })
    .getByRole('button', { name: 'Reset' })
    .click();
  await expect(
    page.getByText('0 of 10 lessons finished, 0 terms met and 0 cards in review.'),
  ).toBeVisible();

  await page.getByLabel('Choose a backup file').setInputFiles(backup);
  const confirm = page.getByRole('group', { name: 'Confirm loading' });
  await expect(confirm).toContainText(SUMMARY);
  await confirm.getByRole('button', { name: 'Load it' }).click();
  await expect(page.getByText(SUMMARY)).toBeVisible();

  // Loaded progress is saved: after a reload it is still there, and the glossary has its terms.
  await page.reload();
  await expect(page.getByText(SUMMARY)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Glossary' })
    .click();
  await expect(
    page.getByRole('region', { name: 'EM Fundamentals' }).getByRole('article'),
  ).toHaveCount(3);
  expect(errors).toEqual([]);
});

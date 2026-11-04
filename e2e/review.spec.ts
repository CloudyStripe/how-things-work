import { expect, test, type Page } from '@playwright/test';
import { collectConsoleErrors } from './console';

// The Review and Glossary pages in a browser, from progress saved in this browser as a learner
// who finished lesson 2 more than a day ago would have it.

const FINISHED = '2026-01-05T09:00:00.000Z';
const DUE = '2026-01-06T09:00:00.000Z';
const scheduled = { lessonId: 'what-magnets-do', addedAt: FINISHED, box: 0, dueAt: DUE };

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
      { source: 'recall', cardId: 'two-north-poles', ...scheduled },
      { source: 'term', termId: 'repulsion', ask: 'explain', ...scheduled },
    ],
  },
};

async function seedProgress(page: Page) {
  await page.addInitScript((stored) => {
    // Only on the first load, so the page's own saves survive a reload.
    if (localStorage.getItem('how-things-work:progress') === null) {
      localStorage.setItem('how-things-work:progress', JSON.stringify(stored));
    }
  }, PROGRESS);
}

test('a learner reviews the cards that are due', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await seedProgress(page);
  await page.goto('/');
  // The count on the Review link, from the map.
  await expect(page.getByLabel('2 due')).toBeVisible();
  await page.getByRole('link', { name: /Review/ }).click();

  const card = page.locator('.review-card');
  await expect(card).toContainText('What happens when two north poles are brought together?');
  await page.getByRole('button', { name: 'Show the answer' }).click();
  await expect(card).toContainText('They push each other apart.');
  await page.getByRole('button', { name: 'I remembered' }).click();

  await expect(page.getByRole('article', { name: 'Explain this term' })).toContainText('Repulsion');
  await page.getByRole('button', { name: 'Show the answer' }).click();
  await page.getByRole('button', { name: 'Not yet' }).click();

  await expect(page.getByText(/Nothing is due/)).toBeVisible();
  await expect(page.getByLabel(/due$/)).toHaveCount(0);
  // Answers are saved: after a reload, still nothing due.
  await page.reload();
  await expect(page.getByText(/Nothing is due/)).toBeVisible();
  expect(errors).toEqual([]);
});

test('the glossary lists the terms a learner has met', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await seedProgress(page);
  await page.goto('/#/glossary');
  const module = page.getByRole('region', { name: 'EM Fundamentals' });
  await expect(module.getByRole('article')).toHaveCount(3);
  await expect(module.getByRole('heading', { name: 'Repulsion' })).toBeVisible();
  await module.getByRole('link', { name: 'What magnets do' }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: 'What magnets do' })).toBeVisible();
  expect(errors).toEqual([]);
});

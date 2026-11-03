import { expect, test } from '@playwright/test';
import { collectConsoleErrors } from './console';

// The Phase 3 gate in a browser: the dummy experiment from the map to Complete, through all
// eight steps, with the real 3D view and simulation.

test('a learner completes the dummy experiment end to end', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const next = page.getByRole('button', { name: 'Next' });
  const step = (name: string) => page.getByRole('heading', { level: 2, name });

  await page.goto('/');
  await page.getByRole('link', { name: /EM Fundamentals/ }).click();
  await page.getByRole('link', { name: 'Placeholder: a wire and a compass' }).click();

  // Hook
  await expect(step('Step 1 of 8: Hook')).toBeVisible();
  await expect(page.locator('.viewport canvas')).toBeVisible();
  await next.click();

  // Predict: the model stays locked until the prediction is committed.
  await expect(step('Step 2 of 8: Predict')).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Switch' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Turn away from north' }).check();
  await page.getByRole('button', { name: 'Commit prediction' }).click();
  await expect(page.getByRole('switch', { name: 'Switch' })).toBeEnabled();
  await next.click();

  // Explore: the prompts tick themselves off from the model's state.
  await expect(step('Step 3 of 8: Explore')).toBeVisible();
  await page.getByRole('switch', { name: 'Switch' }).click();
  await page.getByRole('radio', { name: 'High' }).check();
  await page.getByRole('switch', { name: 'Current direction' }).click();
  await expect(page.locator('.prompt.is-done')).toHaveCount(3);
  await expect(page.getByRole('group', { name: 'Ammeter' })).toContainText('High');
  await expect(page.getByRole('group', { name: 'Ammeter' })).toContainText('4.0 A');
  await next.click();

  // Reveal: compares with the prediction, names the terms, turns on the overlay.
  await expect(step('Step 4 of 8: Reveal and name')).toBeVisible();
  await expect(page.getByText('That matches what happened.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Field direction' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('Not to scale')).toBeVisible();
  await page.getByRole('button', { name: 'magnetic field' }).first().hover();
  await expect(page.getByRole('group', { name: 'magnetic field' })).toContainText('turning force');
  await page.keyboard.press('Escape');
  await next.click();

  // Pattern: one row per current level.
  await expect(step('Step 5 of 8: Pattern')).toBeVisible();
  for (const level of ['Low', 'Medium', 'High']) {
    await page.getByRole('radio', { name: level }).check();
  }
  const table = page.getByRole('table', { name: 'Readings' });
  await expect(table.getByRole('row')).toHaveCount(4);
  for (const value of ['10.0', '20.0', '40.0']) {
    await expect(table.getByRole('cell', { name: value })).toBeVisible();
  }
  await expect(
    page.getByText('Doubling the current doubles the field from the wire.'),
  ).toBeVisible();
  await next.click();

  // In the world
  await expect(step('Step 6 of 8: In the world')).toBeVisible();
  await next.click();

  // Challenge: medium reversed falls short of east; high reversed gets there.
  await expect(step('Step 7 of 8: Challenge')).toBeVisible();
  await page.getByRole('radio', { name: 'Medium' }).check();
  await page.waitForTimeout(3000);
  await expect(page.getByText('Not solved yet. Keep adjusting the model.')).toBeVisible();
  await page.getByRole('radio', { name: 'High' }).check();
  await expect(page.getByText('Challenge complete.')).toBeVisible({ timeout: 10_000 });
  await next.click();

  // Recall, then Finish.
  await expect(step('Step 8 of 8: Recall')).toBeVisible();
  await expect(page.getByText('These cards are now in your review queue.')).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'EM Fundamentals' })).toBeVisible();
  await expect(page.getByText('Complete', { exact: true })).toBeVisible();

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByText('Complete', { exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Map' }).click();
  await expect(page.getByRole('link', { name: /EM Fundamentals/ })).toContainText('Complete');

  expect(errors).toEqual([]);
});

test('an experiment resumes where the learner left off', async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto('/#/module/em-fundamentals/experiment/placeholder-wire-compass');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: 'Nothing' }).check();
  await page.getByRole('button', { name: 'Commit prediction' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Step 3 of 8: Explore' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { level: 2, name: 'Step 3 of 8: Explore' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Switch' })).toBeEnabled();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('radio', { name: 'Nothing' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Nothing' })).toBeDisabled();
  expect(errors).toEqual([]);
});

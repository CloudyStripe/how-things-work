import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectConsoleErrors } from './console';

// The Phase 3 gate in a browser: lessons 1 and 2 from the map to Complete, with the real 3D
// view and simulation.

/** Moves a slider by arrow-key presses, slowly enough for the carts to react on the way. */
async function pressSlowly(page: Page, slider: Locator, key: string, presses: number) {
  await slider.focus();
  for (let press = 0; press < presses; press++) {
    await page.keyboard.press(key);
    await page.waitForTimeout(80);
  }
}

test('a learner completes lesson 2, What magnets do', async ({ page }) => {
  // About 175 slow key presses, while the browser renders the 3D view in software.
  test.setTimeout(90_000);
  const errors = collectConsoleErrors(page);
  const next = page.getByRole('button', { name: 'Next' });
  const step = (name: string) => page.getByRole('heading', { level: 2, name });
  const slider = page.getByRole('slider', { name: 'Your magnet' });

  await page.goto('/');
  await page.getByRole('link', { name: /EM Fundamentals/ }).click();
  await page.getByRole('link', { name: 'What magnets do' }).click();

  // Look: what is on the bench, labelled on the model; the controls wait.
  await expect(step('Step 1 of 5: Look')).toBeVisible();
  await expect(page.locator('.viewport canvas')).toBeVisible();
  await expect(page.locator('.model-label', { hasText: 'Your magnet' })).toBeVisible();
  await expect(slider).toBeDisabled();
  await next.click();

  // Try: the prediction comes first and unlocks the model.
  await expect(step('Step 2 of 5: Try')).toBeVisible();
  await expect(next).toBeDisabled();
  await expect(slider).toBeDisabled();
  await page.getByRole('radio', { name: 'Roll away from your magnet' }).check();
  await page.getByRole('button', { name: 'Commit prediction' }).click();
  await expect(slider).toBeEnabled();

  // The prompts tick off from the model: the right cart rolls away, the left one rolls in.
  await pressSlowly(page, slider, 'ArrowRight', 50);
  await expect(page.locator('.prompt.is-done')).toHaveCount(1);
  await pressSlowly(page, slider, 'ArrowLeft', 75);
  await expect(page.locator('.prompt.is-done')).toHaveCount(2);
  await next.click();

  // Why: compares the prediction and names the terms.
  await expect(step('Step 3 of 5: Why')).toBeVisible();
  await expect(page.getByText(/You predicted:/)).toContainText('That matches what happened.');
  await expect(page.getByText(/Named here:/)).toContainText('magnetic pole, repulsion, attraction');
  await next.click();

  await expect(step('Step 4 of 5: In the world')).toBeVisible();
  await next.click();

  // Challenge: the bench starts afresh, and a slow push solves it.
  await expect(step('Step 5 of 5: Challenge')).toBeVisible();
  await expect(page.getByText('Not solved yet. Keep adjusting the model.')).toBeVisible();
  await expect(slider).toHaveValue('0.5');
  await pressSlowly(page, slider, 'ArrowRight', 50);
  await expect(page.getByText('Challenge complete.')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'EM Fundamentals' })).toBeVisible();
  const lesson = page.locator('.lesson-list-item', { hasText: 'What magnets do' });
  await expect(lesson).toContainText('Complete');

  // Progress survives a reload.
  await page.reload();
  await expect(lesson).toContainText('Complete');
  expect(errors).toEqual([]);
});

test('a learner takes the turbine apart in lesson 1, The windmill', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  // Exact: "Remove next part" also contains the word.
  const next = page.getByRole('button', { name: 'Next', exact: true });

  await page.goto('/#/module/em-fundamentals/lesson/the-windmill');
  await expect(page.getByRole('heading', { level: 2, name: 'Step 1 of 3: Look' })).toBeVisible();
  await expect(page.locator('.model-label', { hasText: 'Tower' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Exploded view' })).toBeDisabled();
  await next.click();

  await page.getByRole('switch', { name: 'Wind' }).click();
  await page.getByRole('slider', { name: 'Exploded view' }).fill('1');
  await page.getByRole('button', { name: 'Generator', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Generator' })).toContainText(
    'Turns spinning into electricity.',
  );
  for (const part of ['Blades', 'Hub', 'Nacelle cover', 'Main shaft', 'Gearbox']) {
    await page.getByRole('button', { name: `Remove next part: ${part}` }).click();
  }
  await expect(page.getByRole('button', { name: 'Remove next part: Generator' })).toBeEnabled();
  // The rotor takes a few seconds to spin up in the wind.
  await expect(page.locator('.prompt.is-done')).toHaveCount(4, { timeout: 10_000 });
  await next.click();

  await expect(page.getByRole('heading', { level: 2, name: 'Step 3 of 3: Why' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish' }).click();
  // "Back to the windmill" also contains the title, so match the whole item.
  await expect(page.locator('.lesson-list-item', { hasText: /^The windmill/ })).toContainText(
    'Complete',
  );
  expect(errors).toEqual([]);
});

test('a lesson resumes where the learner left off', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  const step = (name: string) => page.getByRole('heading', { level: 2, name });

  await page.goto('/#/module/em-fundamentals/lesson/what-magnets-do');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('radio', { name: 'Stay where it is' }).check();
  await page.getByRole('button', { name: 'Commit prediction' }).click();
  await expect(step('Step 2 of 5: Try')).toBeVisible();

  await page.reload();
  await expect(step('Step 2 of 5: Try')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Your magnet' })).toBeEnabled();
  await expect(page.getByRole('radio', { name: 'Stay where it is' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Stay where it is' })).toBeDisabled();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(step('Step 1 of 5: Look')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Your magnet' })).toBeDisabled();
  expect(errors).toEqual([]);
});

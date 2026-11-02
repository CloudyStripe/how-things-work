import { expect, test, type Page } from '@playwright/test';

const ROUTES = [
  { path: '/', heading: 'Module map' },
  { path: '/module/em-fundamentals', heading: 'Module' },
  { path: '/module/em-fundamentals/experiment/exp1-current-makes-field', heading: 'Experiment' },
  { path: '/glossary', heading: 'Glossary' },
  { path: '/review', heading: 'Review' },
];

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function expectGlobalNav(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Map', 'Glossary', 'Review']) {
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
}

for (const route of ROUTES) {
  test(`${route.path} renders with the global nav`, async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto(`/#${route.path}`);

    await expect(
      page.getByRole('heading', { level: 1, name: route.heading, exact: true }),
    ).toBeVisible();
    await expectGlobalNav(page);
    expect(errors).toEqual([]);
  });
}

test('clicks from the map through an experiment to the global pages', async ({ page }) => {
  const errors = collectConsoleErrors(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Open EM Fundamentals' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Module', exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Open Experiment 1' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Experiment' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Glossary' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Glossary' })).toBeVisible();

  await nav.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();

  await nav.getByRole('link', { name: 'Map' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Module map' })).toBeVisible();
  expect(errors).toEqual([]);
});

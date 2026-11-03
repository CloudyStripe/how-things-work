import { expect, test, type Page } from '@playwright/test';
import { collectConsoleErrors } from './console';

const ROUTES = [
  { path: '/', heading: 'Module map' },
  { path: '/module/em-fundamentals', heading: 'EM Fundamentals' },
  {
    path: '/module/em-fundamentals/experiment/placeholder-wire-compass',
    heading: 'Placeholder: a wire and a compass',
  },
  { path: '/glossary', heading: 'Glossary' },
  { path: '/review', heading: 'Review' },
];

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
  await page.getByRole('link', { name: /EM Fundamentals/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'EM Fundamentals' })).toBeVisible();

  await page.getByRole('link', { name: 'Placeholder: a wire and a compass' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Placeholder: a wire and a compass' }),
  ).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('link', { name: 'Glossary' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Glossary' })).toBeVisible();

  await nav.getByRole('link', { name: 'Review' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Review' })).toBeVisible();

  await nav.getByRole('link', { name: 'Map' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Module map' })).toBeVisible();
  expect(errors).toEqual([]);
});

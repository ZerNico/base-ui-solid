// Port note: sequential browser interactions depend on preceding clicks and DOM updates.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const html = await readFile(
  new URL('../export/react/components/collapsible/index.html', import.meta.url),
  'utf8',
);
assert.match(html, /Recovery keys/);
assert.match(html, /hiddenUntilFound/);
assert.match(html, /API reference/);
assert.doesNotMatch(html, /Something went wrong/);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) {
      errors.push(message.text());
    }
  });
  const response = await page.goto(
    `${process.env.DOCS_URL ?? 'http://localhost:3005'}/react/components/collapsible`,
  );
  assert.equal(response.status(), 200);
  await page.getByRole('heading', { name: 'Collapsible', exact: true }).waitFor();
  // A click before hydration may do nothing; wait for Start's client entry to settle first.
  await page.waitForLoadState('networkidle');
  assert.ok(
    await page.locator('.QuickNavContent > pre .pl-k').count(),
    'MDX code syntax highlighting',
  );
  for (const variant of ['CSS Modules', 'Tailwind']) {
    await page.getByRole('tab', { name: variant, exact: true }).click();
    const trigger = page.getByRole('button', { name: 'Recovery keys' });
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await trigger.click();
    await page.getByText('alien-bean-pasta', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    await trigger.click();
    await page.getByText('alien-bean-pasta', { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  }
  await page.getByRole('tab', { name: 'CSS Modules', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.getByRole('tab', { name: 'Tailwind', exact: true }).getAttribute('aria-selected'),
    'true',
  );
  await page.getByRole('button', { name: 'Source code', exact: true }).click();
  assert.match(await page.locator('.DemoRoot pre').innerText(), /base-ui-solid\/collapsible/);
  assert.ok(await page.locator('.DemoRoot pre .pl-k').count());
  await page.getByRole('tab', { name: 'CSS Modules', exact: true }).click();
  await page.getByRole('tab', { name: 'index.module.css', exact: true }).click();
  assert.match(await page.locator('.DemoRoot pre').innerText(), /\.Collapsible/);
  await page.getByRole('tab', { name: 'index.tsx', exact: true }).click();
  assert.match(await page.locator('.DemoRoot pre').innerText(), /styles.Trigger/);
  await page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'API reference', exact: true })
    .click();
  assert.match(page.url(), /#api-reference$/);
  await page.getByRole('button', { name: 'Search documentation', exact: true }).click();
  const search = page.getByRole('searchbox', { name: 'Search documentation' });
  await search.fill('collapsible');
  assert.ok(
    await page
      .getByRole('dialog')
      .getByRole('link', { name: 'Collapsible', exact: true })
      .isVisible(),
  );
  await search.fill('missing-component');
  await page.getByText('No results found.').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.screenshot({ path: '/tmp/docs1-collapsible.png', fullPage: true });
  assert.deepEqual(errors, [], 'Browser errors, hydration warnings, or Solid diagnostics');
  process.stdout.write(
    'PASS: prerendered HTML, hydration, both demo toggles, source tabs/highlighting, TOC, search, Escape; zero browser diagnostics.\n',
  );
} finally {
  await browser.close();
}

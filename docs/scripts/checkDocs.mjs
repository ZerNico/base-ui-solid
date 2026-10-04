// Port note: sequential browser checks verify the upstream search behavior and all forms demos.
/* eslint-disable no-await-in-loop, no-console */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';

const evidence = process.env.DOCS_EVIDENCE_DIR ?? '/tmp/codex-jobs/docsfix2';
await mkdir(evidence, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) {
    errors.push(m.text());
  }
});
p.on('pageerror', (error) => errors.push(error.message));
// Port note: these browser/AI entry points previously fell through to the root not-found route.
for (const asset of [
  '/favicon.ico',
  '/llms.txt',
  '/.well-known/appspecific/com.chrome.devtools.json',
]) {
  const response = await p.request.get(
    `${process.env.DOCS_URL ?? 'http://localhost:3005'}${asset}`,
  );
  assert.equal(response.status(), 200, `Public entry point ${asset}`);
}
await p.goto(`${process.env.DOCS_URL ?? 'http://localhost:3005'}/solid/handbook/forms`, {
  waitUntil: 'networkidle',
});
await p.keyboard.press('Control+k');
await p.locator('#search-input').waitFor({ state: 'visible' });
await p.waitForTimeout(300);
await p.screenshot({ path: `${evidence}/local-search-default.png` });
console.log(await p.locator('[role=dialog]').innerText());
const input = p.locator('#search-input');
await input.fill('select');
await p.waitForTimeout(300);
console.log(await p.locator('[role=dialog]').innerText());
assert.match(await p.locator('[role=dialog]').innerText(), /Select/);
await p.screenshot({ path: `${evidence}/local-search-select.png` });
const first = await input.getAttribute('aria-activedescendant');
await input.press('ArrowDown');
assert.notEqual(await input.getAttribute('aria-activedescendant'), first);
await input.press('ArrowUp');
assert.equal(await input.getAttribute('aria-activedescendant'), first);
await input.fill('zzzzzzzzzzzzzz');
await p.getByText('No results found.').waitFor();
await input.fill('select');
await p.waitForTimeout(200);
await input.press('Enter');
await p.waitForURL('**/solid/components/select');
await p.waitForLoadState('networkidle');
await p.keyboard.press('Control+k');
await p.locator('#search-input').waitFor({ state: 'visible' });
assert.equal(await p.locator('#search-input').inputValue(), '');
await p.keyboard.press('Escape');
await p.locator('.SearchPopup').waitFor({ state: 'hidden' });
await p.goto(`${process.env.DOCS_URL ?? 'http://localhost:3005'}/solid/handbook/forms`, {
  waitUntil: 'networkidle',
});
assert.equal(await p.locator('.DemoRoot').count(), 3);
const demos = p.locator('.DemoRoot');
const formResults = [];
for (let i = 0; i < 3; i += 1) {
  const demo = demos.nth(i);
  assert.equal(await demo.locator('[data-demo]').getAttribute('data-demo'), 'tailwind');
  await demo.getByRole('button', { name: 'Launch server' }).click();
  await p.waitForTimeout(100);
  const input = demo.getByRole('textbox', { name: 'Server name', exact: true });
  assert.equal(await input.getAttribute('aria-invalid'), 'true');
  await input.fill('valid-server');
  await p.waitForTimeout(100);
  assert.notEqual(await input.getAttribute('aria-invalid'), 'true');
  formResults.push({ demo: i, validation: 'required and revalidation passed' });
}
await p.evaluate(() => scrollTo(0, 0));
await p.screenshot({ path: `${evidence}/after-local-_react_handbook_forms.png` });
await writeFile(`${evidence}/interaction.json`, JSON.stringify({ errors, formResults }, null, 2));
assert.deepEqual(errors, []);
await p.goto(`${process.env.DOCS_URL ?? 'http://localhost:3005'}/solid/components/select#root`, {
  waitUntil: 'networkidle',
});
const row = p.locator('.ReferenceAccordionRoot details').first();
await row.locator('summary').click();
assert.equal(await row.getAttribute('open'), '');
assert.ok(await row.locator('.ReferenceCompactPanel').innerText());
await writeFile(`${evidence}/interaction.json`, JSON.stringify({ errors, formResults }, null, 2));
assert.deepEqual(errors, []);
await b.close();

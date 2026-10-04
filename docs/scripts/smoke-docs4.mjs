// Port note: page navigation and interactions must run sequentially.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const exportRoot = process.env.DOCS_EXPORT
  ? pathToFileURL(`${process.env.DOCS_EXPORT}/`)
  : new URL('../export/', import.meta.url);

const app = new URL('../src/app/(docs)/', import.meta.url);
async function pages(directory, prefix) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      result.push(
        ...(await pages(new URL(`${entry.name}/`, directory), `${prefix}/${entry.name}`)),
      );
    } else if (entry.name === 'page.mdx') {
      result.push(prefix);
    }
  }
  return result;
}
const urls = [
  '/solid',
  ...(await pages(new URL('solid/overview/', app), '/solid/overview')),
  ...(await pages(new URL('solid/handbook/', app), '/solid/handbook')),
  ...(await pages(new URL('solid/utils/', app), '/solid/utils')),
  '/production-error',
  '/',
  '/careers/design-engineer',
];
const browser = await chromium.launch();
const failures = [];
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) {
        errors.push(message.text());
      }
    });
    try {
      const response = await page.goto(`${process.env.DOCS_URL ?? 'http://localhost:3007'}${url}`);
      assert.equal(response.status(), 200);
      await page.waitForLoadState('networkidle');
      assert.ok(await page.locator('h1').count(), 'page heading');
      assert.doesNotMatch(
        await page.locator('body').innerText(),
        /Something went wrong|Failed to load/,
      );
      const demos = page.locator('.DemoRoot');
      for (let i = 0; i < (await demos.count()); i += 1) {
        const demo = demos.nth(i);
        const variants = demo.getByRole('tab');
        const names = await variants.allTextContents();
        for (const name of names) {
          await demo.getByRole('tab', { name, exact: true }).click();
          const preview = demo.locator('.DemoPreview');
          if (url.endsWith('/quick-start') || url.endsWith('/animation')) {
            const trigger = preview.locator('button').first();
            await trigger.click();
            await page.waitForTimeout(300);
            assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
            await trigger.click();
          } else if (url.endsWith('/use-render')) {
            const counter = preview.getByRole('button');
            if (await counter.count()) {
              await counter.click();
              await page.waitForTimeout(50);
              assert.match(await counter.innerText(), /Counter: 1/);
            } else {
              assert.ok(await preview.locator('strong').count());
            }
          } else if (url.endsWith('/merge-props')) {
            await preview.getByRole('button', { name: 'Unlock', exact: true }).click();
            const toggle = preview.getByRole('button', { name: 'Favorite', exact: true });
            await toggle.click();
            assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
          } else if (url.endsWith('/direction-provider')) {
            const slider = preview.getByRole('slider');
            await slider.focus();
            await page.keyboard.press('ArrowLeft');
            assert.equal(await slider.getAttribute('aria-valuenow'), '26');
          } else if (url.endsWith('/forms')) {
            const input = preview.getByRole('textbox', { name: 'Server name', exact: true });
            await input.fill('api-server-01');
            assert.equal(await input.inputValue(), 'api-server-01');
            const toggle = preview.getByRole('switch');
            await toggle.click();
            assert.equal(await toggle.getAttribute('aria-checked'), 'false');
          }
        }
      }
      for (let i = 0; i < (await demos.count()); i += 1) {
        const demo = demos.nth(i);
        await demo.getByRole('button', { name: 'Source code', exact: true }).click();
        assert.ok((await demo.locator('pre').innerText()).length > 40);
        const files = await demo
          .getByRole('tablist', { name: 'Source files' })
          .getByRole('tab')
          .allTextContents();
        for (const file of files) {
          await demo
            .getByRole('tablist', { name: 'Source files' })
            .getByRole('tab', { name: file, exact: true })
            .click();
          assert.ok((await demo.locator('pre').innerText()).length > 10);
        }
      }
      if (url === '/production-error') {
        const codes = JSON.parse(
          await readFile(new URL('../src/error-codes.json', import.meta.url), 'utf8'),
        );
        const code = Object.keys(codes)[0];
        await page.goto(
          `${process.env.DOCS_URL ?? 'http://localhost:3007'}/production-error?code=${code}&args[]=value`,
        );
        await page.waitForLoadState('networkidle');
        assert.match(await page.locator('h1').innerText(), new RegExp(code));
        assert.doesNotMatch(await page.locator('body').innerText(), /Unknown error code/);
      }
      if (url === '/') {
        const trigger = page.getByRole('button', { name: 'What is Base UI?', exact: true });
        await trigger.click();
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      }
      if (process.env.DOCS_STATIC === 'true') {
        const html = await readFile(
          new URL(`${url === '/' ? '' : `${url.slice(1)}/`}index.html`, exportRoot),
          'utf8',
        );
        assert.match(html, /<h1/);
      }
      assert.deepEqual(errors, [], 'browser errors, hydration warnings, Solid diagnostics');
      process.stdout.write(`PASS ${url}\n`);
    } catch (error) {
      failures.push(`${url}: ${error.message}`);
      process.stdout.write(`FAIL ${url}: ${error.message}\n`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, []);
process.stdout.write(
  `PASS ${urls.length} pages, every demo variant, interactions, zero diagnostics.\n`,
);

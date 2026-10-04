/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const routes = [];
for (const filename of await readdir(new URL('../src/routes/', import.meta.url))) {
  const source = await readFile(new URL(`../src/routes/${filename}`, import.meta.url), 'utf8');
  if (source.includes('import Content') && source.includes("createFileRoute('/_docs")) {
    routes.push(source.match(/createFileRoute\('([^']+)'\)/)[1].replace('/_docs', ''));
  }
}
const browser = await chromium.launch();
const results = [];
try {
  const jobs = [1280, 390].flatMap((width) => routes.sort().map((route) => ({ width, route })));
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (jobs.length) {
        const { width, route } = jobs.shift();
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.setDefaultTimeout(8000);
        const errors = [];
        page.on('console', (message) => {
          if (['warning', 'error'].includes(message.type())) {
            errors.push(message.text());
          }
        });
        page.on('pageerror', (error) => errors.push(error.message));
        const result = { route, width, demos: 0, files: 0, errors };
        try {
          await page.goto(`${process.env.DOCS_URL ?? 'http://localhost:3005'}${route}`, {
            waitUntil: 'networkidle',
          });
          const demos = page.locator('.DemoRoot');
          result.demos = await demos.count();
          for (let i = 0; i < result.demos; i += 1) {
            const demo = demos.nth(i);
            const selector = demo.getByRole('combobox', { name: 'Styling method' });
            const variants = (await selector.count()) ? ['CSS Modules', 'Tailwind'] : [null];
            for (const variant of variants) {
              if (variant) {
                await selector.click();
                await page.getByRole('option', { name: variant, exact: true }).click();
              }
              if (
                (await demo.locator('.DemoSourceToggle').getAttribute('aria-expanded')) !== 'true'
              ) {
                await demo.locator('.DemoSourceToggle').click();
              }
              const tabs = demo.locator('.DemoTabsList').getByRole('tab');
              const labels = await tabs.allTextContents();
              assert.equal(labels[0], 'index.tsx');
              for (const label of labels) {
                assert.doesNotMatch(label, /\.\.\/|_index\./, 'Upstream flat demo filenames');
                await demo
                  .locator('.DemoTabsList')
                  .getByRole('tab', { name: label, exact: true })
                  .click();
                const text = await demo.locator('pre').innerText();
                assert.ok(text.length, 'Nonempty source');
                assert.doesNotMatch(text, /Port note|_index\.module\.css/);
                result.files += 1;
                await assertFrames(page);
              }
            }
          }
          await assertFrames(page);
          // Chromium reports unused preloads after the load event has aged several seconds.
          await page.waitForTimeout(
            Math.max(0, 3500 - (await page.evaluate(() => performance.now()))),
          );
          assert.deepEqual(errors, [], 'Console warnings/errors');
          result.passed = true;
        } catch (error) {
          result.failure = error.message;
          result.passed = false;
        }
        results.push(result);
        process.stdout.write(
          `${result.passed ? 'PASS' : 'FAIL'} ${width} ${route} ${result.demos} demos ${result.files} files${result.failure ? ` ${result.failure}` : ''}\n`,
        );
        await page.close();
      }
    }),
  );
} finally {
  await browser.close();
}
await writeFile(
  process.env.DOCS_DEMO_REPORT ?? '/tmp/codex-jobs/DOCSDEMO-dev.json',
  JSON.stringify(results, null, 2),
);
assert.ok(
  results.every((result) => result.passed),
  'Every docs route passes',
);

async function assertFrames(page) {
  const failures = await page.evaluate(() => {
    const roots = document.querySelectorAll(
      '.DemoRoot, .CodeBlockRoot, .ReferenceAccordionRoot, .ReferenceOverflow',
    );
    return Array.from(roots).flatMap((root) => {
      if (root.scrollWidth > root.clientWidth + 2) {
        return [`${root.className}: ${root.scrollWidth} > ${root.clientWidth}`];
      }
      return [];
    });
  });
  assert.deepEqual(failures, [], 'Code/API content contained inside its frame');
  const viewports = await page
    .locator('.DemoCodeBlockViewport, .CodeBlockViewport')
    .evaluateAll((elements) =>
      elements
        .filter((element) => !element.hasAttribute('data-closed'))
        .map((element) => {
          const overflow = getComputedStyle(element).overflowX;
          const before = element.scrollLeft;
          element.scrollLeft = element.scrollWidth;
          const canScroll =
            element.scrollWidth <= element.clientWidth + 1 || element.scrollLeft > 0;
          element.scrollLeft = before;
          return { overflow, canScroll };
        }),
    );
  assert.ok(
    viewports.every(
      ({ overflow, canScroll }) => ['auto', 'scroll'].includes(overflow) && canScroll,
    ),
  );
}

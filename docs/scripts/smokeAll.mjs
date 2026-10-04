// Port note: verify every exported MDX route with its independently hydrated client tree.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const routes = [];
for (const filename of await readdir(new URL('../src/routes/', import.meta.url))) {
  if (!filename.startsWith('_docs.')) {
    continue;
  }
  const source = await readFile(new URL(`../src/routes/${filename}`, import.meta.url), 'utf8');
  const content = source.match(/import Content,.*from '([^']+)'/);
  const path = source.match(/createFileRoute\('([^']+)'\)/);
  if (!content || !path) {
    continue;
  }
  const mdx = await readFile(new URL(`../src/routes/${content[1]}`, import.meta.url), 'utf8');
  routes.push({
    path: path[1].replace('/_docs', ''),
    heading: mdx.match(/^# (.+)$/m)?.[1].replace(/<[^>]*>/g, ''),
    demos: (mdx.match(/^<Demo\w+\s*\/>/gm) ?? []).length,
  });
}
routes.sort((a, b) => a.path.localeCompare(b.path));
const browser = await chromium.launch();
const results = [];
try {
  for (const route of routes) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) {
        errors.push(message.text());
      }
    });
    const result = { ...route, errors, interaction: 'no demo' };
    try {
      const response = await page.goto(
        `${process.env.DOCS_URL ?? 'http://localhost:3010'}${route.path}`,
        { waitUntil: 'networkidle', timeout: 60000 },
      );
      assert.equal(response.status(), 200);
      const heading = (await page.locator('h1').innerText()).replaceAll('\u00a0', ' ');
      assert.equal(heading, route.heading?.replaceAll('\u00a0', ' '), 'Unmasked page heading');
      assert.equal(await page.locator('.DemoRoot').count(), route.demos, 'All page demos rendered');
      if (route.demos) {
        const demo = page.locator('.DemoRoot').first();
        await demo.locator('.DemoSourceToggle').click();
        assert.equal(await demo.locator('.DemoSourceToggle').getAttribute('aria-expanded'), 'true');
        assert.ok(await demo.locator('pre').innerText());
        await demo.locator('.DemoSourceToggle').click();
        const variant = demo.getByRole('tab', { name: 'Tailwind', exact: true });
        if (await variant.count()) {
          await variant.click();
          assert.equal(await variant.getAttribute('aria-selected'), 'true');
          await demo.locator('.DemoToolbar [role=tab]').first().click();
        }
        result.interaction = 'source + variant';
        const preview = demo.locator('.DemoPreview');
        const input = preview
          .locator(
            'input:not([type=hidden]):not([type=range]):not([aria-hidden=true]):not([disabled]), textarea:not([disabled])',
          )
          .first();
        const buttonCandidates = preview
          .locator(
            'button:not([disabled]), [role=button]:not([aria-disabled=true]), [role=tab], [role=checkbox], [role=radio], [role=switch]',
          )
          .first();
        const inactive = preview
          .locator('[role=radio][aria-checked=false], [role=tab][aria-selected=false]')
          .first();
        const button = (await inactive.count()) ? inactive : buttonCandidates;
        const slider = preview.getByRole('slider').first();
        if (route.path.endsWith('/merge-props')) {
          const favorite = preview.getByRole('button', { name: 'Favorite', exact: true });
          const pressed = await favorite.getAttribute('aria-pressed');
          await favorite.click();
          assert.equal(
            await favorite.getAttribute('aria-pressed'),
            pressed,
            'Locked toggle cancels the Base UI handler',
          );
          await preview.getByRole('button', { name: 'Unlock', exact: true }).click();
          await favorite.click();
          assert.notEqual(
            await favorite.getAttribute('aria-pressed'),
            pressed,
            'Unlocked toggle changes state',
          );
          result.interaction += ' + lock/cancel/unlock';
        } else if (route.path.endsWith('/preview-card') || route.path.endsWith('/tooltip')) {
          const trigger = preview
            .locator(route.path.endsWith('/preview-card') ? 'a' : 'button')
            .first();
          await trigger.hover();
          await page.locator('[data-open][data-side]').first().waitFor({ state: 'visible' });
          result.interaction += ' + preview hover';
        } else if (route.path.endsWith('/scroll-area')) {
          const viewport = preview.locator('[tabindex="0"]').first();
          await viewport.focus();
          await viewport.press('End');
          await page.waitForTimeout(150);
          assert.ok(await viewport.evaluate((element) => element.scrollTop > 0));
          result.interaction += ' + preview scroll';
        } else if ((await input.count()) && (await input.isVisible())) {
          const type = await input.getAttribute('type');
          if (['checkbox', 'radio'].includes(type)) {
            await input.click();
          } else if (type !== 'range') {
            await input.fill(
              ['number', 'tel'].includes(type) || route.path.includes('otp') ? '12' : 'a',
            );
            assert.ok(await input.inputValue());
          }
          result.interaction += ' + preview input';
        } else if (await slider.count()) {
          await slider.focus();
          const value = await slider.getAttribute('aria-valuenow');
          await slider.press('ArrowRight');
          assert.notEqual(await slider.getAttribute('aria-valuenow'), value);
          result.interaction += ' + preview slider';
        } else if ((await button.count()) && (await button.isVisible())) {
          const buttonElement = await button.elementHandle();
          const attributes = ['aria-expanded', 'aria-pressed', 'aria-checked', 'aria-selected'];
          const before = await Promise.all(
            attributes.map((name) => buttonElement.getAttribute(name)),
          );
          await buttonElement.click();
          await page.waitForTimeout(150);
          const after = await Promise.all(
            attributes.map((name) => buttonElement.getAttribute(name)),
          );
          if (before.some((value) => value !== null)) {
            assert.notDeepEqual(after, before, 'Preview changes interactive state');
          }
          result.interaction += ' + preview click';
        }
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(150);
      assert.deepEqual(errors, [], 'Console errors, hydration warnings, or Solid diagnostics');
      result.passed = true;
    } catch (error) {
      result.passed = false;
      result.failure = error.message;
    }
    results.push(result);
    process.stdout.write(
      `${result.passed ? 'PASS' : 'FAIL'} ${route.path} (${result.interaction})${result.failure ? `: ${result.failure}` : ''}\n`,
    );
    if (errors.length) {
      process.stdout.write(`${JSON.stringify(errors)}\n`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
await writeFile(
  process.env.DOCS_SMOKE_REPORT ?? '/tmp/docs5-smoke.json',
  JSON.stringify(results, null, 2),
);
process.stdout.write(
  `${results.filter((result) => result.passed).length}/${results.length} routes passed\n`,
);
if (results.some((result) => !result.passed)) {
  process.exitCode = 1;
}

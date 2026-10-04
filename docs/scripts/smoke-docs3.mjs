// Port note: each browser action depends on the preceding render or interaction.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const names =
  'menu meter navigation-menu number-field otp-field popover preview-card progress radio-group scroll-area select separator slider switch tabs toast toggle toggle-group toolbar tooltip'.split(
    ' ',
  );
const failures = [];
const browser = await chromium.launch();
async function interact(page, preview, name) {
  if (['switch', 'toggle', 'toggle-group', 'toolbar'].includes(name)) {
    const control =
      name === 'switch' ? preview.getByRole('switch') : preview.locator('button').first();
    const attribute = name === 'switch' ? 'aria-checked' : 'aria-pressed';
    const before = await control.getAttribute(attribute);
    await control.click();
    assert.notEqual(await control.getAttribute(attribute), before);
  } else if (name === 'number-field') {
    const input = preview.locator('input').first();
    const before = await input.inputValue();
    await preview.getByRole('button', { name: 'Increase' }).click();
    assert.notEqual(await input.inputValue(), before);
  } else if (name === 'otp-field') {
    await preview.locator('input').first().fill('1');
    assert.equal(await preview.locator('input').first().inputValue(), '1');
  } else if (name === 'slider') {
    const thumb = preview.getByRole('slider');
    const before = await thumb.getAttribute('aria-valuenow');
    await thumb.focus();
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await thumb.getAttribute('aria-valuenow'), before);
  } else if (name === 'radio-group') {
    await preview.getByText('Gala', { exact: true }).click();
    assert.equal(
      await preview.getByRole('radio', { name: 'Gala' }).getAttribute('aria-checked'),
      'true',
    );
  } else if (name === 'tabs') {
    await preview.getByRole('tab', { name: 'Projects' }).click();
    await preview.getByText('Milestones and deadlines.').waitFor({ state: 'visible' });
  } else if (name === 'select') {
    await preview.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Fuji', exact: true }).click();
    assert.match(await preview.getByRole('combobox').innerText(), /Fuji/);
  } else if (name === 'toast') {
    await preview.getByRole('button', { name: 'Create toast', exact: true }).click();
    await page.getByText('Toast 1 created', { exact: true }).waitFor({ state: 'visible' });
    await page.getByText('Dismiss', { exact: true }).click();
    await page.getByText('Toast 1 created', { exact: true }).waitFor({ state: 'hidden' });
  } else if (name === 'tooltip') {
    await page.keyboard.press('Tab');
    await preview.getByRole('button').first().focus();
    await page.getByText('Bold', { exact: true }).waitFor({ state: 'visible' });
    await preview.getByRole('button').first().blur();
    await page.getByText('Bold', { exact: true }).waitFor({ state: 'hidden' });
  } else if (name === 'preview-card') {
    await preview.getByRole('link', { name: 'typography' }).hover();
    await page
      .getByAltText('Station Hofplein signage in Rotterdam, Netherlands')
      .waitFor({ state: 'visible' });
    await page.mouse.move(0, 0);
    await page
      .getByAltText('Station Hofplein signage in Rotterdam, Netherlands')
      .waitFor({ state: 'hidden' });
  } else if (['menu', 'popover', 'navigation-menu'].includes(name)) {
    const trigger = preview.getByRole('button').first();
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
  } else if (name === 'progress') {
    const progress = preview.getByRole('progressbar');
    const before = await progress.getAttribute('aria-valuenow');
    await page.waitForTimeout(2200);
    assert.notEqual(await progress.getAttribute('aria-valuenow'), before);
  } else if (name === 'scroll-area') {
    const scrolled = await preview.locator('div').evaluateAll((elements) => {
      const viewport = elements.find(
        (element) =>
          element.scrollHeight > element.clientHeight &&
          ['auto', 'scroll'].includes(getComputedStyle(element).overflowY),
      );
      if (!viewport) {
        return 0;
      }
      viewport.scrollTop = 100;
      return viewport.scrollTop;
    });
    assert.ok(scrolled > 0);
  } else if (name === 'meter') {
    assert.equal(await preview.getByRole('meter').getAttribute('aria-valuenow'), '24');
  } else if (name === 'separator') {
    assert.ok(await preview.getByRole('separator').count());
  }
}
try {
  for (const name of names) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(60000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        errors.push(message.text());
      }
    });
    try {
      if (process.env.DOCS_STATIC_ROOT) {
        const html = await readFile(
          `${process.env.DOCS_STATIC_ROOT}/react/components/${name}/index.html`,
          'utf8',
        );
        assert.match(html, /API reference/);
        assert.doesNotMatch(html, /Something went wrong/);
      }
      const response = await page.goto(
        `${process.env.DOCS_URL ?? 'http://localhost:3005'}/react/components/${name}`,
      );
      assert.equal(response.status(), 200);
      const title =
        name === 'otp-field'
          ? 'OTP Field'
          : name
              .split('-')
              .map((word) => word[0].toUpperCase() + word.slice(1))
              .join(' ');
      await page.getByRole('heading', { name: title, exact: true }).waitFor();
      await page.waitForLoadState('networkidle');
      const demos = page.locator('.DemoRoot');
      assert.ok(await demos.count());
      for (let index = 0; index < (await demos.count()); index += 1) {
        const demo = demos.nth(index);
        const tabs = demo.getByRole('tab');
        for (let variant = 0; variant < (await tabs.count()); variant += 1) {
          await tabs.nth(variant).click();
          await page.waitForTimeout(100);
          assert.ok(await demo.locator('.DemoPreview').innerHTML());
          if (index === 0) {
            await interact(page, demo.locator('.DemoPreview'), name);
          }
        }
        await demo.getByRole('button', { name: 'Source code', exact: true }).click();
        assert.match(await demo.locator('pre').innerText(), /base-ui-solid\//);
        await demo.getByRole('button', { name: 'Source code', exact: true }).click();
      }
      assert.deepEqual(errors, [], 'Console errors, hydration warnings, or Solid diagnostics');
      process.stdout.write(`PASS ${name}: all live variants and source; first demo interaction\n`);
    } catch (error) {
      failures.push({ name, error: error.message, diagnostics: errors });
      process.stdout.write(`FAIL ${name}: ${error.message}\n`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
assert.deepEqual(failures, []);

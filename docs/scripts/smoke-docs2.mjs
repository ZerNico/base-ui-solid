// Port note: interactions are sequential because each click updates the live demo.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const names =
  'accordion alert-dialog autocomplete avatar button checkbox checkbox-group combobox dialog drawer field fieldset form input'.split(
    ' ',
  );
const browser = await chromium.launch();
const failures = [];
try {
  for (const name of process.env.DOCS_PAGES?.split(',') ?? ['index', ...names]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) {
        errors.push(message.text());
      }
    });
    const url = `${process.env.DOCS_URL ?? 'http://localhost:3005'}/solid/components/${name === 'index' ? '' : name}`;
    const response = await page.goto(url);
    assert.equal(response.status(), 200, name);
    await page.waitForLoadState('networkidle');
    await page.locator('h1').waitFor();
    const demos = page.locator('.DemoRoot');
    if (name !== 'index') {
      assert.ok(await demos.count(), `${name}: live demos`);
      for (let i = 0; i < (await demos.count()); i += 1) {
        for (const variant of await demos.nth(i).getByRole('tab').allTextContents()) {
          await demos.nth(i).getByRole('tab', { name: variant, exact: true }).click();
          await page.waitForTimeout(50);
          assert.ok(
            await demos.nth(i).locator('.DemoPreview').innerHTML(),
            `${name}/${i}/${variant}`,
          );
        }
      }
      const first = demos.first();
      for (const variant of await first.getByRole('tab').allTextContents()) {
        await first.getByRole('tab', { name: variant, exact: true }).click();
        const preview = first.locator('.DemoPreview');
        if (name === 'accordion') {
          const trigger = preview.locator('button[aria-expanded]').first();
          const before = await trigger.getAttribute('aria-expanded');
          await trigger.click();
          await page.waitForTimeout(100);
          assert.notEqual(await trigger.getAttribute('aria-expanded'), before);
        } else if (['alert-dialog', 'dialog', 'drawer'].includes(name)) {
          await preview.getByRole('button').first().click();
          const popup = page.getByRole(name === 'alert-dialog' ? 'alertdialog' : 'dialog');
          await popup.waitFor();
          await page.waitForTimeout(750);
          await popup.getByRole('button').last().click({ force: true });
          await popup.waitFor({ state: 'hidden' });
        } else if (['checkbox', 'checkbox-group'].includes(name)) {
          const control = preview.getByRole('checkbox').first();
          const before = await control.getAttribute('aria-checked');
          await control.click();
          await page.waitForTimeout(100);
          assert.notEqual(await control.getAttribute('aria-checked'), before);
        } else if (['autocomplete', 'combobox'].includes(name)) {
          const input = preview.getByRole('combobox').first();
          await input.fill('a');
          await page.getByRole('listbox').waitFor();
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
          await page.keyboard.press('Escape');
        } else if (['field', 'fieldset', 'form', 'input'].includes(name)) {
          const input = preview.locator('input:not([type="hidden"])').first();
          await input.fill('hello@example.com');
          assert.equal(await input.inputValue(), 'hello@example.com');
        } else if (name === 'button') {
          const button = preview.getByRole('button').first();
          await button.focus();
          await button.click();
          assert.equal(
            await button.evaluate((element) => element === document.activeElement),
            true,
          );
        } else if (name === 'avatar') {
          assert.ok(await preview.locator('img, [data-loading], [data-error], span').count());
        }
      }
    }
    if (errors.length) {
      failures.push({ name, errors });
      process.stdout.write(`${JSON.stringify({ name, errors })}\n`);
    }
    process.stdout.write(
      `PASS ${name}: all live variants, first demo interactions, ${errors.length} diagnostics\n`,
    );
    await page.close();
  }
  assert.deepEqual(failures, [], 'console errors, hydration warnings, Solid diagnostics');
} finally {
  await browser.close();
}

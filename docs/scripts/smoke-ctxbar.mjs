// Port note: exercise every upstream demo variant after its client hydration.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch();
try {
  for (const component of ['context-menu', 'menubar']) {
    const html = await readFile(
      new URL(`../export/solid/components/${component}/index.html`, import.meta.url),
      'utf8',
    );
    assert.ok(
      html.includes(
        component === 'menubar' ? 'The container for menus.' : 'A menu that appears at the pointer',
      ),
    );
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) {
        errors.push(message.text());
      }
    });
    page.on('dialog', (dialog) => dialog.dismiss());
    await page.goto(
      `${process.env.DOCS_URL ?? 'http://localhost:3010'}/solid/components/${component}`,
      { waitUntil: 'networkidle' },
    );
    const demos = page.locator('.DemoRoot');
    assert.equal(await demos.count(), component === 'menubar' ? 1 : 3);
    for (let index = 0; index < (await demos.count()); index += 1) {
      const demo = demos.nth(index);
      for (const variant of ['CSS Modules', 'Tailwind']) {
        await demo.getByRole('tab', { name: variant, exact: true }).click();
        const preview = demo.locator('.DemoPreview');
        if (component === 'menubar') {
          await preview.getByRole('menuitem', { name: 'File', exact: true }).click();
          await page.getByRole('menuitem', { name: 'New', exact: true }).waitFor();
          await page.keyboard.press('Escape');
        } else {
          const surface =
            index === 1
              ? preview.getByText('Station Hofplein', { exact: true })
              : preview.getByText('Right click here', { exact: true });
          await surface.click({ button: 'right' });
          await page.getByRole('menu').first().waitFor();
          assert.ok(await page.getByRole('menuitem').count());
          if (index === 2) {
            await page.getByRole('menuitem', { name: 'Add to Playlist', exact: true }).hover();
            await page.getByRole('menuitem', { name: 'Get Up!', exact: true }).waitFor();
            await page.keyboard.press('Escape');
          }
          await page.keyboard.press('Escape');
          if (index === 1) {
            await preview.getByRole('button').click();
            await page.getByRole('menu').first().waitFor();
            await page.keyboard.press('Escape');
          }
        }
        await demo.locator('.DemoSourceToggle').click();
        assert.ok(await demo.locator('pre').innerText());
        await demo.locator('.DemoSourceToggle').click();
        process.stdout.write(`PASS ${component} demo ${index + 1}: ${variant}\n`);
      }
    }
    assert.deepEqual(errors, [], 'No browser errors, diagnostics or hydration warnings');
    await page.close();
  }
} finally {
  await browser.close();
}

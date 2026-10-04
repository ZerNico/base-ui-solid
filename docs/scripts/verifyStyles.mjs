// Port note: verify SSR stylesheet delivery before hydration as well as the hydrated docs shell.
/* eslint-disable no-await-in-loop */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const routes = [
  '/',
  '/react/overview/quick-start',
  '/react/components/menubar',
  '/react/components/select',
  '/react/handbook/styling',
];
const browser = await chromium.launch();
try {
  for (const javaScriptEnabled of [false, true]) {
    for (const colorScheme of ['light', 'dark']) {
      for (const width of [1440, 390]) {
        const context = await browser.newContext({
          javaScriptEnabled,
          colorScheme,
          viewport: { width, height: width === 1440 ? 900 : 844 },
        });
        for (const route of routes) {
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          page.on('console', (message) => {
            if (['warning', 'error'].includes(message.type())) {
              errors.push(message.text());
            }
          });
          const response = await page.goto(
            `${process.env.DOCS_URL ?? 'http://localhost:3010'}${route}`,
            { waitUntil: 'networkidle' },
          );
          assert.equal(response.status(), 200);
          assert.match(
            await (
              await page.request.get(`${process.env.DOCS_URL ?? 'http://localhost:3010'}${route}`)
            ).text(),
            /<head>[\s\S]*?<link[^>]*rel="stylesheet"[^>]*>[\s\S]*?<\/head>/,
          );
          await page.evaluate(() => document.fonts.ready);
          const styles = await page.evaluate(() => {
            const body = getComputedStyle(document.body);
            const grid = document.querySelector('.ContentLayoutRoot');
            const subtitle = document.querySelector('.Subtitle');
            return {
              font: body.fontFamily,
              fontLoaded: document.fonts.check('16px "die grotesk a"'),
              grid: grid && getComputedStyle(grid).gridTemplateColumns,
              subtitle: subtitle && getComputedStyle(subtitle).fontSize,
              background: body.backgroundColor,
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          assert.match(styles.font, /die grotesk a/);
          assert.equal(styles.fontLoaded, true);
          assert.equal(styles.overflow, false, `${route}: page overflow`);
          if (route !== '/') {
            assert.equal(styles.subtitle, '18px');
            assert.equal(styles.grid, width === 1440 ? '280px 768px 280px' : '342px');
            assert.equal(
              styles.background,
              colorScheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)',
            );
          }
          if (javaScriptEnabled && route === '/react/overview/quick-start') {
            const installation = page.locator('.InstallationBlock');
            await installation.getByRole('tab', { name: 'yarn', exact: true }).click();
            assert.match(
              await installation.getByRole('tabpanel', { name: 'yarn', exact: true }).innerText(),
              /^yarn add base-ui-solid/,
            );
          }
          assert.deepEqual(errors, []);
          await page.close();
        }
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
process.stdout.write('40 SSR/hydrated styling checks passed\n');

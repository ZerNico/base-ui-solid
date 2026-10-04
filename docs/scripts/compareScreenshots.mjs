// Port note: capture every public top-level docs page at the upstream desktop viewport.
/* eslint-disable no-await-in-loop, no-console */
import { chromium } from 'playwright';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';

const evidence = process.env.DOCS_EVIDENCE_DIR ?? '/tmp/codex-jobs/docsfix2';
await mkdir(evidence, { recursive: true });
const paths = [];
for (const filename of await readdir(new URL('../src/routes/', import.meta.url))) {
  const source = await readFile(new URL(`../src/routes/${filename}`, import.meta.url), 'utf8');
  const path = source.match(/createFileRoute\('([^']+)'\)/)?.[1].replace('/_docs', '');
  if (!source.includes('import Content') || !path?.startsWith('/solid/')) {
    continue;
  }
  if (path.includes('/releases/') && path !== '/solid/overview/releases/') {
    continue;
  }
  paths.push(path);
}
const browser = await chromium.launch();
const report = [];
try {
  for (const path of paths.sort()) {
    for (const [name, origin] of [
      ['local', process.env.DOCS_URL ?? 'http://localhost:3005'],
      ['upstream', 'https://base-ui.com'],
    ]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors = [];
      const failedRequests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (
          message.type() === 'error' ||
          /notFound|Hydration|\[[A-Z_]{6,}\]/.test(message.text())
        ) {
          errors.push(message.text());
        }
      });
      page.on('response', (response) => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });
      // Port note: upstream comparison pages retain their React URL segment.
      const requestPath =
        origin === 'https://base-ui.com' ? path.replace(/^\/solid(?=\/|$)/, '/react') : path;
      await page.goto(origin + requestPath, { waitUntil: 'networkidle', timeout: 120000 });
      await page.evaluate(() => scrollTo(0, 0));
      const filename = `${name}-${path.replaceAll('/', '_')}.png`;
      await page.screenshot({ path: `${evidence}/${filename}` });
      report.push({
        path,
        name,
        filename,
        errors,
        failedRequests,
        headings: await page.locator('h1,h2,h3').allTextContents(),
      });
      console.log(name, path);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${evidence}/screens.json`, JSON.stringify(report, null, 2));
if (
  report.some(
    (entry) => entry.name === 'local' && (entry.errors.length || entry.failedRequests.length),
  )
) {
  process.exitCode = 1;
}

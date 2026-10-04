// Port note: measure the same real interaction on SSR documents in dev, static export and upstream.
/* eslint-disable no-await-in-loop, no-console */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const output = process.env.DOCS_EVIDENCE_DIR ?? '/tmp/codex-jobs/docsfix2';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const origin of (
    process.env.DOCS_PERF_ORIGINS ?? 'http://localhost:3005,https://base-ui.com'
  ).split(',')) {
    for (const path of ['/solid/handbook/forms', '/solid/components/select', '/']) {
      for (let run = 0; run < Number(process.env.DOCS_PERF_RUNS ?? 3); run += 1) {
        const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
        const errors = [];
        const failedRequests = [];
        const jsRequests = [];
        const bodies = [];
        page.on('console', (message) => {
          if (
            message.type() === 'error' ||
            /notFound|Hydration|\[[A-Z_]{6,}\]/.test(message.text())
          ) {
            errors.push(message.text());
          }
        });
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => {
          if (response.status() >= 400) {
            failedRequests.push(`${response.status()} ${response.url()}`);
          }
          if (/javascript/.test(response.headers()['content-type'] ?? '')) {
            const record = { url: response.url(), bytes: 0 };
            jsRequests.push(record);
            bodies.push(
              response
                .body()
                .then((body) => {
                  record.bytes = body.length;
                })
                .catch(() => {}),
            );
          }
        });
        await page.addInitScript(() => {
          window.docsLongTasks = [];
          new PerformanceObserver((list) => {
            window.docsLongTasks.push(
              ...list
                .getEntries()
                .map((entry) => ({ start: entry.startTime, duration: entry.duration })),
            );
          }).observe({ type: 'longtask', buffered: true });
        });
        // Port note: upstream comparison pages retain their React URL segment.
        const requestPath =
          origin === 'https://base-ui.com' ? path.replace(/^\/solid(?=\/|$)/, '/react') : path;
        await page.goto(origin + requestPath, { waitUntil: 'domcontentloaded', timeout: 120000 });
        const interactive = await page.evaluate(async () => {
          const trigger =
            document.querySelector('.HeaderSearchDesktopTrigger') ??
            [...document.querySelectorAll('button')].find((button) =>
              /^Search/.test(button.textContent.trim()),
            );
          if (trigger) {
            return new Promise((resolve, reject) => {
              const start = performance.now();
              const interval = setInterval(() => {
                const popup = document.querySelector('.SearchPopup');
                if (popup && popup.getBoundingClientRect().height > 0) {
                  clearInterval(interval);
                  resolve(performance.now());
                } else if (performance.now() - start > 60000) {
                  clearInterval(interval);
                  reject(new Error('Search never became interactive'));
                } else {
                  trigger.click();
                }
              }, 25);
            });
          }
          const accordion =
            document.querySelector('details') ?? document.querySelector('button[aria-expanded]');
          if (!accordion) {
            throw new Error('No shared interactive control found');
          }
          return new Promise((resolve, reject) => {
            const start = performance.now();
            const interval = setInterval(() => {
              if (accordion.getAttribute('aria-expanded') === 'true' || accordion.open) {
                clearInterval(interval);
                resolve(performance.now());
              } else if (performance.now() - start > 60000) {
                clearInterval(interval);
                reject(new Error('Accordion never became interactive'));
              } else {
                (accordion.querySelector('summary') ?? accordion).click();
              }
            }, 25);
          });
        });
        await page.waitForLoadState('networkidle');
        await Promise.all(bodies);
        const timing = await page.evaluate(() => ({
          domContentLoaded: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
          load: performance.getEntriesByType('navigation')[0].loadEventEnd,
          longTasks: window.docsLongTasks,
        }));
        await page.keyboard.press('Escape');
        await page.evaluate(() => scrollTo(0, 0));
        const label = process.env.DOCS_PERF_LABEL ?? 'performance';
        await page.screenshot({
          path: `${output}/${label}-${new URL(origin).host}-${path.replaceAll('/', '_')}-${run}.png`,
        });
        const result = {
          origin,
          path,
          run,
          interactive,
          ...timing,
          jsBytes: jsRequests.reduce((sum, request) => sum + request.bytes, 0),
          modules: jsRequests.length,
          errors,
          failedRequests,
          requests: jsRequests,
        };
        results.push(result);
        console.log(JSON.stringify({ ...result, requests: undefined }));
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  `${output}/${process.env.DOCS_PERF_LABEL ?? 'performance'}.json`,
  JSON.stringify(results, null, 2),
);
if (
  results.some(
    (result) =>
      result.origin.includes('localhost') && (result.errors.length || result.failedRequests.length),
  )
) {
  process.exitCode = 1;
}

/* eslint-disable no-console, no-await-in-loop */
// Compares demo behavior between the local docs (dev server) and base-ui.com: performs the same
// interactions on every demo of every page and diffs the observable state after each step.
// Usage: node docs/scripts/compareInteractions.mjs [--local http://localhost:3005] [--only <path-substring>]
import { chromium } from 'playwright';
import fs from 'node:fs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const LOCAL = arg('--local', 'http://localhost:3005');
const UPSTREAM = 'https://base-ui.com';
const ONLY = arg('--only', '');
const OUT = arg('--out', '/tmp/compare-interactions.json');
const MAX_ELEMENTS = 12;

const ROLES = ['dialog', 'alertdialog', 'menu', 'listbox', 'tooltip', 'region', 'status', 'alert'];

async function collectPaths(browser) {
  const page = await browser.newPage();
  await page.goto(`${LOCAL}/solid/overview/quick-start`, { waitUntil: 'networkidle' });
  const paths = await page.evaluate(() => [
    ...new Set(
      [...document.querySelectorAll('a[href^="/solid/"]')].map(
        (a) => a.getAttribute('href').split('#')[0],
      ),
    ),
  ]);
  await page.close();
  return paths.filter((path) => path.includes(ONLY)).sort();
}

// Observable state of one demo playground, normalized so ids/classes don't cause diffs.
async function snapshot(page, index) {
  return page.evaluate(
    ({ index, ROLES }) => {
      const playground = document.querySelectorAll('.DemoPlayground')[index];
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== 'hidden' &&
          style.display !== 'none'
        );
      };
      const norm = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      const open = {};
      for (const role of ROLES) {
        const els = [...document.querySelectorAll(`[role="${role}"]`)].filter(
          (el) =>
            visible(el) && !el.closest('.DemoCodeBlockRoot, .DemoToolbar, header, nav, aside'),
        );
        if (els.length) {
          open[role] = els.map((el) => norm(el.textContent)).sort();
        }
      }
      const attrs = [];
      if (playground) {
        for (const el of playground.querySelectorAll('*')) {
          const parts = [];
          for (const name of [
            'aria-expanded',
            'aria-pressed',
            'aria-checked',
            'aria-selected',
            'aria-valuenow',
            'aria-invalid',
            'aria-disabled',
            'data-checked',
            'data-open',
            'data-pressed',
            'data-selected',
            'data-disabled',
            'data-invalid',
            'data-highlighted',
          ]) {
            if (el.hasAttribute(name)) {
              parts.push(`${name}=${el.getAttribute(name)}`);
            }
          }
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            parts.push(
              `value=${el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value}`,
            );
          }
          if (parts.length) {
            attrs.push(
              `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''}: ${parts.join(' ')}`,
            );
          }
        }
      }
      const active = document.activeElement;
      return {
        url:
          location.pathname.replace(/^\/(react|solid)\//, '/x/') + location.search + location.hash,
        open,
        attrs,
        text: playground ? norm(playground.innerText) : null,
        focus:
          active && active !== document.body
            ? `${active.tagName.toLowerCase()}${active.getAttribute('role') ? `[${active.getAttribute('role')}]` : ''}:${norm(active.textContent || active.getAttribute('aria-label') || active.getAttribute('name') || '').slice(0, 40)}`
            : 'body',
      };
    },
    { index, ROLES },
  );
}

async function runDemo(page, index) {
  const steps = [];
  const playground = page.locator('.DemoPlayground').nth(index);
  await playground.scrollIntoViewIfNeeded().catch(() => {});
  steps.push({ step: 'initial', state: await snapshot(page, index) });
  const targets = playground.locator(
    'button, a[href], input:not([type=hidden]), textarea, [role=button], [role=tab], [role=checkbox], [role=switch], [role=radio], [role=slider], [role=combobox], [role=menuitem], [tabindex="0"]',
  );
  const count = Math.min(await targets.count(), MAX_ELEMENTS);
  for (let i = 0; i < count; i += 1) {
    const target = targets.nth(i);
    if (!(await target.isVisible().catch(() => false))) {
      continue;
    }
    const label = await target
      .evaluate(
        (el) =>
          `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || el.getAttribute('placeholder') || '').trim().slice(0, 30)}`,
      )
      .catch(() => `#${i}`);
    const isText = await target
      .evaluate(
        (el) =>
          (el instanceof HTMLInputElement &&
            !['checkbox', 'radio', 'range', 'submit', 'button'].includes(el.type)) ||
          el instanceof HTMLTextAreaElement,
      )
      .catch(() => false);
    try {
      await target.hover({ timeout: 2000 });
      await page.waitForTimeout(700);
      steps.push({ step: `hover ${label}`, state: await snapshot(page, index) });
      if (isText) {
        await target.fill('abc', { timeout: 2000 });
        await target.press('Enter');
      } else {
        await target.click({ timeout: 2000 });
      }
      await page.waitForTimeout(600);
      steps.push({
        step: `${isText ? 'type+enter' : 'click'} ${label}`,
        state: await snapshot(page, index),
      });
    } catch (error) {
      steps.push({ step: `interact ${label}`, error: String(error.message).split('\n')[0] });
    }
    await page.keyboard.press('Escape');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    // A navigation (e.g. native form submit) ends the demo run.
    if (
      steps.at(-1).state?.url &&
      !steps.at(-1).state.url.startsWith(steps[0].state.url.split('?')[0])
    ) {
      break;
    }
  }
  return steps;
}

async function runPage(browser, base, path) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message.split('\n')[0]}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`console: ${message.text().split('\n')[0].slice(0, 200)}`);
    }
  });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const demoCount = await page.locator('.DemoPlayground').count();
  const demos = [];
  for (let index = 0; index < demoCount; index += 1) {
    // Fresh load per demo so earlier interactions can't leak into later demos.
    if (index > 0) {
      await page.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 });
      await page.waitForTimeout(1000);
    }
    demos.push(await runDemo(page, index));
  }
  await context.close();
  return { demoCount, demos, errors };
}

const browser = await chromium.launch();
const paths = await collectPaths(browser);
console.log(`Comparing ${paths.length} pages`);
const results = [];
for (const path of paths) {
  const upstreamPath = path.replace(/^\/solid\//, '/react/');
  let local;
  let upstream;
  try {
    [local, upstream] = await Promise.all([
      runPage(browser, LOCAL, path),
      runPage(browser, UPSTREAM, upstreamPath),
    ]);
  } catch (error) {
    results.push({ path, fatal: String(error.message).split('\n')[0] });
    console.log(`${path}: FATAL ${error.message.split('\n')[0]}`);
    continue;
  }
  const diffs = [];
  if (local.demoCount !== upstream.demoCount) {
    diffs.push(`demo count local ${local.demoCount} vs upstream ${upstream.demoCount}`);
  }
  for (let d = 0; d < Math.min(local.demoCount, upstream.demoCount); d += 1) {
    const a = local.demos[d];
    const b = upstream.demos[d];
    for (let s = 0; s < Math.max(a.length, b.length); s += 1) {
      const sa = a[s];
      const sb = b[s];
      if (!sa || !sb) {
        diffs.push(`demo ${d}: step count differs (local ${a.length}, upstream ${b.length})`);
        break;
      }
      if (sa.step !== sb.step) {
        diffs.push(`demo ${d} step ${s}: different step "${sa.step}" vs "${sb.step}"`);
        break;
      }
      for (const key of ['url', 'open', 'attrs', 'text', 'focus', 'error']) {
        const va = JSON.stringify(sa.state?.[key] ?? sa[key] ?? null);
        const vb = JSON.stringify(sb.state?.[key] ?? sb[key] ?? null);
        if (va !== vb) {
          diffs.push(
            `demo ${d} "${sa.step}" ${key}:\n      local:    ${va.slice(0, 400)}\n      upstream: ${vb.slice(0, 400)}`,
          );
        }
      }
    }
  }
  const localOnlyErrors = local.errors.filter((error) => !upstream.errors.includes(error));
  results.push({
    path,
    diffs,
    localErrors: localOnlyErrors,
    upstreamErrors: upstream.errors,
    steps: local.demos.map((d) => d.map((s) => s.step)),
    sample: local.demos[0]?.[2],
  });
  console.log(`${path}: ${diffs.length} diffs, ${localOnlyErrors.length} local-only errors`);
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log(`Wrote ${OUT}`);

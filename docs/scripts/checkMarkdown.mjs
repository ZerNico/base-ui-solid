// Port note: verify the Markdown actions against both a dev server and a static server.
/* eslint-disable no-await-in-loop, no-console */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { REPO_URL, REPO_BRANCH, SITE_URL } from '../src/config.ts'; // eslint-disable-line import/extensions

const browser = await chromium.launch();
try {
  for (const origin of process.argv.slice(2)) {
    const page = await browser.newPage();
    for (const route of [
      '/react/components/collapsible',
      '/react/components/accordion',
      '/react/overview/quick-start',
    ]) {
      await page.goto(`${origin}${route}`);
      const link = page.getByRole('link', { name: 'View as Markdown', exact: true });
      assert.equal(await link.getAttribute('href'), `${route}.md`);
      const source = page.getByRole('link', { name: 'View source', exact: true });
      if (await source.count()) {
        assert.equal(
          await source.getAttribute('href'),
          `${REPO_URL}/blob/${REPO_BRANCH}/docs/src/app/(docs)${route}/page.mdx`,
        );
      }
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
        new URL(route, SITE_URL).href,
      );
      await link.click();
      assert.equal(new URL(page.url()).pathname, `${route}.md`);
      const text = await page.locator('body').innerText();
      assert.match(text, /base-ui-solid/);
      assert.doesNotMatch(text, /<!DOCTYPE|Something went wrong/);
    }
    const llms = await page.request.get(`${origin}/llms.txt`);
    assert.equal(llms.status(), 200);
    const text = await llms.text();
    const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
    assert.ok(links.length >= 80);
    for (const link of links) {
      assert.match(link, /^\/react\/.*\.md$/);
      const response = await page.request.get(new URL(link, origin).href);
      assert.equal(response.status(), 200, link);
      assert.match(await response.text(), /^---\ntitle:/);
    }
    console.log(
      `PASS ${origin}: Markdown actions, source URLs, canonical metadata, llms.txt and ${links.length} Markdown targets`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}

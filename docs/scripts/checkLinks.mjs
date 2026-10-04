// Port note: audit the port's source and generated output, then crawl every static page.
/* eslint-disable no-await-in-loop, no-console */
import assert from 'node:assert/strict';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { SITE_URL, REPO_URL } from '../src/config.ts'; // eslint-disable-line import/extensions

const root = path.resolve(import.meta.dirname, '..');
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
      ),
    )
  ).flat();
}
const sourceFiles = [
  ...(await files(path.join(root, 'src'))),
  ...(await files(path.join(root, 'public'))),
  ...(await files(path.join(root, 'reference'))),
  ...(await files(path.join(root, 'scripts'))),
  ...['vite.config.ts', 'postcss.config.mjs', 'vitest.config.mts', 'package.json'].map((name) =>
    path.join(root, name),
  ),
];
const builtFiles = await files(path.join(root, 'export'));
const upstreamPattern =
  /https:\/\/(?:base-ui\.com|github\.com\/mui\/base-ui)(?:[^\s"'<>`)([\]\\]*)/g;
const allowlist = new Set();
for (const filename of sourceFiles.filter(
  (file) =>
    file.includes('/overview/releases/') ||
    file.endsWith('/Demo.css') ||
    file.endsWith('/HeadingLink.css'),
)) {
  const text = await readFile(filename, 'utf8');
  for (const [url] of text.matchAll(upstreamPattern)) {
    if (
      /^https:\/\/github\.com\/mui\/base-ui\/(?:pull\/\d+(?:\/files)?\/?(?:#(?:issuecomment-\d+|diff-[a-f0-9]+))?|blob\/master\/CHANGELOG\.md)$/.test(
        url,
      )
    ) {
      allowlist.add(url);
    }
  }
}
console.log('Allowed upstream URLs (release history and implementation provenance):');
console.log([...allowlist].sort().join('\n'));
console.log(
  'https://base-ui.com — only in performance.mjs / compareScreenshots.mjs as upstream comparison target',
);
const counts = { source: { a: 0, b: 0, c: 0 }, generated: { a: 0, b: 0, c: 0 } };
const errors = [];
for (const [group, inventory] of [
  ['source', sourceFiles],
  ['generated', builtFiles],
]) {
  for (const filename of inventory.filter(
    (file) =>
      /\.(?:[cm]?js|tsx?|mdx?|html|json|txt|xml|css)$/.test(file) ||
      /_(?:headers|redirects)$/.test(file),
  )) {
    const text = await readFile(filename, 'utf8');
    for (const [url] of text.matchAll(upstreamPattern)) {
      if (
        !allowlist.has(url) &&
        !filename.endsWith('/checkLinks.mjs') &&
        !(
          url === 'https://base-ui.com/react/' &&
          /\/(?:markdownPlugin|generateReference)\.mjs$/.test(filename)
        ) &&
        !(
          url === 'https://base-ui.com' &&
          /\/(?:performance|compareScreenshots)\.mjs$/.test(filename)
        )
      ) {
        errors.push(`${path.relative(root, filename)}: unapproved upstream URL ${url}`);
      }
    }
    // Count URL occurrences, including root-relative href/src, Markdown and metadata URLs.
    const urls =
      text.match(/https?:\/\/[^\s"'<>`)\\]+|(?<=href=["']|src=["']|\]\()\/(?!\/)[^\s"'<>`)]+/g) ??
      [];
    for (const url of urls) {
      let category = 'c';
      if (url.startsWith('/') || url.startsWith(SITE_URL)) {
        category = 'a';
      } else if (url.startsWith(REPO_URL)) {
        category = 'b';
      }
      counts[group][category] += 1;
    }
  }
}
const browser = await chromium.launch();
const documents = new Map();
try {
  const page = await browser.newPage();
  for (const filename of builtFiles.filter((file) => file.endsWith('.html'))) {
    const html = await readFile(filename, 'utf8');
    const data = await page.evaluate((content) => {
      const doc = new DOMParser().parseFromString(content, 'text/html');
      return {
        ids: [...doc.querySelectorAll('[id], a[name]')]
          .flatMap((element) => [element.id, element.getAttribute('name')])
          .filter(Boolean),
        links: [...doc.querySelectorAll('[href], [src], [srcset]')]
          .flatMap((element) => [
            element.getAttribute('href'),
            element.getAttribute('src'),
            ...(element
              .getAttribute('srcset')
              ?.split(',')
              .map((item) => item.trim().split(' ')[0]) ?? []),
          ])
          .filter(Boolean),
      };
    }, html);
    documents.set(filename, data);
  }
  const redirects = new Map([
    ['/drafts', '/'],
    ['/trash', '/'],
    ['/inbox', '/'],
    ['/inbox/sent', '/'],
    ['/inbox/spam', '/'],
    ['/r/invalid-render-prop', '/react/handbook/composition'],
    ['/react/components/radio', '/react/components/radio-group'],
  ]);
  async function destination(url) {
    const pathname = redirects.get(url.pathname) ?? url.pathname;
    const file = path.join(root, 'export', decodeURIComponent(pathname));
    try {
      if ((await stat(file)).isFile()) {
        return file;
      }
    } catch {
      /* Try directory index. */
    }
    try {
      const index = path.join(file, 'index.html');
      if ((await stat(index)).isFile()) {
        return index;
      }
    } catch {
      /* Missing destination reported below. */
    }
    return undefined;
  }
  const checked = new Set();
  for (const [filename, document] of documents) {
    const pathname = `/${path.relative(path.join(root, 'export'), filename).replace(/index\.html$/, '')}`;
    for (const link of document.links) {
      if (/^(?:mailto:|tel:|data:|javascript:)/.test(link)) {
        continue;
      }
      const url = new URL(link, new URL(pathname, SITE_URL));
      if (url.origin !== new URL(SITE_URL).origin) {
        continue;
      }
      const key = url.href;
      if (checked.has(key)) {
        continue;
      }
      checked.add(key);
      const target = await destination(url);
      if (!target) {
        errors.push(`${pathname}: broken link ${link}`);
      } else if (
        url.hash &&
        url.hash !== '#' &&
        documents.has(target) &&
        !documents.get(target).ids.includes(decodeURIComponent(url.hash.slice(1)))
      ) {
        errors.push(`${pathname}: missing fragment ${link}`);
      }
    }
  }
  for (const filename of builtFiles.filter((file) => file.endsWith('.css'))) {
    const css = await readFile(filename, 'utf8');
    const pathname = `/${path.relative(path.join(root, 'export'), filename)}`;
    for (const [, raw] of css.matchAll(/url\(([^)]+)\)/g)) {
      const link = raw.replace(/^["']|["']$/g, '');
      if (link.startsWith('data:')) {
        continue;
      }
      const url = new URL(link, new URL(pathname, SITE_URL));
      if (url.origin === new URL(SITE_URL).origin && !(await destination(url))) {
        errors.push(`${pathname}: broken CSS asset ${link}`);
      }
    }
  }
  // Markdown includes actual demos/API tables; all llms index links must have files.
  const llms = await readFile(path.join(root, 'export/llms.txt'), 'utf8');
  for (const [, link] of llms.matchAll(/\]\(([^)]+)\)/g)) {
    assert.ok(await destination(new URL(link, SITE_URL)), `Missing llms target: ${link}`);
  }
  for (const filename of builtFiles.filter((file) => file.endsWith('.md'))) {
    const text = await readFile(filename, 'utf8');
    const pathname = `/${path.relative(path.join(root, 'export'), filename)}`;
    for (const [, link] of text.matchAll(/\]\((\/[^\s)]+)\)/g)) {
      const url = new URL(link, SITE_URL);
      if (!(await destination(url))) {
        errors.push(`${pathname}: broken Markdown link ${link}`);
      }
    }
  }
  const report = {
    counts,
    htmlPages: documents.size,
    internalUrls: checked.size,
    allowlist: [...allowlist].sort(),
    errors: [...new Set(errors)],
  };
  await mkdir('/tmp/codex-jobs', { recursive: true });
  await writeFile('/tmp/codex-jobs/DOCSLINKS.audit.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        counts,
        htmlPages: documents.size,
        internalUrls: checked.size,
        failures: report.errors.length,
      },
      null,
      2,
    ),
  );
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
}

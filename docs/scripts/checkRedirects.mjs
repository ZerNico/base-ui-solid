// Port note: audit HTTP redirects for every exported Solid page and Markdown document.
/* eslint-disable no-await-in-loop, no-console */
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { legacyPath } from '../src/mdx/legacyPaths.mjs';

async function routes(directory, prefix = '/solid') {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      if (entry.isDirectory()) {
        return routes(new URL(`${entry.name}/`, directory), `${prefix}/${entry.name}`);
      }
      if (entry.name === 'index.html') {
        return [prefix, `${prefix}/`];
      }
      if (entry.name.endsWith('.html') && entry.name !== '404.html') {
        return [`${prefix}/${entry.name.slice(0, -'.html'.length)}`];
      }
      return entry.name.endsWith('.md') ? [`${prefix}/${entry.name}`] : [];
    }),
  );
  return nested.flat();
}
const paths = [
  ...(await routes(new URL('../export/solid/', import.meta.url))),
  '/solid/components/radio',
  '/solid/components/not-yet-created',
];
const origins = process.argv.slice(2);
for (const origin of origins.length ? origins : [process.env.DOCS_URL ?? 'http://localhost:3010']) {
  for (const pathname of paths) {
    const old = pathname.replace(/^\/solid/, '/react');
    const response = await fetch(`${origin}${old}?redirect-check=1`, { redirect: 'manual' });
    assert.equal(response.status, 301, `${origin}${old}`);
    assert.equal(response.headers.get('location'), `${legacyPath(old)}?redirect-check=1`, old);
  }
  const unrelated = await fetch(`${origin}/reaction`, { redirect: 'manual' });
  assert.equal(unrelated.status, 404);
  console.log(`${origin}: ${paths.length} permanent redirects passed (queries preserved)`);
}

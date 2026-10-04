/* eslint-disable no-console */
// Port note: upstream serves a static robots.txt and no sitemap.xml. This static site generates
// both, since the robots.txt `Sitemap` line needs the configured absolute site URL.
import fs from 'node:fs/promises';
import path from 'node:path';
import { globby } from 'globby';
import { SITE_URL } from '../src/config.ts'; // eslint-disable-line import/extensions

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const MDX_SOURCE_DIR = path.join(PROJECT_ROOT, 'src/app/(docs)/solid');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');

const pages = await globby('**/page.mdx', { cwd: MDX_SOURCE_DIR });
const urls = [
  '/',
  ...pages
    .map((page) => path.dirname(page).replace(/\\/g, '/'))
    .map((dir) => (dir === '.' ? '/solid' : `/solid/${dir}`))
    .sort(),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
  .map((url) => `<url><loc>${new URL(url, SITE_URL).href}</loc></url>`)
  .join('')}</urlset>\n`;

// Mirrors upstream's src/app/robots.txt, plus the sitemap location.
const robots = `User-agent: *
Allow: /

Disallow: /playground/

Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}
`;

async function writeFileAtomic(filename, content) {
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, 'utf-8');
  await fs.rename(temporary, filename);
}

await writeFileAtomic(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
await writeFileAtomic(path.join(PUBLIC_DIR, 'robots.txt'), robots);
console.log(`Wrote public/sitemap.xml (${urls.length} URLs) and public/robots.txt`);

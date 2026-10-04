import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE_URL } from '../config';
import type * as GeneratorModule from '../../scripts/generateLlmTxt/index.mjs';

// Port note: upstream generates `llms.txt`, `llms-full.txt`, `index.md` and every page's `.md`
// into `public` before building. The docs server serves them per request instead (so dev never
// serves stale files) and the static build prerenders the same URLs.

type Generator = typeof GeneratorModule;

let generator: Promise<Generator> | undefined;
// Load the generator from disk at runtime: it reads the MDX sources relative to its own location
// and depends on Node-only tooling that shouldn't be bundled into the server build.
function loadGenerator() {
  generator ??= import(
    /* @vite-ignore */ pathToFileURL(path.join(process.cwd(), 'scripts/generateLlmTxt/index.mjs'))
      .href
  );
  return generator;
}

let allFiles: Promise<Map<string, string>> | undefined;
function generateAll() {
  // Sources only change in development, so a build generates everything once.
  if (import.meta.env.DEV || !allFiles) {
    allFiles = loadGenerator().then((markdown) => markdown.generateLlmsTxt());
  }
  return allFiles;
}

const AGGREGATE_FILES = new Set(['/llms.txt', '/llms-full.txt', '/index.md']);

export function robotsTxt() {
  // Mirrors upstream's src/app/robots.txt, plus the sitemap location.
  return `User-agent: *\nAllow: /\n\nDisallow: /playground/\n\nSitemap: ${new URL('/sitemap.xml', SITE_URL).href}\n`;
}

/**
 * The URLs served by `getGeneratedFile()`, for prerendering.
 */
export async function listGeneratedFiles() {
  const pages = await (await loadGenerator()).listMarkdownPages();
  return ['/robots.txt', ...AGGREGATE_FILES, ...pages.map((page) => page.mdUrlPath)];
}

/**
 * Returns the generated file for a URL path, or `undefined` when the path isn't one.
 */
export async function getGeneratedFile(pathname: string): Promise<Response | undefined> {
  if (pathname === '/robots.txt') {
    return text(robotsTxt(), 'text/plain');
  }

  if (AGGREGATE_FILES.has(pathname)) {
    const content = (await generateAll()).get(pathname);
    return content === undefined
      ? undefined
      : text(content, pathname.endsWith('.md') ? 'text/markdown' : 'text/plain');
  }

  if (!pathname.startsWith('/solid/') || !pathname.endsWith('.md')) {
    return undefined;
  }

  const markdown = await loadGenerator();
  const pages = await markdown.listMarkdownPages();
  const page = pages.find((item) => item.mdUrlPath === pathname);
  if (!page) {
    return undefined;
  }
  const { content } = await markdown.renderMarkdownPage(
    page,
    new Set(pages.map((item) => item.urlPath)),
  );
  return text(content, 'text/markdown');
}

function text(content: string, type: string) {
  return new Response(content, { headers: { 'Content-Type': `${type}; charset=utf-8` } });
}

// Port note: publish a Solid-specific llms.txt index instead of linking to React guidance.
/* eslint-disable no-await-in-loop */
import { readdir, readFile, writeFile } from 'node:fs/promises';

const sections = new Map();
for (const filename of await readdir(new URL('../src/routes/', import.meta.url))) {
  const routeFile = new URL(`../src/routes/${filename}`, import.meta.url);
  const route = await readFile(routeFile, 'utf8');
  const content = route.match(/import Content from '([^']+\.mdx)'/);
  const path = route.match(/createFileRoute\('\/_docs\/react\/([^']+)'\)/)?.[1];
  if (!content || !path || path.endsWith('/') || path.includes('releases/')) {
    continue;
  }
  const source = await readFile(new URL(content[1], routeFile), 'utf8');
  const title = source.match(/^# (.+)$/m)?.[1];
  const description = source.match(/<Subtitle>(.*?)<\/Subtitle>/s)?.[1];
  const section = path.split('/')[0];
  const entries = sections.get(section) ?? [];
  entries.push(`- [${title}](/react/${path})${description ? `: ${description}` : ''}`);
  sections.set(section, entries);
}
const output = [
  '# Base UI for Solid',
  '',
  '> Accessible, unstyled UI components for Solid 2.0 RC.',
  '',
  'This documentation describes base-ui-solid. Use Solid 2 and @solidjs/web; React APIs and Solid 1 APIs do not apply. Components use native HTML attributes and events, reactive accessors, and function-based render props.',
  '',
];
for (const section of ['overview', 'handbook', 'components', 'utils']) {
  output.push(
    `## ${section[0].toUpperCase()}${section.slice(1)}`,
    '',
    ...(sections.get(section) ?? []).sort(),
    '',
  );
}
await writeFile(new URL('../public/llms.txt', import.meta.url), output.join('\n'));

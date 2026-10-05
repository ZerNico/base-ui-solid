import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { adjustRefProp, adjustRefTypeSource } from './solidPropAdjustments.mjs';

// `--reapply` re-applies the Solid adjustments to every existing reference instead of generating one.
if (process.argv[2] === '--reapply') {
  const directory = new URL('../reference/', import.meta.url);
  const files = (await readdir(directory)).filter((item) => item.endsWith('.json'));
  await Promise.all(
    files.map(async (file) => {
      const url = new URL(file, directory);
      const reference = JSON.parse(await readFile(url, 'utf8'));
      const before = JSON.stringify(reference);
      for (const entry of Object.values(reference)) {
        entry.props.forEach(adjustRefProp);
        for (const type of entry.additionalTypes) {
          type.source = adjustRefTypeSource(type.source);
        }
      }
      // Only rewrite changed files, so their existing escapes are kept.
      if (JSON.stringify(reference) !== before) {
        await writeFile(url, `${JSON.stringify(reference, null, 2)}\n`);
      }
    }),
  );
  process.exit(0);
}

// Port note: this upstream checkout has generated types.md instead of docs/reference JSON.
// Convert that authoritative snapshot to a framework-neutral JSON reference for Solid rendering.
const name = process.argv[2] ?? 'collapsible';
const upstream = process.argv[3] ?? '../../base-ui/docs';
const source = (
  await readFile(resolve(upstream, `src/app/(docs)/react/components/${name}/types.md`), 'utf8')
).replaceAll('https://base-ui.com/react/', '/solid/');
const sections = source
  .split(/^### /m)
  .slice(1)
  .map((section) => {
    const end = section.indexOf('\n');
    return { name: section.slice(0, end).trim(), body: section.slice(end + 1) };
  });
const reference = {};
for (const section of sections.filter((item) => item.body.includes(`**${item.name} Props:**`))) {
  const entry = {
    description: section.body.split('**')[0].trim(),
    props: [],
    dataAttributes: [],
    cssVariables: [],
    additionalTypes: [],
  };
  for (const [heading, key] of [
    ['Props', 'props'],
    ['Data Attributes', 'dataAttributes'],
    ['CSS Variables', 'cssVariables'],
  ]) {
    const marker = `**${section.name} ${heading}:**`;
    if (!section.body.includes(marker)) {
      continue;
    }
    const table = section.body.split(marker)[1].trim().split('\n\n')[0];
    for (const line of table.split('\n').slice(2)) {
      const cells = line
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('\\|', '|').replaceAll('&#xA;', '\n'));
      if (key === 'props') {
        const defaultValue = cells[2];
        let [prop, type, , description] = cells;
        type = type
          .replace(/^`|`$/g, '')
          .replaceAll('React.CSSProperties', 'JSX.CSSProperties')
          .replaceAll('ReactElement', 'JSX.Element');
        if (prop === 'className') {
          prop = 'class';
          type = 'JSX.ClassValue | ((state) => JSX.ClassValue)';
        }
        if (prop === 'style') {
          type = 'JSX.CSSProperties | string | ((state) => JSX.CSSProperties | string | undefined)';
        }
        if (prop === 'render') {
          type = 'keyof JSX.IntrinsicElements | Component | ((props, state) => JSX.Element)';
          description =
            'Replace the default element with a tag name, component, or render function.';
        }
        entry[key].push(adjustRefProp({ name: prop, type, default: defaultValue, description }));
      } else {
        entry[key].push({
          name: cells[0].replace(/^`|`$/g, ''),
          type: cells[1].replace(/^`|`$/g, ''),
          description: cells[2],
        });
      }
    }
  }
  for (const item of sections.filter((candidate) =>
    candidate.name.startsWith(`${section.name}.`),
  )) {
    const code = /```(?:typescript|tsx)\n([\s\S]*?)```/.exec(item.body)?.[1];
    if (code) {
      entry.additionalTypes.push({ name: item.name, source: adjustRefTypeSource(code.trim()) });
    }
  }
  reference[section.name] = entry;
}
await writeFile(
  new URL(`../reference/${name}.json`, import.meta.url),
  `${JSON.stringify(reference, null, 2)}\n`,
);

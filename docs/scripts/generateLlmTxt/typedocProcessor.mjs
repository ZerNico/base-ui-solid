/**
 * typedocProcessor.mjs - Process Typedoc types markdown
 *
 * This module resolves Typedoc components in MDX files to their generated
 * types markdown, parses that markdown, and returns AST nodes to be
 * inserted into the documentation.
 */

import fs from 'fs';
import path from 'path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

/**
 * Parse a markdown string into an AST
 * @param {string} markdown - Markdown string to parse
 * @returns {Object} The root content node of the parsed AST
 */
function parseMarkdown(markdown) {
  // Parse markdown into an AST
  const processor = unified().use(remarkParse).use(remarkGfm);
  const result = processor.parse(markdown);
  return result.children;
}

/**
 * Transforms a Typedoc component into markdown code blocks
 * @param {Object} node - The Typedoc JSX node from MDX
 * @param {string} mdxFilePath - Path to the MDX file containing the Typedoc component
 * @returns {Array} Array of markdown nodes to replace the Typedoc component
 */
export function processTypedoc(node, mdxFilePath, typesPath) {
  // Resolve types path relative to the MDX file
  const mdxDir = path.dirname(mdxFilePath);
  // Port note: render the same Solid JSON reference used by createMultipleTypes,
  // including Solid class/render types, rather than the stale React types.md snapshot.
  const typesModule = path.resolve(mdxDir, `${typesPath}.ts`);
  const source = fs.readFileSync(typesModule, 'utf8');
  const referencePath = source.match(/import reference from '([^']+)'/)?.[1];
  if (!referencePath) {
    throw new Error(`No reference import in ${typesModule}`);
  }
  const reference = JSON.parse(fs.readFileSync(path.resolve(mdxDir, referencePath), 'utf8'));
  const escape = (value) =>
    String(value ?? '-')
      .replaceAll('|', '\\|')
      .replaceAll('\n', '<br />');
  const lines = [];
  for (const [name, entry] of Object.entries(reference)) {
    lines.push(`### ${name}`, '', entry.description, '');
    for (const [key, title] of [
      ['props', 'Props'],
      ['dataAttributes', 'Data Attributes'],
      ['cssVariables', 'CSS Variables'],
    ]) {
      if (!entry[key]?.length) {
        continue;
      }
      lines.push(
        `**${name} ${title}:**`,
        '',
        '| Name | Type | Default | Description |',
        '| --- | --- | --- | --- |',
      );
      for (const item of entry[key]) {
        lines.push(
          `| ${escape(item.name)} | ${escape(item.type)} | ${escape(item.default)} | ${escape(item.description)} |`,
        );
      }
      lines.push('');
    }
    for (const item of entry.additionalTypes ?? []) {
      lines.push(`#### ${item.name}`, '', '```typescript', item.source, '```', '');
    }
  }
  return parseMarkdown(lines.join('\n'));
}

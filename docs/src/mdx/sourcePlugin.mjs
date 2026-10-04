import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relative } from 'node:path';
import {
  parseImportsAndComments,
  processRelativeImports,
} from '@mui/internal-docs-infra/pipeline/loaderUtils';
import { toHtml } from 'hast-util-to-html';
import { highlightSource } from './highlightCode.mjs';
// Port note: a Vite import query replaces the upstream precomputed webpack demo loader.
export function sourcePlugin() {
  return {
    name: 'solid-docs-source',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (!id.endsWith('?highlight')) {
        return undefined;
      }
      const resolved = await this.resolve(id.slice(0, -10), importer, { skipSelf: true });
      if (!resolved) {
        return undefined;
      }
      return `\0solid-docs-source:${encodeURIComponent(resolved.id)}.js`;
    },
    async load(id) {
      if (!id.startsWith('\0solid-docs-source:')) {
        return undefined;
      }
      const file = decodeURIComponent(id.slice('\0solid-docs-source:'.length, -3));
      this.addWatchFile(file);
      const source = await readFile(file, 'utf8');
      const parsed = parseImportsAndComments(source, pathToFileURL(file).href);
      const resolvedPaths = new Map();
      await Promise.all(
        Object.values(parsed.relative).map(async (info) => {
          const resolved = await this.resolve(info.url.replace('file://', ''), file, {
            skipSelf: true,
          });
          if (resolved) {
            // Port note: upstream's deployed flat-file collision labels use the /opt root.
            resolvedPaths.set(
              info.url,
              pathToFileURL(
                `/opt/${relative(fileURLToPath(new URL('../../', import.meta.url)), resolved.id)}`,
              ).href,
            );
          }
        }),
      );
      const { processedSource } = processRelativeImports(
        source,
        parsed.relative,
        'flat',
        /\.[cm]?[jt]sx?$/.test(file),
        resolvedPaths,
      );
      const tree = await highlightSource(processedSource, file.split('/').at(-1));
      return `export default ${JSON.stringify({ type: 'html', value: toHtml(tree) })};`;
    },
  };
}

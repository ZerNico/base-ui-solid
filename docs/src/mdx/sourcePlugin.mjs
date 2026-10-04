import { readFile } from 'node:fs/promises';
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
      const tree = await highlightSource(source, file.split('/').at(-1));
      return `export default ${JSON.stringify(tree)};`;
    },
  };
}

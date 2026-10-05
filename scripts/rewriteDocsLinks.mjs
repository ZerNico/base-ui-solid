import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Points upstream's docs links (`https://base-ui.com/react/…`) in package sources at the port's
// docs. They ship in JSDoc (and the emitted `.d.ts`) and in runtime error messages.
// Run after porting upstream changes: `pnpm rewrite-docs-links`.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FROM = 'https://base-ui.com/react/';
const TO = 'https://base-ui-solid.pages.dev/solid/';

function* sourceFiles(directory) {
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) {
      yield* sourceFiles(file);
    } else if (/\.tsx?$/.test(name) && !/\.(?:test|spec)\.tsx?$/.test(name)) {
      yield file;
    }
  }
}

let count = 0;
for (const directory of ['packages/solid/src', 'packages/utils/src']) {
  for (const file of sourceFiles(path.join(root, directory))) {
    const source = readFileSync(file, 'utf8');
    if (source.includes(FROM)) {
      writeFileSync(file, source.replaceAll(FROM, TO));
      count += 1;
    }
  }
}
process.stdout.write(`Rewrote docs links in ${count} files.\n`);

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processDemo } from './demoProcessor.mjs';

// Port note: the Solid demos are read from their file manifest instead of upstream's
// precomputed loader output, so malformed manifests must fail with the demo path.
describe('processDemo', () => {
  let dir;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'demo-processor-'));
    await fs.mkdir(path.join(dir, 'demos/hero/css-modules'), { recursive: true });
    await fs.writeFile(path.join(dir, 'demos/hero/css-modules/index.tsx'), 'export default 1;\n');
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function run(indexSource) {
    await fs.writeFile(path.join(dir, 'demos/hero/index.ts'), indexSource);
    return processDemo(path.join(dir, 'page.mdx'), './demos/hero');
  }

  const valid = (variants) => `
import Source from './css-modules/index.tsx?highlight';
export const DemoHero = createDemoWithVariants(${variants});
`;

  it('renders a valid demo', async () => {
    const result = await run(valid(`[{ name: 'CSS Modules', files: { 'index.tsx': Source } }]`));
    expect(JSON.stringify(result)).toContain('/* index.tsx */');
  });

  it('throws with the demo path when no variants are declared', async () => {
    await expect(run('export const DemoHero = createDemo();\n')).rejects.toThrow(
      /demos\/hero\/index\.ts/,
    );
  });

  it('throws on an unknown variant name', async () => {
    await expect(
      run(valid(`[{ name: 'Emotion', files: { 'index.tsx': Source } }]`)),
    ).rejects.toThrow(/unknown variant name "Emotion"/);
  });

  it('throws when a file does not reference an import', async () => {
    await expect(
      run(valid(`[{ name: 'CSS Modules', files: { 'index.tsx': Missing } }]`)),
    ).rejects.toThrow(/must reference a default import/);
  });

  it('throws when variants are not an array literal', async () => {
    await expect(run(valid('variants'))).rejects.toThrow(/array of variants/);
  });
});

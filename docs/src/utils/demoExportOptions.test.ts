import { describe, expect, it } from 'vitest';
import { toHtml } from 'hast-util-to-html';
import { dependencies as docsDependencies } from '../../package.json';
import { createStackBlitzRequestPayload } from '../blocks/createCodeSandbox/createStackBlitzProject';
import { highlightSource } from '../mdx/highlightCode.mjs';
import type { CodeNode } from '../components/CodeBlock/Hast';
import {
  BASE_UI_SOLID_PACKAGE_SPEC,
  createDemoExportOptions,
  exportOpts,
  getSourceText,
} from './demoExportOptions';

// Port note: upstream's tests cover the injection of Tailwind classes into the page head for
// Tailwind's CDN runtime. The exported Vite project compiles Tailwind with `@tailwindcss/vite`
// instead, so these tests check that setup, the generated Solid project, and how the source
// text is read from the docs' highlighted HTML.

function text(value: string): CodeNode {
  return { type: 'text', value };
}

function getTailwindProject(source: string) {
  return createStackBlitzRequestPayload(
    createDemoExportOptions(exportOpts, {
      name: 'Hero',
      variantName: 'Tailwind',
      files: { 'index.tsx': text(source) },
    }),
  );
}

describe('exportOpts Tailwind setup', () => {
  it('uses the Tailwind v4 Vite plugin for StackBlitz exports', () => {
    const { files, devDependencies } = getTailwindProject(`
      export default function Demo() {
        return <div class="outline-1 outline-gray-200">Demo</div>;
      }
    `);

    expect(files['vite.config.ts']).toContain("import tailwindcss from '@tailwindcss/vite';");
    expect(files['vite.config.ts']).toContain('plugins: [solid(), tailwindcss()]');
    expect(files['demo.css']).toContain("@import 'tailwindcss';");
    expect(files['index.html']).toContain('<link rel="stylesheet" href="demo.css" />');
    expect(files['index.html']).not.toContain(
      'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
    );
    expect(devDependencies).toMatchObject({
      tailwindcss: docsDependencies.tailwindcss,
      '@tailwindcss/vite': docsDependencies['@tailwindcss/vite'],
    });
  });

  it('does not set up Tailwind for CSS Modules exports', () => {
    const { files, devDependencies } = createStackBlitzRequestPayload(
      createDemoExportOptions(exportOpts, {
        variantName: 'CSS Modules',
        files: {
          'index.tsx': text(
            "import styles from './index.module.css';\n\nexport default function Demo() {\n  return <div class={styles.Root} />;\n}\n",
          ),
          'index.module.css': text('.Root {\n  display: flex;\n}\n'),
        },
      }),
    );

    expect(files['vite.config.ts']).not.toContain('tailwindcss');
    expect(files['demo.css']).not.toContain('tailwindcss');
    expect(devDependencies).not.toHaveProperty('tailwindcss');
    expect(files['src/App.tsx']).toContain("import styles from './index.module.css';");
    expect(files['src/index.module.css']).toBe('.Root {\n  display: flex;\n}\n');
  });
});

describe('createDemoExportOptions', () => {
  it('generates a Vite + Solid project', () => {
    const { files, dependencies } = getTailwindProject(`
      import { Popover } from 'base-ui-solid/popover';

      export default function Demo() {
        return <Popover.Root />;
      }
    `);

    expect(Object.keys(files)[0]).toBe('src/App.tsx');
    expect(files['src/index.tsx']).toContain("import { render } from '@solidjs/web';");
    expect(files['src/index.tsx']).toContain(
      'render(() => <App />, document.querySelector("#root")!);',
    );
    expect(files['index.html']).toContain('<title>Hero - Base UI Example</title>');
    expect(files['index.html']).toContain('<script type="module" src="/src/index.tsx"></script>');
    expect(files['vite.config.ts']).toContain("import solid from 'vite-plugin-solid';");

    const tsconfig = JSON.parse(files['tsconfig.json']);
    expect(tsconfig.compilerOptions).toMatchObject({
      jsx: 'preserve',
      jsxImportSource: '@solidjs/web',
    });

    const packageJson = JSON.parse(files['package.json']);
    expect(packageJson.scripts).toEqual({
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
    });
    expect(dependencies).toEqual({
      'base-ui-solid': BASE_UI_SOLID_PACKAGE_SPEC,
      'solid-js': docsDependencies['solid-js'],
      '@solidjs/web': docsDependencies['@solidjs/web'],
    });
    expect(packageJson.dependencies).toEqual(dependencies);
    expect(JSON.stringify(packageJson)).not.toContain('react');
  });

  it('reads the source text of highlighted HTML sources', async () => {
    const source = `import { Popover } from 'base-ui-solid/popover';

const className = "data-[side=top]:rotate-180 before:content-[''] a&b";

export default function Demo() {
  return <Popover.Trigger class={className}>{'<Open> & "close"'}</Popover.Trigger>;
}
`;
    const tree = await highlightSource(source, 'index.tsx');
    const node: CodeNode = { type: 'html', value: toHtml(tree) };

    expect(getSourceText(node)).toBe(source);
  });
});

// Port note: upstream's Create React App template is replaced by a Vite + Solid template. The
// file keeps its upstream name. Vite serves `index.html` from the project root, so it loads the
// entry point with a module script instead of relying on react-scripts' `public/index.html`.

interface GetHtmlParameters {
  title: string;
  language: string;
  additionalHeadContent?: string;
  /**
   * Path of the entry point, relative to the project root.
   */
  entrypoint?: string;
}

export const getHtml = ({
  title,
  language,
  additionalHeadContent,
  entrypoint = 'src/index.tsx',
}: GetHtmlParameters) => {
  return `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="viewport" content="initial-scale=1, width=device-width" />
    ${additionalHeadContent ?? ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entrypoint}"></script>
  </body>
</html>`;
};

export function getRootIndex(useTypescript: boolean) {
  // document.querySelector returns 'Element | null' but render expects 'MountableElement'.
  const type = useTypescript ? '!' : '';

  // Port note: Solid has no StrictMode. `render` from `@solidjs/web` mounts the app.
  return `import { render } from '@solidjs/web';
import App from './App';

render(() => <App />, document.querySelector("#root")${type});`;
}

export const getTsconfig = (compilerOptions: Record<string, unknown> = {}) =>
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'es2022',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: 'esnext',
        // Port note: Vite resolves packages with `exports` maps, like `moduleResolution: bundler`.
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        // Port note: vite-plugin-solid compiles the JSX, so TypeScript preserves it and reads
        // the JSX types from Solid's web renderer.
        jsx: 'preserve',
        jsxImportSource: '@solidjs/web',
        types: ['vite/client'],
        ...compilerOptions,
      },
      include: ['src'],
    },
    null,
    2,
  )}
`;

interface GetViteConfigParameters {
  /**
   * Compile Tailwind CSS with `@tailwindcss/vite`.
   */
  tailwind?: boolean;
}

// Port note: not in upstream (react-scripts needs no config). Vite needs vite-plugin-solid, and
// Tailwind variants add `@tailwindcss/vite` like the docs site does.
export function getViteConfig({ tailwind = false }: GetViteConfigParameters = {}) {
  return `import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';${tailwind ? "\nimport tailwindcss from '@tailwindcss/vite';" : ''}

// https://vite.dev/config/
export default defineConfig({
  plugins: [solid()${tailwind ? ', tailwindcss()' : ''}],
});
`;
}

export const scripts = {
  dev: 'vite',
  build: 'vite build',
  preview: 'vite preview',
};

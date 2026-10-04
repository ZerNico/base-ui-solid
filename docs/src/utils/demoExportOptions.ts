import {
  dependencies as docsDependencies,
  devDependencies as docsDevDependencies,
} from '../../package.json';
import type { createStackBlitzProject } from '../blocks/createCodeSandbox/createStackBlitzProject';
import { getViteConfig } from '../blocks/createCodeSandbox/CreateReactApp';
import type { DemoFile } from '../blocks/Demo/types';
import type { CodeNode } from '../components/CodeBlock/Hast';
import { SITE_URL } from '../config';

// Port note: upstream configures `@mui/internal-docs-infra/useDemo`, whose exporter generates a
// React project and imports React. The Solid docs export with the ported
// `blocks/createCodeSandbox` utilities instead, and this file keeps upstream's config shape
// (`ExportConfig`) for the parts those utilities use.

/**
 * The variant passed to the export hooks. Sources are plain text.
 */
export interface ExportVariant {
  fileName: string;
  source: string;
  extraFiles?: Record<string, { source: string }>;
}

export interface ExportConfig {
  titlePrefix?: string;
  titleSuffix?: string;
  headTemplate?: (props: {
    sourcePrefix: string;
    assetPrefix: string;
    variant?: ExportVariant;
    variantName?: string;
  }) => string;
  transformVariant?: (
    variant: ExportVariant,
    variantName: string | undefined,
    globals: Record<string, { source: string }>,
  ) => { variant?: ExportVariant; globals?: Record<string, { source: string }> } | undefined;
  versions?: Record<string, string>;
  resolveDependencies?: (packageName: string) => Record<string, string>;
  tsconfigOptions?: Record<string, unknown>;
  devDependencies?: Record<string, string>;
}

const defaultStylesLink = `<link rel="stylesheet" href="demo.css" />`;
const htmlHeadWithDefaultStyles: ExportConfig['headTemplate'] = () => defaultStylesLink;
const demoCss = `:root {
  color-scheme: light dark;
}

body {
  font-family: system-ui;
  margin: 0;

  /* iOS 26+ Safari: ${SITE_URL}/solid/overview/quick-start#ios-26-safari */
  position: relative;
}

#root {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 3rem;
  isolation: isolate;
}
`;

// Tailwind CSS Setup
// Port note: upstream loads Tailwind's browser runtime from a CDN and injects the classes the
// demo uses into the page head so that the runtime sees them before the first render. The
// exported Vite project compiles Tailwind with `@tailwindcss/vite` instead, like the docs site,
// which scans the demo sources at build time. `demo.css` becomes the Tailwind entry point.
const tailwindSetup = `/* Check out the Tailwind CSS' installation guide for setting it up: https://tailwindcss.com/docs/installation/using-vite */
@import 'tailwindcss';

`;

// Head Template
const htmlHeadTemplate: ExportConfig['headTemplate'] = (props) => {
  const head = [htmlHeadWithDefaultStyles?.(props)];

  return head.filter(Boolean).join('\n');
};

// Transform Demo Files at Export
const transformVariant: ExportConfig['transformVariant'] = (variant, variantName, globals) => {
  globals = { ...globals };
  globals['demo.css'] = {
    source: variantName === 'Tailwind' ? `${tailwindSetup}${demoCss}` : demoCss,
  };

  return { globals };
};

// Port note: the versions are read from the docs' own package.json, so exported demos use the
// same Solid, Vite, and Tailwind releases as the docs site.
const versions: Record<string, string> = {
  'solid-js': docsDependencies['solid-js'],
  '@solidjs/web': docsDependencies['@solidjs/web'],
};

const devDependencies: Record<string, string> = {
  vite: docsDevDependencies.vite,
  'vite-plugin-solid': docsDevDependencies['vite-plugin-solid'],
};

const tailwindDevDependencies: Record<string, string> = {
  tailwindcss: docsDependencies.tailwindcss,
  '@tailwindcss/vite': docsDependencies['@tailwindcss/vite'],
};

/**
 * The npm version (or tag, or URL) that exported demos install `base-ui-solid` and
 * `@base-ui-solid/utils` from.
 *
 * Port note: upstream installs `latest`, or a pkg.pr.new build for pull request previews.
 * `base-ui-solid` isn't published to npm yet, so exported demos only install once it is.
 * Change this one value to point them at another release or a tarball URL.
 */
export const BASE_UI_SOLID_PACKAGE_SPEC = 'latest'; // #npm-tag-reference

export function resolveDependencies(packageName: string): Record<string, string> {
  switch (packageName) {
    case 'base-ui-solid':
    case '@base-ui-solid/utils': {
      return { [packageName]: BASE_UI_SOLID_PACKAGE_SPEC };
    }

    default:
      return {
        [packageName]: 'latest',
      };
  }
}

const tsconfigOptions = {
  allowJs: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  forceConsistentCasingInFileNames: true,
};

export const exportOpts: ExportConfig = {
  titleSuffix: ' - Base UI Example',
  headTemplate: htmlHeadTemplate,
  transformVariant,
  versions,
  resolveDependencies,
  tsconfigOptions,
  devDependencies,
};

// Port note: upstream exports a Create React App project to CodeSandbox. Both targets get the
// same Vite project here, so CodeSandbox needs no overrides.
export const exportCodeSandbox: ExportConfig = {};

const characterReferences: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Returns the text of a highlighted source file.
 * Port note: the docs' `?highlight` imports serialize the highlighted HAST to HTML at build
 * time, so the text is recovered from the HTML (upstream reads the HAST text nodes).
 */
export function getSourceText(node: CodeNode): string {
  if (node.type === 'html') {
    return (node.value ?? '')
      .replace(/<[^>]*>/g, '')
      .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (reference: string, name: string) => {
        if (name[0] === '#') {
          return String.fromCodePoint(
            name[1] === 'x' || name[1] === 'X'
              ? parseInt(name.slice(2), 16)
              : parseInt(name.slice(1), 10),
          );
        }
        return characterReferences[name] ?? reference;
      });
  }

  if (node.type === 'text') {
    return node.value ?? '';
  }

  return (node.children ?? []).map((child) => getSourceText(child)).join('');
}

function getFileType(fileName: string) {
  return fileName.split('.').pop() ?? '';
}

export interface DemoExportParameters {
  /**
   * The demo name. Defaults to `Demo`.
   */
  name?: string;
  /**
   * The name of the selected variant (`CSS Modules`, `Tailwind`, …).
   */
  variantName: string;
  /**
   * The source files of the selected variant, keyed by file name. `index.tsx` is the entry point.
   */
  files: Record<string, CodeNode>;
}

/**
 * Builds the options of `createStackBlitzProject` and `createCodeSandbox` for a demo variant.
 * Port note: replaces the export part of `useDemo` from `@mui/internal-docs-infra`, which merges
 * the config the same way and calls its own React exporter.
 */
export function createDemoExportOptions(
  config: ExportConfig,
  { name, variantName, files }: DemoExportParameters,
): createStackBlitzProject.Options {
  const title = name || 'Demo';
  const description = `${title} demo`;
  const finalTitle = [config.titlePrefix, title, config.titleSuffix].filter(Boolean).join('');

  const [entry, ...rest] = Object.entries(files)
    .map(([fileName, node]): [string, string] => [fileName, getSourceText(node)])
    .sort(([a], [b]) => Number(b === 'index.tsx') - Number(a === 'index.tsx'));

  const initialVariant: ExportVariant = {
    fileName: entry[0],
    source: entry[1],
    extraFiles: Object.fromEntries(rest.map(([fileName, source]) => [fileName, { source }])),
  };
  const transformed = config.transformVariant?.(initialVariant, variantName, {});
  const variant = transformed?.variant ?? initialVariant;
  const globals = transformed?.globals ?? {};

  const toDemoFile = (fileName: string, content: string): DemoFile => ({
    name: fileName,
    path: fileName,
    content,
    type: getFileType(fileName),
  });

  // The entry point goes first: `packDemo` renames it to `App`.
  const demoFiles = [
    toDemoFile(variant.fileName, variant.source),
    ...Object.entries(variant.extraFiles ?? {}).map(([fileName, file]) =>
      toDemoFile(fileName, file.source),
    ),
    ...Object.entries(globals).map(([fileName, file]) => toDemoFile(fileName, file.source)),
  ];
  const useTypescript = demoFiles.some((file) => file.type === 'ts' || file.type === 'tsx');

  const versionsConfig = config.versions ?? {};
  const isTailwind = variantName === 'Tailwind';

  return {
    title: finalTitle,
    description,
    demoFiles,
    demoLanguage: useTypescript ? 'ts' : 'js',
    // Port note: the entry point renders with `@solidjs/web` (upstream always adds `react` and
    // `react-dom`).
    dependencies: {
      'solid-js': versionsConfig['solid-js'] ?? 'latest',
      '@solidjs/web': versionsConfig['@solidjs/web'] ?? 'latest',
    },
    devDependencies: {
      ...config.devDependencies,
      ...(isTailwind && tailwindDevDependencies),
      ...(useTypescript && { typescript: 'latest' }),
    },
    dependencyResolver: (packageName) =>
      versionsConfig[packageName]
        ? { [packageName]: versionsConfig[packageName] }
        : (config.resolveDependencies?.(packageName) ?? { [packageName]: 'latest' }),
    additionalHtmlHeadContent: config.headTemplate?.({
      sourcePrefix: 'src/',
      assetPrefix: '',
      variant,
      variantName,
    }),
    customViteConfig: getViteConfig({ tailwind: isTailwind }),
    tsconfigOptions: config.tsconfigOptions,
    // Globals such as `demo.css` sit in the project root, next to `index.html`.
    onAddingFile: (fileName, content) => (fileName in globals ? [fileName, content] : null),
  };
}

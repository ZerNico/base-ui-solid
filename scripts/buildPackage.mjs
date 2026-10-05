// Port note: replaces upstream's `code-infra build` (Babel to CJS + ESM, `tsgo` declarations, a
// generated `build/package.json`). Solid components have to be compiled differently for the
// browser and the server, and Solid bundlers want the JSX source, so the build writes one tree per
// output into `build/` and maps them to export conditions:
//
//   build/**/*.d.ts   `types`    declarations, emitted by `tsc -p tsconfig.build.json`
//   build/source/**   `solid`    TypeScript stripped, JSX preserved (.jsx), compiled by the app
//   build/server/**   `worker`, `deno`, `node`   generate: 'ssr', hydratable
//   build/dom/**      `browser`, `default`       generate: 'dom', hydratable
//
// The condition order follows `solid-js` and `@solidjs/web`, so the server build is picked under
// the same conditions as Solid's own server runtime.
//
// Usage (from a package directory): node ../../scripts/buildPackage.mjs
import { transformAsync } from '@babel/core';
import presetTypescript from '@babel/preset-typescript';
import solidBabelPlugin from '@solidjs/babel-plugin';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_DIR = process.cwd();
const SRC = path.join(PACKAGE_DIR, 'src');
const BUILD = path.join(PACKAGE_DIR, 'build');

const SOURCE_EXTENSIONS = ['.ts', '.tsx'];
const IGNORED_FILES = [
  /\.(test|spec|fixtures)\.tsx?$/,
  /test-utils/,
  /\.template\.js$/,
  /\.d\.ts$/,
];

const VARIANTS = {
  source: { dir: 'source', solid: null },
  server: { dir: 'server', solid: { generate: 'ssr', hydratable: true } },
  dom: { dir: 'dom', solid: { generate: 'dom', hydratable: true } },
};

// Conditions under which each `#imports` target is picked, per compiled variant. `source` keeps
// the specifier and ships an `imports` map instead, since it serves the client and the server.
const VARIANT_IMPORT_CONDITIONS = {
  server: ['solid', 'worker', 'deno', 'node', 'import', 'default'],
  dom: ['solid', 'browser', 'import', 'default'],
};

const packageJson = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8'));

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function listSourceFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file)))
    .filter((file) => !IGNORED_FILES.some((pattern) => pattern.test(toPosix(file))))
    .sort();
}

const sourceFiles = listSourceFiles(SRC);
const sourceFileSet = new Set(sourceFiles);

/** The output path of a source file, relative to the variant directory. */
function outputName(sourceFile, variant) {
  const relative = toPosix(path.relative(SRC, sourceFile));
  const extension = variant === 'source' && sourceFile.endsWith('.tsx') ? '.jsx' : '.js';
  return relative.replace(/\.tsx?$/, extension);
}

/** Resolves a relative specifier the way the workspace's `moduleResolution: bundler` does. */
function resolveRelative(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => base + extension),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];
  const resolved = candidates.find((candidate) => sourceFileSet.has(candidate));
  if (!resolved) {
    throw new Error(
      `${path.relative(PACKAGE_DIR, fromFile)}: cannot resolve '${specifier}' to a published source file.`,
    );
  }
  return resolved;
}

function relativeSpecifier(fromFile, toFile, variant) {
  const fromOutput = outputName(fromFile, variant);
  const toOutput = outputName(toFile, variant);
  const specifier = path.posix.relative(path.posix.dirname(fromOutput), toOutput);
  return specifier.startsWith('.') ? specifier : `./${specifier}`;
}

function pickCondition(target, conditions) {
  if (typeof target === 'string' || target === null) {
    return target;
  }
  for (const [condition, value] of Object.entries(target)) {
    if (conditions.includes(condition)) {
      const picked = pickCondition(value, conditions);
      if (picked !== undefined) {
        return picked;
      }
    }
  }
  return undefined;
}

function resolveSubpathImport(fromFile, specifier, variant) {
  const target = pickCondition(
    packageJson.imports?.[specifier],
    VARIANT_IMPORT_CONDITIONS[variant],
  );
  if (typeof target !== 'string') {
    throw new Error(
      `${path.relative(PACKAGE_DIR, fromFile)}: '${specifier}' has no published target.`,
    );
  }
  const resolved = path.resolve(PACKAGE_DIR, target);
  if (!sourceFileSet.has(resolved)) {
    throw new Error(`'${specifier}' resolves to ${target}, which is not published.`);
  }
  return relativeSpecifier(fromFile, resolved, variant);
}

/** Rewrites relative and `#` specifiers to the emitted files, with explicit extensions. */
function rewriteSpecifiersPlugin(sourceFile, variant) {
  function rewrite(source) {
    if (!source || source.type !== 'StringLiteral') {
      return;
    }
    const specifier = source.value;
    if (specifier.startsWith('.')) {
      source.value = relativeSpecifier(sourceFile, resolveRelative(sourceFile, specifier), variant);
    } else if (specifier.startsWith('#')) {
      if (variant !== 'source') {
        source.value = resolveSubpathImport(sourceFile, specifier, variant);
      } else if (!packageJson.imports?.[specifier]) {
        throw new Error(`${path.relative(PACKAGE_DIR, sourceFile)}: unknown '${specifier}'.`);
      }
    }
  }
  return {
    visitor: {
      ImportDeclaration(nodePath) {
        rewrite(nodePath.node.source);
      },
      ExportNamedDeclaration(nodePath) {
        rewrite(nodePath.node.source);
      },
      ExportAllDeclaration(nodePath) {
        rewrite(nodePath.node.source);
      },
      CallExpression(nodePath) {
        if (nodePath.node.callee.type === 'Import') {
          rewrite(nodePath.node.arguments[0]);
        }
      },
    },
  };
}

const babelBaseOptions = {
  babelrc: false,
  configFile: false,
  sourceMaps: false,
  comments: true,
  retainLines: false,
};

/** Strips TypeScript and keeps JSX. */
async function stripTypes(sourceFile) {
  const code = fs.readFileSync(sourceFile, 'utf8');
  const result = await transformAsync(code, {
    ...babelBaseOptions,
    filename: sourceFile,
    presets: [
      [
        presetTypescript,
        {
          isTSX: sourceFile.endsWith('.tsx'),
          allExtensions: true,
          onlyRemoveTypeImports: true,
          allowDeclareFields: true,
        },
      ],
    ],
  });
  return result.code;
}

async function compileVariant(sourceFile, strippedCode, variant) {
  const { solid } = VARIANTS[variant];
  const plugins = [rewriteSpecifiersPlugin(sourceFile, variant)];
  if (solid) {
    plugins.push([solidBabelPlugin, { ...solid, dev: false }]);
  }
  const result = await transformAsync(strippedCode, {
    ...babelBaseOptions,
    filename: sourceFile.replace(/\.tsx?$/, '.jsx'),
    parserOpts: { plugins: ['jsx'] },
    plugins,
  });
  return `${result.code}\n`;
}

async function buildFile(sourceFile) {
  const stripped = await stripTypes(sourceFile);
  await Promise.all(
    Object.keys(VARIANTS).map(async (variant) => {
      const code = await compileVariant(sourceFile, stripped, variant);
      const outputFile = path.join(BUILD, VARIANTS[variant].dir, outputName(sourceFile, variant));
      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, code);
    }),
  );
}

async function buildJavaScript() {
  const queue = [...sourceFiles];
  const workers = Array.from({ length: 16 }, async () => {
    while (queue.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await buildFile(queue.shift());
    }
  });
  await Promise.all(workers);
}

function listFiles(dir, extension) {
  return fs
    .readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

/**
 * Emits the declarations, then gives their relative specifiers explicit `.js` extensions so they
 * also resolve under `moduleResolution: node16` / `nodenext`.
 */
function buildDeclarations() {
  execFileSync(path.join(ROOT, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.build.json'], {
    cwd: PACKAGE_DIR,
    stdio: 'inherit',
  });
  for (const file of listFiles(BUILD, '.d.ts')) {
    const content = fs.readFileSync(file, 'utf8');
    const rewritten = content.replace(
      /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*|\.{1,2})\2/g,
      (match, prefix, quote, specifier) => {
        const base = path.resolve(path.dirname(file), specifier);
        let target;
        if (fs.existsSync(`${base}.d.ts`)) {
          target = `${specifier}.js`;
        } else if (fs.existsSync(path.join(base, 'index.d.ts'))) {
          target = `${specifier.replace(/\/$/, '')}/index.js`;
        } else {
          throw new Error(`${path.relative(BUILD, file)}: cannot resolve '${specifier}'.`);
        }
        return `${prefix}${quote}${target}${quote}`;
      },
    );
    if (rewritten !== content) {
      fs.writeFileSync(file, rewritten);
    }
  }
}

/** Maps a source entry (`./src/x/index.ts`) to the conditions of its built files. */
function exportConditions(sourceTarget) {
  const sourceFile = path.resolve(PACKAGE_DIR, sourceTarget);
  if (!sourceFileSet.has(sourceFile)) {
    throw new Error(`Export target ${sourceTarget} is not a published source file.`);
  }
  const types = `./${outputName(sourceFile, 'dom').replace(/\.js$/, '.d.ts')}`;
  if (!fs.existsSync(path.join(BUILD, types))) {
    throw new Error(`Missing declarations for ${sourceTarget}.`);
  }
  const server = `./server/${outputName(sourceFile, 'server')}`;
  const dom = `./dom/${outputName(sourceFile, 'dom')}`;
  return {
    types,
    solid: `./source/${outputName(sourceFile, 'source')}`,
    worker: server,
    browser: dom,
    deno: server,
    node: server,
    default: dom,
  };
}

/** Expands upstream-style `./*` patterns into one entry per published file, like code-infra. */
function buildExports() {
  const result = { './package.json': './package.json' };
  const nullPatterns = [];
  for (const [key, target] of Object.entries(packageJson.exports)) {
    if (target === null) {
      nullPatterns.push(key);
    } else if (key.includes('*')) {
      const [targetPrefix, targetSuffix] = target.split('*');
      const [keyPrefix, keySuffix] = key.split('*');
      for (const sourceFile of sourceFiles) {
        const relative = `./${toPosix(path.relative(PACKAGE_DIR, sourceFile))}`;
        if (
          relative.startsWith(targetPrefix) &&
          relative.endsWith(targetSuffix) &&
          !relative.slice(targetPrefix.length).includes('/')
        ) {
          const match = relative.slice(targetPrefix.length, relative.length - targetSuffix.length);
          const entryKey = `${keyPrefix}${match}${keySuffix}`;
          result[entryKey] ??= exportConditions(relative);
        }
      }
    } else {
      result[key] = exportConditions(target);
    }
  }
  for (const key of nullPatterns) {
    result[key] = null;
  }
  return result;
}

/** `#imports` used by the `source` build, resolved by the app's bundler per environment. */
function buildImports() {
  const imports = {};
  for (const [key, target] of Object.entries(packageJson.imports ?? {})) {
    if (key === '#test-utils') {
      continue;
    }
    const mapTarget = (value) => {
      if (typeof value === 'string') {
        return `./source/${outputName(path.resolve(PACKAGE_DIR, value), 'source')}`;
      }
      return Object.fromEntries(
        Object.entries(value).map(([condition, nested]) => [condition, mapTarget(nested)]),
      );
    };
    imports[key] = mapTarget(target);
  }
  return Object.keys(imports).length > 0 ? imports : undefined;
}

function resolveWorkspaceDependencies(dependencies) {
  if (!dependencies) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, range]) => {
      if (!range.startsWith('workspace:')) {
        return [name, range];
      }
      const workspacePackage = JSON.parse(
        fs.readFileSync(path.join(PACKAGE_DIR, 'node_modules', name, 'package.json'), 'utf8'),
      );
      const specifier = range.slice('workspace:'.length);
      const version = workspacePackage.version;
      if (specifier === '*' || specifier === '') {
        return [name, version];
      }
      if (specifier === '^' || specifier === '~') {
        return [name, `${specifier}${version}`];
      }
      return [name, specifier];
    }),
  );
}

function writePackageJson() {
  const publishedPackage = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    keywords: packageJson.keywords,
    license: packageJson.license,
    repository: packageJson.repository,
    bugs: packageJson.bugs,
    homepage: packageJson.homepage,
    sideEffects: packageJson.sideEffects,
    type: 'module',
    dependencies: resolveWorkspaceDependencies(packageJson.dependencies),
    peerDependencies: packageJson.peerDependencies,
    peerDependenciesMeta: packageJson.peerDependenciesMeta,
    publishConfig: { access: packageJson.publishConfig?.access ?? 'public' },
    imports: buildImports(),
    exports: buildExports(),
  };
  fs.writeFileSync(
    path.join(BUILD, 'package.json'),
    `${JSON.stringify(publishedPackage, null, 2)}\n`,
  );
}

function copyFiles() {
  fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(BUILD, 'LICENSE'));
  fs.copyFileSync(path.join(PACKAGE_DIR, 'README.md'), path.join(BUILD, 'README.md'));
}

const start = performance.now();
fs.mkdirSync(BUILD, { recursive: true });
buildDeclarations();
await buildJavaScript();
writePackageJson();
copyFiles();
// eslint-disable-next-line no-console
console.log(
  `Built ${packageJson.name}@${packageJson.version}: ${sourceFiles.length} modules in ${Math.round(
    performance.now() - start,
  )}ms`,
);

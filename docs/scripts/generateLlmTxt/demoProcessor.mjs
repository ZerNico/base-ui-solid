/**
 * demoProcessor.mjs - Process demo component directories
 *
 * This module handles loading and converting demo code examples
 * into markdown code blocks for documentation.
 */

import path from 'path';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as mdx from './mdxNodeHelpers.mjs';

/**
 * Transforms a Demo component into markdown code blocks
 * @param {string} mdxFilePath - Path to the MDX file containing the Demo component
 * @param {string} demoPath - Path to the demo directory
 * @returns {Promise<Array>} Array of markdown nodes to replace the Demo component
 */
export async function processDemo(mdxFilePath, demoPath) {
  // Port note: Solid's demos declare variants and highlighted files directly, without
  // upstream's webpack createDemo(url, variants) loader. Read that same file manifest.
  const mdxDir = path.dirname(mdxFilePath);
  const demoModulePath = path.resolve(mdxDir, demoPath, 'index.ts');
  const source = await readFile(demoModulePath, 'utf8');
  const tree = ts.createSourceFile(demoModulePath, source, ts.ScriptTarget.Latest, true);
  const imports = new Map();
  for (const statement of tree.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause?.name) {
      imports.set(statement.importClause.name.text, statement.moduleSpecifier.text);
    }
  }
  const codeMeta = {};
  const property = (node, name) =>
    node.properties.find((item) => item.name?.getText(tree).replace(/['"]/g, '') === name)
      ?.initializer;
  const collect = (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'createDemoWithVariants') {
      for (const variant of node.arguments[0].elements) {
        const name = property(variant, 'name').text === 'Tailwind' ? 'Tailwind' : 'CssModules';
        codeMeta[name] = Object.fromEntries(
          property(variant, 'files').properties.map((file) => [
            file.name.text,
            path.resolve(
              path.dirname(demoModulePath),
              imports.get(file.initializer.text).replace('?highlight', ''),
            ),
          ]),
        );
      }
    }
    ts.forEachChild(node, collect);
  };
  collect(tree);

  // Define implementation types and their configurations
  const implementationTypes = [
    {
      id: 'Tailwind',
      title: 'Tailwind',
      description: 'This example shows how to implement the component using Tailwind CSS.',
    },
    {
      id: 'CssModules',
      title: 'CSS Modules',
      description: 'This example shows how to implement the component using CSS Modules.',
      firstFile: 'index.module.css',
    },
  ];
  const implementationTypesMap = implementationTypes.reduce((acc, impl) => {
    acc[impl.id] = impl;
    return acc;
  }, {});

  const availableImplementations = Object.keys(codeMeta);

  // Throw error if no implementation types are found
  if (availableImplementations.length === 0) {
    throw new Error(
      `No implementation types found in "${demoModulePath}". Expected one of: ${implementationTypes.map((t) => t.id).join(', ')}`,
    );
  }

  const result = [];

  // Add main Demo heading
  result.push(mdx.heading(2, 'Demo'));

  /**
   * Process a specific implementation type
   * @param {string} variantName - Name of the variant (e.g., 'tailwind', 'css-modules')
   * @param {string | { url?: string } | undefined} variantCodeOrUrl
   * @param {string} title - Title for the section heading
   * @param {string} description - Description text for the section
   * @param {string | undefined} firstFile - Optional filename to display first
   */
  async function processImplementation(
    variantName,
    variantCodeOrUrl,
    title,
    description,
    firstFile,
  ) {
    const implementationResult = [];

    if (!variantCodeOrUrl) {
      throw new Error(`No code variant found for "${variantName}" in demo at "${demoModulePath}"`);
    }

    implementationResult.push(mdx.heading(3, title));
    implementationResult.push(mdx.paragraph(description));

    const allFiles = await Promise.all(
      Object.entries(variantCodeOrUrl).map(async ([fileName, filename]) => ({
        fileName,
        content: await readFile(filename, 'utf8'),
        extension: path.extname(fileName).slice(1),
      })),
    );

    // Reorder files if firstFile is specified
    let files = allFiles;
    if (firstFile) {
      const firstFileIndex = allFiles.findIndex((file) => file.fileName === firstFile);
      if (firstFileIndex > 0) {
        const [firstFileEntry] = allFiles.splice(firstFileIndex, 1);
        files = [firstFileEntry, ...allFiles];
      }
    }

    files.forEach(({ fileName, content, extension }) => {
      const commentedContent = `/* ${fileName} */\n${content}`;
      implementationResult.push(mdx.code(commentedContent, extension));
    });

    return implementationResult;
  }

  // Process each available implementation type
  const implementationResults = await Promise.all(
    availableImplementations.map(async (implName) => {
      const implMeta = implementationTypesMap[implName];
      if (!implMeta) {
        throw new Error(`Unknown implementation type "${implName}" in demo at "${demoModulePath}"`);
      }

      return [
        implName,
        await processImplementation(
          implName,
          codeMeta[implName],
          implMeta.title,
          implMeta.description,
          implMeta.firstFile,
        ),
      ];
    }),
  );

  const implementations = implementationResults.reduce((acc, [implName, implementationResult]) => {
    acc[implName] = implementationResult;
    return acc;
  }, {});
  implementationTypes.forEach(({ id }) => {
    if (implementations[id]) {
      result.push(...implementations[id]);
    }
  });

  return result;
}

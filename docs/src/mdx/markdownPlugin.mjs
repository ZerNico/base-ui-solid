// Port note: the generated Markdown and llms.txt files are served by `src/server.ts` (see
// `src/mdx/generatedFiles.ts`), so this plugin only rewrites docs URLs in package sources.
export function markdownPlugin() {
  return {
    name: 'docs-markdown',
    // Port note: runtime error messages from the package also contain docs URLs.
    // Keep the package independent of docs deployment configuration.
    transform(code, id) {
      if (id.includes('/packages/solid/src/')) {
        // Package sources link to the published docs (`pnpm rewrite-docs-links`). Point those links
        // at the local site, as well as any upstream link that hasn't been rewritten yet.
        return code
          .replaceAll('https://base-ui-solid.pages.dev/solid/', '/solid/')
          .replaceAll('https://base-ui.com/react/', '/solid/');
      }
      return undefined;
    },
  };
}

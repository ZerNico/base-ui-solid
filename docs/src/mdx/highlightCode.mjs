import { visitParents } from 'unist-util-visit-parents';
import { createParseSource } from '@mui/internal-docs-infra/pipeline/parseSource';
import { createEnhanceCodeEmphasis } from '@mui/internal-docs-infra/pipeline/enhanceCodeEmphasis';
import { parseImportsAndComments } from '@mui/internal-docs-infra/pipeline/loaderUtils';

const parser = createParseSource();
const emphasize = createEnhanceCodeEmphasis({ focusFramesMaxSize: 6 });
export async function highlightSource(source, fileName, language) {
  const parse = await parser;
  const parsed = parseImportsAndComments(source, `file:///docs/${fileName}`, {
    removeCommentsWithPrefix: ['@highlight', '@focus'],
    notableCommentsPrefix: ['@highlight', '@focus'],
  });
  return emphasize(parse(parsed.code ?? source, fileName, language), parsed.comments, fileName);
}
// Port note: use docs-infra's real parser/emphasis pipeline, but emit native HAST into
// Solid's MDX compiler instead of its React CodeHighlighter client and compressed props.
export function highlightCode() {
  return async (tree) => {
    const jobs = [];
    visitParents(tree, 'element', (node, ancestors) => {
      if (node.tagName !== 'code' || ancestors.at(-1)?.tagName !== 'pre') {
        return;
      }
      const language = node.properties.className
        ?.find((name) => name.startsWith('language-'))
        ?.slice(9);
      if (language) {
        ancestors.at(-1).properties.dataTitle = node.properties.dataTitle;
        const source = node.children.map((child) => child.value ?? '').join('');
        jobs.push(
          highlightSource(source, `index.${language}`, language).then((result) => {
            node.children = result.children;
          }),
        );
      }
    });
    await Promise.all(jobs);
  };
}

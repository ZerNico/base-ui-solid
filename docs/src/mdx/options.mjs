import transformMarkdownMetadata from '@mui/internal-docs-infra/pipeline/transformMarkdownMetadata';
import transformMarkdownRelativePaths from '@mui/internal-docs-infra/pipeline/transformMarkdownRelativePaths';
import transformHtmlCodeInline from '@mui/internal-docs-infra/pipeline/transformHtmlCodeInline';
import enhanceCodeInline from '@mui/internal-docs-infra/pipeline/enhanceCodeInline';
import remarkGfm from 'remark-gfm';
import remarkTypography from 'remark-typography';
import rehypeExtractToc from '@stefanprobst/rehype-extract-toc';
import transformMarkdownCode from '@mui/internal-docs-infra/pipeline/transformMarkdownCode';
import recmaSolidComponents from './recmaSolidComponents.mjs';
import remarkHeadingTags from './remarkHeadingTags.mjs';
import remarkQuickNavExcludeHeading from '../components/QuickNav/remarkQuickNavExcludeHeading.mjs';
import rehypeSlug from '../components/QuickNav/rehypeSlug.mjs';
import rehypeConcatHeadings from '../components/QuickNav/rehypeConcatHeadings.mjs';
import rehypeQuickNav from '../components/QuickNav/rehypeQuickNav.mjs';
import rehypeSubtitle from '../components/Subtitle/rehypeSubtitle.mjs';
import rehypeKbd from '../components/Kbd/rehypeKbd.mjs';
import { highlightCode } from './highlightCode.mjs';

// Port note: preserve JSX for Solid's compiler, instead of emitting React's JSX runtime calls.
/** @type {import('@mdx-js/rollup').Options} */
export const mdxOptions = {
  jsx: true,
  recmaPlugins: [recmaSolidComponents],
  jsxImportSource: '@solidjs/web',
  remarkPlugins: [
    remarkHeadingTags,
    remarkGfm,
    [transformMarkdownMetadata, { titleSuffix: ' · Base UI Solid' }],
    remarkTypography,
    remarkQuickNavExcludeHeading,
    transformMarkdownRelativePaths,
    transformMarkdownCode,
  ],
  rehypePlugins: [
    highlightCode,
    transformHtmlCodeInline,
    enhanceCodeInline,
    rehypeSlug,
    rehypeConcatHeadings,
    rehypeExtractToc,
    rehypeQuickNav,
    rehypeSubtitle,
    rehypeKbd,
  ],
};

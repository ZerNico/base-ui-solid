/// <reference types="vite/client" />
declare module '*.mdx' {
  import type { Component } from 'solid-js';

  const MDXContent: Component<{ components?: Record<string, unknown> }>;
  export const metadata: { title: string; description: string; keywords?: string[] };
  export default MDXContent;
}

declare module '*?highlight' {
  const tree: import('./components/CodeBlock/Hast').CodeNode;
  export default tree;
}

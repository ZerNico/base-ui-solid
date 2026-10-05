import type { JSX } from '@solidjs/web';
import { PackageManagerSnippetProvider } from '../blocks/PackageManagerSnippet/PackageManagerSnippetProvider';

// Port note: upstream also provides Tooltip, code component and types data contexts here. The
// Solid docs don't need them, so only the package manager preference is provided.
export function DocsProviders(props: { children: JSX.Element }) {
  return (
    <PackageManagerSnippetProvider defaultValue="npm">
      {props.children}
    </PackageManagerSnippetProvider>
  );
}

import { describe, expect, it } from 'vitest';
import { REPO_URL, REPO_BRANCH, sourceUrl } from '../../src/config.ts'; // eslint-disable-line import/extensions
import { resolveMdLink } from './resolver.mjs';

describe('Solid docs link resolution', () => {
  it('maps filesystem section links to generated Markdown', () => {
    expect(
      resolveMdLink('./accordion/page.mdx', {
        urlPath: '/solid/components',
        urlsWithMdVersion: new Set(['/solid/components/accordion']),
      }),
    ).toBe('/solid/components/accordion.md');
  });
  it('preserves fragments when linking to Markdown and within a page', () => {
    const options = {
      urlPath: '/solid/components/input',
      urlsWithMdVersion: new Set(['/solid/components/field']),
    };
    expect(resolveMdLink('/solid/components/field#root', options)).toBe(
      '/solid/components/field.md#root',
    );
    expect(resolveMdLink('#api-reference', options)).toBe('#api-reference');
  });
  it('retains legitimate upstream release URLs', () => {
    const link = 'https://github.com/mui/base-ui/pull/1187';
    expect(resolveMdLink(link, { urlPath: '/solid/overview/releases' })).toBe(link);
  });
  it('maps React package source paths to the configured Solid repository', () => {
    expect(sourceUrl('packages/react/src/accordion/root/AccordionRoot.tsx')).toBe(
      `${REPO_URL}/blob/${REPO_BRANCH}/packages/solid/src/accordion/root/AccordionRoot.tsx`,
    );
    expect(sourceUrl('docs/src/app/(docs)/solid/components/accordion/page.mdx')).toBe(
      `${REPO_URL}/blob/${REPO_BRANCH}/docs/src/app/(docs)/solid/components/accordion/page.mdx`,
    );
  });
});

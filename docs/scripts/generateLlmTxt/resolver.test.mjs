import { describe, expect, it } from 'vitest';
import { REPO_URL, REPO_BRANCH, sourceUrl } from '../../src/config.ts'; // eslint-disable-line import/extensions
import { resolveMdLink } from './resolver.mjs';

describe('Solid docs link resolution', () => {
  it('maps filesystem section links to generated Markdown', () => {
    expect(
      resolveMdLink('./accordion/page.mdx', {
        urlPath: '/react/components',
        urlsWithMdVersion: new Set(['/react/components/accordion']),
      }),
    ).toBe('/react/components/accordion.md');
  });
  it('preserves fragments when linking to Markdown and within a page', () => {
    const options = {
      urlPath: '/react/components/input',
      urlsWithMdVersion: new Set(['/react/components/field']),
    };
    expect(resolveMdLink('/react/components/field#root', options)).toBe(
      '/react/components/field.md#root',
    );
    expect(resolveMdLink('#api-reference', options)).toBe('#api-reference');
  });
  it('retains legitimate upstream release URLs', () => {
    const link = 'https://github.com/mui/base-ui/pull/1187';
    expect(resolveMdLink(link, { urlPath: '/react/overview/releases' })).toBe(link);
  });
  it('maps React package source paths to the configured Solid repository', () => {
    expect(sourceUrl('packages/react/src/accordion/root/AccordionRoot.tsx')).toBe(
      `${REPO_URL}/blob/${REPO_BRANCH}/packages/solid/src/accordion/root/AccordionRoot.tsx`,
    );
    expect(sourceUrl('docs/src/app/(docs)/react/components/accordion/page.mdx')).toBe(
      `${REPO_URL}/blob/${REPO_BRANCH}/docs/src/app/(docs)/react/components/accordion/page.mdx`,
    );
  });
});

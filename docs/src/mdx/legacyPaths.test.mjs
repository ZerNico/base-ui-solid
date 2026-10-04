import { describe, expect, it } from 'vitest';
import { legacyPath } from './legacyPaths.mjs';

// Port note: permanent Solid URL migration has no upstream counterpart.
describe('legacyPath', () => {
  it.each([
    ['/react', '/solid'],
    ['/react/', '/solid/'],
    ['/react/overview/quick-start', '/solid/overview/quick-start'],
    ['/react/handbook/forms', '/solid/handbook/forms'],
    ['/react/components/accordion', '/solid/components/accordion'],
    ['/react/utils/merge-props.md', '/solid/utils/merge-props.md'],
    ['/react/components/radio', '/solid/components/radio-group'],
    ['/react/components/radio/', '/solid/components/radio-group/'],
  ])('redirects %s to %s', (source, target) => {
    expect(legacyPath(source)).toBe(target);
  });

  it.each(['/solid/components/accordion', '/reaction', '/reactive/example', '/'])(
    'leaves %s unchanged',
    (source) => {
      expect(legacyPath(source)).toBeUndefined();
    },
  );
});

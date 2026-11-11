import { afterEach, expect, vi, describe, it } from 'vitest';
import { isJSDOM } from '#test-utils';

describe('NavigationMenuRootContext', () => {
  afterEach(() => {
    vi.doUnmock('@base-ui-solid/utils/isDev');
    vi.resetModules();
  });

  it('sets a development display name', async () => {
    // Port note: the port's IS_DEV comes from Solid's build, and the tests run Solid's development
    // build, so it's already true. Mocking it here fails in Vitest's browser mode, which can't mock
    // a module the setup file already imported.
    vi.resetModules();
    const { NavigationMenuRootContext } = await import('./NavigationMenuRootContext');
    expect((NavigationMenuRootContext as { displayName?: string }).displayName).toBe(
      'NavigationMenuRootContext',
    );
  });

  it.skipIf(!isJSDOM)('omits the display name in production', async () => {
    vi.doMock('@base-ui-solid/utils/isDev', () => ({ IS_DEV: false }));
    vi.resetModules();
    const { NavigationMenuRootContext } = await import('./NavigationMenuRootContext');
    expect((NavigationMenuRootContext as { displayName?: string }).displayName).toBe(undefined);
  });
});

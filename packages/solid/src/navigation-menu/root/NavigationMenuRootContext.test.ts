import { afterEach, expect, vi, describe, it } from 'vitest';
import { isJSDOM } from '#test-utils';

describe('NavigationMenuRootContext', () => {
  afterEach(() => {
    vi.doUnmock('@base-ui-solid/utils/isDev');
    vi.resetModules();
  });

  it('sets a development display name', async () => {
    // Port note: the port's IS_DEV is a build constant, so mock the module rather than NODE_ENV.
    vi.doMock('@base-ui-solid/utils/isDev', () => ({ IS_DEV: true }));
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

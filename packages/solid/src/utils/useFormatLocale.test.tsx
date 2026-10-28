import { expect, describe, it } from 'vitest';
import { render, renderToString, screen, waitFor } from '#test-utils';
import { TestComponent } from './useFormatLocale.fixtures';

// Port note: `TestComponent` lives in `useFormatLocale.fixtures.tsx` so it can be rendered on the
// server by `renderToString`. It renders the locale it gets (`undefined` for the runtime locale)
// instead of recording each render.
describe('useFormatLocale', () => {
  it('returns the runtime locale on the first client-only render', async () => {
    await render(() => <TestComponent />);

    expect(screen.getByTestId('locale')).toHaveTextContent('undefined');
  });

  it.each([
    { name: 'en-US until hydrated without a locale', locale: undefined, hydrated: undefined },
    { name: 'the passed locale while hydrating', locale: 'fr-FR', hydrated: 'fr-FR' },
  ])('returns $name', async ({ locale, hydrated }) => {
    const hydrating = locale ?? 'en-US';

    const { hydrate } = await renderToString(TestComponent, locale ? { locale } : {});
    expect(screen.getByTestId('locale')).toHaveTextContent(hydrating);

    await hydrate();
    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent(String(hydrated));
    });
  });
});

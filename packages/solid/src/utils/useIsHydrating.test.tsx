import { expect, describe, it } from 'vitest';
import { render, renderToString, screen, waitFor } from '#test-utils';
import { TestComponent } from './useIsHydrating.fixtures';

describe('useIsHydrating', () => {
  // Port note: `TestComponent` lives in `useIsHydrating.fixtures.tsx` so it can be rendered on
  // the server by `renderToString`.

  it('returns false for client-only mounts', async () => {
    await render(() => <TestComponent />);

    expect(screen.getByTestId('value')).toHaveTextContent('false');
  });

  it('returns true before hydration for server-rendered markup', async () => {
    await renderToString(TestComponent);

    expect(screen.getByTestId('value')).toHaveTextContent('true');
  });

  it('switches to false after hydration completes', async () => {
    const { hydrate } = await renderToString(TestComponent);

    expect(screen.getByTestId('value')).toHaveTextContent('true');

    hydrate();

    await waitFor(() => {
      expect(screen.getByTestId('value')).toHaveTextContent('false');
    });
  });
});

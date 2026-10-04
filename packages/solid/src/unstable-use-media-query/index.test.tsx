import { describe, it, expect } from 'vitest';
import { flushMicrotasks, render, renderToString, screen } from '#test-utils';
import { useMediaQuery } from '.';
import { NoSsrTest, SsrMatchMediaTest } from './index.fixtures';

function createMatchMedia(initialMatches: boolean) {
  const listeners = new Set<() => void>();
  const mediaQueryList = {
    matches: initialMatches,
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };
  const matchMedia = vi.fn(() => mediaQueryList) as unknown as typeof window.matchMedia;

  return {
    matchMedia,
    listeners,
    setMatches(matches: boolean) {
      mediaQueryList.matches = matches;
      listeners.forEach((listener) => listener());
    },
  };
}

describe('useMediaQuery', () => {
  function Test(props: { query: string; options: useMediaQuery.Options }) {
    const matches = useMediaQuery(
      () => props.query,
      () => props.options,
    );
    return <span data-testid="result">{String(matches())}</span>;
  }

  it('returns defaultMatches when matchMedia is unavailable', async () => {
    await render(() => <Test query="(min-width: 600px)" options={{ matchMedia: null! }} />);

    expect(screen.getByTestId('result')).toHaveTextContent('false');

    await render(() => (
      <Test query="(min-width: 600px)" options={{ matchMedia: null!, defaultMatches: true }} />
    ));

    expect(screen.getAllByTestId('result')[1]).toHaveTextContent('true');
  });

  it('subscribes to the provided matchMedia and updates on change', async () => {
    const media = createMatchMedia(false);

    const { unmount } = await render(() => (
      <Test query="@media (min-width: 600px)" options={{ matchMedia: media.matchMedia }} />
    ));

    expect(media.matchMedia).toHaveBeenCalledWith('(min-width: 600px)');
    expect(screen.getByTestId('result')).toHaveTextContent('false');

    media.setMatches(true);
    await flushMicrotasks();

    expect(screen.getByTestId('result')).toHaveTextContent('true');

    unmount();

    expect(media.listeners.size).toBe(0);
  });

  it('uses ssrMatchMedia for the server snapshot', async () => {
    const { container } = await renderToString(SsrMatchMediaTest, {
      query: '(min-width: 600px)',
    });

    // Port note: the server-side `ssrMatchMedia` calls are recorded by the fixture (see
    // `index.fixtures.tsx`) instead of a spy.
    expect(container.firstElementChild).toHaveAttribute(
      'data-ssr-match-media-calls',
      '(min-width: 600px)',
    );
    expect(container.firstElementChild).toHaveTextContent('true');
  });

  it('uses the client matchMedia result as the server snapshot when noSsr is set', async () => {
    const { container: withNoSsr } = await renderToString(NoSsrTest, {
      query: '(min-width: 600px)',
      matches: true,
      defaultMatches: false,
      noSsr: true,
    });

    expect(withNoSsr.firstElementChild).toHaveTextContent('true');

    const { container: withoutNoSsr } = await renderToString(NoSsrTest, {
      query: '(min-width: 600px)',
      matches: true,
      defaultMatches: false,
    });

    expect(withoutNoSsr.firstElementChild).toHaveTextContent('false');
  });
});

import { createMemo, createSignal, isHydrating } from 'solid-js';
import type { Accessor } from 'solid-js';
import { isServer } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

/**
 * Port note: `query` and `options` are accessors and the result is an accessor, so the hook
 * follows changes to them. React's `useSyncExternalStore` is replaced by a `change` listener that
 * re-reads `matches`; on the server (and while hydrating) the server snapshot is returned.
 */
export function useMediaQuery(
  query: Accessor<string>,
  options: Accessor<useMediaQuery.Options>,
): Accessor<boolean> {
  // Wait for jsdom to support the match media feature.
  // All the browsers Base UI support have this built-in.
  // This defensive check is here for simplicity.
  // Most of the time, the match media logic isn't central to people's tests.
  const supportMatchMedia =
    typeof window !== 'undefined' && typeof window.matchMedia !== 'undefined';

  const normalizedQuery = createMemo(() => query().replace(/^@media( ?)/m, ''));

  const defaultMatches = () => options().defaultMatches ?? false;
  const matchMedia = () => {
    const matchMediaOption = options().matchMedia;
    if (matchMediaOption !== undefined) {
      return matchMediaOption;
    }
    return supportMatchMedia ? window.matchMedia : null;
  };
  const ssrMatchMedia = () => options().ssrMatchMedia ?? null;
  const noSsr = () => options().noSsr ?? false;

  const getServerSnapshot = createMemo(() => {
    const currentMatchMedia = matchMedia();
    const currentSsrMatchMedia = ssrMatchMedia();

    if (noSsr() && currentMatchMedia) {
      return currentMatchMedia(normalizedQuery()).matches;
    }

    if (currentSsrMatchMedia !== null) {
      const { matches } = currentSsrMatchMedia(normalizedQuery());
      return matches;
    }
    return defaultMatches();
  });

  // Port note: allocate identical reactive scopes on server and client for hydration ids.

  const mediaQueryList = createMemo(() => {
    const currentMatchMedia = matchMedia();
    if (currentMatchMedia === null) {
      return null;
    }

    return currentMatchMedia(normalizedQuery());
  });

  // Bumped by the `change` listener, since `MediaQueryList.matches` isn't reactive.
  const [version, setVersion] = createSignal(0);
  // Like `useSyncExternalStore`, render the server snapshot while hydrating.
  const [hydrated, setHydrated] = createSignal(!isHydrating());

  useIsoLayoutEffect(
    ([currentMediaQueryList]) => {
      if (currentMediaQueryList === null) {
        return undefined;
      }

      return addEventListener(currentMediaQueryList, 'change', () => {
        setVersion((previous) => previous + 1);
      });
    },
    () => [mediaQueryList()],
  );

  useIsoLayoutEffect(
    () => {
      setHydrated(true);
    },
    () => [],
  );

  const match = createMemo(() => {
    version();
    if (isServer || !hydrated()) {
      return getServerSnapshot();
    }

    const currentMediaQueryList = mediaQueryList();
    return currentMediaQueryList === null ? defaultMatches() : currentMediaQueryList.matches;
  });

  return match;
}

export interface UseMediaQueryOptions {
  /**
   * As `window.matchMedia()` is unavailable on the server,
   * it returns a default matches during the first mount.
   * @default false
   */
  defaultMatches?: boolean | undefined;
  /**
   * You can provide your own implementation of matchMedia.
   * This can be used for handling an iframe content window.
   */
  matchMedia?: typeof window.matchMedia | undefined;
  /**
   * To perform the server-side hydration, the hook needs to render twice.
   * A first time with `defaultMatches`, the value of the server, and a second time with the resolved value.
   * This double pass rendering cycle comes with a drawback: it's slower.
   * You can set this option to `true` if you use the returned value **only** client-side.
   * @default false
   */
  noSsr?: boolean | undefined;
  /**
   * You can provide your own implementation of `matchMedia`, it's used when rendering server-side.
   */
  ssrMatchMedia?: ((query: string) => { matches: boolean }) | undefined;
}

export interface UseMediaQueryState {}

export namespace useMediaQuery {
  export type State = UseMediaQueryState;
  export type Options = UseMediaQueryOptions;
}

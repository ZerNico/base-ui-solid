import type { Accessor } from 'solid-js';
import { useIsHydrating } from './useIsHydrating';

/**
 * The server can't know the visitor's locale, so format with a fixed one until hydration finishes.
 * The server markup then matches the hydration render, and the visitor's locale is applied after.
 *
 * Port note: takes and returns accessors. Upstream's React 17 fallback doesn't apply.
 */
export function useFormatLocale(
  locale: Accessor<Intl.LocalesArgument | undefined>,
): Accessor<Intl.LocalesArgument | undefined> {
  const isHydrating = useIsHydrating();
  return () => locale() ?? (isHydrating() ? 'en-US' : undefined);
}

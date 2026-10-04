import { EMPTY_ARRAY } from './empty';
import { useEffect } from './useIsoLayoutEffect';

/**
 * A React.useEffect equivalent that runs once, when the component is mounted.
 *
 * Port note: runs in Solid's effect phase after the first render; the returned cleanup runs when
 * the owner is disposed.
 */
export function useOnMount(fn: () => void | (() => void)) {
  useEffect(fn, () => EMPTY_ARRAY);
}

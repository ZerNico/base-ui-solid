import { onCleanup, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from './refObject';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';

type Empty = null | undefined;
type Cleanup = () => void;
/**
 * Port note: a Solid ref: a callback (which may return a cleanup, like React 19 ref callbacks),
 * a ref object, or an array of refs (Solid's composed `ref={[a, b]}` form).
 */
type RefCallback<I> = (instance: I) => void | Cleanup;
type InputRef<I> = RefCallback<I> | RefObject<I | null> | ReadonlyArray<InputRef<I>> | Empty;
type Result<I> = (instance: I | null) => void;

/**
 * Merges refs into a single callback ref.
 * This makes sure multiple refs are updated together and have the same value.
 *
 * This function accepts up to four refs. If you need to merge more, or have an unspecified number of refs to merge,
 * use `useMergedRefsN` instead.
 *
 * Port note: each ref is passed as an accessor (`useMergedRefs(() => props.ref, () => localRef)`),
 * because the hook runs once. The returned callback is stable (upstream returns `null` when every
 * ref is empty). When the refs change while an element is attached, the previous refs are
 * detached and the new ones attached, like React does when the merged callback changes. Solid
 * doesn't call refs with `null` when an element is removed, so the refs are also detached when the
 * owner is disposed.
 */
export function useMergedRefs<I>(a: Accessor<InputRef<I>>, b: Accessor<InputRef<I>>): Result<I>;
export function useMergedRefs<I>(
  a: Accessor<InputRef<I>>,
  b: Accessor<InputRef<I>>,
  c: Accessor<InputRef<I>>,
): Result<I>;
export function useMergedRefs<I>(
  a: Accessor<InputRef<I>>,
  b: Accessor<InputRef<I>>,
  c: Accessor<InputRef<I>>,
  d: Accessor<InputRef<I>>,
): Result<I>;
export function useMergedRefs<I>(
  a: Accessor<InputRef<I>>,
  b: Accessor<InputRef<I>>,
  c?: Accessor<InputRef<I>>,
  d?: Accessor<InputRef<I>>,
): Result<I> {
  return useForkRef(() => [a(), b(), c?.(), d?.()]);
}

/**
 * Merges an array of refs into a single callback ref.
 *
 * If you need to merge a fixed number (up to four) of refs, use `useMergedRefs` instead for better performance.
 *
 * Port note: takes an accessor returning the refs (see {@link useMergedRefs}).
 */
export function useMergedRefsN<I>(refs: Accessor<InputRef<I>[]>): Result<I> {
  return useForkRef(refs);
}

function useForkRef<I>(getRefs: Accessor<InputRef<I>[]>): Result<I> {
  let instance: I | null = null;
  let attachedRefs: InputRef<I>[] | null = null;
  let cleanup: Cleanup | null = null;

  const callback = (nextInstance: I | null) => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    instance = nextInstance;
    attachedRefs = null;

    if (nextInstance != null) {
      const refs = untrack(getRefs);
      attachedRefs = refs;
      const cleanupCallbacks = refs.map((ref) => attachRef(ref, nextInstance));

      cleanup = () => {
        for (const cleanupCallback of cleanupCallbacks) {
          cleanupCallback?.();
        }
      };
    }
  };

  useIsoLayoutEffect(
    (refs) => {
      if (instance != null && attachedRefs !== null && didChange(attachedRefs, refs)) {
        callback(instance);
      }
    },
    () => getRefs(),
  );

  onCleanup(() => {
    callback(null);
  });

  return callback;
}

function didChange<I>(previousRefs: InputRef<I>[], nextRefs: readonly InputRef<I>[]) {
  return (
    previousRefs.length !== nextRefs.length ||
    previousRefs.some((ref, index) => ref !== nextRefs[index])
  );
}

function attachRef<I>(ref: InputRef<I>, instance: I): Cleanup | null {
  if (ref == null) {
    return null;
  }

  if (Array.isArray(ref)) {
    const cleanupCallbacks = ref.map((item) => attachRef(item, instance));
    return () => {
      for (const cleanupCallback of cleanupCallbacks) {
        cleanupCallback?.();
      }
    };
  }

  switch (typeof ref) {
    case 'function': {
      const refCleanup = (ref as RefCallback<I>)(instance);
      if (typeof refCleanup === 'function') {
        return refCleanup;
      }
      // Legacy ref with no attach-time cleanup: detach by calling it with `null`.
      return () => {
        void (ref as RefCallback<I | null>)(null);
      };
    }
    case 'object': {
      const refObject = ref as RefObject<I | null>;
      refObject.current = instance;
      return () => {
        refObject.current = null;
      };
    }
    default:
      return null;
  }
}

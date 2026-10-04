/* Port note: TanStack exposes lifecycle methods with underscore names. */
/* eslint-disable no-underscore-dangle */
// Port note: adapt TanStack's framework-neutral virtualizer lifecycle to Solid 2.
import { createSignal, onSettled, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  Virtualizer,
  elementScroll,
  observeElementRect,
  observeElementOffset,
} from '@tanstack/virtual-core';
import type { VirtualizerOptions } from '@tanstack/virtual-core';

export function useVirtualizer<T extends Element, I extends Element>(
  options: Omit<
    VirtualizerOptions<T, I>,
    'scrollToFn' | 'observeElementRect' | 'observeElementOffset'
  >,
) {
  const [version, setVersion] = createSignal(0, { ownedWrite: true });
  const resolved = () => ({
    ...options,
    scrollToFn: elementScroll,
    observeElementRect,
    observeElementOffset,
    onChange: () => setVersion((previous) => previous + 1),
  });
  const instance = new Virtualizer<T, I>(untrack(resolved));
  onSettled(() => {
    const cleanup = instance._didMount();
    instance._willUpdate();
    return cleanup;
  });
  useIsoLayoutEffect(
    () => {
      instance.setOptions(resolved());
      instance._willUpdate();
    },
    () => [options.count, options.enabled, options.getScrollElement()],
  );
  return new Proxy(instance, {
    get(target, key) {
      version();
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

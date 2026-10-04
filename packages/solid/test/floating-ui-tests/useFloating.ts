import { createMemo, createSignal } from 'solid-js';
import { isElement } from '@floating-ui/utils/dom';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useBaseUIFloating } from '../../src/floating-ui-solid/hooks/useFloating';
import { useFloatingRootContext } from '../../src/floating-ui-solid/hooks/useFloatingRootContext';
import type {
  NarrowedElement,
  ReferenceType,
  UseFloatingOptions,
  UseFloatingReturn,
} from '../../src/floating-ui-solid/types';

/**
 * Floating UI's public `useFloating`: `refs.setReference` and `refs.setFloating` also register the
 * elements in the root store. Base UI components hand their elements to the store directly, so
 * only the ported Floating UI tests use this.
 *
 * Port note: `options` is read lazily (pass getters for reactive options, e.g. `open`), and
 * `rootContext` is read once. The returned object is reactive (see `useBaseUIFloating`).
 */
export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const internalStore = useFloatingRootContext(options);
  const store = options.rootContext || internalStore;
  const domReferenceElement = store.useState('domReferenceElement');

  const [localDomReference, setLocalDomReference] = createSignal<
    NarrowedElement<ReferenceType> | null | undefined
  >(undefined, { ownedWrite: true });
  const [localFloatingElement, setLocalFloatingElement] = createSignal<
    HTMLElement | null | undefined
  >(undefined, { ownedWrite: true });

  const localDomReferenceElement = createMemo(() => {
    const reference = localDomReference();
    return isElement(reference) ? (reference as Element) : null;
  });

  const syncedFloatingElement = createMemo(() => {
    const floating = localFloatingElement();
    return floating === undefined ? store.state.floatingElement : floating;
  });

  store.useSyncedValue('referenceElement', () => localDomReference() ?? null);
  store.useSyncedValue('domReferenceElement', () =>
    localDomReference() === undefined ? domReferenceElement() : localDomReferenceElement(),
  );
  store.useSyncedValue('floatingElement', syncedFloatingElement);

  const floating = useBaseUIFloating(
    new Proxy(options, {
      get(target, key, receiver) {
        if (key === 'rootContext') {
          return store;
        }
        return Reflect.get(target, key, receiver);
      },
    }) as UseFloatingOptions & { rootContext: typeof store },
  );
  const baseRefs = floating.refs;

  const setReference = (node: ReferenceType | null) => {
    if (isElement(node) || node === null) {
      (baseRefs.domReference as RefObject<Element | null>).current = node;
      setLocalDomReference(() => node as NarrowedElement<ReferenceType> | null);
    }

    // Backwards-compatibility for passing a virtual element to `reference`
    // after it has set the DOM reference.
    if (
      isElement(baseRefs.reference.current) ||
      baseRefs.reference.current === null ||
      // Don't allow setting virtual elements using the old technique back to
      // `null` to support `positionReference` + an unstable `reference`
      // callback ref.
      (node !== null && !isElement(node))
    ) {
      baseRefs.setReference(node);
    }
  };

  const setFloating = (node: HTMLElement | null) => {
    setLocalFloatingElement(() => node);
    baseRefs.setFloating(node);
  };

  const refs = { ...baseRefs, setReference, setFloating };

  // Port note: the context and the return value keep `floating`'s getters.
  const context = Object.create(floating.context, {
    refs: { value: refs, enumerable: true },
    // Port note: this test helper owns a stable store, so hooks may read it during setup.
    rootStore: { value: store, enumerable: true },
  }) as UseFloatingReturn['context'];

  return Object.create(floating, {
    refs: { value: refs, enumerable: true },
    // Port note: this test helper owns a stable store, so hooks may read it during setup.
    rootStore: { value: store, enumerable: true },
    context: { value: context, enumerable: true },
  }) as UseFloatingReturn;
}

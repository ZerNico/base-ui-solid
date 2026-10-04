import { untrack } from 'solid-js';
import { isElement } from '@floating-ui/utils/dom';
import { useId } from '@base-ui-solid/utils/useId';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { PopupTriggerMap } from '../../utils/popups';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { useFloatingParentNodeId } from '../components/FloatingTree';
import { FloatingRootStore } from '../components/FloatingRootStore';
import type { FloatingRootState as State } from '../components/FloatingRootStore';
import type { ReferenceType } from '../types';

/**
 * Port note: read lazily like Solid props (`options.open`), so pass a props-like object with
 * getters for reactive options.
 */
export interface UseFloatingRootContextOptions {
  open?: boolean | undefined;
  onOpenChange?(open: boolean, eventDetails: BaseUIChangeEventDetails<string>): void;
  elements?:
    | {
        reference?: ReferenceType | null | undefined;
        floating?: HTMLElement | null | undefined;
      }
    | undefined;
}

export function useFloatingRootContext(options: UseFloatingRootContextOptions): FloatingRootStore {
  const open = () => options.open ?? false;
  const elements = () => options.elements ?? {};

  const floatingId = useId();
  const nested = useFloatingParentNodeId() != null;

  if (IS_DEV) {
    useIsoLayoutEffect(
      ([optionDomReference]) => {
        if (optionDomReference && !isElement(optionDomReference)) {
          console.error(
            'Cannot pass a virtual element to the `elements.reference` option,',
            'as it must be a real DOM element. Use `context.setPositionReference()`',
            'instead.',
          );
        }
      },
      () => [elements().reference],
    );
  }

  const store = untrack(
    () =>
      new FloatingRootStore({
        open: open(),
        transitionStatus: undefined,
        // Port note: reads the latest `onOpenChange` (see the context getter below).
        onOpenChange: undefined,
        referenceElement: elements().reference ?? null,
        floatingElement: elements().floating ?? null,
        triggerElements: new PopupTriggerMap(),
        floatingId,
        syncOnly: false,
        nested,
      }),
  );

  useIsoLayoutEffect(
    ([openValue, floatingIdValue, reference, floating]) => {
      const valuesToSync = { open: openValue, floatingId: floatingIdValue } as Pick<
        State,
        'open' | 'floatingId' | 'referenceElement' | 'domReferenceElement' | 'floatingElement'
      >;

      if (reference !== undefined) {
        valuesToSync.referenceElement = reference;
        valuesToSync.domReferenceElement = isElement(reference) ? reference : null;
      }

      if (floating !== undefined) {
        valuesToSync.floatingElement = floating;
      }

      store.update(valuesToSync);
    },
    () => [open(), floatingId, elements().reference, elements().floating, store] as const,
  );

  // Port note: upstream assigns the latest `onOpenChange` on every render.
  Object.defineProperty(store.context, 'onOpenChange', {
    get() {
      return options.onOpenChange;
    },
    set(value) {
      Object.defineProperty(store.context, 'onOpenChange', {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    },
    configurable: true,
    enumerable: true,
  });
  store.context.nested = nested;

  return store;
}

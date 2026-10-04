import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { usePreviewCardRootContext } from '../root/PreviewCardContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { PreviewCardHandle } from '../store/PreviewCardHandle';
import type { PreviewCardHandleStore } from '../store/PreviewCardStore';
import {
  getInlineRectTriggerProps,
  usePopupHandleStore,
  useTriggerDataForwarding,
} from '../../utils/popups';
import { CLOSE_DELAY, OPEN_DELAY } from '../utils/constants';
import { safePolygon, useFocus, useHoverReferenceInteraction } from '../../floating-ui-solid';

/**
 * A link that opens the preview card.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardTrigger<Payload>(
  componentProps: PreviewCardTrigger.Props<Payload>,
): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'delay',
    'closeDelay',
    'id',
    'payload',
    'handle',
    'style',
  );

  const rootContext = usePreviewCardRootContext(true);
  // Port note: `usePopupHandleStore` reads its handle once, so it's recreated (with its
  // subscription) when the `handle` prop changes, like upstream re-subscribing to the new handle.
  const handleStoreAccessor = createMemo(() => usePopupHandleStore(componentProps.handle));
  const handleStore = () => handleStoreAccessor()();
  if (!untrack(handleStore) && !rootContext) {
    throw new Error(
      'Base UI: <PreviewCard.Trigger> must be either used within a <PreviewCard.Root> component or provided with a handle.',
    );
  }
  const store = createMemo(() => (handleStore() ?? rootContext) as PreviewCardHandleStore<Payload>);

  const generatedId = useBaseUiId();
  const thisTriggerId = createMemo(() => (componentProps.id as string | undefined) ?? generatedId);

  const triggerElementRef: RefObject<Element | null> = { current: null };

  const delayWithDefault = () => componentProps.delay ?? OPEN_DELAY;
  const closeDelayWithDefault = () => componentProps.closeDelay ?? CLOSE_DELAY;

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    () => ({
      payload: componentProps.payload,
      closeDelay: closeDelayWithDefault(),
    }),
  );

  // Port note: a detached trigger follows its handle's store, which changes when a root attaches
  // or detaches. Upstream re-renders and its hooks pick up the new store's floating root context;
  // here the hooks bound to a store are created per store, and disposed when it changes.
  const storeParts = createMemo(() => {
    const currentStore = store();
    return untrack(() => useStoreParts(currentStore));
  });

  function useStoreParts(currentStore: PreviewCardHandleStore<Payload>) {
    const isTriggerActive = currentStore.useState('isTriggerActive', thisTriggerId);
    const isOpenedByThisTrigger = currentStore.useState('isOpenedByTrigger', thisTriggerId);
    // Port note: a store's floating root context never changes.
    const floatingRootContext = currentStore.select('floatingRootContext');
    const inlineRectCoordsRef = currentStore.context.inlineRectCoordsRef;

    const hoverProps = useHoverReferenceInteraction(floatingRootContext, {
      mouseOnly: true,
      move: false,
      handleClose: safePolygon(),
      delay: () => ({ open: delayWithDefault(), close: closeDelayWithDefault() }),
      triggerElementRef,
      get isActiveTrigger() {
        return isTriggerActive();
      },
      isClosing: () => currentStore.select('transitionStatus') === 'ending',
    });

    const focusProps = useFocus(floatingRootContext, {
      get delay() {
        return delayWithDefault();
      },
    });

    const rootTriggerProps = currentStore.useState('triggerProps', isMountedByThisTrigger);
    const inlineRectTriggerProps = getInlineRectTriggerProps(
      inlineRectCoordsRef,
      isOpenedByThisTrigger,
    );

    return {
      isOpenedByThisTrigger,
      hoverProps,
      focusProps,
      rootTriggerProps,
      inlineRectTriggerProps,
    };
  }

  const state = createMemo<PreviewCardTriggerState>(() => ({
    open: storeParts().isOpenedByThisTrigger(),
  }));

  return useRenderElement('a', componentProps, {
    state,
    ref: [
      registerTrigger,
      (element: Element | null) => {
        triggerElementRef.current = element;
      },
    ],
    props: () => {
      const parts = storeParts();
      return [
        parts.hoverProps(),
        parts.focusProps.reference,
        parts.rootTriggerProps(),
        parts.inlineRectTriggerProps,
        { id: thisTriggerId() },
        elementProps,
      ];
    },
    stateAttributesMapping: triggerOpenStateMapping,
  });
}

export interface PreviewCardTriggerState {
  /**
   * Whether the preview card is currently open and was opened by this trigger.
   */
  open: boolean;
}

export interface PreviewCardTriggerProps<Payload = unknown> extends BaseUIComponentProps<
  'a',
  PreviewCardTriggerState,
  JSX.IntrinsicElements['a']
> {
  /**
   * A handle to associate the trigger with a preview card.
   */
  handle?: PreviewCardHandle<Payload> | undefined;
  /**
   * A payload to pass to the preview card when it is opened.
   */
  payload?: Payload | undefined;
  /**
   * How long to wait before the preview card opens. Specified in milliseconds.
   * @default 600
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the preview card. Specified in milliseconds.
   * @default 300
   */
  closeDelay?: number | undefined;
}

export namespace PreviewCardTrigger {
  export type State = PreviewCardTriggerState;
  export type Props<Payload = unknown> = PreviewCardTriggerProps<Payload>;
}

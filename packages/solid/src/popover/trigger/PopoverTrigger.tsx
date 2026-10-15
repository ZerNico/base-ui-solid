import { createMemo, createRoot, flatten, omit, onCleanup, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useButton } from '../../internals/use-button/useButton';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import {
  triggerOpenStateMapping,
  pressableTriggerOpenStateMapping,
} from '../../utils/popupStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { CLICK_TRIGGER_IDENTIFIER } from '../../internals/constants';
import { safePolygon, useClick, useHoverReferenceInteraction } from '../../floating-ui-solid';
import { OPEN_DELAY } from '../utils/constants';
import type { PopoverHandle } from '../store/PopoverHandle';
import type { PopoverHandleStore } from '../store/PopoverStore';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { FocusGuard } from '../../utils/FocusGuard';
import { usePopupHandleStore, useTriggerDataForwarding } from '../../utils/popups';
import { useTriggerFocusGuards } from '../../utils/popups/useTriggerFocusGuards';
import { useOpenMethodTriggerProps } from '../../utils/useOpenInteractionType';

/**
 * A button that opens the popover.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverTrigger<Payload>(componentProps: PopoverTrigger.Props<Payload>) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'disabled',
    'nativeButton',
    'handle',
    'payload',
    'openOnHover',
    'delay',
    'closeDelay',
    'id',
  );

  const disabled = () => componentProps.disabled ?? false;
  const nativeButton = () => componentProps.nativeButton ?? true;
  const openOnHover = () => componentProps.openOnHover ?? false;
  const delay = () => componentProps.delay ?? OPEN_DELAY;
  const closeDelay = () => componentProps.closeDelay ?? 0;

  const rootStore = usePopoverRootContext(true);
  // Port note: `usePopupHandleStore` reads its handle once, so it's recreated (with its
  // subscription) when the `handle` prop changes, like upstream re-subscribing to the new handle.
  const handleStoreAccessor = createMemo(() => usePopupHandleStore(componentProps.handle));
  const handleStore = () => handleStoreAccessor()();
  // Port note: a detached trigger follows the store its handle exposes, so the store is an
  // accessor (upstream re-renders with the new store).
  const store: Accessor<PopoverHandleStore<unknown>> = createMemo(
    () => handleStore() ?? rootStore!,
  );
  if (!untrack(store)) {
    throw new Error(
      'Base UI: <Popover.Trigger> must be either used within a <Popover.Root> component or provided with a handle.',
    );
  }

  const useStoreState = createStoreStateReader(store);

  const generatedId = useBaseUiId();
  const thisTriggerId = () => componentProps.id ?? generatedId;
  const isTriggerActive = useStoreState('isTriggerActive', thisTriggerId);
  const floatingContext = useStoreState('floatingRootContext');
  const isOpenedByThisTrigger = useStoreState('isOpenedByTrigger', thisTriggerId);
  const popupId = useStoreState('triggerPopupId', thisTriggerId);

  const triggerElementRef: RefObject<HTMLElement | null> = { current: null };

  const { registerTrigger, isMountedByThisTrigger } = useTriggerDataForwarding(
    thisTriggerId,
    triggerElementRef,
    store,
    () => ({
      payload: componentProps.payload,
      disabled: disabled(),
      openOnHover: openOnHover(),
      closeDelay: closeDelay(),
    }),
  );

  const isPressOpenedByThisTrigger = useStoreState('isPressOpenedByTrigger', thisTriggerId);
  const isTouchPressOpen = useStoreState('isTouchPressOpen', openOnHover);
  const hasFocusGuards = useStoreState('hasTriggerFocusGuards', thisTriggerId);

  // Port note: the interaction hooks take their floating root context once, so they're created
  // again when the trigger moves to another store (upstream re-renders them with the new context).
  const interactions = createMemo(() => {
    const context = floatingContext();
    return untrack(() => ({
      hoverProps: useHoverReferenceInteraction(context, {
        get enabled() {
          return !disabled() && openOnHover() && !isTouchPressOpen();
        },
        mouseOnly: true,
        move: false,
        handleClose: safePolygon(),
        get restMs() {
          return delay();
        },
        get delay() {
          return {
            close: closeDelay(),
          };
        },
        triggerElementRef,
        get isActiveTrigger() {
          return isTriggerActive();
        },
        isClosing: () => store().select('transitionStatus') === 'ending',
      }),
      click: useClick(context, {
        stickIfOpen: () => store().context.stickIfOpen,
      }),
    }));
  });

  // Port note: read the subscribed render state, like upstream's render snapshot, rather
  // than the synchronous store value that useClick has already changed in the same event.
  const triggerOpen = useStoreState('open');
  const interactionTypeProps = useOpenMethodTriggerProps(triggerOpen, (interactionType) => {
    store().set('openMethod', interactionType);
  });

  const rootTriggerProps = useStoreState('triggerProps', isMountedByThisTrigger);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
  });

  const stateAttributesMapping: StateAttributesMapping<{ open: boolean }> = {
    open(value) {
      if (isPressOpenedByThisTrigger()) {
        return pressableTriggerOpenStateMapping.open(value);
      }

      return triggerOpenStateMapping.open(value);
    },
  };

  // Port note: reads the current store when the guards are focused.
  const { handlePreFocusGuardFocus, handleFocusTargetFocus } = useTriggerFocusGuards(
    {
      setOpen: (open, eventDetails) => store().setOpen(open, eventDetails),
      select: (key) => store().select(key),
      get context() {
        return store().context;
      },
    },
    triggerElementRef,
  );

  const state = createMemo<PopoverTriggerState>(
    () => ({
      disabled: disabled(),
      open: isOpenedByThisTrigger(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const element = useRenderElement('button', componentProps, {
    state,
    ref: [
      buttonRef,
      registerTrigger,
      (el: HTMLElement | null) => {
        triggerElementRef.current = el;
      },
    ],
    props: () => [
      interactions().click.reference,
      interactions().hoverProps(),
      rootTriggerProps(),
      interactionTypeProps,
      {
        [CLICK_TRIGGER_IDENTIFIER as string]: '',
        id: thisTriggerId(),
        'aria-haspopup': 'dialog' as const,
        'aria-expanded': isOpenedByThisTrigger(),
        'aria-controls': popupId(),
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });

  // Port note: inserting conditional guards in a Solid fragment can move the trigger (array
  // reconciliation replaces it with the leading guard and re-inserts it), which drops its focus.
  // Like Menu's trigger, insert the guards around the stable node in the layout effect instead,
  // preserving React's keyed fragment behavior.
  useIsoLayoutEffect(
    ([shouldRender, currentStore]) => {
      const triggerNode = triggerElementRef.current;
      const parentNode = triggerNode?.parentNode;
      if (!shouldRender || !triggerNode || !parentNode) {
        return undefined;
      }
      return createRoot((dispose) => {
        // Port note: dev/HMR JSX can be accessor-backed; resolve it before native DOM insertion.
        const before = flatten(
          TriggerFocusGuard({
            guardRef: currentStore.context.beforeTriggerFocusGuardRef,
            onFocus: handlePreFocusGuardFocus,
          }),
        ) as HTMLElement;
        const after = flatten(
          TriggerFocusGuard({
            guardRef: currentStore.context.triggerFocusTargetRef,
            onFocus: handleFocusTargetFocus,
          }),
        ) as HTMLElement;
        parentNode.insertBefore(before, triggerNode);
        parentNode.insertBefore(after, triggerNode.nextSibling);
        return () => {
          before.remove();
          after.remove();
          dispose();
        };
      });
    },
    () => [hasFocusGuards(), store()] as const,
  );

  return element;
}

/**
 * Port note: `store.useState(key, ...args)` for a store that may change. The returned reader
 * subscribes to the current store and follows the store accessor.
 */
function createStoreStateReader<Store extends Pick<PopoverHandleStore<unknown>, 'useState'>>(
  store: Accessor<Store>,
): Store['useState'] {
  return ((key: string, ...args: unknown[]) => {
    const state = createMemo(() => {
      const currentStore = store() as any;
      return untrack(() => currentStore.useState(key, ...args) as Accessor<unknown>);
    });
    return () => state()();
  }) as Store['useState'];
}

/**
 * Port note: a `FocusGuard` whose ref object is reset to `null` when it unmounts, like React does
 * for ref objects.
 */
function TriggerFocusGuard(props: {
  guardRef: RefObject<HTMLElement | null>;
  onFocus: (event: FocusEvent) => void;
}) {
  const guardRef = untrack(() => props.guardRef);
  onCleanup(() => {
    if (guardRef.current !== null) {
      guardRef.current = null;
    }
  });
  return (
    <FocusGuard
      ref={(element) => {
        guardRef.current = element;
      }}
      onFocusIn={(event) => props.onFocus(event)}
    />
  );
}

export interface PopoverTriggerState {
  /**
   * Whether the trigger is currently disabled.
   */
  disabled: boolean;
  /**
   * Whether the popover is currently open and was opened by this trigger.
   */
  open: boolean;
}

export type PopoverTriggerProps<Payload = unknown> = NativeButtonProps &
  Omit<BaseUIComponentProps<'button', PopoverTriggerState>, 'disabled'> & {
    /**
     * Whether the component should ignore user interaction.
     * @default false
     */
    // Port note: declared here so it's a `boolean` (Solid's `disabled` attribute type also allows
    // `""`); upstream inherits it from React's button props.
    disabled?: boolean | undefined;
    /**
     * Whether the component renders a native `<button>` element when replacing it
     * via the `render` prop.
     * Set to `false` if the rendered element is not a button (e.g. `<div>`).
     * @default true
     */
    nativeButton?: boolean | undefined;
    /**
     * A handle to associate the trigger with a popover.
     */
    handle?: PopoverHandle<Payload> | undefined;
    /**
     * A payload to pass to the popover when it is opened.
     */
    payload?: Payload | undefined;
    /**
     * ID of the trigger. In addition to being forwarded to the rendered element,
     * it is also used to specify the active trigger for the popover in controlled mode (with the PopoverRoot `triggerId` prop).
     */
    id?: string | undefined;
    /**
     * Whether the popover should also open when the trigger is hovered.
     * @default false
     */
    openOnHover?: boolean | undefined;
    /**
     * How long to wait before the popover may be opened on hover. Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 300
     */
    delay?: number | undefined;
    /**
     * How long to wait before closing the popover that was opened on hover.
     * Specified in milliseconds.
     *
     * Requires the `openOnHover` prop.
     * @default 0
     */
    closeDelay?: number | undefined;
  };

export namespace PopoverTrigger {
  export type State = PopoverTriggerState;
  export type Props<Payload = unknown> = PopoverTriggerProps<Payload>;
}

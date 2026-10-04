import { createMemo, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useDismiss, FloatingTree } from '../../floating-ui-solid';
import { PreviewCardRootContext, usePreviewCardRootContext } from './PreviewCardContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { PreviewCardStore } from '../store/PreviewCardStore';
import type { PayloadChildRenderFunction } from '../../utils/popups';
import {
  usePopupHandleAttachment,
  useImplicitActiveTrigger,
  usePopupRootStore,
  useOpenStateTransitions,
  usePopupInteractionProps,
} from '../../utils/popups';
import type { PreviewCardHandle } from '../store/PreviewCardHandle';
import type { HTMLProps } from '../../internals/types';

function PreviewCardRootComponent<Payload>(props: PreviewCardRoot.Props<Payload>): JSX.Element {
  const store = usePopupRootStore(
    (floatingId, nested) =>
      new PreviewCardStore<Payload>(
        {
          open: props.defaultOpen ?? false,
          openProp: props.open,
          activeTriggerId: props.defaultTriggerId ?? null,
          triggerIdProp: props.triggerId,
        },
        floatingId,
        nested,
      ),
  );

  store.useControlledProp('openProp', () => props.open);
  store.useControlledProp('triggerIdProp', () => props.triggerId);

  store.useContextCallback('onOpenChange', () => props.onOpenChange);
  store.useContextCallback('onOpenChangeComplete', () => props.onOpenChangeComplete);

  const open = store.useState('open');
  const activeTriggerId = store.useState('activeTriggerId');
  const mounted = store.useState('mounted');
  const payload = store.useState('payload') as () => Payload | undefined;

  useImplicitActiveTrigger(store, { closeOnActiveTriggerUnmount: true });
  const { forceUnmount } = useOpenStateTransitions(open, store, () => {
    store.context.inlineRectCoordsRef.current = undefined;
  });

  useIsoLayoutEffect(
    ([, activeTriggerIdValue, openValue]) => {
      if (openValue) {
        if (activeTriggerIdValue == null) {
          store.set('payload', undefined);
        }
      }
    },
    () => [store, activeTriggerId(), open()] as const,
  );

  // Port note: counterpart of `React.useImperativeHandle(actionsRef, …)`.
  useIsoLayoutEffect(
    ([actionsRef]) => {
      if (!actionsRef) {
        return undefined;
      }
      actionsRef.current = {
        unmount: forceUnmount,
        close: () => store.setOpen(false, createChangeEventDetails(REASONS.imperativeAction)),
      };
      return () => {
        actionsRef.current = null;
      };
    },
    () => [props.actionsRef, store] as const,
  );

  // Port note: detached triggers registered before this Root migrate in Solid's effect
  // order. Preserve their original registration order when assigning default-open ownership.
  useIsoLayoutEffect(
    () => {
      if (store.select('open') && store.select('activeTriggerId') == null) {
        const firstTrigger = props.handle?.store.context.triggerElements.entries().next();
        if (firstTrigger && !firstTrigger.done) {
          const [id, element] = firstTrigger.value;
          store.update({ activeTriggerId: id, activeTriggerElement: element });
        }
      }
    },
    () => [],
  );

  // Port note: create the attachment effect in the Root body so it precedes descendant
  // and later sibling effects, matching upstream's child-first layout effect ordering.
  usePopupHandleAttachment(() => props.handle, store);

  const shouldRenderInteractions = createMemo(() => open() || mounted());

  // Port note: a render function child is called once with an object whose `payload` is a getter,
  // so read `arg.payload` in a reactive scope instead of destructuring it. Like Solid's `<Show>`,
  // only a function that declares a parameter is a render function: a single component child is
  // also passed as a function.
  const renderChildren = () => {
    const children = props.children;
    if (typeof children === 'function' && children.length > 0) {
      return untrack(() =>
        (children as PayloadChildRenderFunction<Payload>)({
          get payload() {
            return payload();
          },
        }),
      );
    }
    return children as JSX.Element;
  };

  return (
    <PreviewCardRootContext value={store as PreviewCardRootContext}>
      <Show when={shouldRenderInteractions()}>
        <PreviewCardInteractions store={store} />
      </Show>
      {renderChildren()}
    </PreviewCardRootContext>
  );
}

function PreviewCardInteractions<Payload>(props: { store: PreviewCardStore<Payload> }) {
  const store = untrack(() => props.store);
  // Port note: the root store's floating root context never changes.
  const floatingRootContext = store.select('floatingRootContext');

  const dismiss = useDismiss(floatingRootContext);

  // `useDismiss` is not given an `enabled` option, so all three prop bags are always defined.
  // `dismiss.trigger` is the same object as `dismiss.reference`.
  usePopupInteractionProps(store, () => ({
    activeTriggerProps: dismiss.reference! as HTMLProps,
    inactiveTriggerProps: dismiss.trigger! as HTMLProps,
    popupProps: dismiss.floating! as HTMLProps,
  }));

  return null;
}

/**
 * Groups all parts of the preview card.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Preview Card](https://base-ui.com/react/components/preview-card)
 */
export function PreviewCardRoot<Payload>(props: PreviewCardRoot.Props<Payload>): JSX.Element {
  // Port note: context presence can't change, so the branch is decided once.
  if (usePreviewCardRootContext(true)) {
    // eslint-disable-next-line solid/components-return-once
    return <PreviewCardRootComponent {...props} />;
  }

  // Port note: set up the root in this component body so its handle attachment effect
  // precedes later sibling effects. Its JSX descendants still render inside the tree.
  const root = PreviewCardRootComponent(props);
  return <FloatingTree>{root}</FloatingTree>;
}

export interface PreviewCardRootState {}

export interface PreviewCardRootProps<Payload = unknown> {
  /**
   * Whether the preview card is initially open.
   *
   * To render a controlled preview card, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Whether the preview card is currently open.
   */
  open?: boolean | undefined;
  /**
   * Event handler called when the preview card is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: PreviewCardRoot.ChangeEventDetails) => void) | undefined;
  /**
   * Event handler called after any animations complete when the preview card is opened or closed.
   */
  onOpenChangeComplete?: ((open: boolean) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `unmount`: Ends the closing phase of the preview card after an externally controlled closing animation finishes.
   * Call `preventUnmountOnClose()` in `onOpenChange` first, otherwise the preview card completes closing on its own.
   * Whether it leaves the DOM is decided by `keepMounted` on the portal.
   * - `close`: Closes the preview card imperatively when called.
   */
  actionsRef?: RefObject<PreviewCardRoot.Actions | null> | undefined;
  /**
   * A handle to associate the preview card with a trigger.
   * If specified, allows external triggers to control the card's open state.
   * Can be created with the PreviewCard.createHandle() method.
   */
  handle?: PreviewCardHandle<Payload> | undefined;
  /**
   * The content of the preview card.
   * This can be a regular React node or a render function that receives the `payload` of the active trigger.
   */
  children?: JSX.Element | PayloadChildRenderFunction<Payload> | undefined;
  /**
   * ID of the trigger that the preview card is associated with.
   * This is useful in conjunction with the `open` prop to create a controlled preview card.
   * There's no need to specify this prop when the preview card is uncontrolled (that is, when the `open` prop is not set).
   */
  triggerId?: string | null | undefined;
  /**
   * ID of the trigger that the preview card is associated with.
   * This is useful in conjunction with the `defaultOpen` prop to create an initially open preview card.
   */
  defaultTriggerId?: string | null | undefined;
}

export interface PreviewCardRootActions {
  unmount: () => void;
  close: () => void;
}

export type PreviewCardRootChangeEventReason =
  | typeof REASONS.triggerHover
  | typeof REASONS.triggerFocus
  | typeof REASONS.triggerPress
  | typeof REASONS.outsidePress
  | typeof REASONS.escapeKey
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type PreviewCardRootChangeEventDetails =
  BaseUIChangeEventDetails<PreviewCardRoot.ChangeEventReason> & {
    /** Prevents the popup from unmounting until the `unmount` action is called. */
    preventUnmountOnClose: () => void;
  };

export namespace PreviewCardRoot {
  export type State = PreviewCardRootState;
  export type Props<Payload = unknown> = PreviewCardRootProps<Payload>;
  export type Actions = PreviewCardRootActions;
  export type ChangeEventReason = PreviewCardRootChangeEventReason;
  export type ChangeEventDetails = PreviewCardRootChangeEventDetails;
}

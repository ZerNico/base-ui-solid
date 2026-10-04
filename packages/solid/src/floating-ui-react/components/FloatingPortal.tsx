import {
  createContext,
  createMemo,
  createSignal,
  omit,
  onCleanup,
  Show,
  untrack,
  useContext,
} from 'solid-js';
import { Portal } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { isNode } from '@floating-ui/utils/dom';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { useId } from '@base-ui-solid/utils/useId';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FocusGuard } from '../../utils/FocusGuard';
import {
  enableFocusInside,
  disableFocusInside,
  getPreviousTabbable,
  getNextTabbable,
  isOutsideEvent,
} from '../utils/tabbable';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { createAttribute } from '../utils/createAttribute';
import { useRenderElement } from '../../internals/useRenderElement';
import type { UseRenderElementComponentProps } from '../../internals/useRenderElement';
import { ownerVisuallyHidden } from '../../internals/constants';
import type { BaseUIComponentProps } from '../../internals/types';

type FocusManagerState = null | {
  modal: boolean;
  open: boolean;
  onOpenChange(
    open: boolean,
    data?: { reason?: string | undefined; event?: Event | undefined },
  ): void;
  domReference: Element | null;
  closeOnFocusOut: boolean;
};

/**
 * Port note: `portalNode` is a getter, so the context value is a stable object.
 */
interface PortalContextValue {
  readonly portalNode: HTMLElement | null;
  setFocusManagerState: (state: FocusManagerState) => void;
  beforeInsideRef: RefObject<HTMLSpanElement | null>;
  afterInsideRef: RefObject<HTMLSpanElement | null>;
  beforeOutsideRef: RefObject<HTMLSpanElement | null>;
  afterOutsideRef: RefObject<HTMLSpanElement | null>;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export const usePortalContext = () => useContext(PortalContext);

const attr = createAttribute('portal');

/**
 * Port note: read lazily like Solid props (`props.container`), so pass a props-like object with
 * getters for reactive values. `componentProps` and `elementProps` are read once (pass the
 * component's props objects).
 */
export interface UseFloatingPortalNodeProps {
  ref?: ((element: HTMLDivElement) => void) | undefined;
  container?:
    HTMLElement | ShadowRoot | null | RefObject<HTMLElement | ShadowRoot | null> | undefined;
  componentProps?: UseRenderElementComponentProps<any> | undefined;
  elementProps?: Record<string, any> | undefined;
}

/**
 * Port note: `node` and `nodeId` are getters (read them in a reactive scope); `subtree` is the
 * portaled portal element, created once.
 */
export interface UseFloatingPortalNodeResult {
  readonly node: HTMLElement | null;
  /**
   * The `id` attribute of the portal node.
   */
  readonly nodeId: string | undefined;
  subtree: JSX.Element;
}

export function useFloatingPortalNode(
  props: UseFloatingPortalNodeProps = {},
): UseFloatingPortalNodeResult {
  const componentProps = untrack(() => props.componentProps) ?? EMPTY_OBJECT;
  const elementProps = untrack(() => props.elementProps);

  const uniqueId = useId();
  const portalContext = usePortalContext();
  const parentPortalNode = () => portalContext?.portalNode;

  const [containerElement, setContainerElement] = createSignal<HTMLElement | ShadowRoot | null>(
    null,
    { ownedWrite: true },
  );
  const [portalNode, setPortalNode] = createSignal<HTMLElement | null>(null, { ownedWrite: true });
  const setPortalNodeRef = (node: HTMLElement | null) => {
    if (node !== null) {
      // the useIsoLayoutEffect below watching containerProp / parentPortalNode
      // sets setPortalNode(null) when the container becomes null or changes.
      // So even though the ref callback now ignores null, the portal node still gets cleared.
      setPortalNode(node);
    }
  };

  let containerRef: HTMLElement | ShadowRoot | null = null;

  useIsoLayoutEffect(
    ([containerProp, parentPortalNodeValue]) => {
      // Wait for the container to be resolved if explicitly `null`.
      if (containerProp === null) {
        if (containerRef) {
          containerRef = null;
          setPortalNode(null);
          setContainerElement(null);
        }
        return;
      }

      const resolvedContainer =
        (containerProp && (isNode(containerProp) ? containerProp : containerProp.current)) ??
        parentPortalNodeValue ??
        document.body;

      if (resolvedContainer == null) {
        if (containerRef) {
          containerRef = null;
          setPortalNode(null);
          setContainerElement(null);
        }
        return;
      }

      if (containerRef !== resolvedContainer) {
        containerRef = resolvedContainer;
        setPortalNode(null);
        setContainerElement(resolvedContainer);
      }
    },
    () => [props.container, parentPortalNode()],
  );

  // This `Portal` injects the portal element into the `container`.
  // Another `Portal` inside `FloatingPortal`/`FloatingPortalLite` then injects the children into
  // the portal element.
  // Port note: keyed by the container, so a new container gets a new portal element, like React's
  // `createPortal` into a different container.
  const portalSubtree = (
    <Show when={containerElement()} keyed>
      {(container) => (
        <Portal mount={container as Element}>
          {useRenderElement('div', componentProps, {
            ref: setPortalNodeRef,
            props: () => [
              {
                id: uniqueId,
                [attr]: '',
                ref: props.ref,
              },
              elementProps,
            ],
          })}
        </Portal>
      )}
    </Show>
  );

  return {
    get node() {
      return portalNode();
    },
    // `id` and `render` props can override or remove the generated ID. Use the exact
    // rendered value so `aria-owns` never points at an ID absent from the DOM.
    // Port note: the rendered element isn't inspectable before rendering, so this resolves the
    // `id` prop like the props merge does (an `id` set by a `render` function isn't seen).
    get nodeId() {
      return elementProps && 'id' in elementProps
        ? (elementProps.id as string | undefined)
        : uniqueId;
    },
    subtree: portalSubtree,
  };
}

/**
 * Portals the floating element into a given container element — by default,
 * outside of the app root and into the body.
 * This is necessary to ensure the floating element can appear outside any
 * potential parent containers that cause clipping (such as `overflow: hidden`),
 * while retaining its location in the React tree.
 * @see https://floating-ui.com/docs/FloatingPortal
 * @internal
 */
export function FloatingPortal(componentProps: FloatingPortal.Props<any>) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'children',
    'container',
    'portalOwnerRole',
  );

  // Port note: the forwarded `ref` is part of `elementProps` (see `useRenderElement`).
  const portal = useFloatingPortalNode({
    get container() {
      return componentProps.container;
    },
    componentProps,
    elementProps,
  });

  const beforeOutsideRef: RefObject<HTMLSpanElement | null> = { current: null };
  const afterOutsideRef: RefObject<HTMLSpanElement | null> = { current: null };
  const beforeInsideRef: RefObject<HTMLSpanElement | null> = { current: null };
  const afterInsideRef: RefObject<HTMLSpanElement | null> = { current: null };

  const [focusManagerState, setFocusManagerState] = createSignal<FocusManagerState>(null, {
    ownedWrite: true,
  });
  let focusInsideDisabled = false;

  const modal = () => focusManagerState()?.modal;
  const open = () => focusManagerState()?.open;

  const shouldRenderGuards = createMemo(() => {
    const state = focusManagerState();
    return !!state && !state.modal && state.open && !!portal.node;
  });

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  useEffect(
    ([portalNode, modalValue]) => {
      if (!portalNode || modalValue) {
        return undefined;
      }

      // Make sure elements inside the portal element are tabbable only when the
      // portal has already been focused, either by tabbing into a focus trap
      // element outside or using the mouse.
      function onFocus(event: FocusEvent) {
        if (portalNode && event.relatedTarget && isOutsideEvent(event)) {
          if (event.type === 'focusin') {
            if (focusInsideDisabled) {
              enableFocusInside(portalNode);
              focusInsideDisabled = false;
            }
          } else {
            disableFocusInside(portalNode);
            focusInsideDisabled = true;
          }
        }
      }

      // Listen to the event on the capture phase so they run before the focus
      // trap elements onFocus prop is called.
      return mergeCleanups(
        addEventListener(portalNode, 'focusin', onFocus, true),
        addEventListener(portalNode, 'focusout', onFocus, true),
      );
    },
    () => [portal.node, modal()],
  );

  useIsoLayoutEffect(
    ([openValue, portalNode]) => {
      if (!portalNode || openValue !== true || !focusInsideDisabled) {
        return;
      }

      // Restore tabbability before the focus manager's queued focus-on-open step runs.
      enableFocusInside(portalNode);
      focusInsideDisabled = false;
    },
    () => [open(), portal.node],
  );

  const portalContextValue: PortalContextValue = {
    beforeOutsideRef,
    afterOutsideRef,
    beforeInsideRef,
    afterInsideRef,
    get portalNode() {
      return portal.node;
    },
    setFocusManagerState,
  };

  return (
    <>
      {portal.subtree}
      <PortalContext value={portalContextValue}>
        <Show when={shouldRenderGuards() && portal.node}>
          {(portalNode) => (
            <OutsideFocusGuard
              guardRef={beforeOutsideRef}
              onFocusIn={(event) => {
                if (isOutsideEvent(event, portalNode())) {
                  beforeInsideRef.current?.focus();
                } else {
                  const state = focusManagerState();
                  const domReference = state ? state.domReference : null;
                  const prevTabbable = getPreviousTabbable(domReference);
                  prevTabbable?.focus();
                }
              }}
            />
          )}
        </Show>
        <Show when={shouldRenderGuards() && portal.node}>
          <span
            role={componentProps.portalOwnerRole}
            aria-owns={portal.nodeId}
            style={ownerVisuallyHidden}
          />
        </Show>
        <Show when={portal.node}>
          {(portalNode) => <Portal mount={portalNode()}>{componentProps.children}</Portal>}
        </Show>
        <Show when={shouldRenderGuards() && portal.node}>
          {(portalNode) => (
            <OutsideFocusGuard
              guardRef={afterOutsideRef}
              onFocusIn={(event) => {
                if (isOutsideEvent(event, portalNode())) {
                  afterInsideRef.current?.focus();
                } else {
                  const state = focusManagerState();
                  const domReference = state ? state.domReference : null;
                  const nextTabbable = getNextTabbable(domReference);
                  nextTabbable?.focus();

                  if (state?.closeOnFocusOut) {
                    state?.onOpenChange(false, createChangeEventDetails(REASONS.focusOut, event));
                  }
                }
              }}
            />
          )}
        </Show>
      </PortalContext>
    </>
  );
}

/**
 * Port note: a `FocusGuard` whose ref object is reset to `null` when it unmounts, like React does
 * for ref objects.
 */
function OutsideFocusGuard(props: {
  guardRef: RefObject<HTMLSpanElement | null>;
  onFocusIn: (event: FocusEvent) => void;
}) {
  onCleanup(() => {
    props.guardRef.current = null;
  });
  return (
    <FocusGuard
      data-type="outside"
      ref={(element) => {
        props.guardRef.current = element;
      }}
      onFocusIn={(event) => props.onFocusIn(event)}
    />
  );
}

export interface FloatingPortalState {}

export namespace FloatingPortal {
  export type State = FloatingPortalState;
  export interface Props<TState> extends BaseUIComponentProps<'div', TState> {
    /**
     * A parent element to render the portal element into.
     */
    container?: UseFloatingPortalNodeProps['container'] | undefined;
    /**
     * @ignore
     * The role for the hidden `aria-owns` owner element.
     */
    portalOwnerRole?: JSX.AriaAttributes['role'] | undefined;
  }
}

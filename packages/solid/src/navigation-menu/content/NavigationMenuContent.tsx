import { createMemo, createSignal, omit, Show, untrack } from 'solid-js';
import { Portal } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FloatingNode } from '../../floating-ui-solid';
import { contains, getTarget } from '../../floating-ui-solid/utils';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { useNavigationMenuItemContext } from '../item/NavigationMenuItemContext';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { CompositeRoot } from '../../internals/composite/root/CompositeRoot';
import { popupStateMapping } from '../../utils/popupStateMapping';
import * as NavigationMenuContentDataAttributes from './NavigationMenuContentDataAttributes';

const stateAttributesMapping: StateAttributesMapping<NavigationMenuContentState> = {
  ...popupStateMapping,
  ...transitionStatusMapping,
  activationDirection(value) {
    if (!value) {
      return null;
    }
    return {
      [NavigationMenuContentDataAttributes.activationDirection]: value,
    };
  },
};

/**
 * A container for the content of the navigation menu item that is moved into the popup
 * when the item is active.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuContent(componentProps: NavigationMenuContent.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'keepMounted');
  const keepMounted = () => componentProps.keepMounted ?? false;

  const {
    mounted: popupMounted,
    viewportElement,
    value,
    activationDirection,
    currentContentRef,
    viewportTargetElement,
  } = useNavigationMenuRootContext();
  const { value: itemValue } = useNavigationMenuItemContext();
  const nodeId = useNavigationMenuTreeContext();

  const open = createMemo(() => popupMounted() && value() === itemValue());

  const ref: RefObject<HTMLDivElement | null> = { current: null };

  const [focusInside, setFocusInside] = createSignal(false, { ownedWrite: true });

  const { mounted, setMounted, transitionStatus } = useTransitionStatus(open);

  // If the popup unmounts before the content's exit animation completes, reset the internal
  // mounted state so the next open can re-enter via `transitionStatus="starting"`.
  // Port note: upstream adjusts the state during render; here an effect does it.
  useIsoLayoutEffect(
    ([isMounted, isPopupMounted]) => {
      if (isMounted && !isPopupMounted) {
        setMounted(false);
      }
    },
    () => [mounted(), popupMounted()],
  );

  useOpenChangeComplete({
    ref: () => ref.current,
    open,
    onComplete() {
      if (!untrack(open)) {
        setMounted(false);
      }
    },
  });

  // When a content re-enters while still mounted (e.g. switching top-level triggers
  // back before the exit animation completes), the DOM element hasn't changed so the
  // callback ref won't fire again. Ensure the shared ref is updated so the
  // MutationObserver in the trigger watches the correct content element.
  useIsoLayoutEffect(
    ([isOpen]) => {
      if (isOpen && ref.current) {
        currentContentRef.current = ref.current;
      }
    },
    () => [open(), currentContentRef],
  );

  const state = createMemo<NavigationMenuContentState>(() => ({
    open: open(),
    transitionStatus: transitionStatus(),
    activationDirection: activationDirection(),
  }));

  const handleCurrentContentRef = (node: HTMLDivElement | null) => {
    // Inactive `keepMounted` content also mounts in the viewport; only the
    // active content can own the shared sizing observer target.
    if (node && untrack(open)) {
      currentContentRef.current = node;
    }
  };

  // Port note: React's `onFocus`/`onBlur` bubble, so they're `onFocusIn`/`onFocusOut`.
  const commonProps: HTMLProps<HTMLDivElement> = {
    onFocusIn(event: FocusEvent) {
      const target = getTarget(event) as Element | null;
      if (target?.hasAttribute('data-base-ui-focus-guard')) {
        return;
      }
      setFocusInside(true);
    },
    onFocusOut(event: FocusEvent) {
      if (!contains(event.currentTarget as Element, event.relatedTarget as Element | null)) {
        setFocusInside(false);
      }
    },
  };

  const defaultProps = (): HTMLProps =>
    !open() && mounted()
      ? {
          style: { position: 'absolute', top: 0, left: 0 },
          inert: inertValue(!focusInside()),
          ...commonProps,
        }
      : commonProps;

  const portalContainer = () => viewportTargetElement() || viewportElement();
  const hidden = () => keepMounted() && !mounted();

  // Port note: upstream sets this during render; it only ever becomes `true`, so it's derived.
  const hasMountedInPortal = createMemo<boolean>(
    (prev) => Boolean(prev) || (keepMounted() && portalContainer() != null),
  );

  const shouldRenderInline = () => keepMounted() && !portalContainer() && !hasMountedInPortal();

  const portalTarget = () => {
    const container = portalContainer();
    if (shouldRenderInline() || !container || (!mounted() && !keepMounted())) {
      return null;
    }
    return container;
  };

  return (
    <Show
      when={!shouldRenderInline()}
      fallback={
        <CompositeRoot
          render={componentProps.render}
          class={componentProps.class}
          style={componentProps.style}
          state={state()}
          props={[defaultProps(), { hidden: true }, elementProps]}
          stateAttributesMapping={stateAttributesMapping}
        />
      }
    >
      <Show when={portalTarget()} keyed>
        {(container) => (
          <Portal mount={container}>
            <FloatingNode id={nodeId}>
              <CompositeRoot
                render={componentProps.render}
                class={componentProps.class}
                style={componentProps.style}
                state={state()}
                refs={[
                  (node: HTMLDivElement | null) => {
                    ref.current = node;
                  },
                  handleCurrentContentRef,
                ]}
                props={[defaultProps(), hidden() ? { hidden: true } : EMPTY_OBJECT, elementProps]}
                stateAttributesMapping={stateAttributesMapping}
              />
            </FloatingNode>
          </Portal>
        )}
      </Show>
    </Show>
  );
}

export interface NavigationMenuContentState {
  /**
   * If `true`, the component is open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * The direction of the activation.
   */
  activationDirection: 'left' | 'right' | 'up' | 'down' | null;
}

export interface NavigationMenuContentProps extends BaseUIComponentProps<
  'div',
  NavigationMenuContentState
> {
  /**
   * Whether to keep the content mounted in the DOM while the popup is closed.
   * Ensures the content is present during server-side rendering for web crawlers.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace NavigationMenuContent {
  export type State = NavigationMenuContentState;
  export type Props = NavigationMenuContentProps;
}

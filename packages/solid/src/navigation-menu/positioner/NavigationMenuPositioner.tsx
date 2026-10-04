import { createMemo, createSignal, flush, omit, untrack } from 'solid-js';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  disableFocusInside,
  enableFocusInside,
  isOutsideEvent,
} from '../../floating-ui-solid/utils';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { useNavigationMenuPortalContext } from '../portal/NavigationMenuPortalContext';
import type {
  Align,
  Side,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import { useNavigationMenuAnchorPositioning } from '../utils/useNavigationMenuAnchorPositioning';
import { NavigationMenuPositionerContext } from './NavigationMenuPositionerContext';
import { DROPDOWN_COLLISION_AVOIDANCE, POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { adaptiveOrigin } from '../../utils/adaptiveOriginMiddleware';
import { usePositioner } from '../../utils/usePositioner';

const EMPTY_ROOT_CONTEXT = getEmptyRootContext();

/**
 * Positions the navigation menu against the currently active trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuPositioner(componentProps: NavigationMenuPositioner.Props) {
  const {
    open,
    mounted,
    positionerElement,
    setPositionerElement,
    floatingRootContext,
    nested,
    transitionStatus,
  } = useNavigationMenuRootContext();

  // `useAnchorPositioning` applies the same defaults to the undefined values; the names
  // remain omitted to exclude the props from `elementProps`.
  const elementProps = omit(
    componentProps,
    'class',
    'render',
    'anchor',
    'positionMethod',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionBoundary',
    'collisionPadding',
    'collisionAvoidance',
    'arrowPadding',
    'sticky',
    'disableAnchorTracking',
    'style',
  );

  const keepMounted = useNavigationMenuPortalContext();
  const nodeId = useNavigationMenuTreeContext();

  const initialInstantTimeout = useTimeout();
  const resizeTimeout = useTimeout();

  // When the menu is initially open, disable the positioner's transition for one frame
  // so a default value does not animate in from the unpositioned portal state.
  const [instant, setInstant] = createSignal(untrack(open), { ownedWrite: true });
  let needsInitialInstantReset = untrack(open);

  // https://codesandbox.io/s/tabbable-portal-f4tng?file=/src/TabbablePortal.tsx
  useEffect(
    ([positioner]) => {
      if (!positioner) {
        return undefined;
      }

      // Make sure elements inside the portal element are tabbable only when the
      // portal has already been focused, either by tabbing into a focus trap
      // element outside or using the mouse.
      function onFocus(event: FocusEvent) {
        if (positioner && isOutsideEvent(event)) {
          const focusing = event.type === 'focusin';
          const manageFocus = focusing ? enableFocusInside : disableFocusInside;
          manageFocus(positioner);
        }
      }

      // Listen to the event on the capture phase so they run before the focus
      // trap elements onFocus prop is called.
      return mergeCleanups(
        addEventListener(positioner, 'focusin', onFocus, true),
        addEventListener(positioner, 'focusout', onFocus, true),
      );
    },
    () => [positionerElement()],
  );

  // Port note: the active trigger's store replaces the root context, so the subscription follows it.
  const domReferenceState = createMemo(() =>
    (floatingRootContext() || EMPTY_ROOT_CONTEXT).useState('domReferenceElement'),
  );
  const domReference = () => domReferenceState()();

  const positioning = useNavigationMenuAnchorPositioning({
    get anchor() {
      return componentProps.anchor ?? domReference();
    },
    get positionMethod() {
      return componentProps.positionMethod ?? 'absolute';
    },
    get mounted() {
      return mounted();
    },
    get side() {
      return componentProps.side ?? 'bottom';
    },
    get sideOffset() {
      return componentProps.sideOffset ?? 0;
    },
    get align() {
      return componentProps.align ?? 'center';
    },
    get alignOffset() {
      return componentProps.alignOffset ?? 0;
    },
    get arrowPadding() {
      return componentProps.arrowPadding ?? 5;
    },
    get collisionBoundary() {
      return componentProps.collisionBoundary ?? 'clipping-ancestors';
    },
    get collisionPadding() {
      return componentProps.collisionPadding ?? 5;
    },
    get sticky() {
      return componentProps.sticky ?? false;
    },
    get disableAnchorTracking() {
      return componentProps.disableAnchorTracking ?? false;
    },
    get keepMounted() {
      return keepMounted();
    },
    get floatingRootContext() {
      return floatingRootContext();
    },
    get collisionAvoidance() {
      return (
        componentProps.collisionAvoidance ??
        (nested ? POPUP_COLLISION_AVOIDANCE : DROPDOWN_COLLISION_AVOIDANCE)
      );
    },
    shift: { rootBoundary: 'layoutViewport' },
    nodeId,
    // Allows the menu to remain anchored without wobbling while its size
    // and position transition simultaneously when side=top or side=left.
    adaptiveOrigin,
  });

  const state = createMemo<NavigationMenuPositionerState>(() => ({
    open: open(),
    side: positioning.side,
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
    instant: instant(),
  }));

  useEffect(
    ([isOpen, positioner]) => {
      if (!isOpen) {
        return undefined;
      }

      if (needsInitialInstantReset) {
        initialInstantTimeout.start(0, () => {
          needsInitialInstantReset = false;

          if (!resizeTimeout.isStarted()) {
            setInstant(false);
          }
        });
      }

      function handleResize() {
        // Port note: `ReactDOM.flushSync(() => setInstant(true))`.
        setInstant(true);
        flush();

        resizeTimeout.start(100, () => {
          setInstant(false);
        });
      }

      const win = ownerWindow(positioner);
      return addEventListener(win, 'resize', handleResize);
    },
    () => [open(), positionerElement()],
  );

  return (
    <NavigationMenuPositionerContext value={positioning}>
      {usePositioner(componentProps, state, {
        get styles() {
          return positioning.positionerStyles;
        },
        get transitionStatus() {
          return transitionStatus();
        },
        // Port note: `elementProps`' handlers take `BaseUIEvent`s.
        props: elementProps as HTMLProps<HTMLDivElement>,
        refs: setPositionerElement,
        get hidden() {
          return !mounted();
        },
        get inert() {
          return !open();
        },
      })}
    </NavigationMenuPositionerContext>
  );
}

export interface NavigationMenuPositionerState {
  /**
   * Whether the navigation menu is currently open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
  /**
   * Whether CSS transitions should be disabled.
   */
  instant: boolean;
}

export interface NavigationMenuPositionerProps
  extends
    UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', NavigationMenuPositionerState> {}

export namespace NavigationMenuPositioner {
  export type State = NavigationMenuPositionerState;
  export type Props = NavigationMenuPositionerProps;
}

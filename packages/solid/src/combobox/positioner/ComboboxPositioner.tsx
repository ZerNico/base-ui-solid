import { createMemo, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useComboboxFloatingContext, useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxPositionerContext } from './ComboboxPositionerContext';
import { useListEmpty } from '../utils/parts';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useComboboxPortalContext } from '../portal/ComboboxPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../internals/constants';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxPositioner(componentProps: ComboboxPositioner.Props): JSX.Element {
  // `useAnchorPositioning` applies the same defaults to the undefined values; the names
  // remain omitted to exclude the props from `elementProps`.
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'anchor',
    'positionMethod',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionBoundary',
    'collisionPadding',
    'arrowPadding',
    'sticky',
    'disableAnchorTracking',
    'collisionAvoidance',
    'style',
  );

  const store = useComboboxRootContext();
  const floatingRootContext = useComboboxFloatingContext();
  const keepMounted = useComboboxPortalContext();

  const modal = store.useState('modal');
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputGroupElement = store.useState('inputGroupElement');
  const inputInsidePopup = store.useState('inputInsidePopup');
  const transitionStatus = store.useState('transitionStatus');

  const empty = useListEmpty();
  const resolvedAnchor = () =>
    componentProps.anchor ??
    (inputInsidePopup() ? triggerElement() : (inputGroupElement() ?? inputElement()));

  const positioning = useAnchorPositioning({
    get anchor() {
      return resolvedAnchor();
    },
    floatingRootContext,
    get positionMethod() {
      return componentProps.positionMethod;
    },
    get mounted() {
      return mounted();
    },
    get side() {
      return componentProps.side;
    },
    get sideOffset() {
      return componentProps.sideOffset;
    },
    get align() {
      return componentProps.align;
    },
    get alignOffset() {
      return componentProps.alignOffset;
    },
    get arrowPadding() {
      return componentProps.arrowPadding;
    },
    get collisionBoundary() {
      return componentProps.collisionBoundary ?? 'clipping-ancestors';
    },
    get collisionPadding() {
      return componentProps.collisionPadding;
    },
    get sticky() {
      return componentProps.sticky;
    },
    get disableAnchorTracking() {
      return componentProps.disableAnchorTracking ?? false;
    },
    get keepMounted() {
      return keepMounted();
    },
    get collisionAvoidance() {
      return componentProps.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;
    },
    lazyFlip: true,
  });

  useAnchoredPopupScrollLock(
    () => open() && modal(),
    () => openMethod() === 'touch',
    positionerElement,
    triggerElement,
  );

  const state = createMemo<ComboboxPositionerState>(() => ({
    open: open(),
    side: positioning.side,
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
    empty: empty(),
  }));

  useIsoLayoutEffect(
    ([side]) => {
      store.set('popupSide', side);
    },
    () => [positioning.side, store] as const,
  );

  const setPositionerElement = (element: HTMLDivElement | null) => {
    store.set('positionerElement', element);
  };

  return (
    <ComboboxPositionerContext value={positioning}>
      <Show when={mounted() && modal()}>
        <InternalBackdrop
          inert={inertValue(!open())}
          cutout={inputGroupElement() ?? inputElement() ?? triggerElement()}
        />
      </Show>
      {usePositioner(componentProps, state, {
        get styles() {
          return positioning.positionerStyles;
        },
        get transitionStatus() {
          return transitionStatus();
        },
        props: elementProps as HTMLProps<HTMLDivElement>,
        refs: [setPositionerElement],
        get hidden() {
          return !mounted();
        },
        get inert() {
          return !open();
        },
      })}
    </ComboboxPositionerContext>
  );
}

export interface ComboboxPositionerState {
  /**
   * Whether the popup is currently open.
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
   * Whether there are no items to display.
   */
  empty: boolean;
}

export interface ComboboxPositionerProps
  extends
    UseAnchorPositioningSharedParameters,
    BaseUIComponentProps<'div', ComboboxPositionerState> {}

export namespace ComboboxPositioner {
  export type State = ComboboxPositionerState;
  export type Props = ComboboxPositionerProps;
}

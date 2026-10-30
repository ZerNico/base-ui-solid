import { Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxPositionerContext } from './ComboboxPositionerContext';
import { useListEmpty } from '../utils/parts';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxPortalContext } from '../portal/ComboboxPortalContext';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../internals/constants';
import { InternalBackdrop } from '../../utils/popups/InternalBackdrop';
import { usePopupPositioner } from '../../utils/popups/popupPositioner';
import { useAnchoredPopupScrollLock } from '../../utils/popups/useAnchoredPopupScrollLock';

/**
 * Positions the popup against the trigger.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxPositioner(componentProps: ComboboxPositioner.Props): JSX.Element {
  const store = useComboboxRootContext();
  const keepMounted = useComboboxPortalContext();

  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const inputElement = store.useState('inputElement');
  const inputGroupElement = store.useState('inputGroupElement');
  const inputInsidePopup = store.useState('inputInsidePopup');

  const empty = useListEmpty();

  const { element, positioning, open, mounted } =
    usePopupPositioner<ComboboxPositionerInternalState>(store, componentProps, {
      keepMounted,
      positioning: {
        get anchor() {
          return (
            componentProps.anchor ??
            (inputInsidePopup() ? triggerElement() : (inputGroupElement() ?? inputElement()))
          );
        },
        get collisionAvoidance() {
          return componentProps.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;
        },
        lazyFlip: true,
      },
      state: () => ({ empty: empty() }),
    });

  useAnchoredPopupScrollLock(
    () => open() && modal(),
    () => openMethod() === 'touch',
    positionerElement,
    triggerElement,
  );

  useIsoLayoutEffect(
    ([side]) => {
      store.set('popupSide', side);
    },
    () => [positioning.side, store] as const,
  );

  return (
    <ComboboxPositionerContext value={positioning}>
      <Show when={mounted() && modal()}>
        <InternalBackdrop
          inert={inertValue(!open())}
          cutout={inputGroupElement() ?? inputElement() ?? triggerElement()}
        />
      </Show>
      {element()}
    </ComboboxPositionerContext>
  );
}

// The shared positioner state also carries `instant`, which a combobox never sets.
type ComboboxPositionerInternalState = ComboboxPositionerState & { instant: undefined };

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

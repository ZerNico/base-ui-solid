import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useStore } from '@base-ui-solid/utils/store';
import type { Side } from '../../../internals/useAnchorPositioning';
import { BasePopupStore, popupStoreSelectors } from '../store';
import type { PopupOpenChangeEventDetails, PopupStoreContext, PopupStoreState } from '../store';

/**
 * State common to popups that pick a value from a list of items: Select, Combobox and
 * Autocomplete.
 */
export type ValuePopupState = PopupStoreState<unknown> & {
  id: string | undefined;
  labelId: string | undefined;

  itemToStringLabel?: ((item: any) => string) | undefined;
  isItemEqualToValue: (itemValue: any, selectedValue: any) => boolean;

  selectedValue: any;
  selectionMode: 'single' | 'multiple' | 'none';

  /**
   * Whether the popup subtree is mounted while closed, so the items can register.
   */
  forceMounted: boolean;
  openMethod: InteractionType | null;

  activeIndex: number | null;
  selectedIndex: number | null;

  triggerElement: HTMLElement | null;
  listElement: HTMLElement | null;
  popupSide: Side | null;

  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  modal: boolean;
};

/**
 * Non-reactive values common to popups that pick a value from a list of items.
 */
export type ValuePopupContext<ChangeEventDetails> = PopupStoreContext<ChangeEventDetails> & {
  /** Item elements in list order. */
  readonly listRef: RefObject<Array<HTMLElement | null>>;
  /** Item text labels in list order, used for typeahead. */
  readonly labelsRef: RefObject<Array<string | null>>;
  /** Item values in list order. */
  readonly valuesRef: RefObject<Array<any>>;
};

type S = ValuePopupState;

export const valuePopupSelectors = {
  ...popupStoreSelectors,
  id: (state: S) => state.id,
  labelId: (state: S) => state.labelId,

  itemToStringLabel: (state: S) => state.itemToStringLabel,
  isItemEqualToValue: (state: S) => state.isItemEqualToValue,

  selectedValue: (state: S) => state.selectedValue,
  selectionMode: (state: S) => state.selectionMode,

  forceMounted: (state: S) => state.forceMounted,
  openMethod: (state: S) => state.openMethod,

  activeIndex: (state: S) => state.activeIndex,
  selectedIndex: (state: S) => state.selectedIndex,
  isActive: (state: S, index: number) => state.activeIndex === index,

  triggerElement: (state: S) => state.triggerElement,
  listElement: (state: S) => state.listElement,
  popupSide: (state: S) => state.popupSide,
  // The popup anchors to the element the Root keeps in `anchorElement` rather than to the element
  // that opened it.
  anchor: (state: S) => state.anchorOverride ?? state.anchorElement,

  disabled: (state: S) => state.disabled,
  readOnly: (state: S) => state.readOnly,
  required: (state: S) => state.required,
  modal: (state: S) => state.modal,
};

/**
 * The store of a popup that picks a value from a list of items. It has a single anchor (see
 * `getAnchorElement`) and no trigger registry.
 *
 * Port note: upstream restores `anchorElement` in a `setState` override. Here it's a reset the
 * Root derives (see `useAnchorState`).
 */
export abstract class ValuePopupStore<
  State extends ValuePopupState,
  Context extends ValuePopupContext<ChangeEventDetails>,
  Selectors extends Record<string, (state: Readonly<State>, ...args: any[]) => any>,
  ChangeEventDetails extends PopupOpenChangeEventDetails,
> extends BasePopupStore<State, Context, Selectors, ChangeEventDetails> {
  /**
   * Returns the element the popup belongs to, which the interaction hooks see as its anchor.
   */
  protected abstract getAnchorElement(state: Readonly<State>): Element | null;

  /**
   * Port note: a press on another element and positioning both change `anchorElement`, so it's
   * restored whenever the anchor, the open state or the positioner changes. Upstream does it in
   * `setState`, to keep it in the same commit as the change. Here it's a derived reset of the key,
   * so readers see it in the same flush, and a write to it (a trigger press or
   * `clearPositioning()`) is read until the next reset.
   */
  override useAnchorState() {
    super.useAnchorState();
    const anchorElement = useStore(this, (state: Readonly<State>) => this.getAnchorElement(state));
    const open = useStore(this, popupStoreSelectors.open);
    const positionerElement = useStore(this, (state: Readonly<State>) => state.positionerElement);
    this.useResetState(
      'anchorElement',
      () => {
        open();
        positionerElement();
        return { value: anchorElement() as State['anchorElement'] };
      },
      { everyRun: true },
    );
  }

  protected override anchorsToActiveTrigger() {
    return false;
  }
}

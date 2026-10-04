import { createMemo, createSignal, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useSelectFloatingContext, useSelectRootContext } from '../root/SelectRootContext';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Align,
  Side,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import { SelectPositionerContext } from './SelectPositionerContext';
import { InternalBackdrop } from '../../utils/InternalBackdrop';
import { DROPDOWN_COLLISION_AVOIDANCE } from '../../internals/constants';
import { clearStyles } from '../popup/utils';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { findItemIndex } from '../../internals/itemEquality';
import { usePositioner } from '../../utils/usePositioner';
import { useAnchoredPopupScrollLock } from '../../utils/useAnchoredPopupScrollLock';

const FIXED: JSX.CSSProperties = { position: 'fixed' };

/**
 * Positions the select popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectPositioner(componentProps: SelectPositioner.Props) {
  // `useAnchorPositioning` applies the same defaults to the undefined values; the names
  // remain omitted to exclude the props from `elementProps`.
  const elementProps = omit(
    componentProps,
    'anchor',
    'class',
    'render',
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
    'alignItemWithTrigger',
    'collisionAvoidance',
    'style',
  );
  const alignItemWithTrigger = () => componentProps.alignItemWithTrigger ?? true;

  const store = useSelectRootContext();
  const floatingRootContext = useSelectFloatingContext();

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const modal = store.useState('modal');
  const openMethod = store.useState('openMethod');
  const positionerElement = store.useState('positionerElement');
  const triggerElement = store.useState('triggerElement');
  const transitionStatus = store.useState('transitionStatus');

  const scrollUpArrowRef: SelectPositionerContext['scrollUpArrowRef'] = { current: null };
  const scrollDownArrowRef: SelectPositionerContext['scrollDownArrowRef'] = { current: null };

  // Port note: upstream resets the state during render while unmounted. A writable memo applies
  // the same rule whenever `mounted` or the prop changes.
  const [controlledAlignItemWithTrigger, setControlledAlignItemWithTriggerState] =
    createSignal<boolean>(
      (prev) => (!mounted() || prev === undefined ? alignItemWithTrigger() : prev),
      {
        ownedWrite: true,
      },
    );
  const setControlledAlignItemWithTrigger: SelectPositionerContext['setControlledAlignItemWithTrigger'] =
    (value) => {
      setControlledAlignItemWithTriggerState((prev) =>
        typeof value === 'function' ? value(prev) : value,
      );
    };
  const alignItemWithTriggerActive = createMemo(
    () => mounted() && controlledAlignItemWithTrigger() && openMethod() !== 'touch',
  );

  // Port note: counterpart of `React.useImperativeHandle(alignItemWithTriggerActiveRef, …)`.
  useIsoLayoutEffect(
    ([active]) => {
      store.context.alignItemWithTriggerActiveRef.current = active;
    },
    () => [alignItemWithTriggerActive()],
  );

  useAnchoredPopupScrollLock(
    () => (alignItemWithTriggerActive() || modal()) && open(),
    () => openMethod() === 'touch',
    positionerElement,
    triggerElement,
  );

  const positioning = useAnchorPositioning({
    get anchor() {
      return componentProps.anchor;
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
      return componentProps.disableAnchorTracking ?? alignItemWithTriggerActive();
    },
    get collisionAvoidance() {
      return componentProps.collisionAvoidance ?? DROPDOWN_COLLISION_AVOIDANCE;
    },
    keepMounted: true,
  });

  const renderedSide = () => (alignItemWithTriggerActive() ? 'none' : positioning.side);
  const positionerStyles = () =>
    alignItemWithTriggerActive() ? FIXED : positioning.positionerStyles;

  const state = createMemo<SelectPositionerState>(() => ({
    open: open(),
    side: renderedSide(),
    align: positioning.align,
    anchorHidden: positioning.anchorHidden,
  }));

  useIsoLayoutEffect(
    ([side]) => {
      store.set('popupSide', side);
    },
    () => [positioning.side],
  );

  const setPositionerElement = store.useStateSetter('positionerElement');

  // Port note: called inside the providers' JSX (see below), so the children are created under them.
  const renderElement = () =>
    usePositioner(componentProps, state, {
      get styles() {
        return positionerStyles();
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
    });

  let prevMapSize = 0;

  const onMapChange = (map: Map<Element, { index?: number | null | undefined } | null>) => {
    // Port note: rebuild from registered elements before reconciling selection. Solid runs the
    // list effect before item index effects, and keyed moves preserve the original item owners.
    store.context.valuesRef.current = store.context.listRef.current.map((element) =>
      element ? store.context.itemValues.get(element)?.() : undefined,
    );
    // Port note: upstream records the size after the empty-values bail-out. React runs the items'
    // layout effects (which fill `valuesRef`) before the list's, so the first map change already
    // sees the values; Solid runs the list's effect first, so the size is recorded before bailing
    // out, otherwise the first item update would be treated as the initial registration.
    const prevSize = prevMapSize;
    prevMapSize = map.size;

    if (store.context.valuesRef.current.length === 0) {
      return;
    }

    const eventDetails = createChangeEventDetails(REASONS.none);
    const value = store.state.value;
    const isItemEqualToValue = store.state.isItemEqualToValue;

    if (prevSize !== 0 && !store.state.multiple && value !== null) {
      const selectedValueIndex = findItemIndex(
        store.context.valuesRef.current,
        value,
        isItemEqualToValue,
      );
      if (selectedValueIndex === -1) {
        const initialSelectedValue = store.context.initialValueRef.current;
        const hasInitial =
          initialSelectedValue != null &&
          findItemIndex(
            store.context.valuesRef.current,
            initialSelectedValue,
            isItemEqualToValue,
          ) !== -1;
        const nextValue = hasInitial ? initialSelectedValue : null;
        store.context.setValue(nextValue, eventDetails);

        if (nextValue === null) {
          store.set('selectedIndex', null);
          store.context.selectedItemTextRef.current = null;
        }
      }
    }

    if (prevSize !== 0 && store.state.multiple && Array.isArray(value)) {
      const nextValue = value.filter(
        (selectedItemValue) =>
          findItemIndex(store.context.valuesRef.current, selectedItemValue, isItemEqualToValue) !==
          -1,
      );
      if (nextValue.length !== value.length) {
        store.context.setValue(nextValue, eventDetails);

        if (nextValue.length === 0) {
          store.set('selectedIndex', null);
          store.context.selectedItemTextRef.current = null;
        }
      }
    }

    if (store.state.open && untrack(alignItemWithTriggerActive)) {
      store.update({
        scrollUpArrowVisible: false,
        scrollDownArrowVisible: false,
      });

      const stylesToClear: JSX.CSSProperties = { height: '' };
      clearStyles(store.state.positionerElement, stylesToClear);
      clearStyles(store.context.popupRef.current, stylesToClear);
    }
  };

  const contextValue: SelectPositionerContext = {
    get positionerStyles() {
      return positioning.positionerStyles;
    },
    get arrowStyles() {
      return positioning.arrowStyles;
    },
    arrowRef: positioning.arrowRef,
    get arrowUncentered() {
      return positioning.arrowUncentered;
    },
    get align() {
      return positioning.align;
    },
    get physicalSide() {
      return positioning.physicalSide;
    },
    get anchorHidden() {
      return positioning.anchorHidden;
    },
    refs: positioning.refs,
    context: positioning.context,
    get isPositioned() {
      return positioning.isPositioned;
    },
    update: positioning.update,
    get side() {
      return renderedSide();
    },
    get alignItemWithTriggerActive() {
      return alignItemWithTriggerActive();
    },
    setControlledAlignItemWithTrigger,
    scrollUpArrowRef,
    scrollDownArrowRef,
  };

  return (
    <CompositeList
      elementsRef={store.context.listRef}
      labelsRef={store.context.labelsRef}
      onMapChange={onMapChange}
    >
      <SelectPositionerContext value={contextValue}>
        <Show when={mounted() && modal()}>
          <InternalBackdrop inert={inertValue(!open())} cutout={triggerElement()} />
        </Show>
        {renderElement()}
      </SelectPositionerContext>
    </CompositeList>
  );
}

export interface SelectPositionerState {
  /**
   * Whether the component is open.
   */
  open: boolean;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side | 'none';
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
}

export interface SelectPositionerProps
  extends UseAnchorPositioningSharedParameters, BaseUIComponentProps<'div', SelectPositionerState> {
  /**
   * Whether the positioner overlaps the trigger so the selected item's text is aligned with the trigger's value text. This only applies to mouse input and is automatically disabled if there is not enough space.
   * @default true
   */
  alignItemWithTrigger?: boolean | undefined;
}

export namespace SelectPositioner {
  export type State = SelectPositionerState;
  export type Props = SelectPositionerProps;
}

import { createMemo, createSignal, omit, untrack } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useCollapsibleRoot } from '../../collapsible/root/useCollapsibleRoot';
import type { CollapsibleRoot } from '../../collapsible/root/CollapsibleRoot';
import { CollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import type { AccordionRootState } from '../root/AccordionRoot';
import { useAccordionRootContext } from '../root/AccordionRootContext';
import { AccordionItemContext } from './AccordionItemContext';
import { accordionStateAttributesMapping } from './stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';

/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui-solid.pages.dev/solid/components/accordion)
 */
export function AccordionItem(componentProps: AccordionItem.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'disabled',
    'onOpenChange',
    'render',
    'value',
    'style',
  );

  const { ref: listItemRef, index } = useCompositeListItem();

  const {
    disabled: contextDisabled,
    handleValueChange,
    state: rootState,
    value: openValues,
  } = useAccordionRootContext();

  const fallbackValue = useBaseUiId();

  const value = () => componentProps.value ?? fallbackValue;

  const disabled = () => (componentProps.disabled ?? false) || contextDisabled();

  const isOpen = createMemo(() => openValues().includes(value()));

  const onOpenChange = (nextOpen: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => {
    componentProps.onOpenChange?.(nextOpen, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    handleValueChange(untrack(value), nextOpen, eventDetails);
  };

  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled,
  });

  const collapsibleContext: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange,
    state: createMemo(() => ({
      open: collapsible.open(),
      disabled: collapsible.disabled(),
      transitionStatus: collapsible.transitionStatus(),
    })),
  };

  const state = createMemo<AccordionItemState>(() => ({
    ...rootState(),
    hidden: !isOpen() && !collapsible.mounted(),
    index: index(),
    disabled: disabled(),
    open: isOpen(),
  }));

  const defaultTriggerId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the trigger unmounted.
  const [registeredTriggerId, setTriggerId] = createSignal<string | null | undefined>();
  const triggerId = () => {
    const registered = registeredTriggerId();
    return registered === null ? undefined : (registered ?? defaultTriggerId);
  };

  const accordionItemContext: AccordionItemContext = {
    defaultTriggerId,
    open: isOpen,
    state,
    setTriggerId,
    triggerId,
  };

  return (
    <CollapsibleRootContext value={collapsibleContext}>
      <AccordionItemContext value={accordionItemContext}>
        {useRenderElement('div', componentProps, {
          state,
          ref: listItemRef,
          props: elementProps,
          stateAttributesMapping: accordionStateAttributesMapping,
        })}
      </AccordionItemContext>
    </CollapsibleRootContext>
  );
}

export interface AccordionItemState extends AccordionRootState {
  /**
   * Whether the accordion item's panel is currently hidden.
   */
  hidden: boolean;
  /**
   * The item index.
   */
  index: number;
  /**
   * Whether the component is open.
   */
  open: boolean;
}

export interface AccordionItemProps extends BaseUIComponentProps<'div', AccordionItemState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * A unique value that identifies this accordion item.
   * If no value is provided, a unique ID will be generated automatically.
   * Use when controlling the accordion programmatically, or to set an initial
   * open state.
   * @example
   * ```tsx
   * <Accordion.Root value={['a']}>
   *   <Accordion.Item value="a" /> // initially open
   *   <Accordion.Item value="b" /> // initially closed
   * </Accordion.Root>
   * ```
   */
  value?: any;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: AccordionItem.ChangeEventDetails) => void) | undefined;
}

export type AccordionItemChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;

export type AccordionItemChangeEventDetails =
  BaseUIChangeEventDetails<AccordionItem.ChangeEventReason>;

export namespace AccordionItem {
  export type State = AccordionItemState;
  export type Props = AccordionItemProps;
  export type ChangeEventReason = AccordionItemChangeEventReason;
  export type ChangeEventDetails = AccordionItemChangeEventDetails;
}

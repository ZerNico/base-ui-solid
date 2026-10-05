import { omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../../collapsible/root/CollapsibleRootContext';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';

const stateAttributesMapping: StateAttributesMapping<AccordionItemState> = {
  ...accordionStateAttributesMapping,
  ...triggerOpenStateMapping,
};

/**
 * A button that opens and closes the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui-solid.pages.dev/solid/components/accordion)
 */
export function AccordionTrigger(componentProps: AccordionTrigger.Props) {
  const elementProps = omit(
    componentProps,
    'disabled',
    'class',
    'id',
    'render',
    'nativeButton',
    'style',
  );

  const { panelId, open, handleTrigger, disabled: contextDisabled } = useCollapsibleRootContext();

  const disabled = () =>
    (componentProps.disabled !== undefined && componentProps.disabled !== false) ||
    contextDisabled();

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: () => componentProps.nativeButton ?? true,
  });

  const { defaultTriggerId, state, setTriggerId } = useAccordionItemContext();
  const registeredId = () => componentProps.id || undefined;
  const id = () => registeredId() ?? defaultTriggerId;

  useIsoLayoutEffect(
    ([currentRegisteredId]) => {
      setTriggerId(
        (currentId) => currentRegisteredId ?? (currentId === null ? undefined : currentId),
      );
      return () => {
        setTriggerId((currentId) => (currentId === currentRegisteredId ? null : currentId));
      };
    },
    () => [registeredId()],
  );

  return useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: () => [
      {
        'aria-controls': open() ? panelId() : undefined,
        'aria-expanded': open(),
        id: id(),
        onClick: handleTrigger,
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });
}

export interface AccordionTriggerState extends AccordionItemState {}

export interface AccordionTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', AccordionTriggerState> {}

export namespace AccordionTrigger {
  export type State = AccordionTriggerState;
  export type Props = AccordionTriggerProps;
}

import { omit } from 'solid-js';
import { triggerOpenStateMapping } from '../../utils/collapsibleOpenStateMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { useCollapsibleRootContext } from '../root/CollapsibleRootContext';
import type { CollapsibleRootState } from '../root/CollapsibleRoot';

const stateAttributesMapping: StateAttributesMapping<CollapsibleRootState> = {
  ...triggerOpenStateMapping,
  ...transitionStatusMapping,
};

/**
 * A button that opens and closes the collapsible panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui.com/react/components/collapsible)
 */
export function CollapsibleTrigger(componentProps: CollapsibleTrigger.Props) {
  const {
    panelId,
    open,
    handleTrigger,
    state,
    disabled: contextDisabled,
  } = useCollapsibleRootContext();

  const elementProps = omit(
    componentProps,
    'class',
    'disabled',
    'render',
    'nativeButton',
    'style',
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled: () =>
      componentProps.disabled === undefined ? contextDisabled() : componentProps.disabled !== false,
    native: () => componentProps.nativeButton ?? true,
  });

  return useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: () => [
      {
        'aria-controls': open() ? panelId() : undefined,
        'aria-expanded': open(),
        onClick: handleTrigger,
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });
}

export interface CollapsibleTriggerState extends CollapsibleRootState {}

export interface CollapsibleTriggerProps
  extends NativeButtonProps, BaseUIComponentProps<'button', CollapsibleTriggerState> {}

export namespace CollapsibleTrigger {
  export type State = CollapsibleTriggerState;
  export type Props = CollapsibleTriggerProps;
}

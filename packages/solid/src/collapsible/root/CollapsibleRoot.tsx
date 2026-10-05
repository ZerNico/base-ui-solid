import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useCollapsibleRoot } from './useCollapsibleRoot';
import type { UseCollapsibleRootReturnValue } from './useCollapsibleRoot';
import { CollapsibleRootContext } from './CollapsibleRootContext';
import { collapsibleStateAttributesMapping } from './stateAttributesMapping';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';

/**
 * Groups all parts of the collapsible.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Collapsible](https://base-ui-solid.pages.dev/solid/components/collapsible)
 */
export function CollapsibleRoot(componentProps: CollapsibleRoot.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'defaultOpen',
    'disabled',
    'onOpenChange',
    'open',
    'style',
  );

  const onOpenChange: CollapsibleRootContext['onOpenChange'] = (open, eventDetails) => {
    componentProps.onOpenChange?.(open, eventDetails);
  };

  const collapsible = useCollapsibleRoot({
    open: () => componentProps.open,
    get defaultOpen() {
      return componentProps.defaultOpen ?? false;
    },
    onOpenChange,
    disabled: () => componentProps.disabled ?? false,
  });

  const state = createMemo<CollapsibleRootState>(
    () => ({
      open: collapsible.open(),
      disabled: collapsible.disabled(),
      transitionStatus: collapsible.transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const contextValue: CollapsibleRootContext = {
    ...collapsible,
    onOpenChange,
    state,
  };

  return (
    <CollapsibleRootContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: elementProps,
        stateAttributesMapping: collapsibleStateAttributesMapping,
      })}
    </CollapsibleRootContext>
  );
}

export interface CollapsibleRootState {
  open: boolean;
  disabled: boolean;
  transitionStatus: ReturnType<UseCollapsibleRootReturnValue['transitionStatus']>;
}

export interface CollapsibleRootProps extends BaseUIComponentProps<'div', CollapsibleRootState> {
  /**
   * Whether the collapsible panel is currently open.
   *
   * To render an uncontrolled collapsible, use the `defaultOpen` prop instead.
   */
  open?: boolean | undefined;
  /**
   * Whether the collapsible panel is initially open.
   *
   * To render a controlled collapsible, use the `open` prop instead.
   * @default false
   */
  defaultOpen?: boolean | undefined;
  /**
   * Event handler called when the panel is opened or closed.
   */
  onOpenChange?:
    ((open: boolean, eventDetails: CollapsibleRootChangeEventDetails) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export type CollapsibleRootChangeEventReason = typeof REASONS.triggerPress | typeof REASONS.none;
export type CollapsibleRootChangeEventDetails =
  BaseUIChangeEventDetails<CollapsibleRootChangeEventReason>;

export namespace CollapsibleRoot {
  export type State = CollapsibleRootState;
  export type Props = CollapsibleRootProps;
  export type ChangeEventReason = CollapsibleRootChangeEventReason;
  export type ChangeEventDetails = CollapsibleRootChangeEventDetails;
}

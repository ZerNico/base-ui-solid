import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useProgressRootContext } from '../root/ProgressRootContext';
import type { ProgressRootState } from '../root/ProgressRoot';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'children', 'style');

  const { value, formattedValue, state } = useProgressRootContext();

  const element = useRenderElement('span', componentProps, {
    state,
    props: () => {
      // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
      // has no formatted text to show.
      const indeterminate = state().status === 'indeterminate';
      const formattedValueArg = indeterminate ? 'indeterminate' : formattedValue();
      const formattedValueDisplay = indeterminate ? null : formattedValue();
      // Port note: read in the props accessor so the children are re-created when they change,
      // like upstream's re-render calls the `children` function again.
      const children = componentProps.children;
      const currentValue = value();
      return [
        {
          'aria-hidden': true,
          get children() {
            return typeof children === 'function'
              ? children(formattedValueArg, currentValue)
              : formattedValueDisplay;
          },
        },
        elementProps,
      ];
    },
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return element;
}

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps extends Omit<
  BaseUIComponentProps<'span', ProgressValueState>,
  'children'
> {
  children?:
    null | ((formattedValue: string | null, value: number | null) => JSX.Element) | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}

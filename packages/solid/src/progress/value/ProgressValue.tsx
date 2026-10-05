import { createMemo, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
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
 * Documentation: [Base UI Progress](https://base-ui-solid.pages.dev/solid/components/progress)
 */
export function ProgressValue(componentProps: ProgressValue.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'children', 'style');

  const { value, formattedValue, state } = useProgressRootContext();

  // Follow `status` rather than re-deriving it: a non-finite `value` is also indeterminate, and
  // has no formatted text to show.
  const indeterminate = () => state().status === 'indeterminate';
  const formattedValueArg = () => (indeterminate() ? 'indeterminate' : formattedValue());

  // Port note: upstream calls the `children` function on every render. Here it's called once (again
  // only if the function itself changes) with accessors, so its DOM updates in place.
  const childrenProp = createMemo(() => componentProps.children);
  const renderedChildren = createMemo(() => {
    const children = childrenProp();
    return typeof children === 'function'
      ? untrack(() => children(formattedValueArg, value))
      : undefined;
  });

  const childrenSource = {
    get children(): JSX.Element {
      if (typeof childrenProp() === 'function') {
        return renderedChildren();
      }
      return indeterminate() ? null : formattedValue();
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    props: () => [{ 'aria-hidden': true }, childrenSource, elementProps],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return element;
}

export interface ProgressValueState extends ProgressRootState {}

export interface ProgressValueProps extends Omit<
  BaseUIComponentProps<'span', ProgressValueState>,
  'children'
> {
  /**
   * A function called once with accessors of the formatted value (`'indeterminate'` while the
   * value is indeterminate) and the raw value.
   */
  children?:
    | null
    | ((formattedValue: Accessor<string | null>, value: Accessor<number | null>) => JSX.Element)
    | undefined;
}

export namespace ProgressValue {
  export type State = ProgressValueState;
  export type Props = ProgressValueProps;
}

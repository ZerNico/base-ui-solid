import { createMemo, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useMeterRootContext } from '../root/MeterRootContext';
import type { MeterRootState } from '../root/MeterRoot';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A text element displaying the current value.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Meter](https://base-ui.com/react/components/meter)
 */
export function MeterValue(componentProps: MeterValue.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'children', 'style');

  const { value, formattedValue } = useMeterRootContext();

  // Port note: upstream calls the `children` function on every render. Here it's called once (again
  // only if the function itself changes) with accessors, so its DOM updates in place.
  const childrenProp = createMemo(() => componentProps.children);
  const renderedChildren = createMemo(() => {
    const children = childrenProp();
    return typeof children === 'function'
      ? untrack(() => children(formattedValue, value))
      : undefined;
  });

  const childrenSource = {
    get children(): JSX.Element {
      return typeof childrenProp() === 'function' ? renderedChildren() : formattedValue();
    },
  };

  return useRenderElement('span', componentProps, {
    props: () => [{ 'aria-hidden': true }, childrenSource, elementProps],
  });
}

export interface MeterValueState extends MeterRootState {}

export interface MeterValueProps extends Omit<
  BaseUIComponentProps<'span', MeterValueState>,
  'children'
> {
  /**
   * A function called once with accessors of the formatted value and the raw value.
   */
  children?:
    null | ((formattedValue: Accessor<string>, value: Accessor<number>) => JSX.Element) | undefined;
}

export namespace MeterValue {
  export type State = MeterValueState;
  export type Props = MeterValueProps;
}

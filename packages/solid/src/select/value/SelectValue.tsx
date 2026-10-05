import { createMemo, omit, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../internals/resolveValueLabel';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';

const stateAttributesMapping: StateAttributesMapping<SelectValueState> = {
  value: () => null,
};

/**
 * A text label of the currently selected item.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectValue(componentProps: SelectValue.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'children', 'placeholder', 'style');

  const store = useSelectRootContext();

  const value = store.useState('value');
  const items = store.useState('items');
  const itemToStringLabel = store.useState('itemToStringLabel');
  const hasSelectedValue = store.useState('hasSelectedValue');

  // Port note: JSX `children`/`placeholder` are created when read, so they're read through memos
  // (re-created only when their own reactive dependencies change, like a React re-render).
  const childrenProp = createMemo(() => componentProps.children);
  const placeholder = createMemo(() => componentProps.placeholder);

  const shouldCheckNullItemLabel = () =>
    !hasSelectedValue() && placeholder() != null && childrenProp() == null;
  const hasNullLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  const state = createMemo<SelectValueState>(() => ({
    value: value(),
    placeholder: !hasSelectedValue(),
  }));

  // Port note: upstream calls a `children` function on every render. Here it's called once (again
  // only if the function itself changes) with an accessor of the value, so its DOM updates in place.
  const renderedChildren = createMemo(() => {
    const currentChildren = childrenProp();
    return typeof currentChildren === 'function'
      ? untrack(() => currentChildren(value))
      : undefined;
  });

  // Port note: a stable children source whose getter is evaluated reactively by the rendered
  // element, so the label updates in place.
  const childrenSource = {
    get children(): JSX.Element {
      const currentChildren = childrenProp();
      if (typeof currentChildren === 'function') {
        return renderedChildren();
      }
      const currentValue = value();
      if (currentChildren != null) {
        return currentChildren;
      }
      if (shouldCheckNullItemLabel() && !hasNullLabel()) {
        return placeholder();
      }
      if (Array.isArray(currentValue)) {
        return resolveMultipleLabels(currentValue, items(), itemToStringLabel());
      }
      return resolveSelectedLabel(currentValue, items(), itemToStringLabel());
    },
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: [
      (node: HTMLSpanElement | null) => {
        store.context.valueRef.current = node;
      },
    ],
    props: () => [childrenSource, elementProps],
    stateAttributesMapping,
  });

  return element;
}

export interface SelectValueState {
  /**
   * The value of the currently selected item.
   */
  value: any;
  /**
   * Whether the placeholder is being displayed.
   */
  placeholder: boolean;
}

export interface SelectValueProps extends Omit<
  BaseUIComponentProps<'span', SelectValueState>,
  'children'
> {
  /**
   * Accepts a function that returns a `JSX.Element` to format the selected value.
   * The function is called once with an accessor of the value.
   * Treat the value as read-only: in `multiple` mode it may be a shared frozen array
   * when nothing is selected.
   * @example
   * ```tsx
   * <Select.Value>
   *   {(value: Accessor<string | null>) => (value() ? labels[value()!] : 'No value')}
   * </Select.Value>
   * ```
   */
  children?: JSX.Element | ((value: Accessor<any>) => JSX.Element) | undefined;
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: JSX.Element | undefined;
}

export namespace SelectValue {
  export type State = SelectValueState;
  export type Props = SelectValueProps;
}

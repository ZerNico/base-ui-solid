import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { resolveMultipleLabels, resolveSelectedLabel } from '../../internals/resolveValueLabel';

/**
 * The current value of the combobox.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxValue(props: ComboboxValue.Props): JSX.Element {
  const store = useComboboxRootContext();

  const itemToStringLabel = store.useState('itemToStringLabel');
  const selectedValue = store.useState('selectedValue');
  const items = store.useState('items');
  const selectionMode = store.useState('selectionMode');
  const hasSelectedValue = store.useState('hasSelectedValue');

  // Port note: JSX `children`/`placeholder` are created when read, so they're read through memos
  // (re-created only when their own reactive dependencies change, like a React re-render).
  const childrenProp = createMemo(() => props.children);
  const placeholder = createMemo(() => props.placeholder);

  const shouldCheckNullItemLabel = () =>
    !hasSelectedValue() && placeholder() != null && childrenProp() == null;
  const hasNullLabel = store.useState('hasNullItemLabel', shouldCheckNullItemLabel);

  // Port note: upstream calls a `children` function on every render. Here it's called once (again
  // only if the function itself changes) with an accessor of the value, so its DOM updates in place.
  const renderedChildren = createMemo(() => {
    const currentChildren = childrenProp();
    return typeof currentChildren === 'function'
      ? untrack(() => currentChildren(selectedValue))
      : undefined;
  });

  const children = createMemo((): JSX.Element => {
    const currentChildren = childrenProp();

    if (typeof currentChildren === 'function') {
      return renderedChildren();
    }
    const currentSelectedValue = selectedValue();
    const multiple = selectionMode() === 'multiple';
    if (currentChildren != null) {
      return currentChildren;
    }
    if (!hasSelectedValue() && placeholder() != null && !hasNullLabel()) {
      return placeholder();
    }
    if (multiple && Array.isArray(currentSelectedValue)) {
      return resolveMultipleLabels(currentSelectedValue, items(), itemToStringLabel());
    }
    return resolveSelectedLabel(currentSelectedValue, items(), itemToStringLabel());
  });

  return <>{children()}</>;
}

export interface ComboboxValueState {}

export interface ComboboxValueProps {
  /**
   * Accepts a function that returns a `JSX.Element` to format the selected value.
   * The function is called once with an accessor of the selected value.
   * Treat the value as read-only: in `multiple` mode it may be a shared frozen array
   * when nothing is selected.
   */
  children?: JSX.Element | ((selectedValue: Accessor<any>) => JSX.Element) | undefined;
  /**
   * The placeholder value to display when no value is selected.
   * This is overridden by `children` if specified, or by a null item's label in `items`.
   */
  placeholder?: JSX.Element | undefined;
}

export namespace ComboboxValue {
  export type State = ComboboxValueState;
  export type Props = ComboboxValueProps;
}

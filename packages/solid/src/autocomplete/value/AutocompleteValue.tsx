import { createMemo, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useComboboxInputValueContext } from '../../combobox/root/ComboboxRootContext';

/**
 * The current value of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui-solid.pages.dev/solid/components/autocomplete)
 */
export function AutocompleteValue(props: AutocompleteValue.Props): JSX.Element {
  const inputValue = useComboboxInputValueContext();
  const value = () => String(inputValue());
  // Port note: upstream calls a `children` function on every render. Here it's called once (again
  // only if the function itself changes) with an accessor of the value, so its DOM updates in place.
  const children = createMemo(() => props.children);
  const returnValue = createMemo(() => {
    const currentChildren = children();
    if (typeof currentChildren === 'function') {
      return untrack(() => currentChildren(value));
    }
    return currentChildren != null ? currentChildren : inputValue();
  });
  return <>{returnValue()}</>;
}

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  /**
   * The content, or a function called once with an accessor of the input value.
   */
  children?: JSX.Element | ((value: Accessor<string>) => JSX.Element) | undefined;
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}

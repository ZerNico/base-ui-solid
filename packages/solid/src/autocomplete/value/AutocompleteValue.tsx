import { createMemo } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useComboboxInputValueContext } from '../../combobox/root/ComboboxRootContext';

/**
 * The current value of the autocomplete.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Autocomplete](https://base-ui.com/react/components/autocomplete)
 */
export function AutocompleteValue(props: AutocompleteValue.Props): JSX.Element {
  const inputValue = useComboboxInputValueContext();
  // Port note: resolve children in a memo so the current input value remains reactive.
  const children = createMemo(() => props.children);
  const returnValue = createMemo(() => {
    const currentChildren = children();
    if (typeof currentChildren === 'function') {
      return currentChildren(String(inputValue()));
    }
    return currentChildren != null ? currentChildren : inputValue();
  });
  return <>{returnValue()}</>;
}

export interface AutocompleteValueState {}

export interface AutocompleteValueProps {
  children?: JSX.Element | ((value: string) => JSX.Element) | undefined;
}

export namespace AutocompleteValue {
  export type State = AutocompleteValueState;
  export type Props = AutocompleteValueProps;
}

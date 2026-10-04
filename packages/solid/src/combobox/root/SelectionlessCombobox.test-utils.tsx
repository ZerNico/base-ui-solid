import { omit } from 'solid-js';
import { Combobox } from '../index';
import { AriaCombobox } from './AriaCombobox';

// Port note: these upstream Combobox tests exercise AriaCombobox's selectionMode="none".
// Keep the fixture local while the public Autocomplete wrapper is ported in a later wave.
function Root(
  props: Omit<AriaCombobox.Props<any>, 'selectionMode'> & {
    value?: string | undefined;
    defaultValue?: string | undefined;
  },
) {
  const rest = omit(props, 'value', 'defaultValue');
  return (
    <AriaCombobox
      {...rest}
      selectionMode="none"
      inputValue={props.value}
      defaultInputValue={props.defaultValue}
    />
  );
}

export const SelectionlessCombobox = { ...Combobox, Root };

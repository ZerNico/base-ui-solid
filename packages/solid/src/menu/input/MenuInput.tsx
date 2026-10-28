import { omit, merge } from 'solid-js';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { ownerDocument } from '@base-ui-solid/utils/owner';

import { FilterDropdownInput } from '../../filter-dropdown/input/FilterDropdownInput';
import type {
  FilterDropdownInputProps,
  FilterDropdownInputState,
} from '../../filter-dropdown/input/FilterDropdownInput';
import { useFilterDropdownValueContext } from '../../filter-dropdown/root/FilterDropdownRootContext';
import { mergePropsSnapshot } from '../../merge-props/mergeProps';
import { activeElement } from '../../utils/popups/element';
import { useMenuFilterKeyDown } from '../filter-root/useMenuFilterKeyDown';
import { useMenuFilterPart } from '../filter-root/MenuFilterContext';
import { useMenuRootContext } from '../root/MenuRootContext';

const mountedInputs = new WeakMap<object, HTMLInputElement>();

/**
 * A search field that filters the menu items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuInput(componentProps: MenuInput.Props) {
  useMenuFilterPart('Input');
  const { store } = useMenuRootContext();
  const value = useFilterDropdownValueContext();

  const navigation = store.useState('inputProps');
  const navigationProps = merge(() => omit(navigation(), 'onKeyDown'));
  const activeItemId = store.useState('highlightedItemId');

  const handleKeyDown = useMenuFilterKeyDown(() => value() !== '');
  // Port note: Solid refs aren't called with `null` on unmount, so a cleanup covers input
  // removal without blur. A replaced input is disposed after its replacement mounts, so only the
  // most recently mounted input of the menu may clear the state.
  let inputElement: HTMLInputElement | null = null;
  const handleInputRef = (input: HTMLInputElement) => {
    inputElement = input;
    mountedInputs.set(store, input);
    store.set('inputFocused', activeElement(ownerDocument(input)) === input);
  };
  onCleanupWithWrites(() => {
    if (inputElement !== null && mountedInputs.get(store) === inputElement) {
      mountedInputs.delete(store);
      store.set('inputFocused', false);
    }
  });

  const inputProps = merge(() =>
    mergePropsSnapshot<typeof FilterDropdownInput>(
      {
        onKeyDown: handleKeyDown,
        // Port note: React's `onFocus`/`onBlur` bubble like `focusin`/`focusout`.
        onFocusIn() {
          store.set('inputFocused', true);
        },
        onFocusOut() {
          store.set('inputFocused', false);
        },
        ref: handleInputRef,
      },
      componentProps,
    ),
  );

  return (
    <FilterDropdownInput
      {...inputProps}
      activeItemId={activeItemId()}
      navigationProps={navigationProps}
    />
  );
}

export interface MenuInputState extends FilterDropdownInputState {}
export interface MenuInputProps extends FilterDropdownInputProps {}

export namespace MenuInput {
  export type State = MenuInputState;
  export type Props = MenuInputProps;
}

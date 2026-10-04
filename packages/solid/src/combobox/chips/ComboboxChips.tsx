import { createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { ComboboxChipsContext } from './ComboboxChipsContext';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { handleInputPress } from '../utils/handleInputPress';

/**
 * A container for the chips in a multiselectable input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxChips(componentProps: ComboboxChips.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useComboboxRootContext();

  const open = store.useState('open');
  const hasSelectionChips = store.useState('hasSelectionChips');

  // Port note: upstream resets the highlighted chip during render while the popup is open.
  const [highlightedChipIndexState, setHighlightedChipIndexState] = createSignal<
    number | undefined
  >((prev) => (open() ? undefined : prev), { ownedWrite: true });
  const highlightedChipIndex = () => (open() ? undefined : highlightedChipIndexState());
  const setHighlightedChipIndex = (index: number | undefined) => {
    setHighlightedChipIndexState(() => index);
  };

  const chipsRef: RefObject<Array<HTMLButtonElement | null>> = { current: [] };

  const contextValue: ComboboxChipsContext = {
    highlightedChipIndex,
    setHighlightedChipIndex,
    chipsRef,
  };

  return (
    <ComboboxChipsContext value={contextValue}>
      <CompositeList elementsRef={chipsRef}>
        {useRenderElement('div', componentProps, {
          ref: [
            (element: HTMLDivElement | null) => {
              store.context.chipsContainerRef.current = element;
            },
          ],
          // NVDA enters browse mode instead of staying in focus mode when navigating with
          // arrow keys inside a container unless it has a toolbar role.
          props: () => [
            hasSelectionChips() ? { role: 'toolbar' } : EMPTY_OBJECT,
            {
              onMouseDown(event: MouseEvent) {
                handleInputPress(event, store, store.state.disabled);
              },
            },
            elementProps,
          ],
        })}
      </CompositeList>
    </ComboboxChipsContext>
  );
}

export interface ComboboxChipsState {}

export interface ComboboxChipsProps extends BaseUIComponentProps<'div', ComboboxChipsState> {}

export namespace ComboboxChips {
  export type State = ComboboxChipsState;
  export type Props = ComboboxChipsProps;
}

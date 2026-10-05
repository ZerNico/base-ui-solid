import { omit, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useSelectRootContext } from '../root/SelectRootContext';
import { useSelectItemContext } from '../item/SelectItemContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A text label of the select item.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectItemText(componentProps: SelectItemText.Props) {
  const { index, textRef, selectedByFocus } = useSelectItemContext();
  const store = useSelectRootContext();

  const elementProps = omit(componentProps, 'render', 'class', 'style');

  // Port note: upstream recreates this callback ref when `index` or `selectedByFocus` change,
  // which re-runs it. The effect below re-applies it the same way.
  let node: HTMLElement | null = null;
  const applyLocalRef = () => {
    if (!node) {
      return;
    }

    if (untrack(index) === 0) {
      store.context.firstItemTextRef.current = node;
    }
    if (untrack(selectedByFocus)) {
      store.context.selectedItemTextRef.current = node;
    }
  };
  const localRef = (element: HTMLElement | null) => {
    node = element;
    applyLocalRef();
  };

  useIsoLayoutEffect(applyLocalRef, () => [index(), selectedByFocus()]);

  const element = useRenderElement('div', componentProps, {
    ref: [
      localRef,
      (element: HTMLElement | null) => {
        textRef.current = element;
      },
    ],
    props: elementProps,
  });

  return element;
}

export interface SelectItemTextState {}

export interface SelectItemTextProps extends BaseUIComponentProps<'div', SelectItemTextState> {}

export namespace SelectItemText {
  export type State = SelectItemTextState;
  export type Props = SelectItemTextProps;
}

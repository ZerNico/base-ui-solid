import { createSignal, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { SelectGroupContext } from './SelectGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups related select items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui.com/react/components/select)
 */
export function SelectGroup(componentProps: SelectGroup.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const [labelId, setLabelIdState] = createSignal<string | undefined>(undefined, {
    ownedWrite: true,
  });
  const setLabelId: SelectGroupContext['setLabelId'] = (value) => {
    setLabelIdState((prev) => (typeof value === 'function' ? value(prev) : value));
  };

  const contextValue: SelectGroupContext = {
    labelId,
    setLabelId,
  };

  return (
    <SelectGroupContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        props: () => [
          {
            role: 'group',
            'aria-labelledby': labelId(),
          },
          elementProps,
        ],
      })}
    </SelectGroupContext>
  );
}

export interface SelectGroupState {}

export interface SelectGroupProps extends BaseUIComponentProps<'div', SelectGroupState> {}

export namespace SelectGroup {
  export type State = SelectGroupState;
  export type Props = SelectGroupProps;
}

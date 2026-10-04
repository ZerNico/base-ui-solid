import { createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useMenuFilterImpl } from '../filter-root/MenuFilterContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { MenuGroupContext } from './MenuGroupContext';

export function MenuGroupPlain(componentProps: MenuGroup.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const [labelId, setLabelId] = createSignal<string | undefined>(undefined);

  return (
    <MenuGroupContext value={setLabelId}>
      {useRenderElement('div', componentProps, {
        props: () => [
          {
            role: 'group',
            'aria-labelledby': labelId(),
          },
          elementProps,
        ],
      })}
    </MenuGroupContext>
  );
}

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuGroup(props: MenuGroup.Props) {
  const Group = useMenuFilterImpl()?.Group ?? MenuGroupPlain;
  return <Group {...props} />;
}

export interface MenuGroupProps extends BaseUIComponentProps<'div', MenuGroupState> {
  /**
   * The content of the component.
   */
  children?: JSX.Element | undefined;
}

export interface MenuGroupState {}

export namespace MenuGroup {
  export type Props = MenuGroupProps;
  export type State = MenuGroupState;
}

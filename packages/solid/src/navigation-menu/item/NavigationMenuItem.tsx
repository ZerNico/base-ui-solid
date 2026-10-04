import { omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { NavigationMenuItemContextValue } from './NavigationMenuItemContext';
import { NavigationMenuItemContext } from './NavigationMenuItemContext';
import { useBaseUiId } from '../../internals/useBaseUiId';

/**
 * An individual navigation menu item.
 * Renders a `<li>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui.com/react/components/navigation-menu)
 */
export function NavigationMenuItem(componentProps: NavigationMenuItem.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'value');

  const fallbackValue = useBaseUiId();
  const value = () => componentProps.value ?? fallbackValue;

  const contextValue: NavigationMenuItemContextValue = { value };

  return (
    <NavigationMenuItemContext value={contextValue}>
      {useRenderElement('li', componentProps, {
        props: elementProps,
      })}
    </NavigationMenuItemContext>
  );
}

export interface NavigationMenuItemState {}

export interface NavigationMenuItemProps extends BaseUIComponentProps<
  'li',
  NavigationMenuItemState
> {
  /**
   * A unique value that identifies this navigation menu item.
   * If no value is provided, a unique ID will be generated automatically.
   * Use when controlling the navigation menu programmatically.
   */
  value?: any;
}

export namespace NavigationMenuItem {
  export type State = NavigationMenuItemState;
  export type Props = NavigationMenuItemProps;
}

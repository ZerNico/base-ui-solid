import { omit } from 'solid-js';
import { Menu } from 'base-ui-solid/menu';
import type { ComponentProps } from 'solid-js';
import type { JSX } from '@solidjs/web';
import './Menu.css';

// Port note: replaces `clsx`. Base UI's `class` can be a function of the state.
function withClass<State>(
  base: string,
  value: JSX.ClassValue | ((state: State) => JSX.ClassValue),
) {
  return (state: State) => [base, typeof value === 'function' ? value(state) : value];
}

export const Root = Menu.Root;

export const Trigger = Menu.Trigger;

// Port note: `class` applies to the popup, so it takes the popup's state.
export function Popup(
  props: Omit<ComponentProps<typeof Menu.Positioner>, 'class'> &
    Pick<ComponentProps<typeof Menu.Popup>, 'class'>,
) {
  const positionerProps = omit(props, 'children', 'class', 'sideOffset');
  return (
    <Menu.Portal>
      <Menu.Positioner
        sideOffset={props.sideOffset ?? 8}
        class="MenuPositioner"
        {...positionerProps}
      >
        <Menu.Popup class={withClass('MenuPopup', props.class)}>{props.children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function Item(props: ComponentProps<typeof Menu.Item>) {
  const itemProps = omit(props, 'children', 'class');
  return (
    <Menu.Item class={withClass('MenuItem', props.class)} {...itemProps}>
      {props.children}
    </Menu.Item>
  );
}

export function LinkItem(props: ComponentProps<typeof Menu.LinkItem>) {
  const itemProps = omit(props, 'children', 'class');
  return (
    <Menu.LinkItem class={withClass('MenuItem', props.class)} {...itemProps}>
      {props.children}
    </Menu.LinkItem>
  );
}

export function Separator(props: ComponentProps<typeof Menu.Separator>) {
  const separatorProps = omit(props, 'class');
  return <Menu.Separator class={withClass('MenuSeparator', props.class)} {...separatorProps} />;
}

import { omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { FloatingPortal } from '../../floating-ui-solid';
import type { BaseUIComponentProps } from '../../internals/types';
import { useComboboxRootContext } from '../root/ComboboxRootContext';
import { ComboboxPortalContext } from './ComboboxPortalContext';

/**
 * A portal element that moves the popup to a different part of the DOM.
 * By default, the portal element is appended to `<body>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxPortal(props: ComboboxPortal.Props): JSX.Element {
  const portalProps = omit(props, 'keepMounted');
  const keepMounted = () => props.keepMounted ?? false;

  const store = useComboboxRootContext();

  const mounted = store.useState('mounted');
  const forceMounted = store.useState('forceMounted');

  const shouldRender = () => mounted() || keepMounted() || forceMounted();

  return (
    <Show when={shouldRender()}>
      <ComboboxPortalContext value={keepMounted}>
        <FloatingPortal {...portalProps} />
      </ComboboxPortalContext>
    </Show>
  );
}

export interface ComboboxPortalState {}

export interface ComboboxPortalProps extends BaseUIComponentProps<'div', ComboboxPortalState> {
  /**
   * Whether to keep the portal mounted in the DOM while the popup is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
  /**
   * A parent element to render the portal element into.
   */
  container?:
    HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null | undefined;
}

export namespace ComboboxPortal {
  export type State = ComboboxPortalState;
  export type Props = ComboboxPortalProps;
}

import type { JSX } from '@solidjs/web';
import { DirectionContext } from '../internals/direction-context/DirectionContext';
import type { TextDirection } from '../internals/direction-context/DirectionContext';

/**
 * Enables RTL behavior for Base UI components.
 *
 * Documentation: [Base UI Direction Provider](https://base-ui.com/react/utils/direction-provider)
 */
export function DirectionProvider(props: DirectionProvider.Props) {
  const contextValue: DirectionContext = {
    direction: () => props.direction ?? 'ltr',
  };
  return <DirectionContext value={contextValue}>{props.children}</DirectionContext>;
}

export interface DirectionProviderState {}

export interface DirectionProviderProps {
  children?: JSX.Element | undefined;
  /**
   * The reading direction of the text
   * @default 'ltr'
   */
  direction?: TextDirection | undefined;
}

export namespace DirectionProvider {
  export type State = DirectionProviderState;
  export type Props = DirectionProviderProps;
}

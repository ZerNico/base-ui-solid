import type { JSX } from '@solidjs/web';
import { FloatingDelayGroup } from '../../floating-ui-solid';
import { TooltipProviderContext } from './TooltipProviderContext';

/**
 * Provides a shared delay for multiple tooltips. The grouping logic ensures that
 * once a tooltip becomes visible, the adjacent tooltips will be shown instantly.
 *
 * Documentation: [Base UI Tooltip](https://base-ui.com/react/components/tooltip)
 */
export function TooltipProvider(props: TooltipProvider.Props): JSX.Element {
  return (
    <TooltipProviderContext value={() => props.delay}>
      <FloatingDelayGroup
        delay={{ open: props.delay, close: props.closeDelay }}
        timeoutMs={props.timeout ?? 400}
      >
        {props.children}
      </FloatingDelayGroup>
    </TooltipProviderContext>
  );
}

export interface TooltipProviderState {}

export interface TooltipProviderProps {
  children?: JSX.Element | undefined;
  /**
   * How long to wait before opening the tooltip on hover. Specified in milliseconds.
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing a tooltip. Specified in milliseconds.
   */
  closeDelay?: number | undefined;
  /**
   * Another tooltip will open instantly if the previous tooltip
   * is closed within this timeout. Specified in milliseconds.
   * @default 400
   */
  timeout?: number | undefined;
}

export namespace TooltipProvider {
  export type State = TooltipProviderState;
  export type Props = TooltipProviderProps;
}

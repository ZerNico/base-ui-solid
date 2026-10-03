import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useRenderElement } from '../../internals/useRenderElement';
import type { ProgressRootState } from '../root/ProgressRoot';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * Visualizes the completion status of the task.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressIndicator(componentProps: ProgressIndicator.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { percentageValue, state } = useProgressRootContext();

  const indicatorStyle = (): JSX.CSSProperties => {
    const currentPercentageValue = percentageValue();
    return currentPercentageValue == null
      ? {}
      : {
          'inset-inline-start': 0,
          height: 'inherit',
          width: `${currentPercentageValue}%`,
        };
  };

  const element = useRenderElement('div', componentProps, {
    state,
    props: () => [
      {
        style: indicatorStyle(),
      },
      elementProps,
    ],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return element;
}

export interface ProgressIndicatorState extends ProgressRootState {}

export interface ProgressIndicatorProps extends BaseUIComponentProps<
  'div',
  ProgressIndicatorState
> {}

export namespace ProgressIndicator {
  export type State = ProgressIndicatorState;
  export type Props = ProgressIndicatorProps;
}

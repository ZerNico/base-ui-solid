import { omit } from 'solid-js';
import { useRenderElement } from '../../internals/useRenderElement';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { ProgressRootState } from '../root/ProgressRoot';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * Contains the progress bar indicator.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui.com/react/components/progress)
 */
export function ProgressTrack(componentProps: ProgressTrack.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state } = useProgressRootContext();

  const element = useRenderElement('div', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return element;
}

export interface ProgressTrackState extends ProgressRootState {}

export interface ProgressTrackProps extends BaseUIComponentProps<'div', ProgressTrackState> {}

export namespace ProgressTrack {
  export type State = ProgressTrackState;
  export type Props = ProgressTrackProps;
}

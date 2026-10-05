import { omit } from 'solid-js';
import { useRenderElement } from '../../internals/useRenderElement';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';
import { useProgressRootContext } from '../root/ProgressRootContext';
import { progressStateAttributesMapping } from '../root/stateAttributesMapping';
import type { ProgressRootState } from '../root/ProgressRoot';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * An accessible label for the progress bar.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Progress](https://base-ui-solid.pages.dev/solid/components/progress)
 */
export function ProgressLabel(componentProps: ProgressLabel.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { setLabelId, state } = useProgressRootContext();

  const id = useRegisteredLabelId(() => componentProps.id as string | undefined, setLabelId);

  const element = useRenderElement('span', componentProps, {
    state,
    props: () => [
      {
        id: id(),
        role: 'presentation',
      },
      elementProps,
    ],
    stateAttributesMapping: progressStateAttributesMapping,
  });

  return element;
}

export interface ProgressLabelState extends ProgressRootState {}

export interface ProgressLabelProps extends BaseUIComponentProps<'span', ProgressLabelState> {}

export namespace ProgressLabel {
  export type State = ProgressLabelState;
  export type Props = ProgressLabelProps;
}

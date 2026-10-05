import { createMemo, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useCheckboxRootContext } from '../root/CheckboxRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { getCheckboxStateAttributesMapping } from '../utils/getCheckboxStateAttributesMapping';
import type { CheckboxRootState } from '../root/CheckboxRoot';
import type { BaseUIComponentProps } from '../../internals/types';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';

/**
 * Indicates whether the checkbox is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Checkbox](https://base-ui-solid.pages.dev/solid/components/checkbox)
 */
export function CheckboxIndicator(componentProps: CheckboxIndicator.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'keepMounted');

  const rootState = useCheckboxRootContext();

  const rendered = () => rootState().checked || rootState().indeterminate;

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  let indicatorElement: HTMLSpanElement | null = null;

  const state = createMemo<CheckboxIndicatorState>(() => ({
    ...rootState(),
    transitionStatus: transitionStatus(),
  }));

  useOpenChangeComplete({
    batch: true,
    enabled: () => !rendered(),
    open: rendered,
    ref: () => indicatorElement,
    onComplete() {
      if (!untrack(rendered)) {
        setMounted(false);
      }
    },
  });

  const stateAttributesMapping: StateAttributesMapping<CheckboxIndicatorState> = {
    ...getCheckboxStateAttributesMapping(rootState),
    ...transitionStatusMapping,
  };

  const shouldRender = () => (componentProps.keepMounted ?? false) || mounted();

  return useRenderElement('span', componentProps, {
    enabled: shouldRender,
    ref: [
      (element: HTMLSpanElement | null) => {
        indicatorElement = element;
      },
    ],
    state,
    stateAttributesMapping,
    props: elementProps,
  });
}

export interface CheckboxIndicatorState extends CheckboxRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface CheckboxIndicatorProps extends BaseUIComponentProps<
  'span',
  CheckboxIndicatorState
> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace CheckboxIndicator {
  export type State = CheckboxIndicatorState;
  export type Props = CheckboxIndicatorProps;
}

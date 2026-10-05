import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { focusElementWithVisible, useLabel } from '../../internals/labelable-provider/useLabel';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { SliderRoot } from '../root/SliderRoot';
import { useSliderRootContext } from '../root/SliderRootContext';
import { sliderStateAttributesMapping } from '../root/stateAttributesMapping';

/**
 * An accessible label that is automatically associated with the slider thumbs.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Slider](https://base-ui-solid.pages.dev/solid/components/slider)
 */
export function SliderLabel(componentProps: SliderLabel.Props): JSX.Element {
  // Keep label id derived from the root and ignore runtime `id` overrides from untyped consumers.
  const elementProps = omit(
    componentProps as SliderLabel.Props & { id?: string | undefined },
    'render',
    'class',
    'style',
    'id',
  );

  const { state, setLabelId, controlRef, rootLabelId } = useSliderRootContext();

  function focusControl(event: MouseEvent, controlId: string | undefined) {
    if (controlId) {
      const root = (event.currentTarget as Element).getRootNode() as Document | ShadowRoot;
      const controlElement = root.getElementById(controlId);
      if (isHTMLElement(controlElement)) {
        focusElementWithVisible(controlElement);
        return;
      }
    }

    const fallbackInputs = controlRef.current?.querySelectorAll('input[type="range"]');
    const fallbackInput = fallbackInputs?.length === 1 ? fallbackInputs[0] : null;
    if (isHTMLElement(fallbackInput)) {
      focusElementWithVisible(fallbackInput);
    }
  }

  const labelProps = useLabel({
    id: rootLabelId,
    setLabelId,
    focusControl,
  });

  return useRenderElement('div', componentProps, {
    state,
    props: () => [labelProps(), elementProps],
    stateAttributesMapping: sliderStateAttributesMapping,
  });
}

export type SliderLabelState = SliderRoot.State;

export interface SliderLabelProps extends Omit<
  BaseUIComponentProps<'div', SliderLabel.State>,
  'id'
> {}

export namespace SliderLabel {
  export type State = SliderLabelState;
  export type Props = SliderLabelProps;
}

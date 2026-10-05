import { omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { AccordionItemState } from '../item/AccordionItem';
import { useAccordionItemContext } from '../item/AccordionItemContext';
import { accordionStateAttributesMapping } from '../item/stateAttributesMapping';

/**
 * A heading that labels the corresponding panel.
 * Renders an `<h3>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui-solid.pages.dev/solid/components/accordion)
 */
export function AccordionHeader(componentProps: AccordionHeader.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state } = useAccordionItemContext();

  return useRenderElement('h3', componentProps, {
    state,
    props: elementProps,
    stateAttributesMapping: accordionStateAttributesMapping,
  });
}

export interface AccordionHeaderState extends AccordionItemState {}

export interface AccordionHeaderProps extends BaseUIComponentProps<'h3', AccordionHeaderState> {}

export namespace AccordionHeader {
  export type State = AccordionHeaderState;
  export type Props = AccordionHeaderProps;
}

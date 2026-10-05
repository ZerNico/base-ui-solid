import { SelectScrollArrow } from '../scroll-arrow/SelectScrollArrow';
import type { BaseUIComponentProps } from '../../internals/types';

/**
 * An element that scrolls the select popup down when hovered. Does not render when using touch input.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectScrollDownArrow(props: SelectScrollDownArrow.Props) {
  return <SelectScrollArrow {...props} direction="down" />;
}

export interface SelectScrollDownArrowState {}

export interface SelectScrollDownArrowProps extends BaseUIComponentProps<
  'div',
  SelectScrollDownArrowState
> {
  /**
   * Whether to keep the HTML element in the DOM while the select popup is not scrollable.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace SelectScrollDownArrow {
  export type State = SelectScrollDownArrowState;
  export type Props = SelectScrollDownArrowProps;
}

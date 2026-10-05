import { omit, Show } from 'solid-js';
import { Portal } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { platform } from '@base-ui-solid/utils/platform';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useNumberFieldRootContext } from '../root/NumberFieldRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { NumberFieldRootState } from '../root/NumberFieldRoot';
import { stateAttributesMapping } from '../utils/stateAttributesMapping';
import { useNumberFieldScrubAreaContext } from '../scrub-area/NumberFieldScrubAreaContext';
import { useRenderElement } from '../../internals/useRenderElement';

const CURSOR_STYLE = {
  position: 'fixed',
  top: 0,
  left: 0,
  'pointer-events': 'none',
};

/**
 * A custom element to display instead of the native cursor while using the scrub area.
 * Renders a `<span>` element.
 *
 * This component uses the [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API), which may prompt the browser to display a related notification. It is disabled
 * in Safari to avoid a layout shift that this notification causes there.
 *
 * Documentation: [Base UI Number Field](https://base-ui-solid.pages.dev/solid/components/number-field)
 */
export function NumberFieldScrubAreaCursor(
  componentProps: NumberFieldScrubAreaCursor.Props,
): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { state, inputRef } = useNumberFieldRootContext();
  const { isScrubbing, isTouchInput, isPointerLockDenied, scrubAreaCursorRef } =
    useNumberFieldScrubAreaContext();

  const shouldRender = () =>
    isScrubbing() && !platform.engine.webkit && !isTouchInput() && !isPointerLockDenied();

  // Port note: `ReactDOM.createPortal` -> Solid's `<Portal mount>`, rendered only while the
  // cursor is shown (`Portal` can't render on the server). Upstream resolves the owner document
  // from the cursor element itself after a re-render; a portal's mount can't depend on its own
  // content here, so it's resolved from the number field's input instead.
  return (
    <Show when={shouldRender()}>
      <Portal mount={ownerDocument(inputRef.current).body}>
        {useRenderElement('span', componentProps, {
          ref: (element: HTMLSpanElement | null) => {
            scrubAreaCursorRef.current = element;
          },
          state,
          props: [
            {
              role: 'presentation',
              style: CURSOR_STYLE,
            },
            elementProps,
          ],
          stateAttributesMapping,
        })}
      </Portal>
    </Show>
  );
}

export interface NumberFieldScrubAreaCursorState extends NumberFieldRootState {}

export interface NumberFieldScrubAreaCursorProps extends BaseUIComponentProps<
  'span',
  NumberFieldScrubAreaCursorState
> {}

export namespace NumberFieldScrubAreaCursor {
  export type State = NumberFieldScrubAreaCursorState;
  export type Props = NumberFieldScrubAreaCursorProps;
}

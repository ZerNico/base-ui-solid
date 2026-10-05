import type { JSX } from '@solidjs/web';
import { visuallyHiddenInput } from '@base-ui-solid/utils/visuallyHidden';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

type DismissEvent = MouseEvent | KeyboardEvent;

/**
 * @internal
 *
 * Port note: `ref` is an internal ref: it's also called with `null` when the button is disposed,
 * like React.
 */
export function ComboboxInternalDismissButton(props: {
  ref: (element: HTMLSpanElement | null) => void;
}) {
  const store = useComboboxRootContext();

  const { buttonRef, getButtonProps } = useButton({
    native: () => false,
  });

  function handleDismiss(event: DismissEvent) {
    store.context.setOpen(
      false,
      createChangeEventDetails(REASONS.closePress, event, event.currentTarget as HTMLElement),
    );
  }

  onCleanupWithWrites(() => {
    props.ref(null);
  });

  return (
    <span
      ref={(element: HTMLSpanElement) => {
        props.ref(element);
        buttonRef(element);
      }}
      {...getButtonProps({
        onClick: handleDismiss,
      })}
      aria-label="Dismiss"
      tabindex={undefined}
      style={visuallyHiddenInput as JSX.CSSProperties}
    />
  );
}

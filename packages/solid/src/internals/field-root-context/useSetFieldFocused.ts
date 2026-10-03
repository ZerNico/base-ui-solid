import { untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useFieldRootContext } from './FieldRootContext';

/**
 * Returns the field's `setFocused`, recording which control the focused state belongs to.
 *
 * Disabling or unmounting a focused control moves focus away without firing `blur`, so the focused
 * state would otherwise stay latched. A field can have several focus targets, so a control only
 * clears the shared state when focus last landed on itself. The callback doubles as that
 * identity.
 */
export function useSetFieldFocused(
  disabled: Accessor<boolean | undefined>,
  focusTarget: () => Element | null | undefined,
  onFocusedChange?: ((focused: boolean) => void) | undefined,
) {
  const { setFocused, focusOwnerRef } = useFieldRootContext();

  // `disabled` is read untracked: in browsers, removing a focused element fires `blur` while the
  // element's owner is being disposed, which is still inside a reactive callback.
  function setFieldFocused(focused: boolean, isDisabled = untrack(disabled)) {
    // A disabled target can still be focused (`aria-disabled` elements stay programmatically
    // focusable), but must not publish the field's focused styling.
    if (focused ? !isDisabled : focusOwnerRef.current === setFieldFocused) {
      focusOwnerRef.current = focused && setFieldFocused;
      onFocusedChange?.(focused);
      setFocused(focused);
    }
  }

  // Re-run when `disabled` changes so a focused control releases the field even when the browser
  // does not fire `blur`. The setup reclaims focus that no focus event reported: a control
  // focused before hydration, or an `aria-disabled` control re-enabled while it kept focus.
  useIsoLayoutEffect(
    ([isDisabled]) => {
      const el = focusTarget();
      const root = el?.getRootNode() as Document | ShadowRoot | undefined;
      if (root?.activeElement === el) {
        setFieldFocused(true, isDisabled);
      }
      return () => setFieldFocused(false, isDisabled);
    },
    () => [disabled()],
  );

  return (focused: boolean) => setFieldFocused(focused);
}

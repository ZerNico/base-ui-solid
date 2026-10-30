import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { platform } from '@base-ui-solid/utils/platform';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';

/**
 * @internal
 */
export function FocusGuard(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [role, setRole] = createSignal<'button' | undefined>();

  useIsoLayoutEffect(
    () => {
      // Unlike NVDA and JAWS, VoiceOver's virtual cursor triggers `onFocus` as
      // it moves — but only on focusable/role-button elements through WebKit's
      // NSAccessibility path. Setting `role="button"` lets the focus trap catch
      // the cursor.
      if (platform.screenReader.voiceOver && platform.engine.webkit) {
        setRole('button');
      }
    },
    () => [],
  );

  return (
    <span
      {...props}
      style={visuallyHidden}
      aria-hidden={role() ? undefined : 'true'}
      tabindex={0}
      // Role is only for VoiceOver
      role={role()}
      data-base-ui-focus-guard=""
    />
  );
}

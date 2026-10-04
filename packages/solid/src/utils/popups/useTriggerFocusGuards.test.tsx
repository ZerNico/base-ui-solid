import { describe, it } from 'vitest';
import { isJSDOM } from '#test-utils';

// Port note: every test renders `Popover` and `Menu` (and `Dialog`), which aren't ported yet.
describe.skipIf(isJSDOM)('useTriggerFocusGuards', () => {
  describe.each([{ name: 'Popover' }, { name: 'Menu' }])('$name', () => {
    describe.each(['forward', 'backward'] as const)('tabbing %s', () => {
      // TODO(port): needs Popover, Menu
      it.skip('preserves the tab destination after the exit transition with finalFocus as a %s and trigger tabIndex=%s', () => {});

      // TODO(port): needs Popover, Menu
      it.skip('uses the current tab order when an adjacent control is %s during close', () => {});

      // TODO(port): needs Dialog, Popover, Menu
      it.skip('preserves the surrounding modal dialog focus trap', () => {});

      // TODO(port): needs Popover, Menu
      it.skip('returns focus to the trigger when no outside element is tabbable and trigger tabIndex=%s', () => {});
    });
  });
});

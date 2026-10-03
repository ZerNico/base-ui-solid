import { isJSDOM } from '@base-ui-solid/utils/testUtils';

/**
 * Resets the Playwright/WebDriver pointer state that persists between browser tests.
 */
export async function resetBrowserPointer() {
  if (!isJSDOM) {
    const { userEvent } = await import('vitest/browser');
    await userEvent.unhover(document.body);
  }
}

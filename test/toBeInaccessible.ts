import { expect } from 'vitest';
import { isInaccessible } from '@solidjs/testing-library';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Match Vitest's type parameters for declaration merging.
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /**
     * Port of `@mui/internal-test-utils`' `toBeInaccessible` assertion: checks that the element is
     * excluded from the accessibility tree (`isInaccessible` from `@testing-library/dom`).
     */
    toBeInaccessible(): R;
  }
}

expect.extend({
  toBeInaccessible(element: Element) {
    const pass = element != null && isInaccessible(element);
    return {
      pass,
      message: () =>
        `Expected element ${pass ? 'not ' : ''}to be inaccessible, but it was ${
          pass ? 'inaccessible' : 'accessible'
        }.`,
    };
  },
});

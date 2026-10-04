import { Errored, untrack } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { Dialog } from 'base-ui-solid/dialog';
import { describeConformance, render } from '#test-utils';

describe('<Dialog.Portal />', () => {
  describeConformance(Dialog.Portal, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Dialog.Root open>{node()}</Dialog.Root>,
  });

  it('throws a descriptive error when a portaled part is rendered without <Dialog.Portal>', async () => {
    // Port note: catch the expected component error with Solid's boundary so it doesn't halt
    // the reactive scheduler or surface a duplicate uncaught browser error.
    let caughtError: unknown;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = untrack(error);
          return null;
        }}
      >
        <Dialog.Root open>
          <Dialog.Viewport />
        </Dialog.Root>
      </Errored>
    ));
    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain('Base UI: <Dialog.Portal> is missing.');
  });

  describe('Suspense integration', () => {
    // Issue #3695
    // React-only: `React.Suspense` / `React.lazy` update-depth regression.
    it.skip('should not throw "Maximum update depth exceeded" when Suspense boundary is outside Portal', () => {});
  });
});

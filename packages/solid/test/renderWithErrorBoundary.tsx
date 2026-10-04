import { Errored, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';

/**
 * Port note: expected component errors must reach Solid's error boundary. An unhandled render
 * error halts the reactive graph and emits a diagnostic even when the test expects rejection.
 * Rethrow the same error outside the graph so upstream's rejection assertion remains unchanged.
 */
export async function renderWithErrorBoundary(
  render: (ui: () => JSX.Element) => Promise<unknown>,
  ui: () => JSX.Element,
) {
  let caughtError: unknown;
  let caught = false;
  const result = await render(() => (
    <Errored
      fallback={(error) => {
        caught = true;
        caughtError = untrack(error);
        return null;
      }}
    >
      {ui()}
    </Errored>
  ));
  if (caught) {
    throw caughtError;
  }
  return result;
}

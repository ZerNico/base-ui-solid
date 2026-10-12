import { vi } from 'vitest';

/**
 * Creates an `onSubmit` spy that prevents the submission and returns the form's entry for
 * `name`. Read it with `spy.mock.results.at(-1)?.value` (`null` when the entry is absent).
 *
 * Port note: the handler receives the native `SubmitEvent` (Solid's event handler shape).
 */
export function createFormDataSpy(name: string) {
  return vi.fn((event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    event.preventDefault();
    return new FormData(event.currentTarget).get(name);
  });
}

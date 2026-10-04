import { expect, describe, it } from 'vitest';
import { resolvePopupLabel } from './resolvePopupLabel';

describe('resolvePopupLabel', () => {
  it('falls back to the trigger id', () => {
    expect(resolvePopupLabel({}, null, 'trigger')).toBe('trigger');
  });

  // React-only: reads the props of a React element passed as `render`, which Solid doesn't support.
  it.skip("uses a render element's own label instead of the trigger", () => {});

  // React-only: Server Component render elements (`react.lazy` wrappers).
  it.skip("reads a server-created render element's label", () => {});
});

import { expect, vi, describe } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { useValueChanged } from './useValueChanged';

describe('useValueChanged', () => {
  // Port note: React.StrictMode has no Solid counterpart, so both cases render the same tree.
  it.each([false, true])(
    'retains -0 as the previous value without treating it as a change from 0 (strict: %s)',
    () => {
      const onChange = vi.fn();
      // Port note: `equals: false` mirrors React re-rendering with a new prop value; Solid's default
      // signal equality (`===`) would drop the 0 -> -0 update before the hook sees it.
      const [value, setValue] = createSignal(0, { equals: false });

      function Test(props: { value: number }) {
        useValueChanged(() => props.value, onChange);
        return null;
      }

      render(() => <Test value={value()} />);
      flush();

      setValue(-0);
      flush();
      expect(onChange).not.toHaveBeenCalled();

      setValue(1);
      flush();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(Object.is(onChange.mock.calls[0][0], -0)).toBe(true);
    },
  );
});

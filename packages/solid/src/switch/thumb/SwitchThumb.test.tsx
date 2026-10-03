import { Switch } from '..';
import { SwitchRootContext } from '../root/SwitchRootContext';
import type { SwitchRootState } from '../root/SwitchRoot';
import {
  render,
  describeConformance,
} from '#test-utils';

const testContext: SwitchRootState = {
  checked: false,
  disabled: false,
  readOnly: false,
  required: false,
  dirty: false,
  touched: false,
  filled: false,
  focused: false,
  valid: null,
};

describe('<Switch.Thumb />', () => {
  describeConformance(Switch.Thumb, {
    refInstanceof: window.HTMLSpanElement,
    wrap: (node) => <SwitchRootContext value={() => testContext}>{node()}</SwitchRootContext>,
  });

  it('throws a descriptive error when rendered outside <Switch.Root>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Switch.Thumb />)).rejects.toThrow(
        'Base UI: SwitchRootContext is missing. Switch parts must be placed within <Switch.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});

import { createSignal, untrack } from 'solid-js';
import type { ComponentProps } from 'solid-js';
import type { JSX } from '@solidjs/web';

import { NOOP } from '@base-ui-solid/utils/empty';
import { expect, vi, describe, beforeEach, it } from 'vitest';
import { screen, resetBrowserPointer } from '#test-utils';
import { portRef, createRenderer } from '../../../test/menuPortHelpers';

import { describeMenuConformance } from '../../../test/menuConformance';
import * as FilterDropdown from '../../../test/filterDropdown';

describe('<FilterDropdown.Clear />', () => {
  beforeEach(resetBrowserPointer);
  const { render } = createRenderer();
  describeMenuConformance(FilterDropdown.Clear, {
    refInstanceof: window.HTMLButtonElement,
    render: (node: () => JSX.Element) => {
      return render(
        (testProps: any) => <ControlledFilterDropdownRoot {...testProps} />,
        () => ({
          initialValue: 'can',
          get children() {
            return (
              <>
                <FilterDropdown.Popup id={undefined}>
                  <FilterDropdown.Input aria-label="Filter" />
                  {node()}
                </FilterDropdown.Popup>
              </>
            );
          },
        }),
      );
    },
  });
  it('does not render when the filter value is empty', async () => {
    await render(
      (testProps: any) => <ControlledFilterDropdownRoot {...testProps} />,
      () => ({
        get children() {
          return (
            <>
              <FilterDropdown.Popup id={undefined}>
                <FilterDropdown.Input aria-label="Filter" />
                <FilterDropdown.Clear data-testid="clear" />
              </FilterDropdown.Popup>
            </>
          );
        },
      }),
    );
    expect(screen.queryByTestId('clear')).toBe(null);
  });
  it('clears the filter value and focuses the input when clicked', async () => {
    const onValueChange = vi.fn();
    const { user } = await render(
      (testProps: any) => <ControlledFilterDropdownRoot {...testProps} />,
      () => ({
        initialValue: 'can',
        onValueChange,
        get children() {
          return (
            <>
              <FilterDropdown.Popup id={undefined}>
                <FilterDropdown.Input aria-label="Filter countries" />
                <FilterDropdown.Clear aria-label="Clear filter" />
              </FilterDropdown.Popup>
            </>
          );
        },
      }),
    );
    const input = screen.getByRole('searchbox', { name: 'Filter countries' });
    await user.click(screen.getByLabelText('Clear filter'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByLabelText('Clear filter')).toBe(null);
    expect(onValueChange).toHaveBeenLastCalledWith(
      '',
      expect.objectContaining({ reason: 'clear-press' }),
    );
  });
  it('does nothing when disabled', async () => {
    const { user } = await render(
      (testProps: any) => <ControlledFilterDropdownRoot {...testProps} />,
      () => ({
        initialValue: 'can',
        get children() {
          return (
            <>
              <FilterDropdown.Popup id={undefined}>
                <FilterDropdown.Input aria-label="Filter countries" />
                <FilterDropdown.Clear aria-label="Clear filter" disabled />
              </FilterDropdown.Popup>
            </>
          );
        },
      }),
    );
    const clear = screen.getByLabelText('Clear filter');
    expect(clear).toBeDisabled();
    await user.click(clear);
    expect(screen.getByRole('searchbox', { name: 'Filter countries' })).toHaveValue('can');
  });
  it('ignores a click on a disabled non-native button', async () => {
    const onValueChange = vi.fn();
    const { user } = await render(
      (testProps: any) => <ControlledFilterDropdownRoot {...testProps} />,
      () => ({
        initialValue: 'can',
        onValueChange,
        get children() {
          return (
            <>
              <FilterDropdown.Popup id={undefined}>
                <FilterDropdown.Input aria-label="Filter countries" />
                <FilterDropdown.Clear
                  aria-label="Clear filter"
                  disabled
                  nativeButton={false}
                  render={(renderProps) => <div {...renderProps} />}
                />
              </FilterDropdown.Popup>
            </>
          );
        },
      }),
    );
    await user.click(screen.getByLabelText('Clear filter'));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
interface ControlledFilterDropdownRootProps {
  children: JSX.Element;
  initialValue?: string;
  onValueChange?: ComponentProps<typeof FilterDropdown.Root>['onValueChange'];
}
function ControlledFilterDropdownRoot(props: ControlledFilterDropdownRootProps) {
  const [value, setValue] = createSignal(untrack(() => props.initialValue ?? ''));
  const listRef = portRef<Array<HTMLElement | null>>([]);
  return (
    <FilterDropdown.Root
      open
      value={value()}
      listRef={listRef}
      getActiveIndex={getNoActiveIndex}
      setActiveIndex={NOOP}
      onValueChange={(nextValue, eventDetails) => {
        props.onValueChange?.(nextValue, eventDetails);
        setValue(nextValue);
      }}
    >
      {props.children}
    </FilterDropdown.Root>
  );
}
function getNoActiveIndex() {
  return null;
}

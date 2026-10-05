import { createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';

import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { expect, vi, describe, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import {
  createRenderer,
  describeConformance,
  isJSDOM,
  act,
  fireEvent,
  flushMicrotasks,
  screen,
  waitFor,
} from '#test-utils';
import { Field } from 'base-ui-solid/field';
import { SelectionlessCombobox as Autocomplete } from '../root/SelectionlessCombobox.test-utils';
import { REASONS } from '../../internals/reasons';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

// Port note: `Combobox.List`/`Combobox.Collection` (and `Autocomplete.*`) render functions receive
// the item and its index as accessors, and `*.Value` render functions receive accessors.

describe('<Combobox.Trigger />', () => {
  const { render } = createRenderer();
  describeConformance((props) => <Combobox.Trigger {...props} />, {
    refInstanceof: window.HTMLButtonElement,

    wrap(node) {
      return <Combobox.Root>{node()}</Combobox.Root>;
    },
  });
  it('sets tabIndex to -1 when not used as the main anchor', async () => {
    const { user } = await render((overrides) => (
      <Combobox.Root {...overrides()}>
        <Combobox.Input />
        <Combobox.Trigger data-testid="trigger" />
      </Combobox.Root>
    ));
    const input = screen.getByRole('combobox');
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveAttribute('tabindex', '-1');
    await user.click(input);
    expect(trigger).toHaveAttribute('tabindex', '-1');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('tabindex', '-1');
  });
  describe('prop: disabled', () => {
    it('should render aria-disabled attribute when disabled', async () => {
      await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger disabled data-testid="trigger">
            Open
          </Combobox.Trigger>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('disabled');
    });
    it('should inherit disabled state from ComboboxRoot', async () => {
      await render((overrides) => (
        <Combobox.Root disabled {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('disabled');
    });
    it('should inherit disabled state from Field.Root', async () => {
      await render((overrides) => (
        <Field.Root disabled {...overrides()}>
          <Combobox.Root>
            <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          </Combobox.Root>
        </Field.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('disabled');
    });
    it('should not open popup when disabled', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger disabled data-testid="trigger">
            Open
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                  <Combobox.Item value="b">b</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      expect(screen.queryByRole('listbox')).toBe(null);
    });
    it('ignores native keydown events on a disabled non-native trigger', async () => {
      const onOpenChange = vi.fn();
      await render((overrides) => (
        <Combobox.Root onOpenChange={onOpenChange} {...overrides()}>
          <Combobox.Trigger
            disabled
            nativeButton={false}
            render={(props) => <div {...props} />}
            data-testid="trigger"
          />
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await act(async () => {
        trigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
        );
      });
      expect(onOpenChange).not.toHaveBeenCalled();
    });
    it('should prioritize local disabled over root disabled', async () => {
      await render((overrides) => (
        <Combobox.Root disabled={false} {...overrides()}>
          <Combobox.Trigger disabled data-testid="trigger">
            Open
          </Combobox.Trigger>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('disabled');
    });
  });
  it.each([
    {
      name: 'single selection',
      control: () => (
        <Combobox.Root defaultValue="apple">
          <Combobox.Trigger data-testid="trigger" />
        </Combobox.Root>
      ),
      expectedValue: 'apple',
    },
    {
      name: 'no selection',
      control: () => (
        <Autocomplete.Root defaultValue="query">
          <Autocomplete.Trigger data-testid="trigger" />
        </Autocomplete.Root>
      ),
      expectedValue: 'query',
    },
  ])('validates the $name value when blurred', async (props) => {
    const validate = vi.fn();
    await render((overrides) => (
      <Field.Root validationMode="onBlur" validate={validate} {...overrides()}>
        {props.control()}
      </Field.Root>
    ));
    const trigger = screen.getByTestId('trigger');
    fireEvent.focusIn(trigger);
    flush();
    fireEvent.focusOut(trigger);
    flush();
    expect(validate).toHaveBeenCalledWith(props.expectedValue, expect.anything());
  });
  it('ignores a pending mouseup after the trigger unmounts', async () => {
    const onOpenChange = vi.fn();
    function Test(props: { showTrigger: boolean }) {
      return (
        <Combobox.Root onOpenChange={onOpenChange}>
          {props.showTrigger && <Combobox.Trigger data-testid="trigger" />}
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Input />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      );
    }
    const { setProps } = await render((overrides) => <Test showTrigger {...overrides()} />);
    fireEvent.mouseDown(screen.getByTestId('trigger'));
    flush();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything()));
    onOpenChange.mockClear();
    await setProps({ showTrigger: false });
    fireEvent.mouseUp(document.body, { clientX: 100, clientY: 100 });
    flush();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it('does not select when closed typeahead matches a sparse label without a value', async () => {
    const onValueChange = vi.fn();
    function SparseRegistry() {
      const store = useComboboxRootContext();
      useIsoLayoutEffect(
        () => {
          store.context.labelsRef.current[0] = 'apple';
          delete store.context.valuesRef.current[0];
        },
        () => [store],
      );
      return null;
    }
    const { user } = await render((overrides) => (
      <Combobox.Root onValueChange={onValueChange} {...overrides()}>
        <SparseRegistry />
        <Combobox.Trigger>Open</Combobox.Trigger>
      </Combobox.Root>
    ));
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('a');
    expect(onValueChange).not.toHaveBeenCalled();
  });
  describe('prop: readOnly', () => {
    it('applies the data-readonly style hook only when readOnly', async () => {
      const { setProps } = await render((overrides) => (
        <Combobox.Root readOnly {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('data-readonly', '');
      await setProps({ readOnly: false });
      expect(trigger).not.toHaveAttribute('data-readonly');
    });
    it('opens the popup when readOnly', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root readOnly {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                  <Combobox.Item value="b">b</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      expect(await screen.findByRole('listbox')).toHaveAttribute('aria-readonly', 'true');
    });
    it.each([
      { name: 'ArrowDown', key: '{ArrowDown}' },
      { name: 'ArrowUp', key: '{ArrowUp}' },
      { name: 'Enter', key: '{Enter}' },
      { name: 'Space', key: '[Space]' },
    ])('opens on $name when readOnly', async (props) => {
      const onOpenChange = vi.fn();
      const { user } = await render((overrides) => (
        <Combobox.Root readOnly onOpenChange={onOpenChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Input />
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      await user.keyboard(props.key);
      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(await screen.findByRole('listbox')).not.toBe(null);
    });
    it('does not commit a value with typeahead on a closed trigger', async () => {
      const onValueChange = vi.fn();
      const { user } = await render((overrides) => (
        <Combobox.Root readOnly onValueChange={onValueChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="apple">apple</Combobox.Item>
                  <Combobox.Item value="banana">banana</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      trigger.focus();
      await user.keyboard('b');
      expect(onValueChange).not.toHaveBeenCalled();
      expect(trigger).toHaveAttribute('data-placeholder');
    });
    it('should not toggle when readOnly=false (control)', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root readOnly={false} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      expect(await screen.findByRole('listbox')).not.toBe(null);
    });
  });
  describe('interaction behavior', () => {
    it('should toggle popup when enabled', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Input />
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                  <Combobox.Item value="b">b</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      expect(await screen.findByRole('listbox')).not.toBe(null);
      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
    });
    it('should call onOpenChange when toggling', async () => {
      const handleOpenChange = vi.fn();
      const { user } = await render((overrides) => (
        <Combobox.Root onOpenChange={handleOpenChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                  <Combobox.Item value="b">b</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      await waitFor(() => {
        expect(handleOpenChange.mock.calls.length).toBe(1);
      });
      expect(handleOpenChange.mock.calls[0][0]).toBe(true);
    });
    it('opens popup when pressing ArrowDown or ArrowUp', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger" />
          <Combobox.Input />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).not.toBe(null);
      expect(screen.getByRole('combobox')).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('listbox')).toBe(null);
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('{ArrowUp}');
      expect(screen.queryByRole('listbox')).not.toBe(null);
      expect(screen.getByRole('combobox')).toHaveFocus();
    });
    it('does not open on ArrowDown/ArrowUp when reference is a textarea', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger>Open</Combobox.Trigger>
          <textarea aria-label="notes" />
        </Combobox.Root>
      ));
      const trigger = screen.getByRole('combobox');
      await user.click(trigger);
      await user.keyboard('{ArrowDown}');
      expect(screen.queryByRole('listbox')).toBe(null);
      await user.keyboard('{ArrowUp}');
      expect(screen.queryByRole('listbox')).toBe(null);
    });
    it('fires with reason trigger-press when Trigger is clicked', async () => {
      const onOpenChange = vi.fn();
      const { user } = await render((overrides) => (
        <Combobox.Root onOpenChange={onOpenChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                  <Combobox.Item value="beta">Beta</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      await waitFor(() => {
        expect(onOpenChange.mock.calls.length).toBe(1);
      });
      expect(onOpenChange.mock.lastCall?.[0]).toBe(true);
      expect(onOpenChange.mock.lastCall?.[1].reason).toBe(REASONS.triggerPress);
    });
  });
  describe('drag selection', () => {
    it('commits selection when the input is outside the popup', async () => {
      const handleValueChange = vi.fn();
      await render((overrides) => (
        <Combobox.Root onValueChange={handleValueChange} {...overrides()}>
          <Combobox.Input />
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                  <Combobox.Item value="beta">Beta</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      await screen.findByRole('listbox');
      const option = await screen.findByRole('option', { name: 'Beta' });
      fireEvent.mouseMove(option, { pointerType: 'mouse' });
      flush();
      await waitFor(() => expect(option).toHaveAttribute('data-highlighted'));
      fireEvent.mouseUp(option, { button: 0 });
      flush();
      await waitFor(() => {
        expect(handleValueChange.mock.calls.length).toBe(1);
      });
      expect(handleValueChange.mock.calls[0][0]).toBe('beta');
    });
    it('commits selection when the input is inside the popup and the pointer is released over an item', async () => {
      const handleValueChange = vi.fn();
      await render((overrides) => (
        <Combobox.Root onValueChange={handleValueChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Input />
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                  <Combobox.Item value="beta">Beta</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      await screen.findByRole('listbox');
      const option = await screen.findByRole('option', { name: 'Beta' });
      fireEvent.mouseMove(option, { pointerType: 'mouse' });
      flush();
      await waitFor(() => expect(option).toHaveAttribute('data-highlighted'));
      fireEvent.mouseUp(option, { button: 0 });
      flush();
      await waitFor(() => {
        expect(handleValueChange.mock.calls.length).toBe(1);
      });
      expect(handleValueChange.mock.calls[0][0]).toBe('beta');
    });
    it.skipIf(isJSDOM)(
      'does not double-commit when a non-primary touch lands on another item',
      async () => {
        const handleValueChange = vi.fn();
        await render((overrides) => (
          <Combobox.Root onValueChange={handleValueChange} {...overrides()}>
            <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
            <Combobox.Portal>
              <Combobox.Positioner>
                <Combobox.Popup>
                  <Combobox.Input />
                  <Combobox.List>
                    <Combobox.Item value="alpha">Alpha</Combobox.Item>
                    <Combobox.Item value="beta">Beta</Combobox.Item>
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        ));
        const trigger = screen.getByTestId('trigger');
        fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
        flush();
        fireEvent.mouseDown(trigger, { button: 0 });
        flush();
        await screen.findByRole('listbox');
        const alpha = await screen.findByRole('option', { name: 'Alpha' });
        const beta = await screen.findByRole('option', { name: 'Beta' });
        // Highlight Alpha so a stray drag-select would be able to commit it.
        fireEvent.mouseMove(alpha, { pointerType: 'mouse' });
        flush();
        await waitFor(() => expect(alpha).toHaveAttribute('data-highlighted'));
        // Primary touch presses Alpha; a second, non-primary touch lands on Beta.
        // Without the `isPrimary` guard the shared ref would flip to Beta, making
        // Alpha's release read as a drag-select and commit once on `mouseup` and
        // again on the following `click`.
        fireEvent.pointerDown(alpha, { pointerType: 'touch', isPrimary: true, button: 0 });
        flush();
        fireEvent.pointerDown(beta, { pointerType: 'touch', isPrimary: false, button: 0 });
        flush();
        fireEvent.mouseUp(alpha, { button: 0 });
        flush();
        fireEvent.click(alpha, { button: 0 });
        flush();
        await waitFor(() => {
          expect(handleValueChange.mock.calls.length).toBe(1);
        });
        expect(handleValueChange.mock.calls[0][0]).toBe('alpha');
      },
    );
    it.skipIf(isJSDOM)(
      'commits a later drag-select onto an item whose earlier pointerdown never released',
      async () => {
        const handleValueChange = vi.fn();
        const { user } = await render((overrides) => (
          <Combobox.Root onValueChange={handleValueChange} {...overrides()}>
            <Combobox.Input />
            <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
            <Combobox.Portal>
              <Combobox.Positioner>
                <Combobox.Popup>
                  <Combobox.List>
                    <Combobox.Item value="alpha">Alpha</Combobox.Item>
                    <Combobox.Item value="beta">Beta</Combobox.Item>
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        ));
        const trigger = screen.getByTestId('trigger');
        // Press an item, then close before any matching `mouseup` arrives. The
        // closed-state effect must clear the shared pointerdown ref, otherwise the
        // stale entry makes the next drag-select onto Alpha read as a same-item tap
        // and never commit.
        fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
        flush();
        fireEvent.mouseDown(trigger, { button: 0 });
        flush();
        await screen.findByRole('listbox');
        const alpha = await screen.findByRole('option', { name: 'Alpha' });
        fireEvent.pointerDown(alpha, { pointerType: 'touch', isPrimary: true, button: 0 });
        flush();
        await user.keyboard('{Escape}');
        await waitFor(() => {
          expect(screen.queryByRole('listbox')).toBe(null);
        });
        // Reopen and drag-select onto Alpha (gesture starts on the trigger).
        fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
        flush();
        fireEvent.mouseDown(trigger, { button: 0 });
        flush();
        await screen.findByRole('listbox');
        const alphaReopened = await screen.findByRole('option', { name: 'Alpha' });
        fireEvent.mouseMove(alphaReopened, { pointerType: 'mouse' });
        flush();
        await waitFor(() => expect(alphaReopened).toHaveAttribute('data-highlighted'));
        fireEvent.mouseUp(alphaReopened, { button: 0 });
        flush();
        await waitFor(() => {
          expect(handleValueChange.mock.calls.length).toBe(1);
        });
        expect(handleValueChange.mock.calls[0][0]).toBe('alpha');
      },
    );
    it('does not commit selection if the pointer never hovers the item', async () => {
      const handleValueChange = vi.fn();
      await render((overrides) => (
        <Combobox.Root onValueChange={handleValueChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.Input />
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                  <Combobox.Item value="beta">Beta</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      await screen.findByRole('listbox');
      const option = await screen.findByRole('option', { name: 'Beta' });
      fireEvent.mouseUp(option, { button: 0 });
      flush();
      await waitFor(() => {
        expect(handleValueChange.mock.calls.length).toBe(0);
      });
    });
  });
  describe('cancel-open', () => {
    it('closes the popup when mouseup occurs outside the trigger bounds', async () => {
      const onOpenChange = vi.fn();
      await render((overrides) => (
        <Combobox.Root onOpenChange={onOpenChange} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      await screen.findByRole('listbox');
      fireEvent.mouseUp(document.body, { button: 0, clientX: 999, clientY: 999 });
      flush();
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
      expect(onOpenChange.mock.lastCall?.[0]).toBe(false);
      expect(onOpenChange.mock.lastCall?.[1].reason).toBe(REASONS.cancelOpen);
    });
    it('keeps the popup open when mouseup remains near the trigger bounds', async () => {
      await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      trigger.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          right: 100,
          bottom: 40,
          width: 100,
          height: 40,
          x: 0,
          y: 0,
          toJSON() {
            return {};
          },
        }) as DOMRect;
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      const listbox = await screen.findByRole('listbox');
      fireEvent.mouseUp(document.body, { button: 0, clientX: 1, clientY: 1 });
      flush();
      expect(listbox.isConnected).toBe(true);
    });
    it('closes the popup when the release is more than 5px outside the trigger bounds', async () => {
      await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Open</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="alpha">Alpha</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      trigger.getBoundingClientRect = () =>
        DOMRect.fromRect({ x: 100, y: 100, width: 100, height: 40 });
      fireEvent.pointerDown(trigger, { pointerType: 'mouse', button: 0 });
      flush();
      fireEvent.mouseDown(trigger, { button: 0 });
      flush();
      await screen.findByRole('listbox');
      fireEvent.mouseUp(document.body, { button: 0, clientX: 94, clientY: 120 });
      flush();
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
    });
  });
  describe('aria attributes', () => {
    it('sets aria-required attribute when required (input inside popup)', async () => {
      await render((overrides) => (
        <Combobox.Root required {...overrides()}>
          <Combobox.Trigger data-testid="trigger" />
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('aria-required', 'true');
    });
    it('does not set aria-required attribute when the input is outside the popup', async () => {
      await render((overrides) => (
        <Combobox.Root required {...overrides()}>
          <Combobox.Input />
          <Combobox.Trigger data-testid="trigger" />
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveAttribute('aria-required');
    });
    it('sets aria-readonly attribute when readOnly (input inside popup)', async () => {
      await render((overrides) => (
        <Combobox.Root readOnly {...overrides()}>
          <Combobox.Trigger data-testid="trigger" />
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('role', 'combobox');
      expect(trigger).toHaveAttribute('aria-readonly', 'true');
    });
    it('does not set aria-readonly attribute when the input is outside the popup', async () => {
      await render((overrides) => (
        <Combobox.Root readOnly {...overrides()}>
          <Combobox.Input data-testid="input" />
          <Combobox.Trigger data-testid="trigger" />
        </Combobox.Root>
      ));
      // Without the `combobox` role the trigger is a plain button, so `aria-readonly` wouldn't
      // apply to it. The input carries the state instead.
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveAttribute('role');
      expect(trigger).not.toHaveAttribute('aria-readonly');
      expect(screen.getByTestId('input')).toHaveAttribute('aria-readonly', 'true');
    });
    it('sets all aria attributes on the input when closed', async () => {
      await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger" />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('tabindex', '0');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).not.toHaveAttribute('aria-controls');
    });
    it('sets all aria attributes on the trigger when open', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger" />
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      await screen.findByRole('listbox');
      const popup = screen.getByRole('dialog');
      expect(trigger).toHaveAttribute('tabindex', '0');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(popup.id).not.toBe('');
      expect(trigger).toHaveAttribute('aria-controls', popup.id);
    });
  });
  describe('typeahead', () => {
    it('selects item when typing on focused trigger (input inside popup)', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root items={['apple', 'banana', 'cherry']} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value data-testid="value" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  {(item: Accessor<string>) => (
                    <Combobox.Item value={item()}>{item()}</Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveTextContent('apple');
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('a');
      expect(trigger).toHaveTextContent('apple');
      expect(screen.queryByRole('listbox')).toBe(null);
    });
    it.each([false, true])(
      'selects item when typing after the popup has been opened and closed (items prop, strict: %s)',
      async (_strict) => {
        const { user } = await render(
          (overrides) => (
            <Combobox.Root items={['apple', 'banana', 'cherry']} {...overrides()}>
              <Combobox.Trigger data-testid="trigger">
                <Combobox.Value data-testid="value" />
              </Combobox.Trigger>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.List>
                      {(item: Accessor<string>) => (
                        <Combobox.Item value={item()}>{item()}</Combobox.Item>
                      )}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
          ),
          {},
        );
        const trigger = screen.getByTestId('trigger');
        // Opening mounts the list (rendered labels overwrite the derived ones) and closing
        // unmounts it, clearing the registered labels. Typeahead must still work afterwards.
        await user.click(trigger);
        await screen.findByRole('listbox');
        await user.keyboard('{Escape}');
        await waitFor(() => {
          expect(screen.queryByRole('listbox')).toBe(null);
        });
        // Focus returns to the trigger asynchronously after close.
        await waitFor(() => {
          expect(trigger).toHaveFocus();
        });
        await user.keyboard('b');
        await waitFor(() => {
          expect(trigger).toHaveTextContent('banana');
        });
      },
    );
    it.each([false, true])(
      'cycles to the next matching item when typing after open/close (no items prop, keepMounted %s)',
      async (keepMounted) => {
        const { user } = await render((overrides) => (
          <Combobox.Root defaultValue="apple" {...overrides()}>
            <Combobox.Trigger data-testid="trigger">
              <Combobox.Value data-testid="value" />
            </Combobox.Trigger>
            <Combobox.Portal keepMounted={keepMounted}>
              <Combobox.Positioner>
                <Combobox.Popup>
                  <Combobox.List>
                    <Combobox.Item value="apple">apple</Combobox.Item>
                    <Combobox.Item value="apricot">apricot</Combobox.Item>
                    <Combobox.Item value="banana">banana</Combobox.Item>
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        ));
        const trigger = screen.getByTestId('trigger');
        await user.click(trigger);
        await screen.findByRole('listbox');
        await user.keyboard('{Escape}');
        await waitFor(() => {
          expect(screen.queryByRole('listbox')).toBe(null);
        });
        await waitFor(() => {
          expect(trigger).toHaveFocus();
        });
        // Typeahead starts matching after the selected item, like a native select.
        await user.keyboard('a');
        await waitFor(() => {
          expect(trigger).toHaveTextContent('apricot');
        });
      },
    );
    it('cycles from the selected item after reordering items while closed (no items prop)', async () => {
      function App() {
        const [order, setOrder] = createSignal(['apple', 'apricot', 'banana']);
        return (
          <div>
            <Combobox.Root defaultValue="apple">
              <Combobox.Trigger data-testid="trigger">
                <Combobox.Value data-testid="value" />
              </Combobox.Trigger>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.List>
                      {order().map((item) => (
                        <Combobox.Item value={item}>{item}</Combobox.Item>
                      ))}
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
            <button
              type="button"
              data-testid="reorder"
              onClick={() => setOrder(['apricot', 'apple', 'banana'])}
            >
              reorder
            </button>
          </div>
        );
      }
      const { user } = await render((overrides) => <App {...overrides()} />);
      const trigger = screen.getByTestId('trigger');
      // Open and close so the trigger path force-mounts the list.
      await user.click(trigger);
      await screen.findByRole('listbox');
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
      // Reorder while closed: apple moves from index 0 to index 1.
      fireEvent.click(screen.getByTestId('reorder'));
      flush();
      await flushMicrotasks();
      // Typeahead starts after the selected item; from apple it wraps to apricot.
      await user.keyboard('a');
      await waitFor(() => {
        expect(trigger).toHaveTextContent('apricot');
      });
    });
    it('only matches mounted indexed item labels when typing on the focused trigger', async () => {
      function TestComponent() {
        const [showBanana, setShowBanana] = createSignal(true);
        return (
          <Combobox.Root>
            <Combobox.Trigger data-testid="trigger">
              <Combobox.Value />
            </Combobox.Trigger>
            <button type="button" onClick={() => setShowBanana(false)}>
              Remove banana
            </button>
            <Combobox.Portal>
              <Combobox.Positioner>
                <Combobox.Popup>
                  <Combobox.List>
                    <Combobox.Item value="apple" index={0}>
                      Apple
                    </Combobox.Item>
                    {showBanana() && (
                      <Combobox.Item value="banana" index={1}>
                        Banana
                      </Combobox.Item>
                    )}
                    <Combobox.Item value="blueberry" index={2}>
                      Blueberry
                    </Combobox.Item>
                  </Combobox.List>
                </Combobox.Popup>
              </Combobox.Positioner>
            </Combobox.Portal>
          </Combobox.Root>
        );
      }
      const { user } = await render((overrides) => <TestComponent {...overrides()} />);
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      await screen.findByRole('listbox');
      await user.click(screen.getByRole('button', { name: 'Remove banana' }));
      await waitFor(() => {
        expect(screen.queryByRole('option', { name: 'Banana' })).toBe(null);
      });
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
      await act(async () => {
        trigger.focus();
      });
      await user.keyboard('b');
      await waitFor(() => {
        expect(trigger).toHaveTextContent('blueberry');
      });
    });
  });
  describe('data state attributes', () => {
    it.skipIf(isJSDOM)('sets data-popup-side to the current popup side', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root items={['apple']} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Trigger</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner side="right">
              <Combobox.Popup>
                <Combobox.List>
                  {(item: Accessor<string>) => (
                    <Combobox.Item value={item()}>{item()}</Combobox.Item>
                  )}
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveAttribute('data-popup-side');
      await user.click(trigger);
      await waitFor(() => expect(screen.queryByRole('listbox')).not.toBe(null));
      expect(trigger).toHaveAttribute('data-popup-side', 'right');
      await user.click(document.body);
      await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null));
      expect(trigger).not.toHaveAttribute('data-popup-side');
    });
    it('toggles data-list-empty when the filtered list is empty', async () => {
      const { user } = await render((overrides) => (
        <Combobox.Root items={[]} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">Trigger</Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List />
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);
      await waitFor(() => expect(screen.getByRole('listbox')).not.toBe(null));
      expect(trigger).toHaveAttribute('data-list-empty');
    });
    it('has data-placeholder when no value is selected', async () => {
      await render((overrides) => (
        <Combobox.Root {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value placeholder="Select" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('data-placeholder');
    });
    it('does not have data-placeholder when value is selected', async () => {
      await render((overrides) => (
        <Combobox.Root defaultValue="a" {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value placeholder="Select" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveAttribute('data-placeholder');
    });
    it('has data-placeholder when multiple mode has empty array', async () => {
      await render((overrides) => (
        <Combobox.Root multiple defaultValue={[]} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value placeholder="Select" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).toHaveAttribute('data-placeholder');
    });
    it('does not have data-placeholder when multiple mode has a default value', async () => {
      await render((overrides) => (
        <Combobox.Root multiple defaultValue={['a']} {...overrides()}>
          <Combobox.Trigger data-testid="trigger">
            <Combobox.Value placeholder="Select" />
          </Combobox.Trigger>
          <Combobox.Portal>
            <Combobox.Positioner>
              <Combobox.Popup>
                <Combobox.List>
                  <Combobox.Item value="a">a</Combobox.Item>
                </Combobox.List>
              </Combobox.Popup>
            </Combobox.Positioner>
          </Combobox.Portal>
        </Combobox.Root>
      ));
      const trigger = screen.getByTestId('trigger');
      expect(trigger).not.toHaveAttribute('data-placeholder');
    });
  });
});

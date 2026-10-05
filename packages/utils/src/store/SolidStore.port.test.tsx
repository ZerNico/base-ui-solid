import { expect, describe, it, vi } from 'vitest';
import {
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  flush,
  onCleanup,
  untrack,
} from 'solid-js';
import type { Accessor } from 'solid-js';
import { attribution } from 'solid-js/attribution';
import { render, screen } from '@solidjs/testing-library';
// eslint-disable-next-line import/no-relative-packages
import { Select } from '../../../solid/src/select';
// eslint-disable-next-line import/no-relative-packages
import { Popover } from '../../../solid/src/popover';
// eslint-disable-next-line import/no-relative-packages
import { renderToString } from '../../../solid/test/renderToString';
import { SolidStore } from './SolidStore';
import { SyncedValues } from './SolidStore.port.fixtures';

type TestState = { value: number; label: string; node: string | undefined };

const initialState: TestState = { value: 0, label: '', node: undefined };

/**
 * Exposes `register` to test it without the `use*` helpers.
 */
class TestStore extends SolidStore<TestState> {
  sync<const Key extends keyof TestState>(
    part: Accessor<Pick<TestState, Key>>,
    options?: { undefinedFallsBack?: boolean; resetOnCleanup?: boolean },
  ) {
    this.register(part, options);
  }
}

function partOf<Key extends keyof TestState>(key: Key, value: Accessor<TestState[Key]>) {
  return createMemo(() => ({ [key]: value() }) as Pick<TestState, Key>, {
    equals: (a, b) => Object.is(a[key], b[key]),
  });
}

describe('SolidStore (port)', () => {
  describe('register', () => {
    it('reads a registered source right away and lets the last writer win', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const dispose = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        return disposeRoot;
      });

      expect(store.state.value).toBe(1);

      // An imperative write takes the key over, synchronously.
      store.set('value', 5);
      expect(store.state.value).toBe(5);
      store.set('label', 'a');
      expect(store.state.label).toBe('a');
      expect(store.state.value).toBe(5);

      // The source retakes it when it changes.
      setValue(2);
      flush();
      expect(store.state.value).toBe(2);

      dispose();
    });

    it('keeps the snapshot identity until a value changes', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      const dispose = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        store.sync(partOf('label', label));
        return disposeRoot;
      });

      const first = store.state;
      expect(store.state).toBe(first);
      expect(store.getSnapshot()).toBe(first);

      setValue(1);
      flush();
      expect(store.state).toBe(first);

      setLabel('b');
      flush();
      const second = store.state;
      expect(second).not.toBe(first);
      expect(second).toEqual({ value: 1, label: 'b', node: undefined });
      expect(store.state).toBe(second);

      // `notifyAll` still gives the state a new reference.
      store.notifyAll();
      expect(store.state).not.toBe(second);
      expect(store.state).toEqual(second);

      dispose();
    });

    it('hands the last value of a disposed source to the imperative state', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const node = (): string | undefined => 'node';
      const dispose = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        store.sync(partOf('node', node), { resetOnCleanup: true });
        return disposeRoot;
      });

      expect(store.state.value).toBe(1);
      expect(store.state.node).toBe('node');

      dispose();
      expect(store.state.value).toBe(1);
      expect(store.state.node).toBe(undefined);

      setValue(2);
      flush();
      expect(store.state.value).toBe(1);
    });

    it('keeps the last value when a source with undefinedFallsBack turns undefined', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal<number | undefined>(undefined);
      const dispose = createRoot((disposeRoot) => {
        store.sync(partOf('value', value as Accessor<number>), { undefinedFallsBack: true });
        return disposeRoot;
      });

      // Uncontrolled: the imperative state provides the key.
      expect(store.state.value).toBe(0);
      store.set('value', 3);
      expect(store.state.value).toBe(3);

      setValue(7);
      flush();
      expect(store.state.value).toBe(7);

      setValue(undefined);
      flush();
      expect(store.state.value).toBe(7);

      store.set('value', 8);
      expect(store.state.value).toBe(8);

      dispose();
    });

    it('notifies subscribers once per change, after the flush', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const notified: number[] = [];
      store.subscribe((state) => {
        notified.push(state.value);
      });

      const dispose = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        return disposeRoot;
      });
      expect(notified).toEqual([]);
      flush();
      expect(notified).toEqual([1]);

      setValue(2);
      expect(notified).toEqual([1]);
      flush();
      expect(notified).toEqual([1, 2]);

      setValue(2);
      flush();
      expect(notified).toEqual([1, 2]);

      dispose();
      // The value is handed over unchanged.
      expect(notified).toEqual([1, 2]);
    });

    it('trackSelector() subscribes to the sources of the keys read', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      let valueRuns = 0;

      const { dispose, selected } = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        store.sync(partOf('label', label));
        const selectedValue = createMemo(() => {
          valueRuns += 1;
          return [value(), store.trackSelector((state) => state.value)];
        });
        return { dispose: disposeRoot, selected: selectedValue };
      });
      flush();
      expect(selected()).toEqual([1, 1]);
      const runs = valueRuns;

      setValue(2);
      flush();
      expect(selected()).toEqual([2, 2]);
      expect(valueRuns).toBe(runs + 1);

      // A source of another key re-runs it once, after the flush (a selector can read values
      // that aren't in the state), without changing its value.
      setLabel('b');
      flush();
      expect(valueRuns).toBe(runs + 2);
      expect(selected()).toEqual([2, 2]);

      // An imperative write does.
      store.set('value', 9);
      flush();
      expect(selected()).toEqual([2, 9]);

      dispose();
    });
  });

  describe('synced values', () => {
    it('reads synced values right away and lets the last writer win', () => {
      const store = new SolidStore<TestState>(initialState);
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValue('value', value);
        store.useSyncedValues(() => ({ label: label() }));
        return disposeRoot;
      });

      // Before any flush.
      expect(store.state.value).toBe(1);
      expect(store.state.label).toBe('a');

      store.set('value', 5);
      store.update({ label: 'b' });
      store.set('node', 'node');
      expect(store.state).toEqual({ value: 5, label: 'b', node: 'node' });

      setValue(2);
      flush();
      expect(store.state).toEqual({ value: 2, label: 'b', node: 'node' });

      setLabel('c');
      flush();
      expect(store.state).toEqual({ value: 2, label: 'c', node: 'node' });

      dispose();
    });

    it('syncs from a separate root and stops when it is disposed', () => {
      // Like a detached trigger registering into a handle's store.
      const store = new SolidStore<TestState>(initialState);
      const [node, setNode] = createSignal<string | undefined>('first');
      const [value, setValue] = createSignal(1);

      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValueWithCleanup('node', node);
        store.useSyncedValue('value', value);
        return disposeRoot;
      });
      expect(store.state.node).toBe('first');
      expect(store.state.value).toBe(1);

      setNode('second');
      flush();
      expect(store.state.node).toBe('second');

      dispose();
      expect(store.state.node).toBe(undefined);
      expect(store.state.value).toBe(1);

      setNode('third');
      setValue(2);
      flush();
      expect(store.state.node).toBe(undefined);
      expect(store.state.value).toBe(1);
    });

    it('keeps the snapshot identity while the synced values are unchanged', () => {
      const store = new SolidStore<TestState>(initialState);
      const [part, setPart] = createSignal({ value: 1, label: 'a' });
      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValues(part);
        return disposeRoot;
      });

      const snapshot = store.state;
      setPart({ value: 1, label: 'a' });
      flush();
      expect(store.state).toBe(snapshot);
      expect(store.getSnapshot()).toBe(snapshot);

      setPart({ value: 2, label: 'a' });
      flush();
      expect(store.state).not.toBe(snapshot);
      expect(store.state.value).toBe(2);

      dispose();
    });

    it('keeps the last controlled value when the prop becomes undefined', () => {
      const store = new SolidStore<TestState>(initialState);
      const [controlled, setControlled] = createSignal<number | undefined>(1);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const dispose = createRoot((disposeRoot) => {
        store.useControlledProp('value', controlled);
        return disposeRoot;
      });

      // Before any flush.
      expect(store.state.value).toBe(1);

      setControlled(4);
      flush();
      expect(store.state.value).toBe(4);

      setControlled(undefined);
      flush();
      expect(store.state.value).toBe(4);
      expect(errorSpy.mock.calls.map((call) => call[0])).toEqual([
        'A component is changing the uncontrolled state of value to be controlled. Elements should not switch from uncontrolled to controlled (or vice versa).',
      ]);

      // Uncontrolled from now on: imperative writes stick.
      store.set('value', 5);
      flush();
      expect(store.state.value).toBe(5);

      errorSpy.mockRestore();
      dispose();
    });
  });

  describe('reactivity', () => {
    const selectors = {
      value: (state: TestState) => state.value,
      label: (state: TestState) => state.label,
      node: (state: TestState) => state.node,
    };

    it('updates selected values in the same flush as the synced values', () => {
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      const [node, setNode] = createSignal<string | undefined>('x');
      const seen: Array<readonly unknown[]> = [];

      function Test(props: { value: number; label: string; node: string | undefined }) {
        const store = new SolidStore<TestState, Record<string, never>, typeof selectors>(
          initialState,
          undefined,
          selectors,
        );
        store.useSyncedValue('value', () => props.value);
        store.useSyncedValues(() => ({ label: props.label }));
        store.useControlledProp('node', () => props.node);
        const storeValue = store.useState('value');
        const storeLabel = store.useState('label');
        const storeNode = store.useState('node');

        createEffect(
          () => [props.value, storeValue(), props.label, storeLabel(), props.node, storeNode()],
          (values) => {
            seen.push(values);
          },
        );
        return null;
      }

      render(() => <Test value={value()} label={label()} node={node()} />);
      flush();

      setValue(2);
      flush();
      setLabel('b');
      flush();
      setNode('y');
      flush();
      setValue(3);
      setLabel('c');
      flush();

      expect(seen.length).toBeGreaterThan(1);
      for (const values of seen) {
        expect([values[1], values[3], values[5]]).toEqual([values[0], values[2], values[4]]);
      }
      expect(seen[seen.length - 1]).toEqual([3, 3, 'c', 'c', 'y', 'y']);
    });

    it('notifies observers once per change, with the selected state up to date', () => {
      const [value, setValue] = createSignal(1);
      const calls: Array<[number, number, number]> = [];

      function Test(props: { value: number }) {
        const store = new SolidStore<TestState, Record<string, never>, typeof selectors>(
          initialState,
          undefined,
          selectors,
        );
        store.useSyncedValue('value', () => props.value);
        const storeValue = store.useState('value');
        onCleanup(
          store.observe('value', (newValue, oldValue) => {
            calls.push([newValue, oldValue, untrack(storeValue)]);
          }),
        );
        return null;
      }

      render(() => <Test value={value()} />);
      flush();
      // The initial call, with the synced value.
      expect(calls).toEqual([[1, 1, 1]]);

      setValue(2);
      flush();
      expect(calls).toEqual([
        [1, 1, 1],
        [2, 1, 2],
      ]);

      setValue(2);
      flush();
      setValue(3);
      flush();
      expect(calls).toEqual([
        [1, 1, 1],
        [2, 1, 2],
        [3, 2, 3],
      ]);
    });

    it('does not relay synced values through effects when opening and closing popups', async () => {
      // Solid reports relay tears when its attribution engine is enabled.
      const disableAttribution = attribution.enable();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const [selectOpen, setSelectOpen] = createSignal(false);
      const [popoverOpen, setPopoverOpen] = createSignal(false);

      render(() => (
        <div>
          <Select.Root open={selectOpen()} onOpenChange={setSelectOpen} defaultValue="a">
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.Item value="a">a</Select.Item>
                  <Select.Item value="b">b</Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <Popover.Root open={popoverOpen()} onOpenChange={setPopoverOpen}>
            <Popover.Trigger>Toggle</Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner>
                <Popover.Popup>
                  <Popover.Title>Title</Popover.Title>
                  <Popover.Close>Close</Popover.Close>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      ));

      for (const setOpen of [setSelectOpen, setPopoverOpen]) {
        for (const open of [true, false, true, false]) {
          setOpen(open);
          flush();
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => {
            setTimeout(resolve, 20);
          });
          flush();
        }
      }

      // Synced values used to reach `useState` through a `subscribe` listener that wrote a signal
      // one flush late. Imperative writes from effects (upstream's layout effects, e.g. Select's
      // `selectedIndex`) still reach it through the store's version signal.
      const relayed = warnSpy.mock.calls
        .map((call) => String(call[0]))
        .filter(
          (message) =>
            message.startsWith('[EFFECT_RELAY_TEAR]') &&
            /by writing "(subscribeToStore\.track|SolidStore\.source|SolidStore\.late)"/.test(
              message,
            ),
        );
      warnSpy.mockRestore();
      disableAttribution();
      expect(relayed).toEqual([]);
    });
  });

  describe('server rendering', () => {
    it('renders synced values on the server and hydrates them', async () => {
      const { hydrate } = await renderToString(SyncedValues, { value: 'server' });

      const output = screen.getByTestId('output');
      expect(output).toHaveTextContent('server');
      expect(output).toHaveAttribute('data-label', 'server-label');

      const { setProps } = hydrate();

      expect(screen.getByTestId('output')).toBe(output);
      expect(output).toHaveTextContent('server');

      setProps({ value: 'client' });
      flush();
      expect(output).toHaveTextContent('client');
      expect(output).toHaveAttribute('data-label', 'client-label');
    });
  });
});

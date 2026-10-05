import { expect, describe, it } from 'vitest';
import { createMemo, createRoot, createSignal, flush } from 'solid-js';
import type { Accessor } from 'solid-js';
import { screen } from '@solidjs/testing-library';
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

    it('track() subscribes to the sources of the keys read', () => {
      const store = new TestStore(initialState);
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      let valueRuns = 0;

      const { dispose, selected } = createRoot((disposeRoot) => {
        store.sync(partOf('value', value));
        store.sync(partOf('label', label));
        const selectedValue = createMemo(() => {
          valueRuns += 1;
          return [value(), store.track().value];
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

      // A source of another key doesn't re-run the memo.
      setLabel('b');
      flush();
      expect(valueRuns).toBe(runs + 1);

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

    it('renders synced values on the server', async () => {
      await renderToString(SyncedValues, { value: 'server' });

      const output = screen.getByTestId('output');
      expect(output).toHaveTextContent('server');
      expect(output).toHaveAttribute('data-label', 'server-label');
    });

    it('hydrates synced values without a mismatch', async () => {
      const { hydrate } = await renderToString(SyncedValues, { value: 'server' });
      const { setProps } = hydrate();

      const output = screen.getByTestId('output');
      expect(output).toHaveTextContent('server');

      setProps({ value: 'client' });
      flush();
      expect(output).toHaveTextContent('client');
      expect(output).toHaveAttribute('data-label', 'client-label');
    });
  });
});

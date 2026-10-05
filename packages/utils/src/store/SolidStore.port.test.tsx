import { expect, describe, it, vi } from 'vitest';
import { createRoot, createSignal, flush, onCleanup } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { SolidStore } from './SolidStore';

type TestState = { value: number; label: string; node: string | undefined };

const initialState: TestState = { value: 0, label: '', node: undefined };

const selectors = {
  value: (state: TestState) => state.value,
  label: (state: TestState) => state.label,
  node: (state: TestState) => state.node,
};

// Port note: synced and controlled values are copied into the store by effects, like upstream's
// layout effects, so they reach `state` when Solid flushes (see PORTING.md, "Stores and popups").
describe('SolidStore (port)', () => {
  describe('synced values', () => {
    it('lets an imperative write take a synced key over until the synced value changes', () => {
      const store = new SolidStore<TestState>(initialState);
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValue('value', value);
        store.useSyncedValues(() => ({ label: label() }));
        return disposeRoot;
      });
      flush();
      expect(store.state.value).toBe(1);
      expect(store.state.label).toBe('a');

      // Imperative writes are visible synchronously.
      store.set('value', 5);
      expect(store.state.value).toBe(5);
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
      flush();
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
      const [value, setValue] = createSignal(1);
      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValues(part);
        store.useSyncedValue('value', value);
        return disposeRoot;
      });
      flush();

      const snapshot = store.state;
      expect(store.getSnapshot()).toBe(snapshot);

      setPart({ value: 1, label: 'a' });
      setValue(1);
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
      flush();
      expect(store.state.value).toBe(1);

      setControlled(4);
      flush();
      expect(store.state.value).toBe(4);

      setControlled(undefined);
      flush();
      expect(store.state.value).toBe(4);
      // Upstream's message, worded from the new controlled state.
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
    it('notifies subscribers once per change', () => {
      const store = new SolidStore<TestState>(initialState);
      const [value, setValue] = createSignal(1);
      const notified: number[] = [];
      store.subscribe((state) => {
        notified.push(state.value);
      });

      const dispose = createRoot((disposeRoot) => {
        store.useSyncedValue('value', value);
        return disposeRoot;
      });
      flush();
      expect(notified).toEqual([1]);

      setValue(2);
      flush();
      expect(notified).toEqual([1, 2]);

      setValue(2);
      flush();
      expect(notified).toEqual([1, 2]);

      dispose();
      expect(notified).toEqual([1, 2]);
    });

    it('notifies observers once per change', () => {
      const [value, setValue] = createSignal(1);
      const calls: Array<[number, number]> = [];

      function Test(props: { value: number }) {
        const store = new SolidStore<TestState, Record<string, never>, typeof selectors>(
          initialState,
          undefined,
          selectors,
        );
        store.useSyncedValue('value', () => props.value);
        onCleanup(
          store.observe('value', (newValue, oldValue) => {
            calls.push([newValue, oldValue]);
          }),
        );
        return null;
      }

      render(() => <Test value={value()} />);
      flush();
      // The initial call, then the synced value.
      expect(calls).toEqual([
        [0, 0],
        [1, 0],
      ]);

      setValue(2);
      flush();
      setValue(2);
      flush();
      setValue(3);
      flush();
      expect(calls).toEqual([
        [0, 0],
        [1, 0],
        [2, 1],
        [3, 2],
      ]);
    });

    it('settles selected values on the synced values after the flush', () => {
      const [value, setValue] = createSignal(1);
      const [label, setLabel] = createSignal('a');
      const [node, setNode] = createSignal<string | undefined>('x');
      let read!: () => readonly unknown[];

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
        read = () => [storeValue(), storeLabel(), storeNode()];
        return null;
      }

      render(() => <Test value={value()} label={label()} node={node()} />);
      flush();
      expect(read()).toEqual([1, 'a', 'x']);

      setValue(2);
      flush();
      expect(read()).toEqual([2, 'a', 'x']);
      setNode('y');
      setValue(3);
      setLabel('c');
      flush();
      expect(read()).toEqual([3, 'c', 'y']);
    });
  });
});

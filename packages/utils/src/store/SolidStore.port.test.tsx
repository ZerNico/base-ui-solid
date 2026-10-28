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
  describe('useResetState', () => {
    function setup(options?: { everyRun?: boolean; hold?: boolean }) {
      const store = new SolidStore<TestState>(initialState);
      const [reset, setReset] = createSignal<{ value: number } | undefined>(undefined);
      const onReset = vi.fn();
      const dispose = createRoot((disposeRoot) => {
        store.useResetState('value', reset, { ...options, onReset });
        return disposeRoot;
      });
      flush();
      return { store, setReset, onReset, dispose };
    }

    it('reads the reset value until the next write', () => {
      const { store, setReset, dispose } = setup();
      store.set('value', 1);
      expect(store.state.value).toBe(1);

      setReset({ value: 0 });
      flush();
      expect(store.state.value).toBe(0);

      store.set('value', 2);
      expect(store.state.value).toBe(2);

      // No reset keeps what the key reads.
      setReset(undefined);
      flush();
      expect(store.state.value).toBe(2);
      dispose();
    });

    it('resets to the same value again after a run without a reset', () => {
      const { store, setReset, onReset, dispose } = setup();
      setReset({ value: 0 });
      flush();
      expect(onReset).toHaveBeenCalledTimes(1);
      store.set('value', 2);

      // The same value again is no reset.
      setReset({ value: 0 });
      flush();
      expect(store.state.value).toBe(2);
      expect(onReset).toHaveBeenCalledTimes(1);

      setReset(undefined);
      flush();
      setReset({ value: 0 });
      flush();
      expect(store.state.value).toBe(0);
      expect(onReset).toHaveBeenCalledTimes(2);
      expect(onReset).toHaveBeenLastCalledWith(0);
      dispose();
    });

    it('resets on every run with `everyRun`', () => {
      const { store, setReset, onReset, dispose } = setup({ everyRun: true });
      setReset({ value: 0 });
      flush();
      store.set('value', 2);
      setReset({ value: 0 });
      flush();
      expect(store.state.value).toBe(0);
      expect(onReset).toHaveBeenCalledTimes(2);
      dispose();
    });

    it('ignores writes while resetting with `hold`', () => {
      const { store, setReset, dispose } = setup({ hold: true });
      setReset({ value: 0 });
      flush();
      store.set('value', 2);
      expect(store.state.value).toBe(0);

      setReset(undefined);
      flush();
      expect(store.state.value).toBe(0);
      store.set('value', 3);
      expect(store.state.value).toBe(3);
      dispose();
    });
  });

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

      // Port note: synced values are derived. The snapshot is replaced when the raw state changes, not
      // when only a synced value does (its getter returns the current value).
      setPart({ value: 2, label: 'a' });
      flush();
      expect(store.state).toBe(snapshot);
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
      expect(errorSpy.mock.calls.map((call) => call[0])).toEqual([
        'A component is changing the controlled state of value to be uncontrolled. Elements should not switch from uncontrolled to controlled (or vice versa).',
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
      // Port note: the synced value is derived, so the initial call already sees it.
      expect(calls).toEqual([[1, 1]]);

      setValue(2);
      flush();
      setValue(2);
      flush();
      setValue(3);
      flush();
      expect(calls).toEqual([
        [1, 1],
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

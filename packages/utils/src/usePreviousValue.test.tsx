import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as solidRender } from '@solidjs/testing-library';
import { usePreviousValue } from './usePreviousValue';

interface TestComponentProps {
  value: any;
  unrelatedProp?: any;
  children: (previous: any) => JSX.Element;
}

// Port note: the hook takes and returns accessors. `children` is called in a reactive scope, so it
// re-runs when the previous value changes (upstream calls it on every render).
function TestComponent(props: TestComponentProps) {
  const previous = usePreviousValue(() => props.value);
  return <>{props.children(previous())}</>;
}

// Port note: counterpart of upstream's `render(...).setProps` (props held in a signal, updates
// flushed synchronously) and `act()`, which batches the updates until the flush.
function render(element: { props: TestComponentProps }) {
  const [props, setProps] = createSignal({ current: element.props });
  solidRender(() => <TestComponent {...props().current} />);
  flush();
  let batching = false;
  return {
    setProps(newProps: Partial<TestComponentProps>) {
      setProps((previous) => ({ current: { ...previous.current, ...newProps } }));
      if (!batching) {
        flush();
      }
    },
    act(callback: () => void) {
      batching = true;
      callback();
      batching = false;
      flush();
    },
  };
}

// Port note: stands for upstream's `<TestComponent value={value}>{children}</TestComponent>`.
function testComponent(
  value: any,
  children: (previous: any) => JSX.Element,
): { props: TestComponentProps } {
  return { props: { value, children } };
}

describe('usePrevious', () => {
  it('should return null on the first render', () => {
    let previousValue: any;
    render(
      testComponent('first', (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);
  });

  it('should return the previous value on subsequent renders', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent('first', (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: 'second' });
    expect(previousValue).toBe('first');

    setProps({ value: 'third' });
    expect(previousValue).toBe('second');
  });

  it('should work with primitive values', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent(42, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: 100 });
    expect(previousValue).toBe(42);

    setProps({ value: true });
    expect(previousValue).toBe(100);

    setProps({ value: false });
    expect(previousValue).toBe(true);
  });

  it('should treat NaN as unchanged', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent(Number.NaN, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: Number.NaN, unrelatedProp: 1 });
    expect(previousValue).toBe(null);
  });

  it('should return the previous value when changing to NaN', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent(1, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    setProps({ value: Number.NaN });
    expect(previousValue).toBe(1);
  });

  it('should distinguish positive and negative zero', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent(0, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    setProps({ value: -0 });
    expect(previousValue).toBe(0);

    setProps({ value: 0 });
    expect(previousValue).toBe(-0);
  });

  it('should ignore renders where the value does not change', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent('stable', (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ unrelatedProp: 1 });
    expect(previousValue).toBe(null);

    setProps({ unrelatedProp: 2 });
    expect(previousValue).toBe(null);
  });

  it('should work with object values', () => {
    let previousValue: any;
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };

    const { setProps } = render(
      testComponent(obj1, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: obj2 });
    expect(previousValue).toBe(obj1);

    setProps({ value: obj3 });
    expect(previousValue).toBe(obj2);
  });

  it('should handle undefined and null values', () => {
    let previousValue: any;
    const { setProps } = render(
      testComponent(undefined, (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: null });
    expect(previousValue).toBe(undefined);

    setProps({ value: 'defined' });
    expect(previousValue).toBe(null);

    setProps({ value: undefined });
    expect(previousValue).toBe('defined');
  });

  it('should handle rapid value changes', () => {
    let previousValue: any;
    const { setProps, act } = render(
      testComponent('initial', (previous) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    act(() => {
      setProps({ value: 'first' });
      setProps({ value: 'second' });
      setProps({ value: 'third' });
    });

    // With React batching, only the final value 'third' causes a render,
    // so the previous value should be 'initial' (from the first render)
    expect(previousValue).toBe('initial');
  });

  it('should maintain type safety', () => {
    let previousValue: string | null = null;
    const { setProps } = render(
      testComponent('hello', (previous: string | null) => {
        previousValue = previous;
        return null;
      }),
    );

    expect(previousValue).toBe(null);

    setProps({ value: 'world' });
    expect(previousValue).toBe('hello');
    expect(typeof previousValue).toBe('string');
  });
});

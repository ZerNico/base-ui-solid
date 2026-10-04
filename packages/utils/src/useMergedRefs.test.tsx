import { expect, vi, describe, it, test } from 'vitest';
import { createSignal, flush, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as solidRender, screen } from '@solidjs/testing-library';
import type { RefObject } from './refObject';
import { useMergedRefs } from './useMergedRefs';

type Ref<T> = ((instance: T) => void) | RefObject<T> | null | undefined;

// Port note: counterpart of upstream's `render(...)` / `setProps` (props held in a signal,
// updates flushed synchronously).
function render<Props extends object>(
  Component: (props: Props) => JSX.Element,
  initialProps: NoInfer<Props>,
) {
  const [props, setPropsState] = createSignal({ current: initialProps });
  const view = solidRender(() => <Component {...props().current} />);
  flush();
  return {
    ...view,
    setProps(newProps: Partial<Props>) {
      setPropsState((previous) => ({ current: { ...previous.current, ...newProps } }));
      flush();
    },
  };
}

// Port note: upstream's `not.toErrorDev()` matcher is replaced by a `console.error` spy.
function expectNoErrorDev(callback: () => void) {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    callback();
    flush();
    expect(errorSpy).not.toHaveBeenCalled();
  } finally {
    errorSpy.mockRestore();
  }
}

function createRef<T>(): RefObject<T | null> {
  return { current: null };
}

describe('useMergedRefs', () => {
  it('returns a single ref-setter function that forks the ref to its inputs', () => {
    interface TestComponentProps {
      innerRef: Ref<HTMLDivElement | null>;
    }

    function Component(props: TestComponentProps) {
      const [ownRefCurrent, setOwnRef] = createSignal<HTMLDivElement | null>(null, {
        ownedWrite: true,
      });
      const ownRef = (element: HTMLDivElement | null) => {
        setOwnRef(element);
      };

      const handleRef = useMergedRefs(
        () => props.innerRef,
        () => ownRef,
      );

      return <div ref={handleRef}>{ownRefCurrent() ? 'has a ref' : 'has no ref'}</div>;
    }

    const outerRef = createRef<HTMLDivElement>();

    expectNoErrorDev(() => {
      render(Component, { innerRef: outerRef });
    });
    expect(outerRef.current!.textContent).toBe('has a ref');
  });

  it('forks if only one of the branches requires a ref', () => {
    function Component(props: { ref?: Ref<HTMLDivElement> }) {
      const [hasRef, setHasRef] = createSignal(false, { ownedWrite: true });
      const handleOwnRef = () => {
        setHasRef(true);
      };
      const handleRef = useMergedRefs(
        () => handleOwnRef,
        () => props.ref,
      );

      return (
        <div ref={handleRef} data-testid="hasRef">
          {String(hasRef())}
        </div>
      );
    }

    expectNoErrorDev(() => {
      render(Component, {});
    });

    expect(screen.getByTestId('hasRef')).toHaveTextContent('true');
  });

  it('does nothing if none of the forked branches requires a ref', () => {
    // Port note: upstream reads the child element's ref with `getReactElementRef` and clones it
    // (React-only). The element here has no ref of its own, which is the case being tested.
    function Outer(props: { ref?: Ref<HTMLDivElement> }) {
      const handleRef = useMergedRefs(
        () => null,
        () => props.ref,
      );

      return <div ref={handleRef} />;
    }

    expectNoErrorDev(() => {
      render(Outer, {});
    });
  });

  describe('changing refs', () => {
    interface TestComponentProps {
      leftRef?: Ref<HTMLDivElement | null>;
      rightRef?: Ref<HTMLDivElement | null>;
      id?: string;
    }

    function Div(props: TestComponentProps) {
      const other = omit(props, 'leftRef', 'rightRef');
      const handleRef = useMergedRefs(
        () => props.leftRef,
        () => props.rightRef,
      );

      return <div {...other} ref={handleRef} />;
    }

    it('handles changing from no ref to some ref', () => {
      let view!: ReturnType<typeof render<TestComponentProps>>;

      expectNoErrorDev(() => {
        view = render(Div, { id: 'test' });
      });

      const ref = createRef<HTMLDivElement>();
      expectNoErrorDev(() => {
        view.setProps({ leftRef: ref });
      });
      expect(ref.current!.id).toBe('test');
    });

    it('cleans up detached refs', () => {
      const firstLeftRef = createRef<HTMLDivElement>();
      const firstRightRef = createRef<HTMLDivElement>();
      const secondRightRef = createRef<HTMLDivElement>();
      let view!: ReturnType<typeof render<TestComponentProps>>;

      expectNoErrorDev(() => {
        view = render(Div, { leftRef: firstLeftRef, rightRef: firstRightRef, id: 'test' });
      });

      expect(firstLeftRef.current!.id).toBe('test');
      expect(firstRightRef.current!.id).toBe('test');
      expect(secondRightRef.current).toBe(null);

      view!.setProps({ rightRef: secondRightRef });

      expect(firstLeftRef.current!.id).toBe('test');
      expect(firstRightRef.current).toBe(null);
      expect(secondRightRef.current!.id).toBe('test');
    });
  });

  test('calls clean up function if it exists', () => {
    const cleanUp = vi.fn();
    const setup = vi.fn();
    const setup2 = vi.fn();
    const nullHandler = vi.fn();

    function onRefChangeWithCleanup(ref: HTMLDivElement | null) {
      if (ref) {
        setup(ref.id);
      } else {
        nullHandler();
      }
      return cleanUp;
    }

    function onRefChangeWithoutCleanup(ref: HTMLDivElement | null) {
      if (ref) {
        setup2(ref.id);
      } else {
        nullHandler();
      }
    }

    function App() {
      const ref = useMergedRefs(
        () => onRefChangeWithCleanup,
        () => onRefChangeWithoutCleanup,
      );
      return <div id="test" ref={ref} />;
    }

    const { unmount } = render(App, {});

    expect(setup.mock.calls[0][0]).toBe('test');
    expect(setup.mock.calls.length).toBe(1);
    expect(cleanUp.mock.calls.length).toBe(0);

    expect(setup2.mock.calls[0][0]).toBe('test');
    expect(setup2.mock.calls.length).toBe(1);

    unmount();

    expect(setup.mock.calls.length).toBe(1);
    expect(cleanUp.mock.calls.length).toBe(1);

    // Setup was not called again
    expect(setup2.mock.calls.length).toBe(1);
    // Null handler hit because no cleanup is returned
    expect(nullHandler.mock.calls.length).toBe(1);
  });
});

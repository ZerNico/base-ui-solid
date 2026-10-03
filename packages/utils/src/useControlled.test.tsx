import { expect, describe, it, vi, afterEach } from 'vitest';
import { type Accessor, createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render as solidRender } from '@solidjs/testing-library';
import { type ControlledSetter, useControlled } from './useControlled';

// Port note: upstream's `toErrorDev` matcher is replaced by a `console.error` spy. `error()` logs
// each message once (the dedupe is reset after each test, like upstream).
function expectErrorDev(callback: () => void, message?: string) {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    callback();
    flush();
    if (message === undefined) {
      expect(errorSpy).not.toHaveBeenCalled();
    } else {
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain(message);
    }
  } finally {
    errorSpy.mockRestore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

interface TestComponentChildrenArgument {
  // Port note: the hook returns an accessor.
  value: Accessor<number | string | object | null | undefined>;
  setValue: ControlledSetter<any>;
}

interface TestComponentProps {
  value?: number | string;
  defaultValue?: number | string | object | null;
  children: (parames: TestComponentChildrenArgument) => JSX.Element;
}

function TestComponent(props: TestComponentProps) {
  const [value, setValue] = useControlled<any>({
    controlled: () => props.value,
    get default() {
      return props.defaultValue;
    },
    name: 'TestComponent',
  });
  return props.children({ value, setValue });
}

// Port note: counterpart of upstream's `render(...).setProps`: each prop is a signal (not a store,
// whose proxies would wrap object default values).
function render(initialProps: Omit<TestComponentProps, 'children'> = {}) {
  const [value, setValue] = createSignal(initialProps.value);
  const [defaultValue, setDefaultValue] = createSignal(initialProps.defaultValue);
  solidRender(() => (
    <TestComponent value={value()} defaultValue={defaultValue()}>
      {() => null}
    </TestComponent>
  ));
  flush();
  return {
    setProps(newProps: Partial<TestComponentProps>) {
      if ('value' in newProps) {
        setValue(() => newProps.value);
      }
      if ('defaultValue' in newProps) {
        setDefaultValue(() => newProps.defaultValue);
      }
      flush();
    },
  };
}

describe('useControlled', () => {
  it('works correctly when is not controlled', () => {
    let valueState!: Accessor<unknown>;
    let setValueState!: ControlledSetter<number | string>;
    solidRender(() => (
      <TestComponent defaultValue={1}>
        {({ value, setValue }) => {
          valueState = value;
          setValueState = setValue;
          return null;
        }}
      </TestComponent>
    ));
    expect(valueState()).toBe(1);

    setValueState(2);
    flush();

    expect(valueState()).toBe(2);
  });

  it('works correctly when is controlled', () => {
    let valueState!: Accessor<unknown>;
    solidRender(() => (
      <TestComponent value={1}>
        {({ value }) => {
          valueState = value;
          return null;
        }}
      </TestComponent>
    ));
    expect(valueState()).toBe(1);
  });

  it('warns when switching from uncontrolled to controlled', () => {
    let setProps!: (newProps: any) => void;
    expectErrorDev(() => {
      ({ setProps } = render());
    });

    expectErrorDev(() => {
      setProps({ value: 'foobar' });
    }, 'Base UI: A component is changing the uncontrolled value state of TestComponent to be controlled.');
  });

  it('warns and falls back to the default when switching from controlled to uncontrolled', () => {
    const [controlled, setControlled] = createSignal<string | undefined>('foobar');
    let result!: [Accessor<string>, ControlledSetter<string>];

    function TestHook() {
      result = useControlled({
        controlled,
        default: 'default',
        name: 'TestHook',
      });
      return null;
    }

    expectErrorDev(() => {
      solidRender(() => <TestHook />);
    });

    expect(result[0]()).toBe('foobar');

    expectErrorDev(() => {
      setControlled(undefined);
    }, 'Base UI: A component is changing the controlled value state of TestHook to be uncontrolled.');

    expect(result[0]()).toBe('default');

    result[1]('next');
    flush();

    expect(result[0]()).toBe('default');
  });

  describe('prop: defaultValue', () => {
    it('warns when changed after initial rendering', () => {
      let setProps!: (newProps: any) => void;

      expectErrorDev(() => {
        ({ setProps } = render());
      });

      expectErrorDev(() => {
        setProps({ defaultValue: 1 });
      }, 'Base UI: A component is changing the default value state of an uncontrolled TestComponent after being initialized.');
    });

    it('does not warn when controlled', () => {
      let setProps!: (newProps: any) => void;

      expectErrorDev(() => {
        ({ setProps } = render({ value: 1, defaultValue: 0 }));
      });

      expectErrorDev(() => {
        setProps({ defaultValue: 1 });
      });
    });

    it('does not warn when NaN', () => {
      expectErrorDev(() => {
        render({ defaultValue: NaN });
      });
    });

    it('does not warn when an array', () => {
      function TestComponentArray() {
        useControlled({
          controlled: () => undefined,
          default: [],
          name: 'TestComponent',
        });
        return null;
      }

      expectErrorDev(() => {
        solidRender(() => <TestComponentArray />);
      });
    });

    it('does not throw when defaultValue has React elements', () => {
      function TestComponentArray() {
        useControlled({
          controlled: () => undefined,
          default: {
            value: <span />,
          },
          name: 'TestComponent',
        });
        return null;
      }

      expectErrorDev(() => {
        solidRender(() => <TestComponentArray />);
      });
    });

    it('does not throw when defaultValue has function', () => {
      const fn = () => 100;

      function TestComponentArray() {
        useControlled({
          controlled: () => undefined,
          default: {
            value: fn,
          },
          name: 'TestComponent',
        });
        return null;
      }

      expectErrorDev(() => {
        solidRender(() => <TestComponentArray />);
      });
    });

    it('does not throw when defaultValue has bigint', () => {
      function TestComponentBigInt() {
        useControlled({
          controlled: () => undefined,
          default: 1n,
          name: 'TestComponent',
        });
        return null;
      }

      expectErrorDev(() => {
        solidRender(() => <TestComponentBigInt />);
      });
    });

    it('should warn only when defaultValue changes', () => {
      let setProps!: (newProps: any) => void;

      expectErrorDev(() => {
        ({ setProps } = render({ defaultValue: 0 }));
      });

      expectErrorDev(() => {
        setProps({ defaultValue: 1 });
      }, 'Base UI: A component is changing the default value state of an uncontrolled TestComponent after being initialized.');

      expectErrorDev(() => {
        setProps({ defaultValue: 2 });
      });

      expectErrorDev(() => {
        setProps({ defaultValue: 0 });
      });
    });

    it('should warn only when defaultValue has functions/components and changes', () => {
      let setProps!: (newProps: any) => void;

      const items = [
        {
          item: <span />,
        },
        {
          item: () => 100,
        },
        {
          item: <div />,
        },
      ];

      expectErrorDev(() => {
        ({ setProps } = render({ defaultValue: items[0] }));
      });

      expectErrorDev(() => {
        setProps({ defaultValue: items[1] });
      }, 'Base UI: A component is changing the default value state of an uncontrolled TestComponent after being initialized.');

      expectErrorDev(() => {
        setProps({ defaultValue: items[2] });
      });

      expectErrorDev(() => {
        setProps({ defaultValue: items[0] });
      });
    });

    it('should not fail on null values', () => {
      let setProps!: (newProps: any) => void;

      const s1 = null;
      const s2 = undefined;

      expectErrorDev(() => {
        ({ setProps } = render({ defaultValue: s1 }));
      });

      expectErrorDev(() => {
        setProps({ defaultValue: s2 });
      }, 'Base UI: A component is changing the default value state of an uncontrolled TestComponent after being initialized.');

      expectErrorDev(() => {
        setProps({ defaultValue: s1 });
      });
    });
  });
});

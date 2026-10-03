import { expect, vi, describe, it } from 'vitest';
// Port note: handlers receive native events (there's no `nativeEvent` wrapper), `className` is
// `class` and merges into a Solid class array, and style objects use kebab-case keys.
// `mergeProps<any>` has no Solid counterpart (the type parameter is a props object), so the
// tests use `any`.
import { mergeProps, mergePropsN } from '../merge-props';
import type { BaseUIEvent } from '../internals/types';

describe('mergeProps', () => {
  it('merges event handlers', () => {
    const theirProps = {
      onClick: vi.fn(),
      onKeyDown: vi.fn(),
    };
    const ourProps = {
      onClick: vi.fn(),
      onPaste: vi.fn(),
    };
    const mergedProps = mergeProps<any>(ourProps, theirProps);

    mergedProps.onClick?.(new MouseEvent('click'));
    mergedProps.onKeyDown?.(new KeyboardEvent('keydown'));
    mergedProps.onPaste?.(new Event('paste'));

    expect(theirProps.onClick.mock.invocationCallOrder[0]).toBeLessThan(
      ourProps.onClick.mock.invocationCallOrder[0],
    );
    expect(theirProps.onClick.mock.calls.length).toBe(1);
    expect(ourProps.onClick.mock.calls.length).toBe(1);
    expect(theirProps.onKeyDown.mock.calls.length).toBe(1);
    expect(ourProps.onPaste.mock.calls.length).toBe(1);
  });

  it('merges multiple event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<any>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    mergedProps.onClick?.(new MouseEvent('click'));
    expect(log).toEqual(['1', '2', '3']);
  });

  it('merges undefined event handlers', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<any>(
      {
        onClick() {
          log.push('3');
        },
      },
      {
        onClick: undefined,
      },
      {
        onClick() {
          log.push('1');
        },
      },
    );

    mergedProps.onClick?.(new MouseEvent('click'));
    expect(log).toEqual(['1', '3']);
  });

  it('makes a lone synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<any>(
      {},
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
    );

    mergedProps.onMouseDown?.(new MouseEvent('mousedown'));

    expect(prevented).toBe(true);
  });

  it('makes a first-position synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<any>(
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
      {
        id: 'test-button',
      },
    );

    mergedProps.onMouseDown?.(new MouseEvent('mousedown'));

    expect(prevented).toBe(true);
  });

  it('makes a first-position synthetic event handler preventable in mergePropsN', () => {
    let prevented = false;

    const mergedProps = mergePropsN<any>([
      {
        onMouseDown(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
      {
        id: 'test-button',
      },
    ]);

    mergedProps.onMouseDown?.(new MouseEvent('mousedown'));

    expect(prevented).toBe(true);
  });

  it('makes a lone obscure synthetic event handler preventable', () => {
    let prevented = false;

    const mergedProps = mergeProps<any>(
      {},
      {
        onContextMenu(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          prevented = event.baseUIHandlerPrevented === true;
        },
      },
    );

    mergedProps.onContextMenu?.(new MouseEvent('contextmenu'));

    expect(prevented).toBe(true);
  });

  it('merges styles', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {
      style: { color: 'blue', 'background-color': 'blue' },
    };
    const mergedProps = mergeProps<any>(ourProps, theirProps);

    expect(mergedProps.style).toEqual({
      color: 'red',
      'background-color': 'blue',
    });
  });

  it('merges styles with undefined', () => {
    const theirProps = {
      style: { color: 'red' },
    };
    const ourProps = {};

    const mergedProps = mergeProps<any>(ourProps, theirProps);

    expect(mergedProps.style).toEqual({
      color: 'red',
    });
  });

  it('does not merge styles if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<any>(ourProps, theirProps);

    expect(mergedProps.style).toBe(undefined);
  });

  it('merges classNames with rightmost first', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {
      class: 'internal-class',
    };
    const mergedProps = mergeProps<any>(ourProps, theirProps);

    // Port note: Solid merges classes into a class array instead of a string.
    expect(mergedProps.class).toEqual(['external-class', 'internal-class']);
  });

  it('merges multiple classNames', () => {
    const mergedProps = mergeProps<any>(
      {
        class: 'class-1',
      },
      {
        class: 'class-2',
      },
      {
        class: 'class-3',
      },
    );

    // Port note: Solid merges classes into a (nested) class array instead of a string.
    expect(mergedProps.class).toEqual(['class-3', ['class-2', 'class-1']]);
  });

  it('merges classNames with undefined', () => {
    const theirProps = {
      class: 'external-class',
    };
    const ourProps = {};

    const mergedProps = mergeProps<any>(ourProps, theirProps);

    expect(mergedProps.class).toBe('external-class');
  });

  it('does not merge classNames if both are undefined', () => {
    const theirProps = {};
    const ourProps = {};
    const mergedProps = mergeProps<any>(ourProps, theirProps);

    expect(mergedProps.class).toBe(undefined);
  });

  it('does not prevent internal handler if event.preventBaseUIHandler() is not called', () => {
    let ran = false;

    const mergedProps = mergeProps<any>(
      {
        onClick() {},
      },
      {
        onClick() {
          ran = true;
        },
      },
    );

    mergedProps.onClick?.(new MouseEvent('click'));

    expect(ran).toBe(true);
  });

  it('prevents internal handler if event.preventBaseUIHandler() is called', () => {
    let ran = false;

    const mergedProps = mergeProps<any>(
      {
        onClick: function onClick3() {
          ran = true;
        },
      },
      {
        onClick: function onClick2() {
          ran = true;
        },
      },
      {
        onClick: function onClick1(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
        },
      },
    );

    const event = new MouseEvent('click');
    mergedProps.onClick?.(event);

    expect(ran).toBe(false);
  });

  it('prevents handlers merged after event.preventBaseUIHandler() is called', () => {
    const log: string[] = [];

    const mergedProps = mergeProps<any>(
      {
        onClick() {
          log.push('2');
        },
      },
      {
        onClick(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          log.push('1');
        },
      },
      {
        onClick() {
          log.push('0');
        },
      },
    );

    mergedProps.onClick?.(new MouseEvent('click'));

    expect(log).toEqual(['0', '1']);
  });

  [true, 13, 'newValue', { key: 'value' }, ['value'], () => 'value'].forEach((eventArgument) => {
    it('handles non-standard event handlers without error', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<any>(
        {
          onValueChange() {
            log.push('1');
          },
        },
        {
          onValueChange() {
            log.push('0');
          },
        },
      );

      mergedProps.onValueChange(eventArgument);

      expect(log).toEqual(['0', '1']);
    });
  });

  it('forwards all arguments for a lone non-standard event handler', () => {
    const handler = vi.fn();

    const mergedProps = mergeProps<any>(
      {},
      {
        onOpenChange: handler,
      },
    );

    const eventDetails = { reason: 'test' };
    mergedProps.onOpenChange?.(true, eventDetails);

    expect(handler).toHaveBeenCalledWith(true, eventDetails);
  });

  it('forwards all arguments for merged non-standard event handlers', () => {
    const log: Array<[string, boolean, { reason: string }]> = [];
    const eventDetails = { reason: 'test' };

    const mergedProps = mergeProps<any>(
      {
        onOpenChange(open: boolean, details: { reason: string }) {
          log.push(['ours', open, details]);
        },
      },
      {
        onOpenChange(open: boolean, details: { reason: string }) {
          log.push(['theirs', open, details]);
        },
      },
    );

    mergedProps.onOpenChange?.(true, eventDetails);

    expect(log).toEqual([
      ['theirs', true, eventDetails],
      ['ours', true, eventDetails],
    ]);
  });

  it('forwards additional arguments for synthetic event handlers', () => {
    const log: Array<[string, string]> = [];

    const mergedProps = mergeProps<any>(
      {
        onMouseDown(_event: BaseUIEvent<MouseEvent>, details: { reason: string }) {
          log.push(['ours', details.reason]);
        },
      },
      {
        onMouseDown(_event: BaseUIEvent<MouseEvent>, details: { reason: string }) {
          log.push(['theirs', details.reason]);
        },
      },
    );

    mergedProps.onMouseDown?.(new MouseEvent('mousedown'), {
      reason: 'pointer',
    });

    expect(log).toEqual([
      ['theirs', 'pointer'],
      ['ours', 'pointer'],
    ]);
  });

  it('merges internal props so that the ones defined first override the ones defined later', () => {
    const mergedProps = mergeProps<any>(
      {
        title: 'internal title 2',
      },
      {
        title: 'internal title 1',
      },
      {},
    );

    expect(mergedProps.title).toBe('internal title 1');
  });

  it('sets baseUIHandlerPrevented to true after calling preventBaseUIHandler()', () => {
    let observedFlag: boolean | undefined;

    const mergedProps = mergeProps<any>(
      {
        onClick() {},
      },
      {
        onClick(event: BaseUIEvent<MouseEvent>) {
          event.preventBaseUIHandler();
          observedFlag = event.baseUIHandlerPrevented;
        },
      },
    );

    mergedProps.onClick?.(new MouseEvent('click'));

    expect(observedFlag).toBe(true);
  });

  describe('props getters', () => {
    it('calls the props getter with the props defined after it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps<any>(
        {
          id: '2',
          class: 'test-class',
        },
        propsGetter,
        {
          id: '1',
          role: 'button',
        },
      );

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({ id: '2', class: 'test-class' });
    });

    it('calls the props getter with merged props defined after it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps<any>(
        {
          role: 'button',
          class: 'test-class',
        },
        {
          role: 'tab',
        },
        propsGetter,
        {
          id: 'one',
        },
      );

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({
        role: 'tab',
        class: 'test-class',
      });
    });

    it('calls the props getter with an empty object if no props are defined after it', () => {
      let observedProps;
      const propsGetter = vi.fn((props) => {
        observedProps = { ...props };
        return props;
      });

      mergeProps<any>(propsGetter, { id: '1' });

      expect(propsGetter.mock.calls.length === 1).toBe(true);
      expect(observedProps).toEqual({});
    });

    it('does not mutate a reused object returned by the first props getter', () => {
      const shared = { class: 'base' };

      const result = mergeProps<any>(() => shared, {
        class: 'next',
      });

      // Port note: Solid merges classes into a class array instead of a string.
      expect(result).toEqual({
        class: ['next', 'base'],
      });
      expect(shared).toEqual({
        class: 'base',
      });
    });

    it('accepts the result of the props getter', () => {
      const propsGetter = () => ({ class: 'test-class' });
      const result = mergeProps<any>(
        {
          id: 'two',
          role: 'tab',
        },
        {
          id: 'one',
        },
        propsGetter,
      );

      expect(result).toEqual({
        class: 'test-class',
      });
    });

    it('does not automatically prevent handlers that are manually called by getter handlers', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<any>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            // Call preventBaseUIHandler to signal prevention
            event.preventBaseUIHandler();
            log.push('getter-handler');
            // Manually calling the previous handler - this bypasses automatic prevention!
            props.onClick?.(new MouseEvent('click'));
          },
        }),
        {
          onClick() {
            // This handler does NOT call preventBaseUIHandler, so getter-handler runs
            log.push('last-handler');
          },
        },
      );

      mergedProps.onClick?.(new MouseEvent('click'));

      // last-handler runs first, then getter-handler (not prevented), then getter-handler
      // manually calls first-handler which runs despite preventBaseUIHandler being called
      expect(log).toEqual(['last-handler', 'getter-handler', 'first-handler']);
    });

    it('allows props getter handlers to check baseUIHandlerPrevented manually', () => {
      const log: string[] = [];

      const mergedProps = mergeProps<any>(
        {
          onClick() {
            log.push('first-handler');
          },
        },
        (props) => ({
          onClick(event: BaseUIEvent<MouseEvent>) {
            // Call preventBaseUIHandler to signal prevention
            event.preventBaseUIHandler();
            log.push('getter-handler');
            // Check the flag before manually calling previous handlers - this respects prevention
            if (!event.baseUIHandlerPrevented) {
              props.onClick?.(new MouseEvent('click'));
            }
          },
        }),
        {
          onClick() {
            // This handler does NOT call preventBaseUIHandler, so getter-handler runs
            log.push('last-handler');
          },
        },
      );

      mergedProps.onClick?.(new MouseEvent('click'));

      // first-handler does NOT run because getter-handler checks the flag before calling it
      expect(log).toEqual(['last-handler', 'getter-handler']);
    });
  });
});

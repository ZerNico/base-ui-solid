import { $PROXY, createSignal, flush, merge } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi, describe, it } from 'vitest';
import { render, screen } from '#test-utils';
import { mergeProps, mergePropsN } from '.';

/**
 * A props source whose keys change with a signal, without being a Solid store or view.
 */
function createDynamicSource(extra: Accessor<Record<string, string>>) {
  return new Proxy({} as Record<string, string>, {
    get: (_target, key) => extra()[key as string],
    has: (_target, key) => key in extra(),
    ownKeys: () => Object.keys(extra()),
    getOwnPropertyDescriptor: (_target, key) =>
      key in extra()
        ? { configurable: true, enumerable: true, value: extra()[key as string] }
        : undefined,
  });
}

// Port note: regressions for the reactive result of the public `mergeProps`, absent upstream
// (upstream returns a new object on every render).
describe('mergeProps (reactive result)', () => {
  it('reads a source prop when it changes', () => {
    const [title, setTitle] = createSignal('a');
    const merged = mergeProps<any>(
      { id: 'x' },
      {
        get title() {
          return title();
        },
      },
    );
    expect(merged.title).toBe('a');
    setTitle('b');
    flush();
    expect(merged.title).toBe('b');
    expect(merged.id).toBe('x');
  });

  it('stays reactive when spread on an element', async () => {
    const [title, setTitle] = createSignal('a');
    const [className, setClassName] = createSignal('user');
    const [color, setColor] = createSignal('red');

    function Button(props: JSX.HTMLAttributes<HTMLButtonElement>) {
      return (
        <button
          {...mergeProps<any>(
            { class: 'internal', style: { 'font-weight': 'bold' }, 'data-testid': 'button' },
            props,
          )}
        />
      );
    }

    await render(() => <Button title={title()} class={className()} style={{ color: color() }} />);
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('title', 'a');
    expect(button).toHaveClass('internal', 'user');
    expect(button.style.color).toBe('red');

    setTitle('b');
    setClassName('next');
    setColor('blue');
    flush();
    expect(button).toHaveAttribute('title', 'b');
    expect(button).toHaveClass('internal', 'next');
    expect(button).not.toHaveClass('user');
    expect(button.style.color).toBe('blue');
    expect(button.style.fontWeight).toBe('bold');
  });

  it('keeps a stable merged handler that calls the current source handlers', () => {
    const first = vi.fn();
    const second = vi.fn();
    const internal = vi.fn();
    const [handler, setHandler] = createSignal<(event: MouseEvent) => void>(() => first);
    const merged = mergeProps<any>(
      { onClick: internal },
      {
        get onClick() {
          return handler();
        },
      },
    );
    const mergedHandler = merged.onClick;
    mergedHandler(new MouseEvent('click'));
    expect(first).toHaveBeenCalledTimes(1);

    setHandler(() => second);
    flush();
    expect(merged.onClick).toBe(mergedHandler);
    mergedHandler(new MouseEvent('click'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(internal).toHaveBeenCalledTimes(2);
  });

  it('keeps preventBaseUIHandler semantics with changing handlers', () => {
    const internal = vi.fn();
    const [prevent, setPrevent] = createSignal(false);
    const merged = mergeProps<any>(
      { onClick: internal },
      {
        onClick(event: any) {
          if (prevent()) {
            event.preventBaseUIHandler();
          }
        },
      },
    );
    merged.onClick(new MouseEvent('click'));
    expect(internal).toHaveBeenCalledTimes(1);
    setPrevent(true);
    flush();
    merged.onClick(new MouseEvent('click'));
    expect(internal).toHaveBeenCalledTimes(1);
  });

  it('picks up keys that a source adds later', () => {
    const [extra, setExtra] = createSignal<Record<string, string>>({});
    const merged = mergeProps<any>({ id: 'x' }, createDynamicSource(extra));
    expect(Object.keys(merged)).toEqual(['id']);
    setExtra({ title: 't' });
    flush();
    expect(Object.keys(merged)).toEqual(['id', 'title']);
    expect(merged.title).toBe('t');
  });

  it('does not read children until they are accessed', () => {
    const getChildren = vi.fn(() => 'child');
    const merged = mergePropsN<any>([
      { id: 'x' },
      {
        get children() {
          return getChildren();
        },
      },
      { title: 't' },
    ]);
    expect(getChildren).not.toHaveBeenCalled();
    expect(merged.children).toBe('child');
    expect(getChildren).toHaveBeenCalledTimes(1);
  });

  it('gives props functions a reactive view of the props before them', () => {
    const [title, setTitle] = createSignal('a');
    const merged = mergeProps<any>(
      {
        get title() {
          return title();
        },
      },
      (props) => ({
        get 'aria-label'() {
          return `label ${props.title}`;
        },
      }),
    );
    expect(merged['aria-label']).toBe('label a');
    setTitle('b');
    flush();
    expect(merged['aria-label']).toBe('label b');
  });

  it('is tracked as a reactive source when nested in Solid merge()', () => {
    const [extra, setExtra] = createSignal<Record<string, string>>({});
    const merged = mergeProps<any>({ id: 'x' }, createDynamicSource(extra));
    expect($PROXY in merged).toBe(true);
    const outer = merge({ role: 'button' }, merged) as Record<string, any>;
    expect(Object.keys(outer)).toEqual(['role', 'id']);

    setExtra({ title: 't' });
    flush();
    expect(Object.keys(outer)).toEqual(['role', 'id', 'title']);
    expect(outer.title).toBe('t');

    setExtra({});
    flush();
    expect(Object.keys(outer)).toEqual(['role', 'id']);
    expect(outer.title).toBe(undefined);
  });

  it('spreads keys that a source adds later when nested in Solid merge()', async () => {
    const [extra, setExtra] = createSignal<Record<string, string>>({});
    const merged = mergeProps<any>({ 'data-testid': 'el' }, createDynamicSource(extra));

    await render(() => <div {...merge({ role: 'button' }, merged)} />);
    const element = screen.getByTestId('el');
    expect(element).toHaveAttribute('role', 'button');
    expect(element).not.toHaveAttribute('title');

    setExtra({ title: 't' });
    flush();
    expect(element).toHaveAttribute('title', 't');
  });

  it('forwards and enumerates symbol keys', () => {
    const visible = Symbol('visible');
    const hidden = Symbol('hidden');
    const source: Record<PropertyKey, unknown> = { id: 'x', [visible]: 'v' };
    Object.defineProperty(source, hidden, { value: 'h', enumerable: false });
    const merged: Record<PropertyKey, any> = mergeProps<any>(source, { title: 't' });

    expect(visible in merged).toBe(true);
    expect(merged[visible]).toBe('v');
    expect(hidden in merged).toBe(true);
    expect(merged[hidden]).toBe('h');
    expect(Reflect.ownKeys(merged)).toEqual(['id', 'title', visible]);
    expect(Object.getOwnPropertyDescriptor(merged, visible)?.enumerable).toBe(true);
    expect({ ...merged }[visible]).toBe('v');
    expect(Object.getOwnPropertySymbols({ ...merged })).toEqual([visible]);
  });

  it('keeps internal marker symbols non-enumerable', () => {
    const merged = mergeProps<any>({ id: 'x' }, { children: 'child' });
    expect(Reflect.ownKeys(merged)).toEqual(['id', 'children']);
    expect(Object.getOwnPropertySymbols({ ...merged })).toEqual([]);
  });
});

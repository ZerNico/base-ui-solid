import { createSignal, flush } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi, describe, it } from 'vitest';
import { render, screen } from '#test-utils';
import { mergeProps, mergePropsN } from '.';

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
    const source = new Proxy({} as Record<string, string>, {
      get: (_target, key) => extra()[key as string],
      has: (_target, key) => key in extra(),
      ownKeys: () => Object.keys(extra()),
      getOwnPropertyDescriptor: (_target, key) =>
        key in extra()
          ? { configurable: true, enumerable: true, value: extra()[key as string] }
          : undefined,
    });
    const merged = mergeProps<any>({ id: 'x' }, source);
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
});

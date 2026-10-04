import { createSignal, flush, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, vi, describe, it } from 'vitest';
import { createRenderer } from '#test-utils';
import { resolveRenderedId, useRenderedId } from './resolveRenderedId';

describe('resolveRenderedId', () => {
  it('falls back to the generated id when nothing else is given', () => {
    expect(resolveRenderedId({}, 'fallback')).toBe('fallback');
  });

  it('prefers an explicit id prop', () => {
    expect(resolveRenderedId({ id: 'explicit' }, 'fallback')).toBe('explicit');
  });

  it('treats an explicitly empty id prop as no id', () => {
    expect(resolveRenderedId({ id: '' }, 'fallback')).toBe('');
  });

  // React-only: reads the props of a React element passed as `render`, which Solid doesn't support.
  it.skip("prefers a render element's own id", () => {});

  // React-only: reads the props of a React element passed as `render`, which Solid doesn't support.
  it.skip('treats an undefined id on a render element as no id', () => {});

  // React-only: Server Component render elements (`react.lazy` wrappers).
  it.skip("reads a server-created render element's id", () => {});

  it('ignores a render element that does not set an id', () => {
    // Port note: Solid doesn't support element `render` props; a tag name `render` is the closest
    // equivalent of upstream's `<div />` and doesn't set an id either.
    expect(resolveRenderedId({ id: 'explicit', render: 'div' }, 'fallback')).toBe('explicit');
  });

  it('cannot see an id applied by a render function', () => {
    // Render callbacks are opaque, so they must apply the id they are handed.
    const render = (props: JSX.HTMLAttributes<HTMLDivElement>) => <div {...props} id="rendered" />;
    expect(resolveRenderedId({ render }, 'fallback')).toBe('fallback');
  });
});

describe('useRenderedId', () => {
  const { render } = createRenderer();

  function Test(props: {
    defaultId?: string | undefined;
    id?: string | undefined;
    renderProp?: unknown;
    onIdChange: (id: string | undefined) => void;
  }) {
    const [resolvedId, ref] = useRenderedId(
      {
        get id() {
          return props.id;
        },
        get render() {
          return props.renderProp;
        },
      },
      () => props.defaultId,
      props.onIdChange,
    );
    return <div ref={ref} id={resolvedId() || undefined} />;
  }

  it('does not publish a generated fallback as an override', async () => {
    const onIdChange = vi.fn();

    await render(() => <Test defaultId="fallback" onIdChange={onIdChange} />);

    expect(onIdChange).toHaveBeenLastCalledWith(undefined);
  });

  // React-only: the id comes from a React element passed as `render`, which Solid doesn't support.
  it.skip('publishes the id that lands on the rendered element', () => {});

  // React-only: the id comes from a React element passed as `render`, which Solid doesn't support.
  it.skip('publishes an empty string for an explicitly empty id', () => {});

  it('clears an explicit id after it is removed', async () => {
    const onIdChange = vi.fn();
    const [id, setId] = createSignal<string | undefined>('component-id');
    await render(() => <Test defaultId="fallback" id={id()} onIdChange={onIdChange} />);

    expect(onIdChange).toHaveBeenLastCalledWith('component-id');

    setId(undefined);
    flush();

    expect(onIdChange).toHaveBeenLastCalledWith(undefined);
  });

  it('releases the override when the element unmounts', async () => {
    const onIdChange = vi.fn();

    function App(props: { mounted: boolean }) {
      return (
        <Show when={props.mounted}>
          <Test defaultId="fallback" id="explicit" onIdChange={onIdChange} />
        </Show>
      );
    }

    const [mounted, setMounted] = createSignal(true);
    await render(() => <App mounted={mounted()} />);
    expect(onIdChange).toHaveBeenLastCalledWith('explicit');

    onIdChange.mockClear();
    setMounted(false);
    flush();

    expect(onIdChange).toHaveBeenLastCalledWith(undefined);
  });
});

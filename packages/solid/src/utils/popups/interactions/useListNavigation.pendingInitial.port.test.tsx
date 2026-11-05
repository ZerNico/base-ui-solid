import { createSignal, flush, For, Show } from 'solid-js';
import { describe, expect, it } from 'vitest';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { render, screen, useTestInteractions } from '#test-utils';
import { useFloating } from '../../../../test/floating-ui-tests/useFloating';
import type { UseListNavigationProps } from './useListNavigation';
import { useListNavigation } from './useListNavigation';

interface HookItem {
  value: string;
  disabled?: boolean | undefined;
}

interface HarnessOptions {
  /** Whether the list publishes a `listVersion` (the Select/Menu scheduling path). */
  listVersion: boolean;
  /** Whether the consumer derives the open highlight from `openHighlightIndex`. */
  deriveOpenHighlight?: boolean | undefined;
}

function createHarness(options: HarnessOptions) {
  const [open, setOpen] = createSignal(false);
  const [enabled, setEnabled] = createSignal(true);
  const [items, setItems] = createSignal<readonly HookItem[]>([]);
  const [version, setVersion] = createSignal(0);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const navigations: Array<number | null> = [];

  function Item(props: { index: number; item: HookItem }) {
    let node!: HTMLButtonElement;
    useIsoLayoutEffect(
      () => {
        listRef.current[props.index] = node;
        return () => {
          listRef.current[props.index] = null;
        };
      },
      () => [props.index],
    );
    return (
      <button
        ref={node}
        type="button"
        tabindex={-1}
        data-testid={`item-${props.item.value}`}
        aria-disabled={props.item.disabled ? 'true' : undefined}
      >
        {props.item.value}
      </button>
    );
  }

  function App() {
    const { refs, context } = useFloating({
      get open() {
        return open();
      },
      onOpenChange: setOpen,
    });
    const navigationProps: UseListNavigationProps = {
      listRef,
      get enabled() {
        return enabled();
      },
      get activeIndex() {
        return activeIndex();
      },
      get selectedIndex() {
        return selectedIndex();
      },
      onNavigate(index) {
        navigations.push(index);
        setActiveIndex(index);
      },
      deriveOpenHighlight: options.deriveOpenHighlight ?? false,
    };
    if (options.listVersion) {
      Object.defineProperty(navigationProps, 'listVersion', {
        enumerable: true,
        get: () => version(),
      });
    }
    const { getReferenceProps, getFloatingProps } = useTestInteractions([
      useListNavigation(context.rootStore, navigationProps),
    ]);
    return (
      <>
        <button data-testid="reference" {...getReferenceProps({ ref: refs.setReference })} />
        <Show when={open()}>
          <div data-testid="floating" {...getFloatingProps({ ref: refs.setFloating })}>
            <For each={items()}>
              {(item, index) => <Item index={index()} item={item} />}
            </For>
          </div>
        </Show>
      </>
    );
  }

  return {
    App,
    items,
    setItems,
    version,
    setVersion,
    enabled,
    setEnabled,
    selectedIndex,
    setSelectedIndex,
    activeIndex,
    navigations,
  };
}

function openPending(): void {
  screen.getByTestId('reference').focus();
  screen
    .getByTestId('reference')
    .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  flush();
}

function publishItems(
  harness: ReturnType<typeof createHarness>,
  next: readonly HookItem[],
): void {
  harness.setItems(next);
  flush();
  harness.setVersion(harness.version() + 1);
  flush();
}

describe('useListNavigation pending initial highlight lifecycle', () => {
  it('listVersion: rejects an all-disabled publication and resolves a later valid one', async () => {
    const harness = createHarness({ listVersion: true });
    await render(harness.App);

    openPending();
    publishItems(harness, [
      { value: 'one', disabled: true },
      { value: 'two', disabled: true },
    ]);
    expect(harness.navigations).toEqual([]);

    publishItems(harness, [{ value: 'one', disabled: true }, { value: 'two' }]);
    expect(harness.navigations).toEqual([1]);
    expect(harness.activeIndex()).toBe(1);
  });

  it('listVersion: a selected index known while pending suppresses the fallback', async () => {
    const harness = createHarness({ listVersion: true, deriveOpenHighlight: true });
    await render(harness.App);

    openPending();
    harness.setSelectedIndex(2);
    flush();
    publishItems(harness, [{ value: 'one' }, { value: 'two' }, { value: 'three' }]);

    // A deriveOpenHighlight consumer renders this highlight from `openHighlightIndex`; the
    // pending fallback must not emit a competing first-item navigation.
    expect(harness.navigations).toEqual([]);
  });

  it('listVersion: disposal before publication never commits', async () => {
    const harness = createHarness({ listVersion: true });
    const view = await render(harness.App);

    openPending();
    view.unmount();
    flush();
    harness.setItems([{ value: 'one' }]);
    flush();
    harness.setVersion(harness.version() + 1);
    flush();

    expect(harness.navigations).toEqual([]);
  });

  it('listVersion: disable before publication never commits', async () => {
    const harness = createHarness({ listVersion: true });
    await render(harness.App);

    openPending();
    harness.setEnabled(false);
    flush();
    publishItems(harness, [{ value: 'one' }, { value: 'two' }]);

    expect(harness.navigations).toEqual([]);
  });

  it('bounded retries: disable before population never commits', async () => {
    const harness = createHarness({ listVersion: false });
    await render(harness.App);

    openPending();
    harness.setEnabled(false);
    flush();
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    flush();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    flush();
    flush();

    expect(harness.navigations).toEqual([]);
  });

  it('bounded retries: reverse all-disabled publication emits no boundary index', async () => {
    const harness = createHarness({ listVersion: false });
    await render(harness.App);

    screen.getByTestId('reference').focus();
    screen
      .getByTestId('reference')
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
      );
    flush();
    harness.setItems([
      { value: 'one', disabled: true },
      { value: 'two', disabled: true },
    ]);
    flush();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    flush();
    flush();

    expect(harness.navigations).toEqual([]);
  });
});

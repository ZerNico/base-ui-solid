import { describe, expect, it } from 'vitest';
import { createSignal, flush, Show } from 'solid-js';
import type { Setter } from 'solid-js';
import { flushMicrotasks, render, waitFor } from '#test-utils';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useImplicitActiveTrigger } from './popupRoot';
import { createPopupOpenState } from './store';
import {
  createTestPopupStore,
  TestForwardedTrigger,
  TestTrigger,
} from '../../../test/popupStoreTestUtils';
import type { TestPopupStore } from '../../../test/popupStoreTestUtils';

// Port note: React's `render`/`rerender`/`act` become a Solid render whose changing parts are
// driven by signals (`<Show>` replaces keyed (un)mounting; `flush()` replaces `act`).

function ImplicitActiveTriggerTest(props: { store: TestPopupStore }) {
  useImplicitActiveTrigger(props.store);
  return null;
}

function CloseOnActiveTriggerUnmountTest(props: { store: TestPopupStore }) {
  useImplicitActiveTrigger(props.store, { closeOnActiveTriggerUnmount: true });
  return null;
}

function HideOnLayout(props: { setVisible: Setter<boolean> }) {
  useIsoLayoutEffect(
    ([setVisible]) => {
      setVisible(false);
    },
    () => [props.setVisible] as const,
  );
  return null;
}

function ImplicitTriggerUnmountTest(props: { store: TestPopupStore; element: HTMLElement }) {
  const [triggerVisible, setTriggerVisible] = createSignal(true);

  // Port note: React runs a parent's layout effects after its children's, while Solid runs a
  // component's effects before those of the children it creates. The hook is called from a
  // component rendered after the trigger so that its effect runs after the trigger registered,
  // like upstream's parent effect.
  return (
    <>
      <Show when={triggerVisible()}>
        <TestTrigger id="trigger" store={props.store} element={props.element} />
        <HideOnLayout setVisible={setTriggerVisible} />
      </Show>
      <CloseOnActiveTriggerUnmountTest store={props.store} />
    </>
  );
}

describe('useImplicitActiveTrigger', () => {
  it('claims the only registered trigger when a closed popup opens', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');

    await render(() => (
      <>
        <ImplicitActiveTriggerTest store={store} />
        <TestTrigger id="trigger" store={store} element={element} />
      </>
    ));

    expect(store.context.triggerElements.getById('trigger')).toBe(element);
    expect(store.state.triggerCount).toBe(0);
    expect(store.state.activeTriggerId).toBe(null);

    store.set('open', true);
    flush();

    expect(store.state.triggerCount).toBe(1);
    expect(store.state.activeTriggerId).toBe('trigger');
    expect(store.state.activeTriggerElement).toBe(element);
  });

  it('does not claim the only registered trigger when the popup opened without a trigger', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');

    await render(() => (
      <>
        <ImplicitActiveTriggerTest store={store} />
        <TestTrigger id="trigger" store={store} element={element} />
      </>
    ));

    store.update(createPopupOpenState(store.state, true, undefined));
    flush();

    expect(store.state.triggerCount).toBe(1);
    expect(store.state.openedWithoutTrigger).toBe(true);
    expect(store.state.activeTriggerId).toBe(null);
    expect(store.state.activeTriggerElement).toBe(null);
  });

  it('claims the only registered trigger again after a trigger-less open is closed by a controlled prop', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');

    await render(() => (
      <>
        <ImplicitActiveTriggerTest store={store} />
        <TestTrigger id="trigger" store={store} element={element} />
      </>
    ));

    store.update(createPopupOpenState(store.state, true, undefined));
    flush();
    expect(store.state.activeTriggerId).toBe(null);

    // A controlled close bypasses `createPopupOpenState`, so the root clears the flag itself.
    store.set('open', false);
    flush();
    expect(store.state.openedWithoutTrigger).toBe(false);

    store.set('open', true);
    flush();
    expect(store.state.activeTriggerId).toBe('trigger');
    expect(store.state.activeTriggerElement).toBe(element);
  });

  it('does not let a trigger registering into an open trigger-less popup claim it', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');
    store.set('payload', 'programmatic');
    store.update(createPopupOpenState(store.state, true, undefined));

    await render(() => (
      <TestForwardedTrigger id="trigger" store={store} element={element} payload="from trigger" />
    ));

    expect(store.context.triggerElements.getById('trigger')).toBe(element);
    expect(store.state.activeTriggerId).toBe(null);
    expect(store.state.activeTriggerElement).toBe(null);
    expect(store.state.payload).toBe('programmatic');
  });

  it('lets a trigger registering into a popup opened by a controlled prop claim it', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');
    store.set('open', true);

    await render(() => (
      <TestForwardedTrigger id="trigger" store={store} element={element} payload="from trigger" />
    ));

    expect(store.state.activeTriggerId).toBe('trigger');
    expect(store.state.activeTriggerElement).toBe(element);
    expect(store.state.payload).toBe('from trigger');
  });

  it('closes when an implicitly claimed trigger unmounts during the claim commit', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');
    store.set('open', true);

    await render(() => <ImplicitTriggerUnmountTest store={store} element={element} />);

    await waitFor(() => {
      expect(store.setOpen).toHaveBeenCalledTimes(1);
    });

    expect(store.context.triggerElements.getById('trigger')).toBeUndefined();
    expect(store.state.activeTriggerId).toBe(null);
    expect(store.state.activeTriggerElement).toBe(null);
    expect(store.setOpen).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'none' }));
    expect(store.state.open).toBe(false);
  });

  it('closes when the active trigger unregisters while open', async () => {
    const store = createTestPopupStore();
    const first = document.createElement('button');
    const second = document.createElement('button');

    store.update({
      open: true,
      activeTriggerId: 'first',
      activeTriggerElement: first,
    });

    const [showFirst, setShowFirst] = createSignal(true);
    await render(() => (
      <>
        <Show when={showFirst()}>
          <TestTrigger id="first" store={store} element={first} />
        </Show>
        <TestTrigger id="second" store={store} element={second} />
        <CloseOnActiveTriggerUnmountTest store={store} />
      </>
    ));

    expect(store.state.triggerCount).toBe(2);
    expect(store.state.activeTriggerId).toBe('first');
    expect(store.state.activeTriggerElement).toBe(first);

    setShowFirst(false);
    flush();

    await waitFor(() => {
      expect(store.setOpen).toHaveBeenCalledTimes(1);
    });

    expect(store.state.triggerCount).toBe(0);
    expect(store.state.activeTriggerId).toBe(null);
    expect(store.state.activeTriggerElement).toBe(null);
    expect(store.setOpen).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'none' }));
    expect(store.state.open).toBe(false);
  });

  it.each([
    ['a different unresolved id', 'second'],
    ['no active trigger', null],
  ] as const)(
    'keeps the popup open when ownership returns to a pending trigger after %s',
    async (_description, pendingTriggerId) => {
      const store = createTestPopupStore();
      const first = document.createElement('button');
      const replacement = document.createElement('button');

      store.update({
        open: true,
        activeTriggerId: 'first',
        activeTriggerElement: first,
      });

      const [triggerElement, setTriggerElement] = createSignal<HTMLElement | null>(first);
      await render(() => (
        <>
          <Show when={triggerElement()} keyed>
            {(element) => <TestTrigger id="first" store={store} element={element} />}
          </Show>
          <CloseOnActiveTriggerUnmountTest store={store} />
        </>
      ));

      store.context.triggerElements.delete('first');
      store.update({
        activeTriggerId: pendingTriggerId,
        activeTriggerElement: null,
        triggerCount: 0,
      });
      flush();

      setTriggerElement(null);
      flush();

      store.update({
        activeTriggerId: 'first',
        activeTriggerElement: null,
      });
      flush();

      await flushMicrotasks();

      expect(store.state.open).toBe(true);
      expect(store.setOpen).not.toHaveBeenCalled();

      setTriggerElement(replacement);
      flush();

      expect(store.context.triggerElements.getById('first')).toBe(replacement);
      expect(store.state.open).toBe(true);
      expect(store.setOpen).not.toHaveBeenCalled();
    },
  );

  it('closes when the active trigger unmounts after registering in a count-neutral commit', async () => {
    const store = createTestPopupStore();
    const first = document.createElement('button');
    const second = document.createElement('button');

    store.update({
      open: true,
      // The `activeTriggerElement` selector resolves to null while unmounted, so reflect the
      // real open-popup state for the element subscription to observe registration.
      mounted: true,
      activeTriggerId: 'first',
      activeTriggerElement: first,
    });

    const [showFirst, setShowFirst] = createSignal(true);
    const [showSecond, setShowSecond] = createSignal(false);
    await render(() => (
      <>
        <Show when={showFirst()}>
          <TestForwardedTrigger id="first" store={store} element={first} />
        </Show>
        <Show when={showSecond()}>
          <TestForwardedTrigger id="second" store={store} element={second} />
        </Show>
        <CloseOnActiveTriggerUnmountTest store={store} />
      </>
    ));

    // Ownership moves to a trigger that has not registered yet: the popup stays open (pending).
    store.update({ activeTriggerId: 'second', activeTriggerElement: null });
    flush();

    await flushMicrotasks();

    expect(store.state.open).toBe(true);
    expect(store.setOpen).not.toHaveBeenCalled();

    // Swap "first" out and "second" in within one commit, so the trigger count nets out
    // unchanged and only the forwarded active trigger element reruns the reconciliation.
    setShowFirst(false);
    setShowSecond(true);
    flush();

    await flushMicrotasks();

    expect(store.context.triggerElements.getById('second')).toBe(second);
    expect(store.state.activeTriggerElement).toBe(second);
    expect(store.state.open).toBe(true);
    expect(store.setOpen).not.toHaveBeenCalled();

    // The now-registered active trigger genuinely unmounts: the popup must close.
    setShowSecond(false);
    flush();

    await waitFor(() => {
      expect(store.setOpen).toHaveBeenCalledTimes(1);
    });

    expect(store.setOpen).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'none' }));
    expect(store.state.open).toBe(false);
    expect(store.state.activeTriggerId).toBe(null);
    expect(store.state.activeTriggerElement).toBe(null);
  });

  it('keeps the popup open when the active trigger is replaced with the same id', async () => {
    const store = createTestPopupStore();
    const first = document.createElement('button');
    const replacement = document.createElement('button');
    const second = document.createElement('button');

    store.update({
      open: true,
      activeTriggerId: 'first',
      activeTriggerElement: first,
    });

    const [firstElement, setFirstElement] = createSignal<HTMLElement>(first);
    await render(() => (
      <>
        <Show when={firstElement()} keyed>
          {(element) => <TestForwardedTrigger id="first" store={store} element={element} />}
        </Show>
        <TestForwardedTrigger id="second" store={store} element={second} />
        <CloseOnActiveTriggerUnmountTest store={store} />
      </>
    ));

    expect(store.state.triggerCount).toBe(2);
    expect(store.state.activeTriggerId).toBe('first');
    expect(store.state.activeTriggerElement).toBe(first);

    setFirstElement(replacement);
    flush();

    await flushMicrotasks();

    expect(store.context.triggerElements.getById('first')).toBe(replacement);
    expect(store.context.triggerElements.getById('second')).toBe(second);
    expect(store.state.triggerCount).toBe(2);
    expect(store.state.activeTriggerId).toBe('first');
    expect(store.state.activeTriggerElement).toBe(replacement);
    expect(store.state.open).toBe(true);
    expect(store.setOpen).not.toHaveBeenCalled();
  });

  it('keeps the popup open when the active trigger element is registered with another id', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');
    element.id = 'dom-id';

    store.update({
      open: true,
      activeTriggerId: 'dom-id',
      activeTriggerElement: element,
    });

    await render(() => (
      <>
        <TestTrigger id="registered-id" store={store} element={element} />
        <CloseOnActiveTriggerUnmountTest store={store} />
      </>
    ));

    expect(store.state.triggerCount).toBe(1);
    expect(store.state.activeTriggerId).toBe('registered-id');
    expect(store.state.activeTriggerElement).toBe(element);
    expect(store.state.open).toBe(true);
    expect(store.setOpen).not.toHaveBeenCalled();
  });

  it('reassociates the active trigger when ownership moves to another rendered-id trigger while open', async () => {
    const store = createTestPopupStore();
    const first = document.createElement('button');
    const second = document.createElement('button');
    second.id = 'dom-id-2';

    store.update({
      open: true,
      activeTriggerId: 'registered-1',
      activeTriggerElement: first,
    });

    await render(() => (
      <>
        <TestTrigger id="registered-1" store={store} element={first} />
        <TestTrigger id="registered-2" store={store} element={second} />
        <CloseOnActiveTriggerUnmountTest store={store} />
      </>
    ));

    expect(store.state.activeTriggerId).toBe('registered-1');

    // A handoff to the second trigger updates the active id from its DOM id (as
    // `getPopupOpenState` does), without changing `open` or `triggerCount`.
    store.update({ activeTriggerId: 'dom-id-2', activeTriggerElement: second });
    flush();

    await flushMicrotasks();

    expect(store.state.activeTriggerId).toBe('registered-2');
    expect(store.state.activeTriggerElement).toBe(second);
    expect(store.state.open).toBe(true);
    expect(store.setOpen).not.toHaveBeenCalled();
  });

  it('preserves active trigger ownership without closing by default', async () => {
    const store = createTestPopupStore();
    const first = document.createElement('button');
    const second = document.createElement('button');

    store.update({
      open: true,
      activeTriggerId: 'first',
      activeTriggerElement: first,
    });

    const [showFirst, setShowFirst] = createSignal(true);
    await render(() => (
      <>
        <Show when={showFirst()}>
          <TestTrigger id="first" store={store} element={first} />
        </Show>
        <TestTrigger id="second" store={store} element={second} />
        <ImplicitActiveTriggerTest store={store} />
      </>
    ));

    expect(store.state.triggerCount).toBe(2);
    expect(store.state.activeTriggerId).toBe('first');
    expect(store.state.activeTriggerElement).toBe(first);

    setShowFirst(false);
    flush();

    // The close is queued in a microtask, so flush before asserting it never happened.
    await flushMicrotasks();

    expect(store.setOpen).not.toHaveBeenCalled();
    expect(store.state.open).toBe(true);
    expect(store.context.triggerElements.getById('first')).toBeUndefined();
    expect(store.context.triggerElements.getById('second')).toBe(second);
    expect(store.state.triggerCount).toBe(1);
    expect(store.state.activeTriggerId).toBe('first');
    expect(store.state.activeTriggerElement).toBe(first);
  });

  it('resets triggerCount when the popup closes', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');

    store.set('open', true);

    await render(() => (
      <>
        <ImplicitActiveTriggerTest store={store} />
        <TestTrigger id="trigger" store={store} element={element} />
      </>
    ));

    expect(store.state.triggerCount).toBe(1);

    store.set('open', false);
    flush();

    expect(store.state.triggerCount).toBe(0);
  });
});

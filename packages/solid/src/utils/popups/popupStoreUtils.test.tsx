import { describe, expect, it, vi } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render, screen } from '#test-utils';
import type { SolidStore } from '@base-ui-solid/utils/store';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { PopupStoreContext, PopupStoreState, PopupStoreSelectors } from './store';
import { usePopupInteractionProps, useTriggerRegistration } from './popupStoreUtils';
import { PopupTriggerMap } from './popupTriggerMap';
import { createTestPopupStore, TestTrigger } from '../../../test/popupStoreTestUtils';
import type { TestPopupStore } from '../../../test/popupStoreTestUtils';

// Port note: React's `render`/`rerender`/`act` become a Solid render whose changing parts are
// driven by signals (`flush()` replaces `act`). Hooks receive the props they read on every render
// as accessors.

function PopupInteractionPropsTest(props: {
  store: SolidStore<PopupStoreState<unknown>, PopupStoreContext<unknown>, PopupStoreSelectors>;
  activeTriggerProps: PopupStoreState<unknown>['activeTriggerProps'];
  inactiveTriggerProps: PopupStoreState<unknown>['inactiveTriggerProps'];
  popupProps: PopupStoreState<unknown>['popupProps'];
}) {
  usePopupInteractionProps(props.store, () => ({
    activeTriggerProps: props.activeTriggerProps,
    inactiveTriggerProps: props.inactiveTriggerProps,
    popupProps: props.popupProps,
  }));

  return null;
}

describe('PopupTriggerMap', () => {
  it('stores and retrieves elements by id', () => {
    const map = new PopupTriggerMap();
    const button = document.createElement('button');

    map.add('trigger', button);

    expect(map.getById('trigger')).toBe(button);
    expect(map.hasElement(button)).toBe(true);
    expect(map.hasMatchingElement((element) => element === button)).toBe(true);
  });

  it('replaces a registered element when the id is reused', () => {
    const map = new PopupTriggerMap();
    const first = document.createElement('button');
    const second = document.createElement('button');

    map.add('trigger', first);
    map.add('trigger', second);

    expect(map.getById('trigger')).toBe(second);
    expect(map.hasElement(first)).toBe(false);
    expect(map.hasElement(second)).toBe(true);
  });

  it('deletes an element and no longer matches it', () => {
    const map = new PopupTriggerMap();
    const button = document.createElement('button');

    map.add('trigger', button);
    map.delete('trigger');

    expect(map.getById('trigger')).toBeUndefined();
    expect(map.hasElement(button)).toBe(false);
    expect(map.hasMatchingElement((element) => element === button)).toBe(false);
  });
});

describe('useTriggerRegistration', () => {
  it('registers and unregisters closed triggers through the context map without notifying the store', async () => {
    const store = createTestPopupStore();
    const spy = vi.spyOn(store, 'set');
    const element = document.createElement('button');

    const { unmount } = await render(() => (
      <TestTrigger id="trigger" store={store} element={element} repeat={3} />
    ));

    expect(store.context.triggerElements.getById('trigger')).toBe(element);
    expect(store.context.triggerElements.hasElement(element)).toBe(true);
    expect(store.state.triggerCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();

    unmount();
    expect(store.context.triggerElements.getById('trigger')).toBeUndefined();
    expect(store.context.triggerElements.hasElement(element)).toBe(false);
    expect(store.state.triggerCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('re-registers closed triggers when the trigger id changes without notifying the store', async () => {
    const store = createTestPopupStore();
    const spy = vi.spyOn(store, 'set');
    const element = document.createElement('button');
    const [id, setId] = createSignal('first');

    const { unmount } = await render(() => (
      <TestTrigger id={id()} store={store} element={element} />
    ));

    expect(store.context.triggerElements.getById('first')).toBe(element);
    expect(store.state.triggerCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();

    setId('second');
    flush();

    expect(store.context.triggerElements.getById('first')).toBeUndefined();
    expect(store.context.triggerElements.getById('second')).toBe(element);
    expect(store.state.triggerCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();

    unmount();
    expect(store.context.triggerElements.getById('second')).toBeUndefined();
    expect(store.context.triggerElements.hasElement(element)).toBe(false);
    expect(store.state.triggerCount).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns a stable callback that unregisters from the store it registered in', async () => {
    const first = createTestPopupStore();
    const second = createTestPopupStore();
    const element = document.createElement('button');
    let registerRef: ((element: Element | null) => void) | null = null;

    function Probe(props: { store: TestPopupStore }) {
      const register = useTriggerRegistration('trigger', () => props.store);
      registerRef = register;

      useIsoLayoutEffect(
        () => {
          register(element);
          return () => register(null);
        },
        () => [props.store],
      );

      return null;
    }

    const [store, setStore] = createSignal(first);
    const { unmount } = await render(() => <Probe store={store()} />);
    const initialRegister = registerRef as unknown as (element: Element | null) => void;

    expect(first.context.triggerElements.getById('trigger')).toBe(element);

    setStore(second);
    flush();

    expect(registerRef).toBe(initialRegister);
    expect(first.context.triggerElements.getById('trigger')).toBeUndefined();
    expect(second.context.triggerElements.getById('trigger')).toBe(element);

    // A retained callback from before the migration must still act on the current store.
    const replacement = document.createElement('button');
    initialRegister(null);
    initialRegister(replacement);
    flush();

    expect(first.context.triggerElements.getById('trigger')).toBeUndefined();
    expect(second.context.triggerElements.getById('trigger')).toBe(replacement);

    unmount();
    expect(second.context.triggerElements.getById('trigger')).toBeUndefined();
  });

  describe('callers that pass the callback straight into a ref', () => {
    // Mirrors `Drawer.SwipeArea`: the callback is merged into the rendered element's ref, and the
    // migration effect is what re-registers it when the id changes.
    function RefOnlyTrigger(props: { id: string | undefined; store: TestPopupStore }) {
      const register = useTriggerRegistration(
        () => props.id,
        () => props.store,
      );
      let elementRef: HTMLButtonElement | null = null;

      useIsoLayoutEffect(
        () => {
          register(elementRef);
          return () => register(null);
        },
        () => [props.id, props.store],
      );

      const handleRef = (element: HTMLButtonElement | null) => {
        elementRef = element;
        register(element);
      };

      return <button type="button" data-testid="trigger" ref={handleRef} />;
    }

    it('registers once the id resolves after the first commit', async () => {
      const store = createTestPopupStore();
      const [id, setId] = createSignal<string | undefined>(undefined);

      await render(() => <RefOnlyTrigger id={id()} store={store} />);
      const element = screen.getByTestId('trigger');

      expect(store.context.triggerElements.size).toBe(0);

      // React 17's `useId` fallback returns `undefined` on the first render and a real id after an
      // effect commits.
      setId('trigger');
      flush();

      expect(store.context.triggerElements.getById('trigger')).toBe(element);
      expect(store.context.triggerElements.size).toBe(1);
    });

    it('follows an id change', async () => {
      const store = createTestPopupStore();
      const [id, setId] = createSignal('first');

      const { unmount } = await render(() => <RefOnlyTrigger id={id()} store={store} />);
      const element = screen.getByTestId('trigger');

      expect(store.context.triggerElements.getById('first')).toBe(element);

      setId('second');
      flush();

      expect(store.context.triggerElements.getById('first')).toBeUndefined();
      expect(store.context.triggerElements.getById('second')).toBe(element);
      expect(store.context.triggerElements.size).toBe(1);

      unmount();
      expect(store.context.triggerElements.size).toBe(0);
    });
  });

  it('keeps triggerCount reactive while the popup is open', async () => {
    const store = createTestPopupStore();
    const element = document.createElement('button');
    store.set('open', true);

    const { unmount } = await render(() => (
      <TestTrigger id="trigger" store={store} element={element} />
    ));

    expect(store.context.triggerElements.getById('trigger')).toBe(element);
    expect(store.state.triggerCount).toBe(1);

    unmount();
    expect(store.context.triggerElements.getById('trigger')).toBeUndefined();
    expect(store.state.triggerCount).toBe(0);
  });
});

describe('popupId selector', () => {
  it('uses the floating id as the popup id', () => {
    const store = createTestPopupStore();

    store.set('floatingId', 'popup-id');

    expect(store.select('popupId')).toBe('popup-id');
  });

  it('omits popup id when the floating id is empty', () => {
    const store = createTestPopupStore();

    store.set('floatingId', '');

    expect(store.select('popupId')).toBeUndefined();
  });

  it('prefers an explicit popup element id over the generated floating id', () => {
    const store = createTestPopupStore();
    const popupElement = document.createElement('div');
    popupElement.id = 'explicit-popup-id';

    store.update({
      open: true,
      activeTriggerId: 'trigger',
      floatingId: 'generated-popup-id',
      popupElement,
    });

    expect(store.select('popupId')).toBe('explicit-popup-id');
  });

  it('associates a lone trigger with the popup id unless the popup opened without a trigger', () => {
    const store = createTestPopupStore();

    store.update({ open: true, floatingId: 'popup-id', triggerCount: 1 });
    expect(store.select('triggerPopupId', 'trigger')).toBe('popup-id');

    store.set('openedWithoutTrigger', true);
    expect(store.select('triggerPopupId', 'trigger')).toBeUndefined();
  });
});

describe('usePopupInteractionProps', () => {
  it('clears stored interaction props when unmounting', async () => {
    const store = createTestPopupStore();
    const activeTriggerProps = { onClick: vi.fn() };
    const inactiveTriggerProps = { onKeyDown: vi.fn() };
    const popupProps = { onPointerDown: vi.fn() };

    const { unmount } = await render(() => (
      <PopupInteractionPropsTest
        store={store}
        activeTriggerProps={activeTriggerProps}
        inactiveTriggerProps={inactiveTriggerProps}
        popupProps={popupProps}
      />
    ));

    expect(store.state.activeTriggerProps).toBe(activeTriggerProps);
    expect(store.state.inactiveTriggerProps).toBe(inactiveTriggerProps);
    expect(store.state.popupProps).toBe(popupProps);

    unmount();

    expect(store.state.activeTriggerProps).not.toBe(activeTriggerProps);
    expect(store.state.activeTriggerProps).toEqual({});
    expect(store.state.inactiveTriggerProps).not.toBe(inactiveTriggerProps);
    expect(store.state.inactiveTriggerProps).toEqual({});
    expect(store.state.popupProps).not.toBe(popupProps);
    expect(store.state.popupProps).toEqual({});
  });
});

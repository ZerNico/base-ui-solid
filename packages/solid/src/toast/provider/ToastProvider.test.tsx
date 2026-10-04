import { createSignal, flush } from 'solid-js';
import { expect, vi, describe, it } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { createRenderer, flushMicrotasks } from '#test-utils';
import { useToastProviderContext } from './ToastProviderContext';

describe('<Toast.Provider />', () => {
  const { clock, render } = createRenderer();

  clock.withFakeTimers();

  it('syncs a changed timeout before descendant layout effects', async () => {
    const onClose = vi.fn();

    function AddToastInLayoutEffect(props: { active: boolean }) {
      const { add } = Toast.useToastManager();

      useIsoLayoutEffect(
        ([active]) => {
          if (active) {
            add({ id: 'toast', title: 'Toast', onClose });
          }
        },
        () => [props.active],
      );

      return null;
    }

    function App(props: { timeout: number; addToast: boolean }) {
      return (
        <Toast.Provider timeout={props.timeout}>
          <AddToastInLayoutEffect active={props.addToast} />
        </Toast.Provider>
      );
    }

    const [props, setProps] = createSignal({ timeout: 5000, addToast: false });
    await render(() => <App timeout={props().timeout} addToast={props().addToast} />);

    setProps({ timeout: 1000, addToast: true });
    flush();

    clock.tick(999);
    await flushMicrotasks();
    expect(onClose).not.toHaveBeenCalled();

    clock.tick(2);
    await flushMicrotasks();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('syncs a changed limit before descendant layout effects', async () => {
    const observeToasts = vi.fn();

    function AddToastsInLayoutEffect(props: { active: boolean }) {
      const { add } = Toast.useToastManager();

      useIsoLayoutEffect(
        ([active]) => {
          if (active) {
            add({ id: 'first', title: 'First', timeout: 0 });
            add({ id: 'second', title: 'Second', timeout: 0 });
          }
        },
        () => [props.active],
      );

      return null;
    }

    function ObserveToastsInLayoutEffect(props: { active: boolean }) {
      const store = useToastProviderContext();

      useIsoLayoutEffect(
        ([active]) => {
          if (active) {
            observeToasts(
              store.state.toasts.map((toast) => ({
                id: toast.id,
                limited: toast.limited,
              })),
            );
          }
        },
        () => [props.active],
      );

      return null;
    }

    function App(props: { limit: number; runEffects: boolean }) {
      return (
        <Toast.Provider limit={props.limit}>
          <AddToastsInLayoutEffect active={props.runEffects} />
          <ObserveToastsInLayoutEffect active={props.runEffects} />
        </Toast.Provider>
      );
    }

    const [props, setProps] = createSignal({ limit: 3, runEffects: false });
    await render(() => <App limit={props().limit} runEffects={props().runEffects} />);

    setProps({ limit: 1, runEffects: true });
    flush();

    expect(observeToasts).toHaveBeenCalledWith([
      { id: 'second', limited: false },
      { id: 'first', limited: true },
    ]);
  });

  // React-only: abandoned renders (`React.Suspense` + `useTransition` suspending the provider's
  // subtree before it commits) have no Solid equivalent.
  it.skip('does not sync provider props from an abandoned render', () => {});
});

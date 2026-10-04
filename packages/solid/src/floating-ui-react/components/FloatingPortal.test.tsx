import { describe, expect, test } from 'vitest';
import { createSignal, onSettled } from 'solid-js';
import { fireEvent, flushMicrotasks, render, screen, isJSDOM } from '#test-utils';
import { FloatingFocusManager, FloatingPortal } from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { FloatingPortalLite } from '../../utils/FloatingPortalLite';
import type { UseFloatingPortalNodeProps } from './FloatingPortal';

interface AppProps {
  container?: UseFloatingPortalNodeProps['container'];
}

function App(props: AppProps) {
  const [open, setOpen] = createSignal(false);
  const { refs } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });

  return (
    <>
      <button data-testid="reference" ref={refs.setReference} onClick={() => setOpen(!open())} />
      <FloatingPortal {...props}>
        {open() && <div ref={refs.setFloating} data-testid="floating" />}
      </FloatingPortal>
    </>
  );
}

describe.skipIf(!isJSDOM)('FloatingPortal', () => {
  test('allows custom containers', async () => {
    const customRoot = document.createElement('div');
    customRoot.id = 'custom-root';
    document.body.appendChild(customRoot);
    await render(() => <App container={customRoot} />);
    fireEvent.click(screen.getByTestId('reference'));

    await flushMicrotasks();

    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(customRoot);
    customRoot.remove();
  });

  test('allows refs as containers', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const ref = { current: el };
    await render(() => <App container={ref} />);
    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();
    const parent = screen.getByTestId('floating').parentElement;
    expect(parent?.hasAttribute('data-base-ui-portal')).toBe(true);
    expect(parent?.parentElement).toBe(el);
    document.body.removeChild(el);
  });

  test('allows containers to be initially null', async () => {
    function RootApp() {
      const [container, setContainer] = createSignal<HTMLElement | null>(null);
      const [renderContainer, setRenderContainer] = createSignal(false);

      onSettled(() => {
        setRenderContainer(true);
      });

      return (
        <>
          {renderContainer() && <div ref={setContainer} data-testid="root" />}
          <App container={container()} />
        </>
      );
    }

    await render(() => <RootApp />);

    fireEvent.click(screen.getByTestId('reference'));
    await flushMicrotasks();

    const subRoot = screen.getByTestId('floating').parentElement;
    const root = screen.getByTestId('root');
    expect(root).toBe(subRoot?.parentElement);
  });

  test('reattaches the portal when the container changes', async () => {
    const customRoot = document.createElement('div');
    document.body.appendChild(customRoot);

    try {
      function RootSwitcher() {
        const [container, setContainer] =
          createSignal<UseFloatingPortalNodeProps['container']>(undefined);

        return (
          <>
            <App container={container()} />
            <button onClick={() => setContainer(undefined)} data-testid="use-undefined" />
            <button onClick={() => setContainer(customRoot)} data-testid="use-element" />
          </>
        );
      }

      await render(() => <RootSwitcher />);

      fireEvent.click(screen.getByTestId('reference'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(
        document.body,
      );

      fireEvent.click(screen.getByTestId('use-element'));

      expect((await screen.findByTestId('floating')).parentElement?.parentElement).toBe(customRoot);

      fireEvent.click(screen.getByTestId('use-undefined'));

      const floatingInBodyAgain = await screen.findByTestId('floating');
      expect(floatingInBodyAgain.parentElement?.parentElement).toBe(document.body);
      expect(customRoot.contains(floatingInBodyAgain)).toBe(false);
    } finally {
      customRoot.remove();
    }
  });

  test('forwards HTML props to the portal element', async () => {
    await render(() => (
      <FloatingPortal data-testid="portal-element" class="closed">
        <div />
      </FloatingPortal>
    ));

    await flushMicrotasks();

    const portal = document.querySelector('[data-testid="portal-element"]') as HTMLElement | null;
    expect(portal).not.toBeNull();
    expect(portal).toHaveClass('closed');
    expect(portal).toHaveAttribute('data-base-ui-portal');
  });

  test('uses the rendered portal ID for the aria-owns relationship', async () => {
    function Test() {
      const { context, refs } = useFloating({ open: true });

      return (
        <FloatingPortal id="custom-portal">
          <FloatingFocusManager context={context.rootStore} modal={false}>
            <div ref={refs.setFloating} />
          </FloatingFocusManager>
        </FloatingPortal>
      );
    }

    await render(() => <Test />);
    await flushMicrotasks();

    expect(document.querySelector('[aria-owns]')).toHaveAttribute('aria-owns', 'custom-portal');
  });

  test('FloatingPortalLite forwards HTML props to the portal element', async () => {
    await render(() => (
      <FloatingPortalLite data-testid="lite-portal">
        <div />
      </FloatingPortalLite>
    ));

    await flushMicrotasks();

    const portal = document.querySelector('[data-testid="lite-portal"]');
    expect(portal).not.toBeNull();
  });
});

import { expect, vi, describe, it } from 'vitest';
import { For, createSignal, flush, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import {
  fireEvent,
  flushMicrotasks,
  render,
  renderToString,
  screen,
  isJSDOM,
} from '#test-utils';
import { NativeTestButton, NonNativeTestButton } from './useButton.fixtures';
import { useButton } from './useButton';
import { CompositeRoot } from '../composite/root/CompositeRoot';

type SpanProps = JSX.HTMLAttributes<HTMLSpanElement>;
type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> & {
  disabled?: boolean | undefined;
};

describe('useButton', () => {
  const focusElement = async (element: HTMLElement) => {
    element.focus();
    await flushMicrotasks();
  };

  describe('non-native button', () => {
    describe('keyboard interactions', () => {
      ['Enter', 'Space'].forEach((key) => {
        it(`can be activated with ${key} key`, async () => {
          const clickSpy = vi.fn();

          function Button(props: ButtonProps) {
            const { getButtonProps } = useButton({
              native: () => false,
            });

            return <span {...getButtonProps(props)} />;
          }

          const { user } = await render(() => <Button onClick={clickSpy} />);

          const button = screen.getByRole('button');

          await user.keyboard('[Tab]');
          expect(button).toHaveFocus();

          await user.keyboard(`[${key}]`);
          expect(clickSpy).toHaveBeenCalledTimes(1);
        });
      });

      it('does not set a type prop', async () => {
        let buttonProps: Record<string, unknown> | undefined = undefined;

        function Button() {
          const { getButtonProps } = useButton({ native: () => false });
          // Port note: read once in the component body, like upstream's render; `untrack` makes
          // the one-off read explicit.
          buttonProps = untrack(() => getButtonProps());
          return <span {...buttonProps} />;
        }

        await render(() => <Button />);
        expect(buttonProps).not.toHaveProperty('type');
      });

      it.skipIf(isJSDOM)(
        'can be activated with Enter when the keyboard event originates inside a shadow root',
        async () => {
          const clickSpy = vi.fn();

          function Button(props: SpanProps) {
            const { getButtonProps, buttonRef } = useButton({
              native: () => false,
            });

            const handleRef = (node: HTMLSpanElement | null) => {
              buttonRef(node);

              if (!node || node.shadowRoot) {
                return;
              }

              const shadowRoot = node.attachShadow({ mode: 'open' });
              const inner = document.createElement('span');
              inner.tabIndex = 0;
              shadowRoot.appendChild(inner);
            };

            return <span {...getButtonProps({ ...props, ref: handleRef })} />;
          }

          await render(() => <Button onClick={clickSpy} />);

          const host = screen.getByRole('button');
          const inner = host.shadowRoot?.querySelector('span');

          expect(inner).toBeTruthy();

          if (!inner) {
            return;
          }

          (inner as HTMLElement).focus();
          await flushMicrotasks();

          inner.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Enter',
              bubbles: true,
              composed: true,
            }),
          );
          await flushMicrotasks();

          expect(clickSpy).toHaveBeenCalledTimes(1);
        },
      );
    });
  });

  describe('param: focusableWhenDisabled', () => {
    it('allows disabled buttons to be focused', async () => {
      function TestButton(props: ButtonProps) {
        const otherProps = omit(props, 'disabled');
        const { getButtonProps } = useButton({
          disabled: () => props.disabled,
          focusableWhenDisabled: () => true,
        });

        return <button {...getButtonProps(otherProps)} />;
      }
      await render(() => <TestButton disabled />);
      const button = screen.getByRole('button');
      await focusElement(button);
      expect(button).toHaveFocus();
    });

    it('force overrides disabled attribute when put in a composite', async () => {
      function TestButton() {
        const { getButtonProps, buttonRef } = useButton({
          disabled: () => true,
          focusableWhenDisabled: () => true,
        });
        return <button ref={buttonRef} {...getButtonProps({ disabled: true })} />;
      }

      // Port note: upstream rerenders with a new React `key` to remount the button and swap its
      // ref. A keyed `<For>` over the key recreates the button when the key changes.
      const [buttonKey, setButtonKey] = createSignal('initial');

      await render(() => (
        <CompositeRoot>
          <For each={[buttonKey()]}>{() => <TestButton />}</For>
        </CompositeRoot>
      ));

      async function verify() {
        const button = screen.getByRole('button');
        await focusElement(button);
        expect(button).toHaveFocus();
      }

      await verify();

      // Ensure it works after ref change
      const initialButton = screen.getByRole('button');
      setButtonKey('rerender');
      flush();
      await flushMicrotasks();
      expect(screen.getByRole('button')).not.toBe(initialButton);
      await verify();
    });

    it('prevents interactions except focus and blur', async () => {
      const handleClick = vi.fn();
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();

      function TestButton(props: ButtonProps) {
        const otherProps = omit(props, 'disabled');
        const { getButtonProps } = useButton({
          disabled: () => props.disabled,
          focusableWhenDisabled: () => true,
          native: () => false,
        });

        return <span {...getButtonProps(otherProps)} />;
      }

      // Port note: React's `onFocus`/`onBlur` bubble, so they map to `onFocusIn`/`onFocusOut`.
      const { user } = await render(() => (
        <TestButton
          disabled
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onFocusIn={handleFocus}
          onFocusOut={handleBlur}
        />
      ));

      const button = screen.getByRole('button');
      expect(document.activeElement).not.toBe(button);

      expect(handleFocus).toHaveBeenCalledTimes(0);
      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();
      expect(handleFocus).toHaveBeenCalledTimes(1);

      await user.keyboard('[Enter]');
      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      await user.keyboard('[Space]');
      expect(handleKeyUp).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      await user.click(button);
      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      expect(handleKeyUp).toHaveBeenCalledTimes(0);
      expect(handleClick).toHaveBeenCalledTimes(0);

      expect(handleBlur).toHaveBeenCalledTimes(0);
      await user.keyboard('[Tab]');
      expect(handleBlur).toHaveBeenCalledTimes(1);
      expect(document.activeElement).not.toBe(button);
    });
  });

  // Port note: Solid uses the lowercase `tabindex` attribute, so `getButtonProps()` returns
  // `tabindex` instead of `tabIndex`.
  describe('param: tabIndex', () => {
    it('returns tabIndex in getButtonProps when host component is BUTTON', async () => {
      function TestButton() {
        const { getButtonProps } = useButton();

        expect(untrack(() => getButtonProps()).tabindex).toBe(0);

        return <button {...getButtonProps()} />;
      }

      await render(() => <TestButton />);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('returns tabIndex in getButtonProps when host component is not BUTTON', async () => {
      function TestButton() {
        const { getButtonProps, buttonRef } = useButton({ native: () => false });

        expect(untrack(() => getButtonProps()).tabindex).toBe(0);

        return <span ref={buttonRef} {...getButtonProps()} />;
      }

      await render(() => <TestButton />);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', 0);
    });

    it('returns tabIndex in getButtonProps if it is explicitly provided', async () => {
      const customTabIndex = 3;
      function TestButton() {
        const { getButtonProps } = useButton({ tabIndex: () => customTabIndex });
        return <button {...getButtonProps()} />;
      }

      await render(() => <TestButton />);
      expect(screen.getByRole('button')).toHaveProperty('tabIndex', customTabIndex);
    });
  });

  describe('arbitrary props', () => {
    it('are passed to the host component', async () => {
      const buttonTestId = 'button-test-id';
      function TestButton() {
        const { getButtonProps } = useButton();
        return <button {...getButtonProps({ 'data-testid': buttonTestId })} />;
      }

      await render(() => <TestButton />);
      expect(screen.getByRole('button')).toHaveAttribute('data-testid', buttonTestId);
    });
  });

  describe('event handlers', () => {
    it('key: Space fires keyup then click on non-composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: SpanProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => (
        <TestButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onClick={handleClick} />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(0);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => (
        <TestButton
          tabindex={0}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
        />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on composite links', async () => {
      const handleClick = vi.fn();

      function TestButton(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <a href="#test" {...getButtonProps(props)} />;
      }

      await render(() => <TestButton onClick={handleClick} />);

      const link = screen.getByRole('button');

      await focusElement(link);
      expect(link).toHaveFocus();

      fireEvent.keyDown(link, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(link, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not click composite links when Space is prevented for text navigation', async () => {
      const handleClick = vi.fn();

      function TestButton(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <a href="#test" {...getButtonProps({ role: 'menuitem', ...props })} />;
      }

      await render(() => (
        <TestButton onKeyDown={(event) => event.preventDefault()} onClick={handleClick} />
      ));

      const link = screen.getByRole('menuitem');

      await focusElement(link);
      expect(link).toHaveFocus();

      fireEvent.keyDown(link, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('does not click composite gridcells when Space is prevented', async () => {
      const handleClick = vi.fn();

      function TestButton(props: JSX.HTMLAttributes<HTMLDivElement>) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <div {...getButtonProps({ role: 'gridcell', tabindex: 0, ...props })} />;
      }

      await render(() => (
        <TestButton onKeyDown={(event) => event.preventDefault()} onClick={handleClick} />
      ));

      const gridcell = screen.getByRole('gridcell');

      await focusElement(gridcell);
      expect(gridcell).toHaveFocus();

      fireEvent.keyDown(gridcell, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('clicks composite switches when Space is prevented', async () => {
      const handleClick = vi.fn();

      function TestButton(props: JSX.HTMLAttributes<HTMLDivElement>) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <div {...getButtonProps({ role: 'switch', tabindex: 0, ...props })} />;
      }

      await render(() => (
        <TestButton onKeyDown={(event) => event.preventDefault()} onClick={handleClick} />
      ));

      const switchElement = screen.getByRole('switch');

      await focusElement(switchElement);
      expect(switchElement).toHaveFocus();

      fireEvent.keyDown(switchElement, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on native composite buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ composite: () => true });

        return <button {...getButtonProps(props)} />;
      }

      await render(() => (
        <TestButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onClick={handleClick} />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire duplicate clicks for Space on native composite buttons', async () => {
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ composite: () => true });

        return <button {...getButtonProps(props)} />;
      }

      const { user } = await render(() => <TestButton onClick={handleClick} />);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('fires a single click for nested non-native composite buttons', async () => {
      const handleClick = vi.fn();

      function TestButton(props: SpanProps) {
        const outer = useButton({ native: () => false, composite: () => true });
        const inner = useButton({ native: () => false, composite: () => true });

        return <span {...outer.getButtonProps(inner.getButtonProps(props))} />;
      }

      const { user } = await render(() => <TestButton tabindex={0} onClick={handleClick} />);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(1);

      await user.keyboard('[Enter]');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('key: Space preserves native submit semantics on composite buttons', async () => {
      const handleSubmit = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
      });

      function TestButton() {
        const { getButtonProps } = useButton({ composite: () => true });

        return (
          <form onSubmit={handleSubmit}>
            <button {...getButtonProps({ type: 'submit' })}>Submit</button>
          </form>
        );
      }

      await render(() => <TestButton />);

      const button = screen.getByRole('button', { name: 'Submit' });

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleSubmit).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('key: Space preserves native reset semantics on composite buttons', async () => {
      const handleReset = vi.fn((event: Event) => {
        event.preventDefault();
      });

      function TestButton() {
        const { getButtonProps } = useButton({ composite: () => true });

        return (
          <form onReset={handleReset}>
            <button {...getButtonProps({ type: 'reset' })}>Reset</button>
          </form>
        );
      }

      await render(() => <TestButton />);

      const button = screen.getByRole('button', { name: 'Reset' });

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleReset).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it('does not click composite buttons when keydown calls preventBaseUIHandler', async () => {
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => true });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => (
        <TestButton
          tabindex={0}
          onKeyDown={(event) =>
            (
              event as unknown as KeyboardEvent & { preventBaseUIHandler: () => void }
            ).preventBaseUIHandler()
          }
          onClick={handleClick}
        />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('does not click non-composite buttons when keydown/keyup calls preventBaseUIHandler', async () => {
      const handleClick = vi.fn();

      function TestButton(props: SpanProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      const preventBaseUIHandler = (event: Event) =>
        (event as Event & { preventBaseUIHandler: () => void }).preventBaseUIHandler();

      await render(() => (
        <TestButton
          tabindex={0}
          onKeyDown={preventBaseUIHandler}
          onKeyUp={preventBaseUIHandler}
          onClick={handleClick}
        />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Enter activates on keydown; the consumer prevents it.
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(0);

      // Space activates on keyup; the consumer prevents it.
      fireEvent.keyDown(button, { key: ' ' });
      fireEvent.keyUp(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Enter does not click non-native buttons when keydown calls preventDefault', async () => {
      const handleClick = vi.fn();

      function TestButton(props: SpanProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      const { user } = await render(() => (
        <TestButton
          tabindex={0}
          onKeyDown={(event) => event.preventDefault()}
          onClick={handleClick}
        />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Match native buttons: preventing the keydown's default cancels Enter activation.
      await user.keyboard('[Enter]');
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Space does not click non-native buttons when keyup calls preventDefault', async () => {
      const handleClick = vi.fn();

      function TestButton(props: SpanProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      const { user } = await render(() => (
        <TestButton tabindex={0} onKeyUp={(event) => event.preventDefault()} onClick={handleClick} />
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      // Match native buttons: preventing the keyup's default cancels Space activation.
      await user.keyboard('[Space]');
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it('key: Space fires keydown then click when in composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => (
        <CompositeRoot>
          <TestButton
            tabindex={0}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onClick={handleClick}
          />
        </CompositeRoot>
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Space fires keydown then click on native buttons in composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton();

        return <button {...getButtonProps(props)} />;
      }

      await render(() => (
        <CompositeRoot>
          <TestButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onClick={handleClick} />
        </CompositeRoot>
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('`composite=false` keeps keyup activation inside composite root context', async () => {
      const handleKeyDown = vi.fn();
      const handleKeyUp = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ native: () => false, composite: () => false });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => (
        <CompositeRoot>
          <TestButton onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} onClick={handleClick} />
        </CompositeRoot>
      ));

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: ' ' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(0);

      fireEvent.keyUp(button, { key: ' ' });
      expect(handleKeyUp).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('key: Enter fires keydown then click on non-native buttons', async () => {
      const handleKeyDown = vi.fn();
      const handleClick = vi.fn();

      function TestButton(props: ButtonProps) {
        const { getButtonProps } = useButton({ native: () => false });

        return <span {...getButtonProps(props)} />;
      }

      await render(() => <TestButton onKeyDown={handleKeyDown} onClick={handleClick} />);

      const button = screen.getByRole('button');

      await focusElement(button);
      expect(button).toHaveFocus();

      expect(handleKeyDown).toHaveBeenCalledTimes(0);
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleKeyDown).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe.skipIf(isJSDOM)('server-side rendering', () => {
    it('should server-side render', async () => {
      const { container } = await renderToString(NonNativeTestButton, { disabled: true });

      expect(container.firstChild).toHaveProperty('role', 'button');
    });

    it('adds disabled attribute', async () => {
      await renderToString(NativeTestButton, { disabled: true, children: 'Submit' });
      expect(screen.getByRole('button')).toHaveProperty('disabled');
    });
  });

  describe('dev warnings', () => {
    it('errors if nativeButton=true but ref is not a button', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});
      function TestButton() {
        const { getButtonProps, buttonRef } = useButton({ native: () => true });
        return <span {...getButtonProps()} ref={buttonRef} />;
      }
      await render(() => <TestButton />);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Base UI: A component that acts as a button expected a native <button> because ' +
            'the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, ' +
            'which can impact forms and accessibility. Use a real <button> in the `render` prop, or set ' +
            '`nativeButton` to `false`.',
        ),
      );
    });

    it('errors if nativeButton=false but ref is a button', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockName('console.error')
        .mockImplementation(() => {});
      function TestButton() {
        const { getButtonProps, buttonRef } = useButton({ native: () => false });
        return <button {...getButtonProps()} ref={buttonRef} />;
      }
      await render(() => <TestButton />);
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Base UI: A component that acts as a button expected a non-<button> because ' +
            'the `nativeButton` prop is false. Rendering a <button> keeps native behavior while Base UI ' +
            'applies non-native attributes and handlers, which can add unintended extra attributes ' +
            '(such as `role` or `aria-disabled`). Use a non-<button> in the `render` prop, or set ' +
            '`nativeButton` to `true`.',
        ),
      );
    });
  });
});

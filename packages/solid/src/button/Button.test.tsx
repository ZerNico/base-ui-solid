import { expect, vi, describe, it } from 'vitest';
import { createSignal } from 'solid-js';
import { Button, ButtonDataAttributes } from '.';
import { mergeProps } from '../merge-props';
import { describeConformance, fireEvent, isJSDOM, render, screen, waitFor } from '#test-utils';

describe('<Button />', () => {
  describeConformance(Button, {
    refInstanceof: window.HTMLButtonElement,
  });

  describe('prop: nativeButton', () => {
    it('custom link element: Space activates the link without scrolling the page', async () => {
      const handleClick = vi.fn();

      const { user } = await render(() => (
        <Button
          nativeButton={false}
          render={(props) => <a href="#target" {...props} />}
          onClick={handleClick}
        >
          Go
        </Button>
      ));

      const link = screen.getByRole('button', { name: 'Go' });
      expect(link.tagName).toBe('A');

      await user.keyboard('[Tab]');
      expect(link).toHaveFocus();

      // `fireEvent` returns false when `preventDefault()` was called, i.e. no page scroll.
      expect(fireEvent.keyDown(link, { key: ' ' })).toBe(false);
      fireEvent.keyUp(link, { key: ' ' });

      expect(handleClick).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(window.location.hash).toBe('#target');
      });
    });

    it('custom element: applies button semantics and dispatches real clicks from keyboard activation', async () => {
      const handleClick = vi.fn();
      const handleRenderClick = vi.fn();
      const handleCaptureClick = vi.fn();
      const handleAncestorClick = vi.fn();

      const { user } = await render(() => (
        <div onClick={handleAncestorClick}>
          <Button
            nativeButton={false}
            // Port note: Solid has no capture-phase event props, so the capture listener is
            // attached from a ref.
            render={(props) => (
              <span
                {...mergeProps<any>(props, {
                  onClick: handleRenderClick,
                  ref: (element: HTMLElement) =>
                    element.addEventListener('click', handleCaptureClick, true),
                })}
              />
            )}
            onClick={handleClick}
          >
            Save
          </Button>
        </div>
      ));

      const button = screen.getByRole('button', { name: 'Save' });

      expect(button.tagName).toBe('SPAN');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabindex', '0');

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.keyboard('[Enter]');
      await user.keyboard('[Space]');

      expect(handleCaptureClick).toHaveBeenCalledTimes(2);
      expect(handleRenderClick).toHaveBeenCalledTimes(2);
      expect(handleClick).toHaveBeenCalledTimes(2);
      expect(handleAncestorClick).toHaveBeenCalledTimes(2);
    });

    it('custom element: keyboard activation clicks carry modifier key state', async () => {
      const handleClick = vi.fn();

      const { user } = await render(() => (
        <Button nativeButton={false} render="span" onClick={handleClick}>
          Save
        </Button>
      ));

      const button = screen.getByRole('button', { name: 'Save' });

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.keyboard('{Shift>}[Enter]{/Shift}');

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick.mock.calls[0][0].shiftKey).toBe(true);
    });
  });

  describe('prop: disabled', () => {
    it('native button: uses the disabled attribute and is not focusable', async () => {
      const handleClick = vi.fn();
      const handleMouseDown = vi.fn();
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();

      const { user } = await render(() => (
        <Button
          disabled
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      ));

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute(ButtonDataAttributes.disabled);
      expect(button).not.toHaveAttribute('aria-disabled');

      await user.keyboard('[Tab]');
      expect(button).not.toHaveFocus();

      await user.click(button);
      await user.keyboard('[Space]');
      await user.keyboard('[Enter]');

      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleMouseDown.mock.calls.length).toBe(0);
      expect(handlePointerDown.mock.calls.length).toBe(0);
      expect(handleKeyDown.mock.calls.length).toBe(0);
    });

    it('custom element: applies aria-disabled and is not focusable', async () => {
      const handleClick = vi.fn();
      const handleMouseDown = vi.fn();
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();

      const { user } = await render(() => (
        <Button
          disabled
          nativeButton={false}
          render="span"
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      ));

      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute(ButtonDataAttributes.disabled);
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '-1');

      await user.keyboard('[Tab]');
      expect(button).not.toHaveFocus();

      await user.click(button);
      await user.keyboard('[Space]');
      await user.keyboard('[Enter]');

      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleMouseDown.mock.calls.length).toBe(0);
      expect(handlePointerDown.mock.calls.length).toBe(0);
      expect(handleKeyDown.mock.calls.length).toBe(0);
    });
  });

  describe('prop: focusableWhenDisabled', () => {
    it('native button: prevents interactions but remains focusable', async () => {
      const handleClick = vi.fn();
      const handleMouseDown = vi.fn();
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();

      const { user } = await render(() => (
        <Button
          disabled
          focusableWhenDisabled
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      ));

      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute(ButtonDataAttributes.disabled);
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '0');

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.click(button);
      await user.keyboard('[Space]');
      await user.keyboard('[Enter]');

      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleMouseDown.mock.calls.length).toBe(0);
      expect(handlePointerDown.mock.calls.length).toBe(0);
      expect(handleKeyDown.mock.calls.length).toBe(0);
    });

    it.skipIf(isJSDOM)(
      'native button: allows hover handlers while blocking activation',
      async () => {
        const handleClick = vi.fn();
        const handleMouseMove = vi.fn();

        const { user } = await render(() => (
          <Button
            disabled
            focusableWhenDisabled
            onClick={handleClick}
            onMouseMove={handleMouseMove}
          />
        ));

        const button = screen.getByRole('button');

        expect(button).not.toHaveAttribute('disabled');
        expect(button).toHaveAttribute(ButtonDataAttributes.disabled);
        expect(button).toHaveAttribute('aria-disabled', 'true');

        await user.hover(button);

        expect(handleMouseMove).toHaveBeenCalled();

        await user.click(button);

        expect(handleClick).toHaveBeenCalledTimes(0);
      },
    );

    it('keeps focus and suppresses interactions after becoming disabled', async () => {
      const handleClick = vi.fn();

      function TestButton() {
        const [disabled, setDisabled] = createSignal(false);

        return (
          <Button
            disabled={disabled()}
            focusableWhenDisabled
            onClick={(event: MouseEvent) => {
              handleClick(event);
              setDisabled(true);
            }}
          >
            Save
          </Button>
        );
      }

      const { user } = await render(() => <TestButton />);

      const button = screen.getByRole('button', { name: 'Save' });

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(button).toHaveFocus();
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await user.click(button);
      await user.keyboard('[Enter]');
      await user.keyboard('[Space]');

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(button).toHaveFocus();
    });

    it('custom element: prevents interactions but remains focusable', async () => {
      const handleClick = vi.fn();
      const handleMouseDown = vi.fn();
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();

      const { user } = await render(() => (
        <Button
          disabled
          focusableWhenDisabled
          nativeButton={false}
          render="span"
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
        />
      ));

      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute(ButtonDataAttributes.disabled);
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('tabindex', '0');

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.click(button);
      await user.keyboard('[Space]');
      await user.keyboard('[Enter]');

      expect(handleClick.mock.calls.length).toBe(0);
      expect(handleMouseDown.mock.calls.length).toBe(0);
      expect(handlePointerDown.mock.calls.length).toBe(0);
      expect(handleKeyDown.mock.calls.length).toBe(0);
    });
  });
});

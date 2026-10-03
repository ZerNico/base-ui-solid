import { expect, describe, it } from 'vitest';
import { createSignal } from 'solid-js';
import { flushMicrotasks, render, screen, describeConformance } from '#test-utils';
import { Toggle } from '.';
import { ToggleGroup } from '../toggle-group/ToggleGroup';

describe('<Toggle />', () => {
  describeConformance(Toggle, {
    refInstanceof: window.HTMLButtonElement,
  });

  describe('pressed state', () => {
    it('controlled', async () => {
      const [pressed, setPressed] = createSignal(false);

      await render(() => (
        <div>
          <input type="checkbox" checked={pressed()} onChange={() => setPressed(!pressed())} />
          <Toggle pressed={pressed()} />;
        </div>
      ));
      const checkbox = screen.getByRole('checkbox');
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-pressed', 'false');
      checkbox.click();
      await flushMicrotasks();

      expect(button).toHaveAttribute('aria-pressed', 'true');

      checkbox.click();
      await flushMicrotasks();

      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('uncontrolled', async () => {
      await render(() => <Toggle defaultPressed={false} />);

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-pressed', 'false');
      button.click();
      await flushMicrotasks();

      expect(button).toHaveAttribute('aria-pressed', 'true');

      button.click();
      await flushMicrotasks();

      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('prop: onPressedChange', () => {
    it('is called when the pressed state changes', async () => {
      const handlePressed = vi.fn();

      await render(() => <Toggle defaultPressed={false} onPressedChange={handlePressed} />);

      const button = screen.getByRole('button');

      button.click();
      await flushMicrotasks();

      expect(handlePressed.mock.calls.length).toBe(1);
      expect(handlePressed.mock.calls[0][0]).toBe(true);
    });

    it('does not change the pressed state when the event is canceled', async () => {
      await render(() => (
        <Toggle
          defaultPressed={false}
          onPressedChange={(_pressed, eventDetails) => {
            eventDetails.cancel();
          }}
        />
      ));

      const button = screen.getByRole('button');

      button.click();
      await flushMicrotasks();

      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('canceling in a grouped Toggle prevents the group value from changing', async () => {
      const onValueChange = vi.fn();

      await render(() => (
        <ToggleGroup onValueChange={onValueChange}>
          <Toggle
            value="one"
            onPressedChange={(_pressed, eventDetails) => {
              eventDetails.cancel();
            }}
          />
          <Toggle value="two" />
        </ToggleGroup>
      ));

      const [button1] = screen.getAllByRole('button');

      button1.click();
      await flushMicrotasks();

      expect(button1).toHaveAttribute('aria-pressed', 'false');
      expect(onValueChange.mock.calls.length).toBe(0);
    });
  });

  describe('prop: disabled', () => {
    it('disables the component', async () => {
      const handlePressed = vi.fn();
      await render(() => <Toggle disabled onPressedChange={handlePressed} />);

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled');
      expect(button).toHaveAttribute('aria-pressed', 'false');

      button.click();
      await flushMicrotasks();

      expect(handlePressed.mock.calls.length).toBe(0);
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('prop: render', () => {
    it('should pass composite props', async () => {
      const renderSpy = vi.fn();

      await render(() => (
        <ToggleGroup defaultValue={['left']}>
          <Toggle
            value="left"
            render={(props) => (
              <button
                type="button"
                {...props}
                data-tabindex={(renderSpy(props.tabindex), props.tabindex)}
              />
            )}
          />
        </ToggleGroup>
      ));

      expect(renderSpy).toHaveBeenLastCalledWith(0);
    });
  });
});

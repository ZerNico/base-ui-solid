import { expect, vi, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render, screen, waitFor, describeConformance, isJSDOM } from '#test-utils';
import { Toolbar } from '..';
import { Switch } from '../../switch';
import { Toggle } from '../../toggle';
import { ToggleGroup } from '../../toggle-group';
import { mergeProps } from '../../merge-props';
import { NOOP } from '../../internals/noop';
import { ToolbarRootContext } from '../root/ToolbarRootContext';
import { CompositeRootContext } from '../../internals/composite/root/CompositeRootContext';

// Port note: Solid context values hold accessors.
const testCompositeContext: CompositeRootContext = {
  highlightedIndex: () => 0,
  onHighlightedIndexChange: NOOP,
  highlightItemOnHover: () => false,
  relayKeyboardEvent: NOOP,
};

const testToolbarContext: ToolbarRootContext = {
  disabled: () => false,
  orientation: () => 'horizontal',
};

describe('<Toolbar.Button />', () => {
  describeConformance(Toolbar.Button, {
    refInstanceof: window.HTMLButtonElement,
    wrap: (node) => (
      <ToolbarRootContext value={testToolbarContext}>
        <CompositeRootContext value={testCompositeContext}>{node()}</CompositeRootContext>
      </ToolbarRootContext>
    ),
  });

  describe('ARIA attributes', () => {
    it('renders a button', async () => {
      await render(() => (
        <Toolbar.Root>
          <Toolbar.Button data-testid="button" />
        </Toolbar.Root>
      ));

      expect(screen.getByTestId('button')).toBe(screen.getByRole('button'));
    });
  });

  describe('prop: nativeButton', () => {
    it('custom element: dispatches real clicks from Space keyboard activation', async () => {
      const handleClick = vi.fn();
      const handleRenderClick = vi.fn();
      const handleCaptureClick = vi.fn();
      const handleAncestorClick = vi.fn();

      const { user } = await render(() => (
        <div onClick={handleAncestorClick}>
          <Toolbar.Root>
            <Toolbar.Button
              nativeButton={false}
              // Port note: Solid can't clone render elements and has no capture-phase event
              // props, so the render function merges the handlers and attaches the capture
              // listener from a ref.
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
            </Toolbar.Button>
          </Toolbar.Root>
        </div>
      ));

      const button = screen.getByRole('button', { name: 'Save' });

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.keyboard('[Space]');

      expect(handleCaptureClick).toHaveBeenCalledTimes(1);
      expect(handleRenderClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleAncestorClick).toHaveBeenCalledTimes(1);
    });

    it('custom element: dispatches real clicks from Enter keyboard activation', async () => {
      const handleClick = vi.fn();
      const handleRenderClick = vi.fn();
      const handleCaptureClick = vi.fn();
      const handleAncestorClick = vi.fn();

      const { user } = await render(() => (
        <div onClick={handleAncestorClick}>
          <Toolbar.Root>
            <Toolbar.Button
              nativeButton={false}
              // Port note: Solid can't clone render elements and has no capture-phase event
              // props, so the render function merges the handlers and attaches the capture
              // listener from a ref.
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
            </Toolbar.Button>
          </Toolbar.Root>
        </div>
      ));

      const button = screen.getByRole('button', { name: 'Save' });

      await user.keyboard('[Tab]');
      expect(button).toHaveFocus();

      await user.keyboard('[Enter]');

      expect(handleCaptureClick).toHaveBeenCalledTimes(1);
      expect(handleRenderClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleAncestorClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('prop: disabled', () => {
    it('disables the button', async () => {
      const handleClick = vi.fn();
      const handleMouseDown = vi.fn().mockName('handleMouseDown');
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();

      const { user } = await render(() => (
        <Toolbar.Root>
          <Toolbar.Button
            disabled
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onPointerDown={handlePointerDown}
            onKeyDown={handleKeyDown}
          />
        </Toolbar.Root>
      ));

      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await user.click(button);
      await user.keyboard(`[Space]`);
      await user.keyboard(`[Enter]`);
      expect(handleClick).toHaveBeenCalledTimes(0);
      expect(handleMouseDown).toHaveBeenCalledTimes(0);
      expect(handlePointerDown).toHaveBeenCalledTimes(0);
      expect(handleKeyDown).toHaveBeenCalledTimes(0);
    });

    it('uses the disabled attribute when focusableWhenDisabled is false', async () => {
      await render(() => (
        <Toolbar.Root>
          <Toolbar.Button disabled focusableWhenDisabled={false} />
        </Toolbar.Root>
      ));

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled');
      expect(button).not.toHaveAttribute('aria-disabled');
    });

    it.skipIf(isJSDOM)('allows hover handlers while blocking activation', async () => {
      const handleClick = vi.fn();
      const handleMouseMove = vi.fn();

      const { user } = await render(() => (
        <Toolbar.Root>
          <Toolbar.Button disabled onClick={handleClick} onMouseMove={handleMouseMove} />
        </Toolbar.Root>
      ));

      const button = screen.getByRole('button');

      expect(button).not.toHaveAttribute('disabled');
      expect(button).toHaveAttribute('data-disabled');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await user.hover(button);

      expect(handleMouseMove).toHaveBeenCalled();

      await user.click(button);

      expect(handleClick).toHaveBeenCalledTimes(0);
    });
  });

  describe('rendering other Base UI components', () => {
    describe('Switch', () => {
      it('renders a switch', async () => {
        vi.spyOn(console, 'error')
          .mockName('console.error')
          .mockImplementation(() => {});

        await render(() => (
          <Toolbar.Root>
            <Toolbar.Button
              data-testid="button"
              render={(props) => <Switch.Root {...(props as any)} />}
            />
          </Toolbar.Root>
        ));

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'Base UI: A component that acts as a button expected a native <button> because ' +
              'the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, ' +
              'which can impact forms and accessibility. Use a real <button> in the `render` prop, or ' +
              'set `nativeButton` to `false`.',
          ),
        );

        expect(screen.getByTestId('button')).toBe(screen.getByRole('switch'));
      });

      it('handles interactions', async () => {
        vi.spyOn(console, 'error')
          .mockName('console.error')
          .mockImplementation(() => {});

        const handleCheckedChange = vi.fn();
        const handleClick = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <Toolbar.Button
              onClick={handleClick}
              render={(props) => (
                <Switch.Root
                  {...mergeProps<any>(props, {
                    defaultChecked: false,
                    onCheckedChange: handleCheckedChange,
                  })}
                />
              )}
            />
          </Toolbar.Root>
        ));

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'Base UI: A component that acts as a button expected a native <button> because ' +
              'the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, ' +
              'which can impact forms and accessibility. Use a real <button> in the `render` prop, or ' +
              'set `nativeButton` to `false`.',
          ),
        );

        const switchElement = screen.getByRole('switch');
        expect(switchElement).toHaveAttribute('data-unchecked');

        await user.keyboard('[Tab]');
        expect(switchElement).toHaveAttribute('tabindex', '0');

        await user.click(switchElement);
        expect(handleCheckedChange).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledTimes(1);
        expect(switchElement).toHaveAttribute('data-checked');

        await user.keyboard('[Enter]');
        expect(handleCheckedChange).toHaveBeenCalledTimes(2);
        expect(handleClick).toHaveBeenCalledTimes(2);
        expect(switchElement).toHaveAttribute('data-unchecked');

        await user.keyboard('[Space]');
        expect(handleCheckedChange).toHaveBeenCalledTimes(3);
        expect(handleClick).toHaveBeenCalledTimes(3);
        expect(switchElement).toHaveAttribute('data-checked');
      });

      it('disabled state', async () => {
        vi.spyOn(console, 'error')
          .mockName('console.error')
          .mockImplementation(() => {});

        const handleCheckedChange = vi.fn();
        const handleClick = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <Toolbar.Button
              disabled
              onClick={handleClick}
              render={(props) => (
                <Switch.Root
                  {...mergeProps<any>(props, { onCheckedChange: handleCheckedChange })}
                />
              )}
            />
          </Toolbar.Root>
        ));

        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining(
            'Base UI: A component that acts as a button expected a native <button> because ' +
              'the `nativeButton` prop is true. Rendering a non-<button> removes native button semantics, ' +
              'which can impact forms and accessibility. Use a real <button> in the `render` prop, or ' +
              'set `nativeButton` to `false`.',
          ),
        );

        const switchElement = screen.getByRole('switch');

        expect(switchElement).not.toHaveAttribute('disabled');
        expect(switchElement).toHaveAttribute('data-disabled');
        expect(switchElement).toHaveAttribute('aria-disabled', 'true');

        await user.keyboard('[Tab]');
        expect(switchElement).toHaveAttribute('tabindex', '0');

        await user.keyboard('[Enter]');
        expect(handleCheckedChange).toHaveBeenCalledTimes(0);
        expect(handleClick).toHaveBeenCalledTimes(0);

        await user.keyboard('[Space]');
        expect(handleCheckedChange).toHaveBeenCalledTimes(0);
        expect(handleClick).toHaveBeenCalledTimes(0);

        await user.click(switchElement);
        expect(handleCheckedChange).toHaveBeenCalledTimes(0);
        expect(handleClick).toHaveBeenCalledTimes(0);
      });
    });

    describe('Menu', () => {
      // TODO(port): needs <Menu>
      it.skip('renders a menu trigger', () => {});

      // TODO(port): needs <Menu>
      it.skip('handles interactions', () => {});

      // TODO(port): needs <Menu>
      it.skip('disabled state', () => {});
    });

    describe('Select', () => {
      // TODO(port): needs <Select>
      it.skip('renders a select trigger', () => {});

      // TODO(port): needs <Select>
      it.skip('handles interactions', () => {});

      // TODO(port): needs <Select>
      it.skip('disabled state', () => {});
    });

    describe('Dialog', () => {
      // TODO(port): needs <Dialog>
      it.skip('renders a dialog trigger', () => {});

      // TODO(port): needs <Dialog>
      it.skip('handles interactions', () => {});

      // TODO(port): needs <Dialog>
      it.skip('disabled state', () => {});

      // TODO(port): needs <Dialog>
      it.skip('prevents composite keydowns from escaping', () => {});
    });

    describe('AlertDialog', () => {
      // TODO(port): needs <AlertDialog>
      it.skip('renders an alert dialog trigger', () => {});

      // TODO(port): needs <AlertDialog>
      it.skip('handles interactions', () => {});

      // TODO(port): needs <AlertDialog>
      it.skip('disabled state', () => {});

      // TODO(port): needs <AlertDialog>
      it.skip('prevents composite keydowns from escaping', () => {});
    });

    describe('Popover', () => {
      // TODO(port): needs <Popover>
      it.skip('renders a popover trigger', () => {});

      // TODO(port): needs <Popover>
      it.skip('handles interactions', () => {});

      // TODO(port): needs <Popover>
      it.skip('disabled state', () => {});
    });

    describe('Toggle and ToggleGroup', () => {
      it('renders toggle and toggle group', async () => {
        await render(() => (
          <Toolbar.Root>
            <Toolbar.Button render={(props) => <Toggle {...(props as any)} />} value="apple" />
            <ToggleGroup>
              <Toolbar.Button render={(props) => <Toggle {...(props as any)} />} value="one" />
              <Toolbar.Button render={(props) => <Toggle {...(props as any)} />} value="two" />
            </ToggleGroup>
          </Toolbar.Root>
        ));

        expect(screen.getAllByRole('button').length).toBe(3);
        screen.getAllByRole('button').forEach((button) => {
          expect(button).toHaveAttribute('aria-pressed');
        });
      });

      it('handles interactions', async () => {
        const onPressedChange = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <Toolbar.Button
              render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
              value="apple"
            />
            <ToggleGroup>
              <Toolbar.Button
                render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
                value="one"
              />
              <Toolbar.Button
                render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
                value="two"
              />
            </ToggleGroup>
          </Toolbar.Root>
        ));

        const [button1, button2, button3] = screen.getAllByRole('button');

        [button1, button2, button3].forEach((button) => {
          expect(button).toHaveAttribute('aria-pressed', 'false');
        });
        expect(onPressedChange).toHaveBeenCalledTimes(0);

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(button1).toHaveFocus();
        });

        await user.keyboard('[Enter]');
        expect(onPressedChange).toHaveBeenCalledTimes(1);
        expect(button1).toHaveAttribute('aria-pressed', 'true');

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(button2).toHaveFocus();
        });

        await user.keyboard('[Space]');
        expect(onPressedChange).toHaveBeenCalledTimes(2);
        expect(button2).toHaveAttribute('aria-pressed', 'true');

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(button3).toHaveFocus();
        });

        await user.keyboard('[Enter]');
        expect(onPressedChange).toHaveBeenCalledTimes(3);
        expect(button3).toHaveAttribute('aria-pressed', 'true');
      });

      it('disabled state', async () => {
        const onPressedChange = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <Toolbar.Button
              disabled
              render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
              value="apple"
            />
            <ToggleGroup>
              <Toolbar.Button
                disabled
                render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
                value="one"
              />
              <Toolbar.Button
                disabled
                render={(props) => <Toggle {...mergeProps<any>(props, { onPressedChange })} />}
                value="two"
              />
            </ToggleGroup>
          </Toolbar.Root>
        ));
        const [button1, button2, button3] = screen.getAllByRole('button');

        [button1, button2, button3].forEach((button) => {
          expect(button).toHaveAttribute('aria-pressed', 'false');
          expect(button).not.toHaveAttribute('disabled');
          expect(button).toHaveAttribute('data-disabled');
          expect(button).toHaveAttribute('aria-disabled', 'true');
        });
        expect(onPressedChange).toHaveBeenCalledTimes(0);

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(button1).toHaveFocus();
        });
        await user.keyboard('[Enter]');
        await user.keyboard('[Space]');
        expect(onPressedChange).toHaveBeenCalledTimes(0);

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(button2).toHaveFocus();
        });
        await user.keyboard('[Enter]');
        await user.keyboard('[Space]');
        expect(onPressedChange).toHaveBeenCalledTimes(0);

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(button3).toHaveFocus();
        });
        await user.keyboard('[Enter]');
        await user.keyboard('[Space]');
        expect(onPressedChange).toHaveBeenCalledTimes(0);
      });

      it('navigates and selects direct ToggleGroup > Toggle children', async () => {
        const onValueChange = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <ToggleGroup defaultValue={['one']} onValueChange={onValueChange}>
              <Toggle value="one" data-testid="one" />
              <Toggle value="two" data-testid="two" />
              <Toggle value="three" data-testid="three" />
            </ToggleGroup>
          </Toolbar.Root>
        ));

        const one = screen.getByTestId('one');
        const two = screen.getByTestId('two');
        const three = screen.getByTestId('three');

        expect(one).toHaveAttribute('aria-pressed', 'true');

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(one).toHaveFocus();
        });

        // toggles past the first must be reachable (previously treated as disabled)
        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(two).toHaveFocus();
        });

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(three).toHaveFocus();
        });

        await user.keyboard('[Enter]');
        expect(onValueChange).toHaveBeenCalledTimes(1);
        // exclusive selection replaces the previous value
        expect(onValueChange.mock.calls[0][0]).toEqual(['three']);
        expect(one).toHaveAttribute('aria-pressed', 'false');
        expect(three).toHaveAttribute('aria-pressed', 'true');
      });

      it.skipIf(isJSDOM)('skips disabled direct ToggleGroup > Toggle children', async () => {
        const { user } = await render(() => (
          <Toolbar.Root>
            <ToggleGroup>
              <Toggle value="one" data-testid="one" />
              <Toggle value="two" data-testid="two" disabled />
              <Toggle value="three" data-testid="three" />
            </ToggleGroup>
          </Toolbar.Root>
        ));

        const one = screen.getByTestId('one');
        const two = screen.getByTestId('two');
        const three = screen.getByTestId('three');

        expect(two).toBeDisabled();

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(one).toHaveFocus();
        });

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(three).toHaveFocus();
        });
        expect(two).not.toHaveAttribute('tabindex', '0');
      });

      it('supports multiple selection for direct ToggleGroup > Toggle children', async () => {
        const onValueChange = vi.fn();
        const { user } = await render(() => (
          <Toolbar.Root>
            <ToggleGroup multiple defaultValue={['one']} onValueChange={onValueChange}>
              <Toggle value="one" data-testid="one" />
              <Toggle value="two" data-testid="two" />
            </ToggleGroup>
          </Toolbar.Root>
        ));

        const one = screen.getByTestId('one');
        const two = screen.getByTestId('two');

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(one).toHaveFocus();
        });

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(two).toHaveFocus();
        });

        await user.keyboard('[Enter]');
        expect(onValueChange.mock.calls[0][0]).toEqual(['one', 'two']);
        expect(one).toHaveAttribute('aria-pressed', 'true');
        expect(two).toHaveAttribute('aria-pressed', 'true');
      });

      it('supports a controlled ToggleGroup value', async () => {
        function App() {
          const [value, setValue] = createSignal<string[]>([]);
          return (
            <Toolbar.Root>
              <ToggleGroup value={value()} onValueChange={(next) => setValue(next)}>
                <Toggle value="one" data-testid="one" />
                <Toggle value="two" data-testid="two" />
              </ToggleGroup>
            </Toolbar.Root>
          );
        }

        const { user } = await render(() => <App />);
        const one = screen.getByTestId('one');

        expect(one).toHaveAttribute('aria-pressed', 'false');

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(one).toHaveFocus();
        });

        await user.keyboard('[Enter]');
        expect(one).toHaveAttribute('aria-pressed', 'true');
      });

      it('disables direct ToggleGroup children when Toolbar.Group is disabled', async () => {
        const { user } = await render(() => (
          <Toolbar.Root>
            <Toolbar.Button data-testid="before" />
            <Toolbar.Group disabled>
              <ToggleGroup>
                <Toggle value="one" data-testid="one" />
                <Toggle value="two" data-testid="two" />
              </ToggleGroup>
            </Toolbar.Group>
            <Toolbar.Button data-testid="after" />
          </Toolbar.Root>
        ));

        const before = screen.getByTestId('before');
        const one = screen.getByTestId('one');
        const two = screen.getByTestId('two');
        const after = screen.getByTestId('after');

        [one, two].forEach((toggle) => {
          expect(toggle).toBeDisabled();
          expect(toggle).toHaveAttribute('data-disabled');
        });

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(before).toHaveFocus();
        });

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(after).toHaveFocus();
        });
        expect(one).not.toHaveAttribute('tabindex', '0');
        expect(two).not.toHaveAttribute('tabindex', '0');
      });

      it.skipIf(isJSDOM)('skips a direct Toggle that becomes disabled at runtime', async () => {
        function App(props: { twoDisabled?: boolean }) {
          return (
            <Toolbar.Root>
              <ToggleGroup>
                <Toggle value="one" data-testid="one" />
                <Toggle value="two" data-testid="two" disabled={props.twoDisabled} />
                <Toggle value="three" data-testid="three" />
              </ToggleGroup>
            </Toolbar.Root>
          );
        }

        const [twoDisabled, setTwoDisabled] = createSignal<boolean | undefined>(undefined);
        const { user } = await render(() => <App twoDisabled={twoDisabled()} />);

        const one = screen.getByTestId('one');
        const three = screen.getByTestId('three');

        await user.keyboard('[Tab]');
        await waitFor(() => {
          expect(one).toHaveFocus();
        });

        setTwoDisabled(true);
        flush();

        await user.keyboard('[ArrowRight]');
        await waitFor(() => {
          expect(three).toHaveFocus();
        });
      });
    });
  });
});

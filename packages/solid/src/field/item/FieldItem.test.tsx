import type { JSX } from '@solidjs/web';
import { Field } from '..';
import { Checkbox } from '../../checkbox';
import { CheckboxGroup } from '../../checkbox-group';
import { Radio } from '../../radio';
import { RadioGroup } from '../../radio-group';
import {
  render,
  screen,
  describeConformance,
} from '#test-utils';

describe('<Field.Item />', () => {
  describeConformance(Field.Item, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Field.Root>{node()}</Field.Root>,
  });

  describe('prop: disabled', () => {
    it('reflects disabled state on the item', async () => {
      let lastState: Field.Item.State | undefined;
      function renderFieldItem(props: JSX.HTMLAttributes<HTMLDivElement>, state: Field.Item.State) {
        return (
          <div
            {...props}
            ref={(el: HTMLDivElement) => {
              // Port note: `state` is reactive; capture it when the element is created.
              lastState = state;
              (props as any).ref?.(el);
            }}
          />
        );
      }

      await render(() => (
        <Field.Root>
          <Field.Item disabled data-testid="item" render={renderFieldItem} />
        </Field.Root>
      ));

      expect(screen.getByTestId('item')).toHaveAttribute('data-disabled');
      expect(lastState?.disabled).toBe(true);
    });

    it('disables a wrapped checkbox', async () => {
      const onValueChange = vi.fn();
      const { user } = await render(() => (
        <Field.Root name="apple">
          <CheckboxGroup defaultValue={[]} onValueChange={onValueChange}>
            <Field.Item disabled>
              <Checkbox.Root value="fuji-apple" />
            </Field.Item>
            <Field.Item>
              <Checkbox.Root value="gala-apple" />
            </Field.Item>
          </CheckboxGroup>
        </Field.Root>
      ));
      const [checkbox1, checkbox2] = screen.getAllByRole('checkbox');
      await user.click(checkbox1);
      expect(onValueChange.mock.calls.length).toBe(0);
      await user.click(checkbox2);
      expect(onValueChange.mock.calls.length).toBe(1);
    });

    it('disables a wrapped radio', async () => {
      const onValueChange = vi.fn();
      const { user } = await render(() => (
        <Field.Root name="apple">
          <RadioGroup defaultValue="" onValueChange={onValueChange}>
            <Field.Item disabled>
              <Radio.Root value="fuji-apple" />
            </Field.Item>
            <Field.Item>
              <Radio.Root value="gala-apple" />
            </Field.Item>
          </RadioGroup>
        </Field.Root>
      ));
      const [radio1, radio2] = screen.getAllByRole('radio');
      await user.click(radio1);
      expect(onValueChange.mock.calls.length).toBe(0);
      await user.click(radio2);
      expect(onValueChange.mock.calls.length).toBe(1);
    });
  });

  it('associates a Field.Item label with a parent checkbox', async () => {
    const { user } = await render(() => (
      <Field.Root>
        <CheckboxGroup allValues={['a', 'b']}>
          <Field.Item>
            <Field.Label>
              <Checkbox.Root parent data-testid="parent" />
              Toggle all
            </Field.Label>
          </Field.Item>
          <Checkbox.Root value="a" data-testid="a" />
          <Checkbox.Root value="b" data-testid="b" />
        </CheckboxGroup>
      </Field.Root>
    ));

    const label = screen.getByText('Toggle all').closest('label') as HTMLLabelElement;
    const parent = screen.getByTestId('parent');

    expect(label).toHaveAttribute('for');
    expect(label.control).toHaveAttribute('type', 'checkbox');
    await user.click(screen.getByText('Toggle all'));
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('a')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('b')).toHaveAttribute('aria-checked', 'true');
  });
});

import { expect, describe, it } from 'vitest';
import { createSignal } from 'solid-js';
import { fireEvent, flushMicrotasks, render, screen, describeConformance } from '#test-utils';
import { Checkbox } from '../../checkbox';
import { CheckboxGroup } from '../../checkbox-group';
import { Field } from '../../field';
import { RadioGroup } from '../../radio-group';
import { Slider } from '../../slider';
import { Fieldset } from '..';

describe('<Fieldset.Root />', () => {
  describeConformance(Fieldset.Root, {
    refInstanceof: window.HTMLFieldSetElement,
  });

  it('sets the native disabled attribute', async () => {
    await render(() => (
      <Fieldset.Root disabled data-testid="fieldset">
        <input />
      </Fieldset.Root>
    ));

    expect(screen.getByTestId('fieldset')).toHaveAttribute('disabled');
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('keeps nested fieldsets disabled when an ancestor fieldset is disabled', async () => {
    await render(() => (
      <Fieldset.Root disabled>
        <Fieldset.Root>
          <Field.Root>
            <Field.Control data-testid="control" />
          </Field.Root>
        </Fieldset.Root>
      </Fieldset.Root>
    ));

    expect(screen.getByTestId('control')).toHaveAttribute('disabled');
  });

  it('updates nested disabled precedence in both directions', async () => {
    function App() {
      const [outerDisabled, setOuterDisabled] = createSignal(false);
      const [innerDisabled, setInnerDisabled] = createSignal(true);

      return (
        <>
          <Fieldset.Root disabled={outerDisabled()}>
            <Fieldset.Root disabled={innerDisabled()}>
              <Field.Root data-testid="root">
                <Field.Control data-testid="control" />
              </Field.Root>
            </Fieldset.Root>
          </Fieldset.Root>
          <button type="button" onClick={() => setOuterDisabled(true)}>
            Disable outer
          </button>
          <button type="button" onClick={() => setInnerDisabled(false)}>
            Enable inner
          </button>
          <button type="button" onClick={() => setOuterDisabled(false)}>
            Enable outer
          </button>
        </>
      );
    }

    await render(() => <App />);

    expect(screen.getByTestId('control')).toBeDisabled();
    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Disable outer' }));
    await flushMicrotasks();
    fireEvent.click(screen.getByRole('button', { name: 'Enable inner' }));
    await flushMicrotasks();
    expect(screen.getByTestId('control')).toBeDisabled();
    expect(screen.getByTestId('root')).toHaveAttribute('data-disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Enable outer' }));
    await flushMicrotasks();
    expect(screen.getByTestId('control')).not.toBeDisabled();
    expect(screen.getByTestId('root')).not.toHaveAttribute('data-disabled');
  });

  // Port note: upstream renders React elements (`render={<RadioGroup />}`); Solid uses render
  // functions that spread the props onto the Base UI roots.
  it('passes disabled to rendered Base UI roots', async () => {
    await render(() => (
      <div>
        <Fieldset.Root
          disabled
          render={(props) => <RadioGroup {...(props as object)} data-testid="radio-group" />}
        />
        <Fieldset.Root disabled render={(props) => <CheckboxGroup {...(props as object)} />}>
          <Checkbox.Root name="apple" data-testid="checkbox" />
        </Fieldset.Root>
        <Fieldset.Root
          disabled
          render={(props) => <Slider.Root {...(props as object)} defaultValue={50} />}
        >
          <Slider.Control data-testid="slider-control">
            <Slider.Track>
              <Slider.Thumb />
            </Slider.Track>
          </Slider.Control>
        </Fieldset.Root>
      </div>
    ));

    expect(screen.getByTestId('radio-group')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('checkbox')).toHaveAttribute('data-disabled');
    expect(screen.getByTestId('slider-control')).toHaveAttribute('data-disabled');
  });
});

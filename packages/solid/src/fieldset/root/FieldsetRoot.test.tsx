import { createSignal } from 'solid-js';
import { Field } from '../../field';
import { Fieldset } from '..';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  describeConformance,
} from '#test-utils';

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

  // TODO(port): needs <Slider>
  it.skip('passes disabled to rendered Base UI roots', () => {});
});

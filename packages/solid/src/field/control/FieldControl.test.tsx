import { Show, createSignal, flush } from 'solid-js';
import { Field } from '..';
import { Form } from '../../form';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
  describeConformance,
  isJSDOM,
  renderToString,
} from '#test-utils';
import { AutoFocusApp } from './FieldControl.fixtures';

async function change(element: HTMLElement, value: string) {
  // React's `onChange` on text inputs is the native `input` event.
  fireEvent.input(element, { target: { value } });
  await flushMicrotasks();
}

describe('<Field.Control />', () => {
  describeConformance(Field.Control, {
    refInstanceof: window.HTMLInputElement,
    wrap: (node) => <Field.Root>{node()}</Field.Root>,
  });

  it('avoids rerendering for uncontrolled input changes', async () => {
    const renderCountRef = { current: 0 };

    await render(() => (
      <Field.Root>
        <Field.Control
          data-testid="control"
          render={(props) => {
            renderCountRef.current += 1;
            return <input {...props} />;
          }}
        />
      </Field.Root>
    ));

    const control = screen.getByTestId('control');
    const initialRenderCount = renderCountRef.current;

    await change(control, 'a');
    const afterFirstChange = renderCountRef.current;

    await change(control, 'ab');
    await change(control, 'abc');

    expect(renderCountRef.current).toBe(afterFirstChange);
    expect(afterFirstChange).toBeLessThanOrEqual(initialRenderCount + 1);
  });

  it('renders once per keystroke for controlled input changes', async () => {
    const renderCountRef = { current: 0 };

    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root>
          <Field.Control
            data-testid="control"
            value={value()}
            onValueChange={setValue}
            render={(props) => {
              renderCountRef.current += 1;
              return <input {...props} />;
            }}
          />
        </Field.Root>
      );
    }

    await render(() => <App />);

    const control = screen.getByTestId<HTMLInputElement>('control');

    await change(control, 'a');
    const settledRenderCount = renderCountRef.current;

    await change(control, 'ab');
    await change(control, 'abc');

    // Port note: Solid calls the render function once and updates the element in place, so no
    // keystroke re-runs it (upstream expects exactly one render per keystroke).
    expect(renderCountRef.current).toBe(settledRenderCount);
    expect(control.value).toBe('abc');
  });

  it('validates once when changed by the user', async () => {
    const validate = vi.fn();

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate}>
        <Field.Control />
      </Field.Root>
    ));

    await change(screen.getByRole('textbox'), 'a');

    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.lastCall?.[0]).toBe('a');
  });

  it('validates once when a controlled value is changed by the user', async () => {
    const validate = vi.fn(() => null);

    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root validationMode="onChange" validate={validate}>
          <Field.Control value={value()} onValueChange={setValue} />
        </Field.Root>
      );
    }

    await render(() => <App />);

    await change(screen.getByRole('textbox'), 'a');

    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('clears dirty state when a numeric controlled value returns to its initial value', async () => {
    function App() {
      const [value, setValue] = createSignal(5);
      return (
        <Field.Root data-testid="root">
          <Field.Control
            value={value()}
            onValueChange={(nextValue) => setValue(Number(nextValue))}
          />
        </Field.Root>
      );
    }

    await render(() => <App />);

    const root = screen.getByTestId('root');
    const control = screen.getByRole('textbox');

    expect(root).not.toHaveAttribute('data-dirty');

    await change(control, '56');

    expect(root).toHaveAttribute('data-dirty', '');

    await change(control, '5');

    expect(root).not.toHaveAttribute('data-dirty');
  });

  it('syncs state and validates when the controlled value changes programmatically', async () => {
    const validate = vi.fn((_value: unknown) => null);

    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root data-testid="root" validationMode="onChange" validate={validate}>
          <Field.Control value={value()} onValueChange={setValue} />
          <button type="button" onClick={() => setValue('external')}>
            set
          </button>
        </Field.Root>
      );
    }

    await render(() => <App />);

    fireEvent.click(screen.getByRole('button'));
    await flushMicrotasks();

    const root = screen.getByTestId('root');

    expect(root).toHaveAttribute('data-filled', '');
    expect(root).toHaveAttribute('data-dirty', '');
    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.lastCall?.[0]).toBe('external');
  });

  it('validates the final controlled value when it is normalized on blur', async () => {
    const validate = vi.fn((value) => (String(value).includes('@') ? null : 'Invalid email'));

    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root validationMode="onBlur" validate={validate}>
          <Field.Control
            value={value()}
            onValueChange={setValue}
            onBlur={() => setValue((currentValue) => currentValue.trim())}
          />
          <Field.Error />
        </Field.Root>
      );
    }

    await render(() => <App />);

    const control = screen.getByRole('textbox');
    await change(control, 'foo ');
    fireEvent.blur(control);

    await flushMicrotasks();

    expect(validate.mock.lastCall?.[0]).toBe('foo');
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('keeps the final async validation when a controlled value is normalized on blur', async () => {
    const resolvers: Record<string, (value: string | null) => void> = {};
    const validate = vi.fn(
      (value) =>
        new Promise<string | null>((resolve) => {
          resolvers[String(value)] = resolve;
        }),
    );

    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root validationMode="onBlur" validate={validate}>
          <Field.Control
            value={value()}
            onValueChange={setValue}
            onBlur={() => setValue((currentValue) => currentValue.trim())}
          />
          <Field.Error />
        </Field.Root>
      );
    }

    await render(() => <App />);

    const control = screen.getByRole('textbox');
    await change(control, 'foo ');
    fireEvent.blur(control);

    await flushMicrotasks();

    expect(validate).toHaveBeenCalledTimes(2);
    expect(validate.mock.lastCall?.[0]).toBe('foo');

    resolvers.foo('Invalid email');
    await flushMicrotasks();

    expect(screen.getByText('Invalid email')).toBeInTheDocument();

    resolvers['foo ']('Stale error');
    await flushMicrotasks();

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('does not validate when a controlled value is reset to the initial value on blur', async () => {
    function App() {
      const [value, setValue] = createSignal('');
      return (
        <Field.Root validationMode="onBlur">
          <Field.Control
            required
            value={value()}
            onValueChange={setValue}
            onBlur={() => setValue('')}
          />
          <Field.Error match="valueMissing">Required</Field.Error>
        </Field.Root>
      );
    }

    await render(() => <App />);

    const control = screen.getByRole('textbox');
    await change(control, 'foo');
    fireEvent.blur(control);

    await flushMicrotasks();

    expect(screen.queryByText('Required')).toBe(null);
  });

  it('sets filled state on mount when the control is prefilled', async () => {
    await render(() => (
      <Field.Root data-testid="root">
        <Field.Control defaultValue="foo" />
      </Field.Root>
    ));

    expect(screen.getByTestId('root')).toHaveAttribute('data-filled', '');
  });

  it('does not set filled state on mount for an empty controlled value', async () => {
    await render(() => (
      <Field.Root data-testid="root">
        <Field.Control value="" onValueChange={() => {}} />
      </Field.Root>
    ));

    expect(screen.getByTestId('root')).not.toHaveAttribute('data-filled');
  });

  it('clears filled state when a controlled control remounts empty', async () => {
    function App() {
      const [empty, setEmpty] = createSignal(false);
      return (
        <Field.Root data-testid="root">
          {/* Port note: a keyed `<Show>` stands in for React's `key` remount. */}
          <Show when={String(empty())} keyed>
            {(key) => (
              <Field.Control value={key === 'true' ? '' : 'value'} onValueChange={() => {}} />
            )}
          </Show>
          <button type="button" onClick={() => setEmpty(true)}>
            clear
          </button>
        </Field.Root>
      );
    }

    await render(() => <App />);

    const root = screen.getByTestId('root');
    expect(root).toHaveAttribute('data-filled', '');

    fireEvent.click(screen.getByRole('button'));
    await flushMicrotasks();

    expect(root).not.toHaveAttribute('data-filled');
  });

  it('clears filled state when an uncontrolled control remounts empty', async () => {
    function App() {
      const [empty, setEmpty] = createSignal(false);
      return (
        <Field.Root data-testid="root">
          <Show when={String(empty())} keyed>
            {(key) => <Field.Control defaultValue={key === 'true' ? '' : 'value'} />}
          </Show>
          <button type="button" onClick={() => setEmpty(true)}>
            clear
          </button>
        </Field.Root>
      );
    }

    await render(() => <App />);

    const root = screen.getByTestId('root');
    expect(root).toHaveAttribute('data-filled', '');

    fireEvent.click(screen.getByRole('button'));
    await flushMicrotasks();

    expect(root).not.toHaveAttribute('data-filled');
  });

  it('sets filled state from a controlled value on a custom element', async () => {
    await render(() => (
      <Field.Root data-testid="root">
        <Field.Control value="value" onValueChange={() => {}} render="div" />
      </Field.Root>
    ));

    expect(screen.getByTestId('root')).toHaveAttribute('data-filled', '');
  });

  it('does not validate when the change is canceled', async () => {
    const validate = vi.fn(() => null);

    await render(() => (
      <Field.Root validationMode="onChange" validate={validate}>
        <Field.Control onValueChange={(value, details) => details.cancel()} />
      </Field.Root>
    ));

    await change(screen.getByRole('textbox'), 'a');

    expect(validate).not.toHaveBeenCalled();
  });

  it('does not clear errors or validate when change is prevented', async () => {
    const validate = vi.fn();
    const handleValueChange = vi.fn();

    await render(() => (
      <Form errors={{ message: 'Server error' }}>
        <Field.Root name="message" validationMode="onChange" validate={validate}>
          <Field.Control onValueChange={handleValueChange} />
          <Field.Error />
        </Field.Root>
      </Form>
    ));

    const control = screen.getByRole<HTMLInputElement>('textbox');
    control.addEventListener('input', (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    fireEvent.input(control, { cancelable: true, target: { value: 'a' } });
    await flushMicrotasks();

    expect(handleValueChange).toHaveBeenCalledTimes(1);
    expect(validate).not.toHaveBeenCalled();
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it.skipIf(isJSDOM)('validates once when Enter implicitly submits a form', async () => {
    const validate = vi.fn(() => null);
    const handleSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());

    const { user } = await render(() => (
      <Form onSubmit={handleSubmit}>
        <Field.Root validate={validate}>
          <Field.Control defaultValue="a" />
        </Field.Root>
        <button type="submit">submit</button>
      </Form>
    ));

    const control = screen.getByRole<HTMLInputElement>('textbox');

    await user.type(control, '{Enter}');
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(validate).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it.skipIf(isJSDOM)('validates when Enter does not implicitly submit the form', async () => {
    const validate = vi.fn(() => null);
    const handleSubmit = vi.fn();

    const { user } = await render(() => (
      <Form onSubmit={handleSubmit}>
        <Field.Root validate={validate}>
          <Field.Control defaultValue="a" />
        </Field.Root>
        <input />
      </Form>
    ));

    const control = screen.getByDisplayValue<HTMLInputElement>('a');

    await user.type(control, '{Enter}');
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    expect(validate).toHaveBeenCalledTimes(1);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it.skipIf(isJSDOM)(
    'validates when a disabled submit button blocks implicit submission',
    async () => {
      const validate = vi.fn(() => null);
      const handleSubmit = vi.fn();

      const { user } = await render(() => (
        <Form onSubmit={handleSubmit}>
          <Field.Root validate={validate}>
            <Field.Control defaultValue="a" />
          </Field.Root>
          <button type="submit" disabled>
            submit
          </button>
        </Form>
      ));

      const control = screen.getByRole<HTMLInputElement>('textbox');

      await user.type(control, '{Enter}');
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      expect(validate).toHaveBeenCalledTimes(1);
      expect(handleSubmit).not.toHaveBeenCalled();
    },
  );

  it('validates the latest value when Enter does not submit the form', async () => {
    const validate = vi.fn((_value: unknown) => null);

    function App() {
      const [value, setValue] = createSignal('a');
      return (
        <Form onKeyDown={() => setValue('')}>
          <Field.Root validate={validate}>
            <Field.Control value={value()} onValueChange={setValue} />
          </Field.Root>
          <input />
        </Form>
      );
    }

    await render(() => <App />);

    const control = screen.getByDisplayValue<HTMLInputElement>('a');
    control.focus();
    await flushMicrotasks();
    fireEvent.keyDown(control, { key: 'Enter' });

    await waitFor(() => {
      expect(validate).toHaveBeenCalledTimes(1);
    });

    expect(validate.mock.lastCall?.[0]).toBe('');
  });

  it('validates when Enter is pressed outside a form', async () => {
    const validate = vi.fn(() => null);

    await render(() => (
      <Field.Root validate={validate}>
        <Field.Control defaultValue="a" />
      </Field.Root>
    ));

    const control = screen.getByRole('textbox');
    control.focus();
    await flushMicrotasks();
    fireEvent.keyDown(control, { key: 'Enter' });

    expect(validate).toHaveBeenCalledTimes(1);
  });

  it('shows a required error when a prefilled value is cleared', async () => {
    await render(() => (
      <Field.Root validationMode="onChange">
        <Field.Control data-testid="control" defaultValue="value" required />
        <Field.Error match="valueMissing">Required</Field.Error>
      </Field.Root>
    ));

    const control = screen.getByTestId('control');

    await change(control, '');

    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  describe('[data-focused]', () => {
    const [firstMounted, setFirstMounted] = createSignal(true);
    const [firstDisabled, setFirstDisabled] = createSignal(false);

    beforeEach(() => {
      setFirstMounted(true);
      setFirstDisabled(false);
      flush();
    });

    function Controls() {
      return (
        <>
          <Field.Root data-testid="root">
            <Field.Label data-testid="label">Name</Field.Label>
            <Show when={firstMounted()}>
              <Field.Control data-testid="first" disabled={firstDisabled()} />
            </Show>
          </Field.Root>
          <button type="button" data-testid="outside" />
        </>
      );
    }

    it('is removed when the focused control becomes disabled', async () => {
      await render(() => <Controls />);

      const control = screen.getByTestId('first');
      control.focus();
      await flushMicrotasks();

      expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');
      expect(control).toHaveAttribute('data-focused', '');

      setFirstDisabled(true);
      await flushMicrotasks();

      expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');
      expect(control).not.toHaveAttribute('data-focused');
      expect(screen.getByTestId('label')).not.toHaveAttribute('data-focused');
    });

    it('is removed when the field root becomes disabled', async () => {
      const [disabled, setDisabled] = createSignal(false);

      await render(() => (
        <Field.Root data-testid="root" disabled={disabled()}>
          <Field.Control data-testid="control" />
        </Field.Root>
      ));

      screen.getByTestId('control').focus();
      await flushMicrotasks();
      expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');

      setDisabled(true);
      await flushMicrotasks();

      expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');
    });

    it('can be re-acquired after the control is re-enabled', async () => {
      await render(() => <Controls />);

      const control = screen.getByTestId('first');
      control.focus();
      await flushMicrotasks();
      expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');

      setFirstDisabled(true);
      await flushMicrotasks();
      expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');

      // Browsers move focus off a disabled control; jsdom leaves it as the active element.
      screen.getByTestId('outside').focus();
      await flushMicrotasks();

      setFirstDisabled(false);
      await flushMicrotasks();
      expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');

      control.focus();
      await flushMicrotasks();
      expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');
    });

    it('is removed when the focused control unmounts', async () => {
      await render(() => <Controls />);

      screen.getByTestId('first').focus();
      await flushMicrotasks();

      expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');

      setFirstMounted(false);
      await flushMicrotasks();

      expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');
      expect(screen.getByTestId('label')).not.toHaveAttribute('data-focused');
    });
  });

  it.skipIf(isJSDOM)('should sync focused state when autoFocus is used with SSR', async () => {
    vi.spyOn(console, 'error')
      .mockName('console.error')
      .mockImplementation(() => {});

    const { hydrate } = await renderToString(AutoFocusApp);

    const control = screen.getByRole('textbox');
    expect(control).toHaveAttribute('autofocus');

    // Simulate focused by browser before hydration
    control.focus();
    expect(control).toBe(document.activeElement);

    hydrate();

    expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');
    expect(control).toHaveAttribute('data-focused', '');
    expect(screen.getByText('Name')).toHaveAttribute('data-focused', '');
  });

  describe('id', () => {
    it('updates the label association when the control is swapped', async () => {
      function App() {
        const [controlKey, setControlKey] = createSignal('a');
        return (
          <>
            <Field.Root>
              <Field.Label data-testid="label">Label</Field.Label>
              <Show when={controlKey()} keyed>
                {(key) => <Field.Control id={key} />}
              </Show>
            </Field.Root>
            <button onClick={() => setControlKey('b')}>swap</button>
          </>
        );
      }

      await render(() => <App />);

      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'a');
      expect(screen.getByTestId('label')).toHaveAttribute('for', 'a');

      fireEvent.click(screen.getByRole('button'));
      await flushMicrotasks();

      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'b');
      expect(screen.getByTestId('label')).toHaveAttribute('for', 'b');
    });
  });
});

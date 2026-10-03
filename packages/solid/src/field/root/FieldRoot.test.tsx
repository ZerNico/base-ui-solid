import { Show, createSignal } from "solid-js";
import { Field } from "..";
import { Form } from "../../form";
import { Checkbox } from "../../checkbox";
import { CheckboxGroup } from "../../checkbox-group";
import { Radio } from "../../radio";
import { RadioGroup } from "../../radio-group";
import { Switch } from "../../switch";
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
  describeConformance,
  isJSDOM,
} from '#test-utils';
import { useFieldRootContext } from "../../internals/field-root-context/FieldRootContext";

async function focus(element: HTMLElement) {
  fireEvent.focus(element);
  await flushMicrotasks();
}

async function blur(element: HTMLElement) {
  fireEvent.blur(element);
  await flushMicrotasks();
}

async function change(element: HTMLElement, value: string) {
  // React's `onChange` on text inputs is the native `input` event.
  fireEvent.input(element, { target: { value } });
  await flushMicrotasks();
}

async function click(element: HTMLElement) {
  fireEvent.click(element);
  await flushMicrotasks();
}

describe("<Field.Root />", () => {
  describeConformance(Field.Root, { refInstanceof: window.HTMLDivElement });

  it("updates label association when replacing one control with another", async () => {
    function TestCase() {
      const [showB, setShowB] = createSignal(false);

      return (
        <>
          <Field.Root>
            <Field.Label>Label</Field.Label>
            <Show when={showB()} fallback={<Field.Control id="control-a" />}>
              <Field.Control id="control-b" />
            </Show>
          </Field.Root>
          <button type="button" onClick={() => setShowB(true)}>
            Toggle
          </button>
        </>
      );
    }

    await render(() => <TestCase />);

    const label = screen.getByText("Label");
    expect(label).toHaveAttribute("for", "control-a");

    await click(screen.getByRole("button", { name: "Toggle" }));

    await waitFor(() => {
      expect(label).toHaveAttribute("for", "control-b");
    });
  });

  it("drops a stale explicit id when an id-less control replaces the control that owned it", async () => {
    const [swapped, setSwapped] = createSignal(false);

    await render(() => (
      <Field.Root>
        <Field.Label>Label</Field.Label>
        <Show
          when={swapped()}
          fallback={<Field.Control id="control" data-testid="control" />}
        >
          <Field.Control data-testid="control" />
        </Show>
      </Field.Root>
    ));

    const label = screen.getByText("Label");
    expect(label).toHaveAttribute("for", "control");

    setSwapped(true);
    await flushMicrotasks();

    const control = screen.getByTestId("control");
    expect(control.id).not.toBe("control");
    expect(label).toHaveAttribute("for", control.id);
  });

  it("re-associates the label when a CheckboxGroup is replaced by another control", async () => {
    const [multi, setMulti] = createSignal(true);

    await render(() => (
      <Field.Root>
        <Field.Label>Answer</Field.Label>
        <Show when={multi()} fallback={<Field.Control data-testid="control" />}>
          <CheckboxGroup allValues={["a"]}>
            <Checkbox.Root value="a" />
          </CheckboxGroup>
        </Show>
      </Field.Root>
    ));

    // The group is named through `aria-labelledby`, so it suppresses `htmlFor` entirely.
    expect(screen.getByText("Answer")).not.toHaveAttribute("for");

    setMulti(false);
    await flushMicrotasks();

    expect(screen.getByText("Answer")).toHaveAttribute("for", screen.getByTestId("control").id);
  });

  it("updates label associations when the control id changes", async () => {
    function TestCase() {
      const [controlId, setControlId] = createSignal("control-a");

      return (
        <>
          <Field.Root>
            <Field.Label>Label</Field.Label>
            <Field.Control id={controlId()} />
          </Field.Root>
          <button type="button" onClick={() => setControlId("control-b")}>
            Change
          </button>
        </>
      );
    }

    await render(() => <TestCase />);

    const label = screen.getByText("Label");

    expect(label).toHaveAttribute("for", "control-a");

    await click(screen.getByRole("button", { name: "Change" }));

    await waitFor(() => {
      expect(label).toHaveAttribute("for", "control-b");
    });
  });

  it("falls back to a generated id when the control id is removed", async () => {
    function TestCase() {
      const [controlId, setControlId] = createSignal<string | undefined>(
        "control-a",
      );

      return (
        <>
          <Field.Root>
            <Field.Label>Label</Field.Label>
            <Field.Control id={controlId()} />
          </Field.Root>
          <button type="button" onClick={() => setControlId(undefined)}>
            Clear
          </button>
        </>
      );
    }

    await render(() => <TestCase />);

    const label = screen.getByText("Label");
    const control = screen.getByRole("textbox");

    expect(label).toHaveAttribute("for", "control-a");
    expect(control).toHaveAttribute("id", "control-a");

    await click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      const updatedControl = screen.getByRole("textbox");
      const updatedId = updatedControl.getAttribute("id") ?? "";

      expect(updatedId).not.toBe("");
      expect(updatedId).not.toBe("control-a");
      expect(label).toHaveAttribute("for", updatedId);
    });
  });

  // TODO(port): needs <Select> (SSR setup is available via renderToString)
  it.skip("does not set `aria-labelledby` during SSR when Field.Label is absent", () => {});

  // TODO(port): needs <Select> (SSR setup is available via renderToString)
  it.skip("keeps `aria-labelledby` valid when toggling from Checkbox.Root to Select.Root after hydration", () => {});

  // TODO(port): needs <Select> (SSR setup is available via renderToString)
  it.skip("removes `aria-labelledby` when Field.Label is removed after hydration", () => {});

  // React-only: React.Activity (+ StrictMode)
  it.skip("preserves label association without looping when a control is unmounted and remounted", () => {});

  // React-only: React.Activity
  it.skip("preserves a non-native label association when a control is unmounted and remounted", () => {});

  // React-only: React.Activity
  it.skip("keeps an explicit control id while the subtree is hidden", () => {});

  // React-only: React.Activity
  it.skip("keeps the group label suppressed while its subtree is hidden", () => {});

  describe("prop: disabled", () => {
    it("should add data-disabled style hook to all components", async () => {
      await render(() => (
        <Field.Root data-testid="field" disabled>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="message" />
        </Field.Root>
      ));

      const field = screen.getByTestId("field");
      const control = screen.getByTestId("control");
      const label = screen.getByTestId("label");
      const message = screen.getByTestId("message");

      expect(field).toHaveAttribute("data-disabled", "");
      expect(control).toHaveAttribute("data-disabled", "");
      expect(label).toHaveAttribute("data-disabled", "");
      expect(message).toHaveAttribute("data-disabled", "");
    });

    it("keeps an explicitly invalid field marked invalid while disabled", async () => {
      await render(() => (
        <Field.Root data-testid="field" disabled invalid>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="description" />
        </Field.Root>
      ));

      const field = screen.getByTestId("field");
      const control = screen.getByTestId("control");
      const label = screen.getByTestId("label");
      const description = screen.getByTestId("description");

      expect(field).toHaveAttribute("data-invalid", "");
      expect(control).toHaveAttribute("data-invalid", "");
      expect(label).toHaveAttribute("data-invalid", "");
      expect(description).toHaveAttribute("data-invalid", "");

      // It does not participate in native constraint validation.
      expect(control).not.toHaveAttribute("aria-invalid");
    });

    it("keeps a disabled field with form errors marked invalid", async () => {
      await render(() => (
        <Form errors={{ name: "Server error" }}>
          <Field.Root name="name" disabled>
            <Field.Control data-testid="control" />
          </Field.Root>
        </Form>
      ));

      const control = screen.getByTestId("control");

      expect(control).toHaveAttribute("data-invalid", "");
      // It does not participate in native constraint validation.
      expect(control).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("prop: validate", () => {
    it("when not in <Form> the function does not run by default", async () => {
      const validateSpy = vi.fn(() => "error");
      await render(() => (
        <Field.Root validate={validateSpy}>
          <Field.Control />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole("textbox");
      const message = screen.queryByText("error");

      expect(message).toBe(null);

      await focus(control);
      await change(control, "abc");
      expect(validateSpy.mock.calls.length).toBe(0);
      expect(screen.queryByText("error")).toBe(null);

      await blur(control);
      expect(validateSpy.mock.calls.length).toBe(0);
      expect(screen.queryByText("error")).toBe(null);
    });

    it("runs after native validations", async () => {
      await render(() => (
        <Form>
          <Field.Root
            validate={(val) => (val === "ab" ? "custom error" : null)}
          >
            <Field.Control required />
            <Field.Error match="valueMissing">value missing</Field.Error>
            <Field.Error match="customError" />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      expect(screen.queryByText("value missing")).toBe(null);
      expect(screen.queryByText("custom error")).toBe(null);

      const input = screen.getByRole<HTMLInputElement>("textbox");

      // submit
      await click(screen.getByText("submit"));
      expect(screen.queryByText("value missing")).not.toBe(null);
      expect(screen.queryByText("custom error")).toBe(null);

      await focus(input);
      // revalidate
      await change(input, "ab");
      expect(screen.queryByText("value missing")).toBe(null);
      expect(screen.queryByText("custom error")).not.toBe(null);

      await change(input, "");
      expect(screen.queryByText("value missing")).not.toBe(null);
      // expect(screen.queryByText('custom error')).toBe(null);
    });

    (
      [
        ["an empty array", () => []],
        ["an undefined", () => undefined],
        ["an empty string", () => ""],
        ["an array of empty strings", () => ["", ""]],
      ] as const
    ).forEach(([label, validate]) => {
      it(`treats ${label} result as valid`, async () => {
        const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());

        await render(() => (
          <Form onSubmit={onSubmit}>
            <Field.Root
              name="field"
              validationMode="onChange"
              validate={validate}
            >
              <Field.Control data-testid="control" />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const control = screen.getByTestId("control");

        await change(control, "abc");

        expect(control).not.toHaveAttribute("aria-invalid");
        expect(control).not.toHaveAttribute("data-invalid");
        expect(screen.queryByTestId("error")).toBe(null);
        expect(control).toHaveProperty("validationMessage", "");

        await click(screen.getByText("submit"));

        expect(onSubmit).toHaveBeenCalledTimes(1);
      });
    });

    describe("async validation pending state", () => {
      (["onSubmit", "onChange", "onBlur"] as const).forEach(
        (validationMode) => {
          it(`publishes neutral validity while a validator is in flight in ${validationMode} mode`, async () => {
            let resolveValidate: ((value: string | null) => void) | undefined;
            const validate = vi.fn(
              () =>
                new Promise<string | null>((resolve) => {
                  resolveValidate = resolve;
                }),
            );

            await render(() => (
              <Form onSubmit={(event) => event.preventDefault()}>
                <Field.Root
                  data-testid="root"
                  name="username"
                  validationMode={validationMode}
                  validate={validate}
                >
                  <Field.Control data-testid="control" />
                  <Field.Error data-testid="error" />
                </Field.Root>
                <button type="submit">submit</button>
              </Form>
            ));

            const root = screen.getByTestId("root");
            const control = screen.getByTestId("control");

            await change(control, "taken");
            if (validationMode === "onBlur") {
              await blur(control);
            } else if (validationMode === "onSubmit") {
              await click(screen.getByText("submit"));
            }

            expect(validate).toHaveBeenCalledTimes(1);
            expect(root).not.toHaveAttribute("data-valid");
            expect(root).not.toHaveAttribute("data-invalid");
            expect(control).not.toHaveAttribute("aria-invalid");
            expect(screen.queryByTestId("error")).toBe(null);

            resolveValidate?.("Username is taken");
            await flushMicrotasks();

            expect(root).toHaveAttribute("data-invalid", "");
            expect(control).toHaveAttribute("aria-invalid", "true");
            expect(screen.getByTestId("error")).toHaveTextContent(
              "Username is taken",
            );
          });
        },
      );

      (["onChange", "onBlur"] as const).forEach((validationMode) => {
        it(`retires a previously valid result to neutral while revalidating in ${validationMode} mode`, async () => {
          const resolvers: Array<(value: string | null) => void> = [];
          const validate = vi.fn(
            () =>
              new Promise<string | null>((resolve) => {
                resolvers.push(resolve);
              }),
          );

          await render(() => (
            <Field.Root
              data-testid="root"
              validationMode={validationMode}
              validate={validate}
            >
              <Field.Control data-testid="control" />
              <Field.Error data-testid="error" />
            </Field.Root>
          ));

          const root = screen.getByTestId("root");
          const control = screen.getByTestId("control");

          await change(control, "good");
          if (validationMode === "onBlur") {
            await blur(control);
          }

          resolvers[0](null);
          await flushMicrotasks();

          expect(root).toHaveAttribute("data-valid", "");

          if (validationMode === "onBlur") {
            await focus(control);
            await blur(control);
          } else {
            await change(control, "taken");
          }

          // A valid result never blocks submission, so it retires to neutral mid-flight.
          expect(root).not.toHaveAttribute("data-valid");
          expect(root).not.toHaveAttribute("data-invalid");

          resolvers[1]("Username is taken");
          await flushMicrotasks();

          expect(root).toHaveAttribute("data-invalid", "");
          expect(screen.getByTestId("error")).toHaveTextContent(
            "Username is taken",
          );
        });
      });

      (["onChange", "onBlur"] as const).forEach((validationMode) => {
        it(`keeps a previously resolved error while revalidating in ${validationMode} mode`, async () => {
          const resolvers: Array<(value: string | null) => void> = [];
          const validate = vi.fn(
            () =>
              new Promise<string | null>((resolve) => {
                resolvers.push(resolve);
              }),
          );

          const onSubmit = vi.fn((event: SubmitEvent) =>
            event.preventDefault(),
          );

          await render(() => (
            <Form onSubmit={onSubmit}>
              <Field.Root
                data-testid="root"
                name="username"
                validationMode={validationMode}
                validate={validate}
              >
                <Field.Control data-testid="control" />
                <Field.Error data-testid="error" />
              </Field.Root>
              <button type="submit">submit</button>
            </Form>
          ));

          const root = screen.getByTestId("root");
          const control = screen.getByTestId("control");

          await change(control, "taken");
          if (validationMode === "onBlur") {
            await blur(control);
          }

          resolvers[0]("Username is taken");
          await flushMicrotasks();

          expect(root).toHaveAttribute("data-invalid", "");

          // A keystroke would optimistically clear the error through the revalidate path, so
          // re-trigger validation without changing the value.
          if (validationMode === "onBlur") {
            await focus(control);
            await blur(control);
          } else {
            await change(control, "taken2");
          }

          // The resolved error stays published mid-flight so it keeps blocking submission.
          expect(root).toHaveAttribute("data-invalid", "");
          expect(screen.getByTestId("error")).toHaveTextContent(
            "Username is taken",
          );

          await click(screen.getByText("submit"));

          expect(onSubmit).not.toHaveBeenCalled();

          resolvers[resolvers.length - 1](null);
          await flushMicrotasks();

          expect(root).not.toHaveAttribute("data-invalid");
          expect(screen.queryByTestId("error")).toBe(null);
        });
      });

      it("retires a stale native error to neutral once the constraint passes again", async () => {
        const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
        const resolvers: Array<(value: string | null) => void> = [];
        const validate = vi.fn(
          () =>
            new Promise<string | null>((resolve) => {
              resolvers.push(resolve);
            }),
        );

        await render(() => (
          <Form onSubmit={onSubmit}>
            <Field.Root
              data-testid="root"
              name="email"
              validationMode="onChange"
              validate={validate}
            >
              <Field.Control data-testid="control" type="email" />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");

        await change(control, "nope");

        resolvers[resolvers.length - 1](null);
        await flushMicrotasks();

        expect(root).toHaveAttribute("data-invalid", "");

        await change(control, "name@example.com");

        // `nextState` already carries the fresh native verdict, so the previous native error must
        // not survive the pending window and keep blocking submission.
        expect(root).not.toHaveAttribute("data-invalid");
        expect(root).not.toHaveAttribute("data-valid");
        expect(screen.queryByTestId("error")).toBe(null);

        await click(screen.getByText("submit"));

        expect(onSubmit).toHaveBeenCalledTimes(1);

        resolvers[resolvers.length - 1](null);
        await flushMicrotasks();

        expect(root).toHaveAttribute("data-valid", "");
      });

      (["onSubmit", "onChange", "onBlur"] as const).forEach(
        (validationMode) => {
          it(`keeps a native constraint failure published while the validator is in flight in ${validationMode} mode`, async () => {
            const onSubmit = vi.fn((event: SubmitEvent) =>
              event.preventDefault(),
            );
            const validate = vi.fn(() => new Promise<string | null>(() => {}));

            await render(() => (
              <Form onSubmit={onSubmit}>
                <Field.Root
                  data-testid="root"
                  name="username"
                  validationMode={validationMode}
                  validate={validate}
                >
                  <Field.Control data-testid="control" required />
                  <Field.Error data-testid="error" />
                </Field.Root>
                <button type="submit">submit</button>
              </Form>
            ));

            await click(screen.getByText("submit"));

            // In `onBlur` mode a native failure short-circuits the validator, so nothing is in
            // flight and the failure is published by the regular end-of-commit path instead.
            expect(validate).toHaveBeenCalledTimes(
              validationMode === "onBlur" ? 0 : 1,
            );
            expect(onSubmit).not.toHaveBeenCalled();
            expect(screen.getByTestId("root")).toHaveAttribute(
              "data-invalid",
              "",
            );
            expect(screen.getByTestId("control")).toHaveAttribute(
              "aria-invalid",
              "true",
            );

            await flushMicrotasks();
          });
        },
      );

      it("retires a resolved async error to neutral while revalidating in onSubmit mode", async () => {
        const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
        const resolvers: Array<(value: string | null) => void> = [];
        const validate = vi.fn(
          () =>
            new Promise<string | null>((resolve) => {
              resolvers.push(resolve);
            }),
        );

        await render(() => (
          <Form onSubmit={onSubmit}>
            <Field.Root data-testid="root" name="username" validate={validate}>
              <Field.Control data-testid="control" />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");

        await click(screen.getByText("submit"));

        resolvers[0]("Username is taken");
        await flushMicrotasks();

        expect(root).toHaveAttribute("data-invalid", "");

        await click(screen.getByText("submit"));

        // An async result can't block submission in `onSubmit` mode, so the neutral state lets
        // the second submit through.
        expect(onSubmit).toHaveBeenCalledTimes(2);
        expect(root).not.toHaveAttribute("data-valid");
        expect(root).not.toHaveAttribute("data-invalid");
        expect(control).not.toHaveAttribute("aria-invalid");
        expect(screen.queryByTestId("error")).toBe(null);

        resolvers[1](null);
        await flushMicrotasks();

        expect(root).toHaveAttribute("data-valid", "");
        expect(screen.queryByTestId("error")).toBe(null);
      });
    });

    it("accepts synchronous and async validators with no return value", async () => {
      await render(() => (
        <>
          <Field.Root data-testid="sync" validate={() => {}} />
          <Field.Root data-testid="async" validate={async () => {}} />
        </>
      ));

      expect(screen.getByTestId("sync")).toBeInTheDocument();
      expect(screen.getByTestId("async")).toBeInTheDocument();
    });

    it("should apply aria-invalid prop to control once validation finishes", async () => {
      await render(() => (
        <Form>
          <Field.Root validate={() => "error"}>
            <Field.Control />
            <Field.Error />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const control = screen.getByRole("textbox");
      expect(control).not.toHaveAttribute("aria-invalid");

      await click(screen.getByText("submit"));
      expect(control).toHaveAttribute("aria-invalid", "true");
    });

    // TODO(port): needs NumberField, Select, Slider
    it.skip("receives all form values as the 2nd argument", () => {});

    it("unmounted fields are excluded from the validate fn", async () => {
      const validateSpy = vi.fn();
      const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      function App() {
        const [checked, setChecked] = createSignal(true);

        return (
          <Form onSubmit={onSubmit}>
            <input
              type="checkbox"
              checked={checked()}
              onChange={() => setChecked(!checked())}
            />
            <Show when={checked()}>
              <Field.Root name="input1">
                <Field.Control defaultValue="one" />
              </Field.Root>
            </Show>
            <Field.Root name="input2" validate={validateSpy}>
              <Field.Control defaultValue="two" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        );
      }
      await render(() => <App />);

      await click(screen.getByText("submit"));

      expect(validateSpy.mock.calls.length).toBe(1);
      expect(validateSpy.mock.calls[0][1]).toEqual({
        input1: "one",
        input2: "two",
      });

      await click(screen.getByRole("checkbox"));
      await click(screen.getByText("submit"));

      expect(validateSpy.mock.calls.length).toBe(2);
      expect(validateSpy.mock.lastCall?.[1]).toEqual({
        input2: "two",
      });
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });

    // TODO(port): needs Select and Slider
    it.skip("submits the replacement control value when swapping field-aware controls", () => {});

    it("excludes registration-gated controls from onFormSubmit when their field name is removed", async () => {
      const handleSubmit = vi.fn();

      function App() {
        const [name, setName] = createSignal<string | undefined>("fruits");

        return (
          <Form onFormSubmit={handleSubmit}>
            <Field.Root name={name()}>
              <CheckboxGroup defaultValue={["apple"]}>
                <Field.Item>
                  <Checkbox.Root value="apple" />
                </Field.Item>
                <Field.Item>
                  <Checkbox.Root value="banana" />
                </Field.Item>
              </CheckboxGroup>
            </Field.Root>
            <button type="button" onClick={() => setName(undefined)}>
              Clear name
            </button>
            <button type="submit">submit</button>
          </Form>
        );
      }

      await render(() => <App />);

      await click(screen.getByText("submit"));

      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({ fruits: ["apple"] });

      await click(screen.getByText("Clear name"));
      await click(screen.getByText("submit"));

      expect(handleSubmit).toHaveBeenCalledTimes(2);
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({});
    });

    it("uses the Field.Control name for form submission and form validation values", async () => {
      const handleSubmit = vi.fn();
      const validate = vi.fn(
        (_value: unknown, _formValues: Form.Values) => null,
      );

      await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Field.Root>
            <Field.Control name="email" defaultValue="one@example.com" />
          </Field.Root>
          <Field.Root name="confirmEmail" validate={validate}>
            <Field.Control defaultValue="one@example.com" />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      await click(screen.getByText("submit"));

      expect(validate.mock.lastCall?.[1]).toEqual({
        email: "one@example.com",
        confirmEmail: "one@example.com",
      });
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({
        email: "one@example.com",
        confirmEmail: "one@example.com",
      });
    });

    it("updates the Field.Control name fallback when the name changes", async () => {
      const handleSubmit = vi.fn();

      function App() {
        const [name, setName] = createSignal<string | undefined>("email");

        return (
          <Form onFormSubmit={handleSubmit}>
            <Field.Root>
              <Field.Control name={name()} defaultValue="one@example.com" />
            </Field.Root>
            <button type="button" onClick={() => setName("alternateEmail")}>
              Change name
            </button>
            <button type="button" onClick={() => setName(undefined)}>
              Clear name
            </button>
            <button type="submit">submit</button>
          </Form>
        );
      }

      await render(() => <App />);

      await click(screen.getByText("submit"));
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({
        email: "one@example.com",
      });

      await click(screen.getByText("Change name"));
      await click(screen.getByText("submit"));
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({
        alternateEmail: "one@example.com",
      });

      await click(screen.getByText("Clear name"));
      await click(screen.getByText("submit"));
      expect(handleSubmit.mock.lastCall?.[0]).toEqual({});
    });

    it("uses the Field.Control name fallback when the Field.Root name is removed", async () => {
      function App() {
        const [rootName, setRootName] = createSignal<string | undefined>(
          "rootEmail",
        );

        return (
          <Form errors={{ email: "Email is already taken" }}>
            <Field.Root name={rootName()}>
              <Field.Control name="email" />
              <Field.Error data-testid="default-error" />
            </Field.Root>
            <button type="button" onClick={() => setRootName(undefined)}>
              Clear root name
            </button>
          </Form>
        );
      }

      await render(() => <App />);

      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
      expect(screen.queryByTestId("default-error")).toBe(null);

      await click(screen.getByText("Clear root name"));

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(screen.getByTestId("default-error")).toHaveTextContent(
        "Email is already taken",
      );
    });

    // TODO(port): needs NumberField
    it.skip("updates field-aware control name fallbacks when the name changes", () => {});
  });

  describe("prop: validationMode", () => {
    describe("onSubmit", () => {
      it("should validate the field on submit", async () => {
        await render(() => (
          <Form>
            <Field.Root validate={() => "error"}>
              <Field.Control />
              <Field.Error />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const message = screen.queryByText("error");

        expect(message).toBe(null);

        await click(screen.getByText("submit"));

        expect(screen.queryByText("error")).not.toBe(null);
      });

      it("revalidates on change", async () => {
        await render(() => (
          <Form>
            <Field.Root>
              <Field.Control type="url" required defaultValue="" />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const control = screen.getByRole<HTMLInputElement>("textbox");

        expect(screen.queryByTestId("error")).toBe(null);

        await click(screen.getByText("submit"));
        expect(screen.queryByTestId("error")).not.toBe(null);

        await change(control, "http://example");
        expect(screen.queryByTestId("error")).toBe(null);
      });
    });

    describe("onChange", () => {
      it("validates the field on change", async () => {
        await render(() => (
          <Field.Root
            validationMode="onChange"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? "error" : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole<HTMLInputElement>("textbox");
        const message = screen.queryByText("error");

        expect(message).toBe(null);

        await change(control, "t");

        expect(control).toHaveAttribute("data-invalid", "");
        expect(control).toHaveAttribute("aria-invalid", "true");
      });
    });

    describe("onBlur", () => {
      it("validates the field on blur", async () => {
        await render(() => (
          <Field.Root
            validationMode="onBlur"
            validate={(value) => {
              const str = value as string;
              return str.length < 3 ? "error" : null;
            }}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole<HTMLInputElement>("textbox");
        const message = screen.queryByText("error");

        expect(message).toBe(null);

        await change(control, "t");

        expect(control).not.toHaveAttribute("data-invalid");

        await blur(control);

        expect(control).toHaveAttribute("data-invalid", "");
        expect(control).toHaveAttribute("aria-invalid", "true");
      });

      it("should not mark invalid if `valueMissing` is the only error and not yet dirtied", async () => {
        await render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId("control");

        await focus(control);
        await blur(control);

        expect(control).not.toHaveAttribute("data-invalid");
        expect(control).not.toHaveAttribute("aria-invalid");
      });

      it("does not publish errors while `valueMissing` is suppressed", async () => {
        let latestValidity: Field.Validity.State | null = null;

        await render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Control data-testid="control" required />
            <Field.Validity>
              {(validity) => {
                latestValidity = validity;
                return null;
              }}
            </Field.Validity>
          </Field.Root>
        ));

        const control = screen.getByTestId("control");

        await focus(control);
        await blur(control);

        // Port note: `Field.Validity` calls its children once with a reactive state object, so
        // `latestValidity` reflects the current state.
        expect(latestValidity!.validity.valid).toBe(true);
        expect(latestValidity!.errors).toEqual([]);
        expect(latestValidity!.error).toBe("");
      });

      it("should mark invalid if `valueMissing` is the only error and dirtied", async () => {
        await render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId("control");

        await focus(control);
        await change(control, "a");
        await change(control, "");
        await blur(control);

        expect(control).toHaveAttribute("data-invalid", "");
        expect(control).toHaveAttribute("aria-invalid", "true");
      });

      it("supports async validation", async () => {
        await render(() => (
          <Field.Root
            validationMode="onBlur"
            validate={() => Promise.resolve("error")}
          >
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole("textbox");
        const message = screen.queryByText("error");

        expect(message).toBe(null);

        await focus(control);
        await blur(control);

        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.queryByText("error")).not.toBe(null);
        });
      });

      it("ignores stale async validation results", async () => {
        const resolvers: Record<string, (value: string | null) => void> = {};
        const validate = vi.fn((value: unknown) => {
          return new Promise<string | null>((resolve) => {
            resolvers[value as string] = resolve;
          });
        });

        await render(() => (
          <Field.Root validationMode="onChange" validate={validate}>
            <Field.Control />
            <Field.Error />
          </Field.Root>
        ));

        const control = screen.getByRole<HTMLInputElement>("textbox");

        await change(control, "old");
        await change(control, "new");

        resolvers.new(null);
        await flushMicrotasks();

        expect(screen.queryByText("old error")).toBe(null);
        expect(control).not.toHaveAttribute("aria-invalid");

        resolvers.old("old error");
        await flushMicrotasks();

        expect(screen.queryByText("old error")).toBe(null);
        expect(control).not.toHaveAttribute("aria-invalid");
      });

      it("should apply [data-field] style hooks to field components", async () => {
        await render(() => (
          <Field.Root validationMode="onBlur">
            <Field.Label data-testid="label">Label</Field.Label>
            <Field.Description data-testid="description">
              Description
            </Field.Description>
            <Field.Error data-testid="error" />
            <Field.Control data-testid="control" required />
          </Field.Root>
        ));

        const control = screen.getByTestId<HTMLInputElement>("control");
        const label = screen.getByTestId("label");
        const description = screen.getByTestId("description");
        let error = screen.queryByTestId("error");

        expect(control).not.toHaveAttribute("data-valid");
        expect(label).not.toHaveAttribute("data-valid");
        expect(description).not.toHaveAttribute("data-valid");
        expect(error).toBe(null);

        await focus(control);
        await change(control, "a");
        await change(control, "");
        await blur(control);

        error = screen.getByTestId("error");

        expect(control).toHaveAttribute("data-invalid", "");
        expect(label).toHaveAttribute("data-invalid", "");
        expect(description).toHaveAttribute("data-invalid", "");
        expect(error).toHaveAttribute("data-invalid", "");

        control.value = "value";
        control.focus();
        control.blur();
        await flushMicrotasks();

        error = screen.queryByTestId("error");

        expect(control).toHaveAttribute("data-valid", "");
        expect(label).toHaveAttribute("data-valid", "");
        expect(description).toHaveAttribute("data-valid", "");
        expect(error).toBe(null);
      });

      describe("revalidation", () => {
        it("revalidates on change for `valueMissing`", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control required />
              <Field.Error />
            </Field.Root>
          ));

          const control = screen.getByRole("textbox");
          const message = screen.queryByText("error");

          expect(message).toBe(null);

          await focus(control);
          await change(control, "t");
          await blur(control);

          expect(control).not.toHaveAttribute("aria-invalid", "true");

          await focus(control);
          await change(control, "");
          await blur(control);

          expect(control).toHaveAttribute("aria-invalid");
        });

        it("handles both `required` and `typeMismatch`", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control type="email" required />
              <Field.Error data-testid="error" />
            </Field.Root>
          ));

          const control = screen.getByRole("textbox");
          const message = screen.queryByTestId("error");

          expect(message).toBe(null);

          await focus(control);
          await blur(control);

          expect(control).not.toHaveAttribute("aria-invalid");

          await focus(control);
          await change(control, "tt");
          await blur(control);

          expect(control).toHaveAttribute("aria-invalid", "true");

          await focus(control);
          await change(control, "");
          await blur(control);

          expect(control).toHaveAttribute("aria-invalid", "true");

          await focus(control);
          await change(control, "email@email.com");
          await blur(control);

          expect(control).not.toHaveAttribute("aria-invalid");
        });

        it("revalidates on change when clearing a type mismatch leaves only `valueMissing`", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control type="email" required data-testid="control" />
              <Field.Error match="typeMismatch" data-testid="type-error">
                Invalid email
              </Field.Error>
              <Field.Error match="valueMissing" data-testid="required-error">
                Required
              </Field.Error>
            </Field.Root>
          ));

          const control = screen.getByTestId("control");

          await focus(control);
          await change(control, "invalid");
          await blur(control);

          expect(screen.getByTestId("type-error")).not.toBe(null);
          expect(screen.queryByTestId("required-error")).toBe(null);

          await focus(control);
          await change(control, "");

          expect(screen.queryByTestId("type-error")).toBe(null);
          expect(screen.getByTestId("required-error")).not.toBe(null);
        });

        it("clears valueMissing on change but defers other native errors like typeMismatch until blur when both are active", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control type="email" required data-testid="control" />
              <Field.Error data-testid="error" />
            </Field.Root>
          ));

          const control = screen.getByTestId("control");

          await focus(control);
          await blur(control);
          expect(control).not.toHaveAttribute("aria-invalid", "true");
          expect(screen.queryByTestId("error")).toBe(null);

          await focus(control);
          await change(control, "a");
          await change(control, "");
          await blur(control);

          expect(control).toHaveAttribute("aria-invalid", "true");
          expect(screen.getByTestId("error")).not.toBe(null);

          await focus(control);
          await change(control, "t");

          // The field becomes temporarily valid because only 'valueMissing' is checked for immediate clearing.
          // Other errors like 'typeMismatch' are deferred to the next blur/submit.
          expect(control).not.toHaveAttribute("aria-invalid", "true");
          expect(screen.queryByTestId("error")).toBe(null);

          await blur(control);

          expect(control).toHaveAttribute("aria-invalid", "true");
          expect(screen.getByTestId("error")).not.toBe(null);
          expect(screen.getByTestId("error").textContent).not.toBe("");

          await focus(control);
          await change(control, "test@example.com");

          expect(control).not.toHaveAttribute("aria-invalid", "true");
          expect(screen.queryByTestId("error")).toBe(null);

          await blur(control);

          expect(control).not.toHaveAttribute("aria-invalid", "true");
          expect(screen.queryByTestId("error")).toBe(null);
        });
      });

      describe("computed validity state", () => {
        it("should not mark field as invalid for valueMissing if not dirty", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control data-testid="control" required />
            </Field.Root>
          ));

          const control = screen.getByTestId("control");

          await focus(control);
          await blur(control);

          expect(control).not.toHaveAttribute("data-invalid");
          expect(control).not.toHaveAttribute("aria-invalid");
        });

        it("should mark field as invalid for valueMissing if dirty", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control data-testid="control" required />
            </Field.Root>
          ));

          const control = screen.getByTestId("control");

          // Mark as touched and dirtied
          await focus(control);
          await change(control, "a");
          await change(control, "");
          await blur(control);

          // valueMissing is true, and markedDirtyRef is true, so valid should be false
          expect(control).toHaveAttribute("data-invalid", "");
          expect(control).toHaveAttribute("aria-invalid", "true");
        });

        it("should mark field as invalid for other errors (e.g., typeMismatch) even if not dirty", async () => {
          await render(() => (
            <Field.Root validationMode="onBlur">
              <Field.Control
                data-testid="control"
                type="email"
                defaultValue="not_an_email@"
              />
            </Field.Root>
          ));

          const control = screen.getByTestId("control");

          // Mark as touched but not dirty
          await focus(control);
          await blur(control);

          // typeMismatch is true, so valid should be false regardless of dirty state
          expect(control).toHaveAttribute("data-invalid", "");
          expect(control).toHaveAttribute("aria-invalid", "true");
        });
      });
    });
  });

  describe("prop: validateDebounceTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    async function tick(ms: number) {
      vi.advanceTimersByTime(ms);
      await flushMicrotasks();
    }

    it("should debounce validation", async () => {
      await render(() => (
        <Field.Root
          validationDebounceTime={100}
          validationMode="onChange"
          validate={(value) => {
            const str = value as string;
            return str.length < 3 ? "error" : null;
          }}
        >
          <Field.Control />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole<HTMLInputElement>("textbox");
      const message = screen.queryByText("error");

      expect(message).toBe(null);

      await change(control, "t");

      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(99);

      await change(control, "te");

      await tick(99);

      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(1);

      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText("error")).not.toBe(null);
    });

    it("should debounce validation for field-aware controls", async () => {
      const validate = vi.fn((value) => (value ? "error" : null));

      await render(() => (
        <Field.Root validationDebounceTime={100} validationMode="onChange" validate={validate}>
          <Checkbox.Root />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole("checkbox");

      await click(control);

      expect(validate).not.toHaveBeenCalled();
      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(99);

      expect(validate).not.toHaveBeenCalled();
      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(1);

      expect(validate).toHaveBeenCalledTimes(1);
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText("error")).not.toBe(null);
    });

    it("should debounce validation for radio groups", async () => {
      const validate = vi.fn((value) => (value === "b" ? "error" : null));

      await render(() => (
        <Field.Root validationDebounceTime={100} validationMode="onChange" validate={validate}>
          <RadioGroup>
            <Radio.Root value="a" data-testid="item-a" />
            <Radio.Root value="b" data-testid="item-b" />
          </RadioGroup>
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole("radiogroup");

      await click(screen.getByTestId("item-b"));

      expect(validate).not.toHaveBeenCalled();
      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(99);

      expect(validate).not.toHaveBeenCalled();
      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(1);

      expect(validate).toHaveBeenCalledTimes(1);
      expect(validate.mock.lastCall?.[0]).toBe("b");
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText("error")).not.toBe(null);
    });

    it("drops a pending debounced validation when the control unmounts", async () => {
      const validate = vi.fn(() => "error");

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Field.Root
              data-testid="root"
              validationDebounceTime={100}
              validationMode="onChange"
              validate={validate}
            >
              <Show when={mounted()}>
                <Field.Control data-testid="control" />
              </Show>
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="button" onClick={() => setMounted(false)}>
              unmount
            </button>
          </div>
        );
      }

      await render(() => <App />);

      await change(screen.getByTestId("control"), "abc");

      await tick(99);

      await click(screen.getByText("unmount"));

      await tick(100);

      expect(validate).not.toHaveBeenCalled();
      expect(screen.queryByTestId("error")).toBe(null);
      expect(screen.getByTestId("root")).not.toHaveAttribute("data-invalid");
    });

    it("ignores async validation results superseded during debounce", async () => {
      const resolvers: Record<string, (value: string | null) => void> = {};
      const validate = vi.fn((value: unknown) => {
        return new Promise<string | null>((resolve) => {
          resolvers[value as string] = resolve;
        });
      });

      await render(() => (
        <Field.Root
          validationDebounceTime={100}
          validationMode="onChange"
          validate={validate}
        >
          <Field.Control />
          <Field.Error />
        </Field.Root>
      ));

      const control = screen.getByRole<HTMLInputElement>("textbox");

      await change(control, "old");
      await tick(100);

      expect(validate.mock.lastCall?.[0]).toBe("old");

      await change(control, "new");

      resolvers.old("old error");
      await flushMicrotasks();

      expect(screen.queryByText("old error")).toBe(null);
      expect(control).not.toHaveAttribute("aria-invalid");

      await tick(100);

      resolvers.new(null);
      await flushMicrotasks();

      expect(validate.mock.lastCall?.[0]).toBe("new");
      expect(screen.queryByText("old error")).toBe(null);
      expect(control).not.toHaveAttribute("aria-invalid");
    });

    it("drops an in-flight async validation when the control unmounts", async () => {
      let resolveValidate: ((value: string | null) => void) | undefined;
      const validate = vi.fn(
        () =>
          new Promise<string | null>((resolve) => {
            resolveValidate = resolve;
          }),
      );

      function App() {
        const [mounted, setMounted] = createSignal(true);

        return (
          <div>
            <Field.Root
              data-testid="root"
              validationMode="onChange"
              validate={validate}
            >
              <Show when={mounted()}>
                <Field.Control data-testid="control" />
              </Show>
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="button" onClick={() => setMounted(false)}>
              unmount
            </button>
          </div>
        );
      }

      await render(() => <App />);

      await change(screen.getByTestId("control"), "abc");
      expect(validate).toHaveBeenCalledTimes(1);

      await click(screen.getByText("unmount"));

      resolveValidate?.("error");
      await flushMicrotasks();

      expect(screen.queryByTestId("error")).toBe(null);
      expect(screen.getByTestId("root")).not.toHaveAttribute("data-invalid");
    });

    it("keeps the published error when async validation rejects", async () => {
      const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
      let commit: ((value: unknown) => Promise<void>) | undefined;

      function ReadCommit() {
        commit = useFieldRootContext().validation.commit;
        return null;
      }

      let calls = 0;
      const validate = async () => {
        calls += 1;
        if (calls === 2) {
          throw new Error("network");
        }
        return "Username is taken";
      };

      await render(() => (
        <Form onSubmit={onSubmit}>
          <Field.Root
            name="username"
            validationMode="onBlur"
            validate={validate}
          >
            <Field.Control data-testid="control" />
            <Field.Error data-testid="error" />
            <ReadCommit />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const control = screen.getByTestId("control");

      await focus(control);
      await change(control, "taken");
      await blur(control);
      await flushMicrotasks();

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Username is taken",
      );

      await expect(commit?.("taken")).rejects.toThrow("network");
      await flushMicrotasks();

      expect(screen.getByTestId("error")).toHaveTextContent(
        "Username is taken",
      );
      expect(control).toHaveAttribute("aria-invalid", "true");

      await click(screen.getByText("submit"));
      await flushMicrotasks();

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("drops a pending validation when another field-aware control takes ownership", async () => {
      const validate = vi.fn(() => "error");

      function App() {
        const [showSwitch, setShowSwitch] = createSignal(false);

        return (
          <div>
            <Field.Root
              data-testid="root"
              validationDebounceTime={100}
              validationMode="onChange"
              validate={validate}
            >
              <Field.Control data-testid="control" />
              <Show when={showSwitch()}>
                <Switch.Root />
              </Show>
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="button" onClick={() => setShowSwitch(true)}>
              add switch
            </button>
          </div>
        );
      }

      await render(() => <App />);

      await change(screen.getByTestId("control"), "abc");

      await tick(99);

      await click(screen.getByText("add switch"));

      await tick(100);

      expect(validate).not.toHaveBeenCalled();
      expect(screen.queryByTestId("error")).toBe(null);
      expect(screen.getByTestId("root")).not.toHaveAttribute("data-invalid");
    });

    it("keeps a pending debounce armed across the first registration", async () => {
      const validate = vi.fn(() => "error");

      await render(() => (
        <Field.Root
          data-testid="root"
          validationDebounceTime={100}
          validationMode="onChange"
          validate={validate}
        >
          <Field.Control data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      await change(screen.getByTestId("control"), "abc");

      await tick(100);

      expect(validate).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("error")).toHaveTextContent("error");
    });
  });

  describe("custom validity ownership", () => {
    it("keeps a message set outside the field when submitting", async () => {
      const onFormSubmit = vi.fn();

      await render(() => (
        <Form onFormSubmit={onFormSubmit}>
          <Field.Root name="external">
            <Field.Control data-testid="control" />
            <Field.Error data-testid="error" />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");
      control.setCustomValidity("external error");

      await click(screen.getByText("submit"));

      expect(onFormSubmit).not.toHaveBeenCalled();
      expect(control.validationMessage).toBe("external error");
      expect(screen.getByTestId("error")).toHaveTextContent("external error");
    });

    it("keeps a message set outside the field when validating on change", async () => {
      await render(() => (
        <Field.Root validationMode="onChange">
          <Field.Control data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");
      control.setCustomValidity("external error");

      await change(control, "abc");

      expect(control.validationMessage).toBe("external error");
      expect(control).toHaveAttribute("data-invalid", "");
      expect(screen.getByTestId("error")).toHaveTextContent("external error");
    });

    it("keeps a message set outside the field when revalidating on change", async () => {
      await render(() => (
        <Field.Root validationMode="onBlur">
          <Field.Control data-testid="control" required />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");

      await focus(control);
      await change(control, "a");
      await change(control, "");
      await blur(control);
      expect(control).toHaveAttribute("data-invalid", "");

      control.setCustomValidity("external error");
      await change(control, "abc");

      expect(control.validationMessage).toBe("external error");
      expect(control).toHaveAttribute("data-invalid", "");
      expect(screen.getByTestId("error")).toHaveTextContent("external error");
    });

    it("keeps other native errors deferred while a message set outside the field survives", async () => {
      const handleValidity = vi.fn();
      await render(() => (
        <Field.Root name="field" validationMode="onBlur">
          <Field.Control type="email" required />
          <Field.Error match="typeMismatch" data-testid="type-mismatch">
            invalid email
          </Field.Error>
          <Field.Validity>{handleValidity}</Field.Validity>
        </Field.Root>
      ));

      const control = screen.getByRole<HTMLInputElement>("textbox");

      await focus(control);
      await change(control, "a");
      await change(control, "");
      await blur(control);
      expect(control).toHaveAttribute("data-invalid", "");

      control.setCustomValidity("external error");
      await change(control, "abc");

      // Port note: `Field.Validity` calls its children once with a reactive state object, so the
      // last call's argument reflects the current state.
      expect(screen.queryByTestId("type-mismatch")).toBe(null);
      expect(handleValidity.mock.lastCall?.[0].validity.typeMismatch).toBe(
        false,
      );
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(false);
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual([
        "external error",
      ]);
    });

    it("clears the message it set itself", async () => {
      await render(() => (
        <Field.Root
          validationMode="onChange"
          validate={(value) =>
            value === "bad" ? "custom error\r\nmore" : null
          }
        >
          <Field.Control data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");

      await change(control, "bad");

      expect(control.validationMessage).toBe("custom error\nmore");

      await change(control, "good");

      expect(control.validationMessage).toBe("");
      expect(screen.queryByTestId("error")).toBe(null);
    });

    it("restores a message its own one displaced", async () => {
      await render(() => (
        <Field.Root
          validationMode="onChange"
          validate={(value) => (value === "bad" ? "custom error" : null)}
        >
          <Field.Control data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");
      control.setCustomValidity("external error");

      await change(control, "bad");

      expect(control.validationMessage).toBe("custom error");

      await change(control, "good");

      expect(control.validationMessage).toBe("external error");
      expect(screen.getByTestId("error")).toHaveTextContent("external error");
    });

    it("does not restore a message that was withdrawn while its own one was installed", async () => {
      await render(() => (
        <Field.Root
          validationMode="onChange"
          validate={(value) => (value === "bad" ? "custom error" : null)}
        >
          <Field.Control data-testid="control" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");
      control.setCustomValidity("external error");

      await change(control, "bad");

      expect(control.validationMessage).toBe("custom error");

      control.setCustomValidity("");

      await change(control, "good");

      expect(control.validationMessage).toBe("");
      expect(screen.queryByTestId("error")).toBe(null);
    });

    it("clears its own message on an input that became disabled", async () => {
      function App() {
        const actionsRef: { current: Field.Root.Actions | null } = {
          current: null,
        };
        const [disabled, setDisabled] = createSignal(false);
        const [failing, setFailing] = createSignal(true);

        return (
          <div>
            <Field.Root
              actionsRef={actionsRef}
              validate={() => (failing() ? "custom error" : null)}
            >
              <Field.Control data-testid="control" disabled={disabled()} />
            </Field.Root>
            <button
              type="button"
              onClick={() => actionsRef.current?.validate()}
            >
              validate
            </button>
            <button type="button" onClick={() => setDisabled((prev) => !prev)}>
              toggle disabled
            </button>
            <button type="button" onClick={() => setFailing(false)}>
              pass
            </button>
          </div>
        );
      }

      await render(() => <App />);

      const control = screen.getByTestId<HTMLInputElement>("control");

      await click(screen.getByText("validate"));

      expect(control.validationMessage).toBe("custom error");

      await click(screen.getByText("toggle disabled"));
      await click(screen.getByText("pass"));
      await click(screen.getByText("validate"));
      await click(screen.getByText("toggle disabled"));

      expect(control.validationMessage).toBe("");
    });

    it("does not adopt a native message as the message it displaced", async () => {
      await render(() => (
        <Field.Root
          validationMode="onChange"
          validate={(value) => (value === "bad" ? "custom error" : null)}
        >
          <Field.Control data-testid="control" type="email" />
        </Field.Root>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");

      await change(control, "bad");
      expect(control.validationMessage).toBe("custom error");

      await change(control, "a@b.co");

      expect(control.validity.customError).toBe(false);
      expect(control.validationMessage).toBe("");
    });

    it("keeps a message set outside the field on another input of the same field", async () => {
      const handleValidity = vi.fn();

      function App() {
        const actionsRef: { current: Field.Root.Actions | null } = { current: null };

        return (
          <div>
            <Field.Root
              actionsRef={actionsRef}
              validationMode="onBlur"
              validate={(value) => (value === "cats" ? "custom error" : null)}
            >
              <RadioGroup defaultValue="cats">
                <Radio.Root value="cats" data-testid="cats" />
                <Radio.Root value="dogs" data-testid="dogs" />
              </RadioGroup>
              <Field.Validity>{handleValidity}</Field.Validity>
            </Field.Root>
            <button type="button" onClick={() => actionsRef.current?.validate()}>
              validate
            </button>
          </div>
        );
      }

      await render(() => <App />);

      const [cats, dogs] = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');

      await click(screen.getByText("validate"));
      expect(cats.validationMessage).toBe("custom error");

      dogs.setCustomValidity("external error");
      await click(screen.getByTestId("dogs"));

      expect(cats.validationMessage).toBe("");
      expect(dogs.validationMessage).toBe("external error");
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual(["external error"]);
    });

    it.skipIf(isJSDOM)("ignores a message set outside the field on a control barred from validation", async () => {
      const onFormSubmit = vi.fn();

      await render(() => (
        <Form onFormSubmit={onFormSubmit}>
          <Field.Root name="field" validationMode="onChange">
            <Field.Control data-testid="control" readonly />
            <Field.Error data-testid="error" />
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const control = screen.getByTestId<HTMLInputElement>("control");
      expect(control.willValidate).toBe(false);
      control.setCustomValidity("external error");

      await change(control, "abc");

      expect(control).not.toHaveAttribute("data-invalid");
      expect(screen.queryByTestId("error")).toBe(null);

      await click(screen.getByText("submit"));

      expect(onFormSubmit).toHaveBeenCalledTimes(1);
    });

    it.skipIf(isJSDOM)("does not write its own message to a barred control", async () => {
      function App() {
        const [readOnly, setReadOnly] = createSignal(true);

        return (
          <div>
            <Field.Root
              validationMode="onChange"
              validate={() => "custom error"}
            >
              <Field.Control data-testid="control" readonly={readOnly()} />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="button" onClick={() => setReadOnly(false)}>
              make editable
            </button>
          </div>
        );
      }

      await render(() => <App />);

      const control = screen.getByTestId<HTMLInputElement>("control");
      control.setCustomValidity("external error");

      await change(control, "abc");

      expect(screen.getByTestId("error")).toHaveTextContent("custom error");

      await click(screen.getByText("make editable"));

      expect(control.validationMessage).toBe("external error");
    });
  });

  describe("style hooks", () => {
    describe("touched", () => {
      it("should apply [data-touched] style hook to all components when touched", async () => {
        await render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");
        const label = screen.getByTestId("label");
        const description = screen.getByTestId("description");
        const error = screen.queryByTestId("error");

        expect(root).not.toHaveAttribute("data-touched");
        expect(control).not.toHaveAttribute("data-touched");
        expect(label).not.toHaveAttribute("data-touched");
        expect(description).not.toHaveAttribute("data-touched");
        expect(error).toBe(null);

        await focus(control);
        await blur(control);

        expect(root).toHaveAttribute("data-touched", "");
        expect(control).toHaveAttribute("data-touched", "");
        expect(label).toHaveAttribute("data-touched", "");
        expect(description).toHaveAttribute("data-touched", "");
        expect(error).toBe(null);
      });
    });

    describe("dirty", () => {
      it("should apply [data-dirty] style hook to all components when dirty", async () => {
        await render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");
        const label = screen.getByTestId("label");
        const description = screen.getByTestId("description");

        expect(root).not.toHaveAttribute("data-dirty");
        expect(control).not.toHaveAttribute("data-dirty");
        expect(label).not.toHaveAttribute("data-dirty");
        expect(description).not.toHaveAttribute("data-dirty");

        await change(control, "value");

        expect(root).toHaveAttribute("data-dirty", "");
        expect(control).toHaveAttribute("data-dirty", "");
        expect(label).toHaveAttribute("data-dirty", "");
        expect(description).toHaveAttribute("data-dirty", "");

        await change(control, "");

        expect(root).not.toHaveAttribute("data-dirty");
        expect(control).not.toHaveAttribute("data-dirty");
        expect(label).not.toHaveAttribute("data-dirty");
        expect(description).not.toHaveAttribute("data-dirty");
      });

      // TODO(port): needs NumberField
      it.skip("should clear [data-dirty] when a null-valued control returns to its empty initial value", () => {});

      // TODO(port): needs Select
      it.skip("should clear [data-dirty] when a Select returns to its null initial value", () => {});

      it("keeps [data-dirty] on a RadioGroup when returning to the first picked value", async () => {
        function App() {
          const [value, setValue] = createSignal<string | null>(null);
          return (
            <div>
              <Field.Root data-testid="root">
                <RadioGroup value={value()} onValueChange={(next) => setValue(next as string | null)}>
                  <Radio.Root value="a" />
                  <Radio.Root value="b" />
                </RadioGroup>
              </Field.Root>
              <button type="button" onClick={() => setValue("a")}>
                a
              </button>
              <button type="button" onClick={() => setValue("b")}>
                b
              </button>
            </div>
          );
        }

        await render(() => <App />);
        const root = screen.getByTestId("root");

        expect(root).not.toHaveAttribute("data-dirty");

        await click(screen.getByText("a"));
        await waitFor(() => {
          expect(root).toHaveAttribute("data-dirty", "");
        });

        await click(screen.getByText("b"));
        await click(screen.getByText("a"));

        await waitFor(() => {
          expect(root).toHaveAttribute("data-dirty", "");
        });
      });
    });

    describe("control remount", () => {
      // TODO(port): needs NumberField
      it.skip("clears dirty after an empty text control returns to empty following a null-valued control", () => {});

      it("keeps the original baseline when a controlled control remounts", async () => {
        function App() {
          const [value, setValue] = createSignal("a");
          const [mounted, setMounted] = createSignal(true);
          return (
            <div>
              <Field.Root data-testid="root">
                <Show when={mounted()}>
                  <Field.Control
                    data-testid="control"
                    value={value()}
                    onValueChange={setValue}
                  />
                </Show>
              </Field.Root>
              <button type="button" onClick={() => setMounted((prev) => !prev)}>
                toggle
              </button>
            </div>
          );
        }

        await render(() => <App />);
        const root = screen.getByTestId("root");

        await change(screen.getByTestId("control"), "b");
        await waitFor(() => {
          expect(root).toHaveAttribute("data-dirty", "");
        });

        await click(screen.getByText("toggle"));
        await click(screen.getByText("toggle"));

        expect(root).toHaveAttribute("data-dirty", "");

        await change(screen.getByTestId("control"), "a");
        await waitFor(() => {
          expect(root).not.toHaveAttribute("data-dirty");
        });
      });

      it("keeps the field baseline when the control is swapped", async () => {
        function SwappableField() {
          const [swapped, setSwapped] = createSignal(false);
          return (
            <div>
              <Field.Root data-testid="root">
                <Show
                  when={swapped()}
                  fallback={<Field.Control defaultValue="a" />}
                >
                  <Field.Control data-testid="control" defaultValue="x" />
                </Show>
              </Field.Root>
              <button type="button" onClick={() => setSwapped(true)}>
                swap
              </button>
            </div>
          );
        }

        await render(() => <SwappableField />);
        const root = screen.getByTestId("root");

        await click(screen.getByText("swap"));
        const control = screen.getByTestId("control");

        await change(control, "y");
        await waitFor(() => {
          expect(root).toHaveAttribute("data-dirty", "");
        });

        // The baseline is still the field's original value, not the swapped-in control's default.
        await change(control, "a");
        await waitFor(() => {
          expect(root).not.toHaveAttribute("data-dirty");
        });
      });

      // React-only: StrictMode; also needs NumberField
      it.skip("captures the baseline only once in StrictMode", () => {});
    });

    describe("filled", () => {
      it("should apply [data-filled] style hook to all components when filled", async () => {
        await render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");
        const label = screen.getByTestId("label");
        const description = screen.getByTestId("description");

        expect(root).not.toHaveAttribute("data-filled");
        expect(control).not.toHaveAttribute("data-filled");
        expect(label).not.toHaveAttribute("data-filled");
        expect(description).not.toHaveAttribute("data-filled");

        await change(control, "value");

        expect(root).toHaveAttribute("data-filled", "");
        expect(control).toHaveAttribute("data-filled", "");
        expect(label).toHaveAttribute("data-filled", "");
        expect(description).toHaveAttribute("data-filled", "");

        await change(control, "");

        expect(root).not.toHaveAttribute("data-filled");
        expect(control).not.toHaveAttribute("data-filled");
        expect(label).not.toHaveAttribute("data-filled");
        expect(description).not.toHaveAttribute("data-filled");
      });

      it("changes [data-filled] when the value is changed externally", async () => {
        function App() {
          const [value, setValue] = createSignal("");
          return (
            <div>
              <Field.Root>
                <Field.Control
                  value={value()}
                  onInput={(event) => setValue(event.currentTarget.value)}
                />
              </Field.Root>
              <button onClick={() => setValue("test")}>change</button>
              <button onClick={() => setValue("")}>reset</button>
            </div>
          );
        }

        const { user } = await render(() => <App />);

        expect(screen.getByRole("textbox")).not.toHaveAttribute(
          "data-filled",
          "",
        );

        await user.click(screen.getByRole("button", { name: "change" }));
        await flushMicrotasks();
        expect(screen.getByRole("textbox")).toHaveAttribute("data-filled", "");

        await user.click(screen.getByRole("button", { name: "reset" }));
        await flushMicrotasks();
        expect(screen.getByRole("textbox")).not.toHaveAttribute(
          "data-filled",
          "",
        );
      });
    });

    describe("focused", () => {
      it("should apply [data-focused] style hook to all components when focused", async () => {
        await render(() => (
          <Field.Root data-testid="root">
            <Field.Control data-testid="control" />
            <Field.Label data-testid="label" />
            <Field.Description data-testid="description" />
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const root = screen.getByTestId("root");
        const control = screen.getByTestId("control");
        const label = screen.getByTestId("label");
        const description = screen.getByTestId("description");

        expect(root).not.toHaveAttribute("data-focused");
        expect(control).not.toHaveAttribute("data-focused");
        expect(label).not.toHaveAttribute("data-focused");
        expect(description).not.toHaveAttribute("data-focused");

        await focus(control);

        expect(root).toHaveAttribute("data-focused", "");
        expect(control).toHaveAttribute("data-focused", "");
        expect(label).toHaveAttribute("data-focused", "");
        expect(description).toHaveAttribute("data-focused", "");

        await blur(control);

        expect(root).not.toHaveAttribute("data-focused");
        expect(control).not.toHaveAttribute("data-focused");
        expect(label).not.toHaveAttribute("data-focused");
        expect(description).not.toHaveAttribute("data-focused");
      });
    });
  });

  describe("defaultValue behavior", () => {
    it("should not reset to defaultValue when input value is programmatically changed and then focused", async () => {
      let inputRef: HTMLInputElement | undefined;

      await render(() => (
        <Field.Root>
          <Field.Control
            ref={(el: HTMLInputElement) => {
              inputRef = el;
            }}
            defaultValue="foo"
            data-testid="input"
          />
        </Field.Root>
      ));

      const input = screen.getByTestId("input") as HTMLInputElement;

      expect(input.value).toBe("foo");

      if (inputRef) {
        inputRef.value = "";
      }

      expect(input.value).toBe("");

      await focus(input);

      expect(input.value).toBe("");
    });

    it("should not reset to defaultValue when input value is programmatically changed to non-empty value and then focused", async () => {
      let inputRef: HTMLInputElement | undefined;

      await render(() => (
        <Field.Root>
          <Field.Control
            ref={(el: HTMLInputElement) => {
              inputRef = el;
            }}
            defaultValue="foo"
            data-testid="input"
          />
        </Field.Root>
      ));

      const input = screen.getByTestId("input") as HTMLInputElement;

      expect(input.value).toBe("foo");

      if (inputRef) {
        inputRef.value = "abc";
      }

      expect(input.value).toBe("abc");

      await focus(input);

      expect(input.value).toBe("abc");
    });
  });

  describe("prop: dirty", () => {
    it("controls the dirty state", async () => {
      await render(() => (
        <Field.Root data-testid="root" dirty>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="description" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      ["root", "control", "label", "description"].forEach((part) => {
        expect(screen.getByTestId(part)).toHaveAttribute("data-dirty");
      });
    });

    it("uses the controlled dirty state for required validation", async () => {
      await render(() => (
        <Field.Root dirty validationMode="onBlur">
          <Field.Control data-testid="control" required />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const control = screen.getByTestId("control");

      await focus(control);
      await blur(control);

      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByTestId("error")).not.toBe(null);
    });

    it("does not update controlled dirty state from user input", async () => {
      await render(() => (
        <Field.Root data-testid="root" dirty={false}>
          <Field.Control />
        </Field.Root>
      ));

      await change(screen.getByRole("textbox"), "changed");

      expect(screen.getByTestId("root")).not.toHaveAttribute("data-dirty");
    });
  });

  describe("prop: touched", () => {
    it("controls the touched state", async () => {
      await render(() => (
        <Field.Root data-testid="root" touched>
          <Field.Control data-testid="control" />
          <Field.Label data-testid="label" />
          <Field.Description data-testid="description" />
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      ["root", "control", "label", "description"].forEach((part) => {
        expect(screen.getByTestId(part)).toHaveAttribute("data-touched");
      });
    });

    it("does not update controlled touched state on blur", async () => {
      await render(() => (
        <Field.Root data-testid="root" touched={false}>
          <Field.Control />
        </Field.Root>
      ));

      await focus(screen.getByRole("textbox"));
      await blur(screen.getByRole("textbox"));

      expect(screen.getByTestId("root")).not.toHaveAttribute("data-touched");
    });
  });

  describe("prop: actionsRef", () => {
    it("validates the field when the `validate` method is called", async () => {
      function App() {
        const actionsRef: { current: Field.Root.Actions | null } = {
          current: null,
        };
        return (
          <div>
            <Field.Root name="username" actionsRef={actionsRef}>
              <Field.Control defaultValue="" required />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button
              type="button"
              onClick={() => actionsRef.current?.validate()}
            >
              validate
            </button>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      expect(screen.queryByTestId("error")).toBe(null);

      await user.click(screen.getByText("validate"));
      await flushMicrotasks();

      expect(screen.queryByTestId("error")).not.toBe(null);
    });

    it("validates a logical field without a mounted control", async () => {
      function App() {
        const actionsRef: { current: Field.Root.Actions | null } = {
          current: null,
        };
        return (
          <div>
            <Field.Root
              actionsRef={actionsRef}
              validate={() => "Logical field error"}
            >
              <Field.Error />
            </Field.Root>
            <button
              type="button"
              onClick={() => actionsRef.current?.validate()}
            >
              validate
            </button>
          </div>
        );
      }

      const { user } = await render(() => <App />);

      await user.click(screen.getByRole("button", { name: "validate" }));
      await flushMicrotasks();

      expect(screen.getByText("Logical field error")).toBeVisible();
    });

    it("validates the current control value when the `validate` method is called", async () => {
      const validate = vi.fn((value: unknown) =>
        value === "valid" ? null : "error",
      );

      function App() {
        const actionsRef: { current: Field.Root.Actions | null } = {
          current: null,
        };
        return (
          <div>
            <Field.Root actionsRef={actionsRef} validate={validate}>
              <Field.Control />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button
              type="button"
              onClick={() => actionsRef.current?.validate()}
            >
              validate
            </button>
          </div>
        );
      }

      const { user } = await render(() => <App />);
      const control = screen.getByRole("textbox");

      await change(control, "valid");
      await user.click(screen.getByText("validate"));
      await flushMicrotasks();

      expect(validate.mock.lastCall?.[0]).toBe("valid");
      expect(screen.queryByTestId("error")).toBe(null);
    });
  });
});

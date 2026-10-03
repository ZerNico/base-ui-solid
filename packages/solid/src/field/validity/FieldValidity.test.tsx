import { Field } from "..";
import { Form } from "../../form";
import {
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  render,
  screen,
} from "#test-utils";

// Port note: `Field.Validity` calls its children once with a reactive state object, so
// `handleValidity.mock.lastCall[0]` always reflects the current state (upstream re-renders and
// passes a fresh snapshot each time). The assertions are the same.

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

describe("<Field.Validity />", () => {
  (["onBlur", "onSubmit"] as const).forEach((validationMode) => {
    it(`surfaces valueMissing immediately after a stale custom error in ${validationMode} mode`, async () => {
      const handleValidity = vi.fn();
      const validate = vi.fn(() => "custom error");

      await render(() => (
        <Form>
          <Field.Root validationMode={validationMode} validate={validate}>
            <Field.Control required />
            <Field.Error match="valueMissing">Required</Field.Error>
            <Field.Validity>{handleValidity}</Field.Validity>
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const input = screen.getByRole<HTMLInputElement>("textbox");
      const establishInvalidState = async () => {
        if (validationMode === "onBlur") {
          await blur(input);
        } else {
          await click(screen.getByText("submit"));
        }
      };

      await focus(input);
      await change(input, "invalid");
      await establishInvalidState();

      expect(handleValidity.mock.lastCall?.[0].value).toBe("invalid");
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        false,
      );
      expect(validate).toHaveBeenCalledTimes(1);

      await focus(input);
      await change(input, "");

      expect(handleValidity.mock.lastCall?.[0].value).toBe("");
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(
        validationMode === "onSubmit",
      );
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        true,
      );
      expect(screen.getByText("Required")).toBeVisible();
      expect(validate).toHaveBeenCalledTimes(
        validationMode === "onBlur" ? 1 : 2,
      );

      await establishInvalidState();

      expect(handleValidity.mock.lastCall?.[0].value).toBe("");
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(
        validationMode === "onSubmit",
      );
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        true,
      );
      expect(screen.getByText("Required")).toBeVisible();
    });
  });

  it.skipIf(isJSDOM)(
    "defers badInput during required change revalidation",
    async () => {
      const { userEvent } = await import("vitest/browser");
      const user = userEvent.setup();
      const handleValidity = vi.fn();

      await render(() => (
        <Field.Root validationMode="onBlur" validate={() => "custom error"}>
          <Field.Control type="number" required />
          <Field.Error match="valueMissing">Required</Field.Error>
          <Field.Error match="badInput">Invalid number</Field.Error>
          <Field.Validity>{handleValidity}</Field.Validity>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>("spinbutton");

      await user.type(input, "1[Tab]");
      await flushMicrotasks();

      expect(handleValidity.mock.lastCall?.[0].value).toBe("1");
      expect(handleValidity.mock.lastCall?.[0].validity.customError).toBe(true);

      await user.type(input, "{Control>}a{/Control}e");
      await flushMicrotasks();

      expect(input.validity.valueMissing).toBe(true);
      expect(input.validity.badInput).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].value).toBe("1");
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        false,
      );
      expect(handleValidity.mock.lastCall?.[0].validity.badInput).toBe(false);
      expect(screen.queryByText("Required")).toBe(null);
      expect(screen.queryByText("Invalid number")).toBe(null);
    },
  );

  describe("validationMode=onSubmit", () => {
    it("should pass validity data", async () => {
      const handleValidity = vi.fn();

      await render(() => (
        <Form>
          <Field.Root>
            <Field.Control required />
            <Field.Validity>{handleValidity}</Field.Validity>
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const input = screen.getByRole<HTMLInputElement>("textbox");

      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(null);

      await click(screen.getByText("submit"));

      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(false);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        true,
      );
      expect(handleValidity.mock.lastCall?.[0]).toHaveProperty(
        "transitionStatus",
      );

      await focus(input);
      await change(input, "test");

      expect(handleValidity.mock.lastCall?.[0].value).toBe("test");
      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        false,
      );
    });
  });

  describe("validationMode=onBlur", () => {
    it("should pass validity data", async () => {
      const handleValidity = vi.fn();

      await render(() => (
        <Field.Root validationMode="onBlur">
          <Field.Control required />
          <Field.Validity>{handleValidity}</Field.Validity>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>("textbox");

      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(null);

      await focus(input);
      await change(input, "test");
      await blur(input);

      expect(handleValidity.mock.lastCall?.[0].value).toBe("test");
      expect(handleValidity.mock.lastCall?.[0].validity.valid).toBe(true);
      expect(handleValidity.mock.lastCall?.[0].validity.valueMissing).toBe(
        false,
      );
    });

    it("should correctly pass errors when validate function returns a string", async () => {
      const handleValidity = vi.fn();

      await render(() => (
        <Field.Root validationMode="onBlur" validate={() => "error"}>
          <Field.Control />
          <Field.Validity>{handleValidity}</Field.Validity>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>("textbox");

      await focus(input);
      await blur(input);

      expect(handleValidity.mock.lastCall?.[0].error).toBe("error");
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual(["error"]);
    });

    it("should correctly pass errors when validate function returns an array of strings", async () => {
      const handleValidity = vi.fn();

      await render(() => (
        <Field.Root validationMode="onBlur" validate={() => ["1", "2"]}>
          <Field.Control />
          <Field.Validity>{handleValidity}</Field.Validity>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>("textbox");

      await focus(input);
      await blur(input);

      expect(handleValidity.mock.lastCall?.[0].error).toBe("1");
      expect(handleValidity.mock.lastCall?.[0].errors).toEqual(["1", "2"]);
    });
  });
});

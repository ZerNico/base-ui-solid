import { createSignal, flush, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';

// A small local stand-in for `@tanstack/solid-form`, which doesn't support Solid 2.0 yet. It mirrors
// the parts of TanStack Form's API this example uses (`form.Field`, `field.state.meta` and form-level
// validators), so the example can switch to the adapter once it does.

type FieldModel = {
  field: {
    name: string;
    value: any;
    onChange: (value: any) => void;
    onFocusOut: () => void;
  };
  fieldState: {
    invalid: boolean;
    isTouched: boolean;
    isDirty: boolean;
    error?: { message: string };
  };
};
export function createControlledForm<T extends Record<string, any>>(options: {
  defaultValues: T;
  onSubmit?: (data: { value: T }) => void;
  validators?: { onDynamic: (data: { value: T }) => any };
}) {
  const [values, setValues] = createSignal<T>(() => options.defaultValues);
  const [touched, setTouched] = createSignal<Record<string, boolean>>({});
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  let submitted = false;
  function validate(next: T) {
    const result: Record<string, string> =
      options.validators?.onDynamic({ value: next })?.fields ?? {};
    setErrors(result);
    return !Object.keys(result).length;
  }
  function model(name: string): FieldModel {
    return {
      field: {
        name,
        get value() {
          return values()[name];
        },
        onChange(value) {
          const next = { ...values(), [name]: value };
          setValues(() => next);
          if (submitted) {
            validate(next);
          }
        },
        onFocusOut() {
          setTouched((old) => ({ ...old, [name]: true }));
        },
      },
      fieldState: {
        get invalid() {
          return !!errors()[name];
        },
        get isTouched() {
          return !!touched()[name];
        },
        get isDirty() {
          return values()[name] !== options.defaultValues[name];
        },
        get error() {
          return errors()[name] ? { message: errors()[name] } : undefined;
        },
      },
    };
  }
  function handleSubmit(callback: (value: T) => void) {
    return (event?: Event) => {
      event?.preventDefault();
      submitted = true;
      flush();
      if (validate(values())) {
        callback(values());
      }
    };
  }
  function Field(props: { name: keyof T; children: (field: any) => JSX.Element }) {
    const current = model(untrack(() => String(props.name)));
    const field = {
      name: current.field.name,
      state: {
        get value() {
          return current.field.value;
        },
        meta: {
          get isValid() {
            return !current.fieldState.invalid;
          },
          get isDirty() {
            return current.fieldState.isDirty;
          },
          get isTouched() {
            return current.fieldState.isTouched;
          },
          get errors() {
            return current.fieldState.error ? [current.fieldState.error.message] : [];
          },
        },
      },
      handleChange: current.field.onChange,
      handleBlur: current.field.onFocusOut,
    };
    return <div style={{ display: 'contents' }}>{props.children(field)}</div>;
  }
  return {
    Field,
    // TanStack Form doesn't move focus on submit.
    handleSubmitForm: () => handleSubmit((value) => options.onSubmit?.({ value }))(),
  };
}

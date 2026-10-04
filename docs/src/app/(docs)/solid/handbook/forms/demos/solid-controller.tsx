import { createSignal, flush, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';

type Rules = { required?: string; minlength?: { value: number; message: string } };
type FieldModel = {
  field: {
    name: string;
    value: any;
    ref: (element: HTMLElement | null) => void;
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
  const rules = new Map<string, Rules>();
  const elements = new Map<string, HTMLElement>();
  function validate(next: T) {
    const result: Record<string, string> =
      options.validators?.onDynamic({ value: next })?.fields ?? {};
    rules.forEach((rule, name) => {
      const value = next[name];
      if (
        rule.required &&
        (value == null || value === '' || (Array.isArray(value) && !value.length))
      ) {
        result[name] = rule.required;
      } else if (
        rule.minlength &&
        typeof value === 'string' &&
        value.length < rule.minlength.value
      ) {
        result[name] = rule.minlength.message;
      }
    });
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
        ref(element) {
          if (element) {
            elements.set(name, element);
          } else {
            elements.delete(name);
          }
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
  const control = {
    model,
    register(name: string, rule?: Rules) {
      if (rule) {
        rules.set(name, rule);
      }
    },
  };
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
    control,
    handleSubmit,
    Field,
    handleSubmitForm: () => handleSubmit((value) => options.onSubmit?.({ value }))(),
  };
}
export function Controller(props: {
  name: string;
  control: ReturnType<typeof createControlledForm>['control'];
  rules?: Rules;
  render: (model: FieldModel) => JSX.Element;
}) {
  untrack(() => props.control.register(props.name, props.rules));
  const model = untrack(() => props.control.model(props.name));
  return <div style={{ display: 'contents' }}>{props.render(model)}</div>;
}

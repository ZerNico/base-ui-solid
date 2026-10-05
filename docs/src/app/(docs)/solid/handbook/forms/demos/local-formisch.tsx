import { createSignal, flush, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';

// A small local stand-in for `@formisch/solid` and `valibot`, which don't support Solid 2.0 yet.
// It mirrors the parts of their API this example uses (`createForm`, `<Field>`, `handleSubmit` and
// a few Valibot schemas and actions), so the example can switch to the libraries once they do.

/* ---------------------------------------------------------------------------------------------- */
/* Schemas (Valibot-like)                                                                          */
/* ---------------------------------------------------------------------------------------------- */

interface Schema<T> {
  /** Returns the issue messages for a value. */
  issues: (value: unknown) => string[];
  /** Type-only marker for the validated output. */
  readonly output?: T;
}

interface Action<T> {
  check: (value: T) => string | undefined;
}

function typeSchema<T>(guard: (value: unknown) => boolean, message: string): Schema<T> {
  return { issues: (value) => (guard(value) ? [] : [message]) };
}

function string(message = 'Invalid type: expected a string.'): Schema<string> {
  return typeSchema((value) => typeof value === 'string', message);
}

function number(message = 'Invalid type: expected a number.'): Schema<number> {
  return typeSchema((value) => typeof value === 'number' && !Number.isNaN(value), message);
}

function boolean(message = 'Invalid type: expected a boolean.'): Schema<boolean> {
  return typeSchema((value) => typeof value === 'boolean', message);
}

function picklist<const Options extends readonly string[]>(
  options: Options,
  message = 'Invalid option.',
): Schema<Options[number]> {
  return typeSchema((value) => options.includes(value as string), message);
}

function array<T>(item: Schema<T>, message = 'Invalid type: expected an array.'): Schema<T[]> {
  return {
    issues: (value) =>
      Array.isArray(value) ? value.flatMap((entry) => item.issues(entry)) : [message],
  };
}

function nonEmpty(message: string): Action<string | readonly unknown[]> {
  return { check: (value) => (value.length > 0 ? undefined : message) };
}

function minLength(length: number, message: string): Action<string | readonly unknown[]> {
  return { check: (value) => (value.length >= length ? undefined : message) };
}

function pipe<T>(schema: Schema<T>, ...actions: Action<T>[]): Schema<T> {
  return {
    issues(value) {
      const typeIssues = schema.issues(value);
      if (typeIssues.length > 0) {
        return typeIssues;
      }
      return actions.flatMap((action) => action.check(value as T) ?? []);
    },
  };
}

type Entries = Record<string, Schema<any>>;

interface ObjectSchema<E extends Entries> {
  entries: E;
}

function object<E extends Entries>(entries: E): ObjectSchema<E> {
  return { entries };
}

export type InferOutput<S> =
  S extends ObjectSchema<infer E>
    ? { [K in keyof E]: E[K] extends Schema<infer T> ? T : never }
    : never;

export const v = { string, number, boolean, picklist, array, nonEmpty, minLength, pipe, object };

/* ---------------------------------------------------------------------------------------------- */
/* Form store (Formisch-like)                                                                      */
/* ---------------------------------------------------------------------------------------------- */

type Input<S> = { [K in keyof InferOutput<S>]: InferOutput<S>[K] | null };
type Errors = [string, ...string[]] | null;

export interface FieldElementProps {
  name: string;
  autofocus: boolean;
  ref: (element: HTMLElement) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export interface FieldStore<Value> {
  path: [string];
  input: Value;
  errors: Errors;
  isTouched: boolean;
  isEdited: boolean;
  isDirty: boolean;
  isValid: boolean;
  /** Updates the value and runs validation, like a native input would. */
  onInput: (value: Value) => void;
  props: FieldElementProps;
}

export interface FormStore<S extends ObjectSchema<Entries>> {
  isSubmitted: boolean;
  isTouched: boolean;
  isDirty: boolean;
  isValid: boolean;
  /** @internal */
  internal: {
    schema: S;
    initialInput: Input<S>;
    input: () => Input<S>;
    setInput: (name: string, value: unknown) => void;
    errors: () => Record<string, Errors>;
    touched: () => Record<string, boolean>;
    setTouched: (name: string) => void;
    elements: Map<string, HTMLElement>;
    validate: () => boolean;
    submitted: () => boolean;
    setSubmitted: () => void;
  };
}

/**
 * Creates a form store from an object schema. Like Formisch's defaults, fields are validated on
 * submit and revalidated on input afterwards.
 */
export function createForm<S extends ObjectSchema<Entries>>(config: {
  schema: S;
  initialInput: Input<S>;
}): FormStore<S> {
  const initialInput = config.initialInput;
  const [input, setInputValues] = createSignal<Input<S>>(() => initialInput);
  const [errors, setErrors] = createSignal<Record<string, Errors>>({});
  const [touched, setTouchedFields] = createSignal<Record<string, boolean>>({});
  const [submitted, setSubmittedSignal] = createSignal(false);
  const elements = new Map<string, HTMLElement>();

  function validate(values = input()) {
    const next: Record<string, Errors> = {};
    for (const [name, schema] of Object.entries(config.schema.entries)) {
      const issues = schema.issues((values as Record<string, unknown>)[name]);
      next[name] = issues.length > 0 ? (issues as [string, ...string[]]) : null;
    }
    setErrors(next);
    return Object.values(next).every((fieldErrors) => fieldErrors == null);
  }

  return {
    get isSubmitted() {
      return submitted();
    },
    get isTouched() {
      return Object.values(touched()).some(Boolean);
    },
    get isDirty() {
      const current = input() as Record<string, unknown>;
      return Object.keys(current).some(
        (name) => current[name] !== (initialInput as Record<string, unknown>)[name],
      );
    },
    get isValid() {
      return Object.values(errors()).every((fieldErrors) => fieldErrors == null);
    },
    internal: {
      schema: config.schema,
      initialInput,
      input,
      setInput(name, value) {
        const next = { ...input(), [name]: value };
        setInputValues(() => next);
        // Revalidate on input once the form was submitted or the field has errors.
        if (submitted() || errors()[name]) {
          validate(next);
        }
      },
      errors,
      touched,
      setTouched(name) {
        setTouchedFields((previous) => ({ ...previous, [name]: true }));
      },
      elements,
      validate: () => validate(),
      submitted,
      setSubmitted: () => setSubmittedSignal(true),
    },
  };
}

/**
 * Connects a field of the form store to its controls through a render function.
 */
export function Field<
  S extends ObjectSchema<Entries>,
  K extends keyof InferOutput<S> & string,
>(props: {
  of: FormStore<S>;
  path: [K];
  children: (field: FieldStore<Input<S>[K]>) => JSX.Element;
}): JSX.Element {
  const form = untrack(() => props.of.internal);
  const name = untrack(() => props.path[0]);
  const field: FieldStore<Input<S>[K]> = {
    path: [name],
    get input() {
      return form.input()[name];
    },
    get errors() {
      return form.errors()[name] ?? null;
    },
    get isTouched() {
      return !!form.touched()[name];
    },
    get isEdited() {
      return form.input()[name] !== form.initialInput[name];
    },
    get isDirty() {
      return form.input()[name] !== form.initialInput[name];
    },
    get isValid() {
      return !form.errors()[name];
    },
    onInput(value) {
      form.setInput(name, value);
    },
    props: {
      name,
      autofocus: false,
      ref(element) {
        form.elements.set(name, element);
      },
      onFocus() {
        form.setTouched(name);
      },
      onBlur() {},
    },
  };
  return untrack(() => props.children(field));
}

/**
 * Returns a submit event handler that validates the form, moves focus to the first invalid field
 * and calls `handler` with the validated output.
 */
export function handleSubmit<S extends ObjectSchema<Entries>>(
  form: FormStore<S>,
  handler: (output: InferOutput<S>, event: SubmitEvent) => void,
) {
  return (event: SubmitEvent) => {
    event.preventDefault();
    const internal = form.internal;
    internal.setSubmitted();
    const valid = internal.validate();
    flush();
    if (valid) {
      handler(internal.input() as InferOutput<S>, event);
      return;
    }
    for (const name of Object.keys(internal.schema.entries)) {
      if (internal.errors()[name]) {
        internal.elements.get(name)?.focus();
        return;
      }
    }
  };
}

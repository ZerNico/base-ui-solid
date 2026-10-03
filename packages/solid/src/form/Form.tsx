import { createSignal, omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { createGenericEventDetails } from '../internals/createBaseUIEventDetails';
import type { BaseUIGenericEventDetails } from '../internals/createBaseUIEventDetails';
import { REASONS } from '../internals/reasons';
import type { BaseUIComponentProps } from '../internals/types';
import { FormContext } from '../internals/form-context/FormContext';
import { useRenderElement } from '../internals/useRenderElement';
import { useValueChanged } from '../internals/useValueChanged';

/**
 * A native form element with consolidated error handling.
 * Renders a `<form>` element.
 *
 * Documentation: [Base UI Form](https://base-ui.com/react/components/form)
 */
export function Form<FormValues extends Record<string, any> = Record<string, any>>(
  componentProps: Form.Props<FormValues>,
): JSX.Element {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'validationMode',
    'errors',
    'onSubmit',
    'onFormSubmit',
    'actionsRef',
    'style',
  );

  const formRef: FormContext['formRef'] = {
    current: {
      fields: new Map(),
    },
  };
  const elementRef: RefObject<HTMLFormElement | null> = { current: null };
  let submitted = false;
  const submitCountRef: RefObject<number> = { current: 0 };

  function focusFirstInvalid() {
    // A field can be invalid without a focusable control (for example a checkbox group whose
    // custom validation failed while every checkbox is unmounted, disabled, or reassociated).
    // Keep submission blocked, but move focus to the first invalid field that has a usable control.
    // Registration order can diverge from DOM order (keyed fields reordered without
    // remounting, portals), so pick the first control by document position. For controls
    // in disconnected trees (e.g. separate shadow roots), where document position is
    // implementation-specific, keep registration order.
    let hasInvalid = false;
    let firstControl: HTMLElement | null = null;
    for (const field of formRef.current.fields.values()) {
      if (field.validityData.state.valid !== false) {
        continue;
      }
      hasInvalid = true;
      const control = field.controlRef.current;
      if (control && (!firstControl || comesBeforeInSameTree(control, firstControl))) {
        firstControl = control;
      }
    }
    if (firstControl) {
      firstControl.focus();
      if (firstControl.tagName === 'INPUT') {
        (firstControl as HTMLInputElement).select();
      }
      return true;
    }
    return hasInvalid;
  }

  const [errors, setErrors] = createSignal(untrack(() => componentProps.errors));

  useValueChanged(
    () => componentProps.errors,
    () => {
      setErrors(() => untrack(() => componentProps.errors));
    },
  );

  useEffect(
    () => {
      if (!submitted) {
        return;
      }

      submitted = false;
      // Port note: upstream's passive effect runs after the fields' layout effects have synced
      // the new errors into `formRef`. Solid runs this effect first (it was created before the
      // fields' effects), so wait until the current flush has finished.
      queueMicrotask(focusFirstInvalid);
    },
    () => [errors()],
  );

  const actions: Form.Actions = {
    validate(fieldName?: string) {
      if (fieldName) {
        Array.from(formRef.current.fields.values())
          .find((field) => field.name === fieldName)
          ?.validate();
      } else {
        formRef.current.fields.forEach((field) => {
          field.validate();
        });
      }
    },
  };
  // Port note: React's `useImperativeHandle` assigns the handle before ancestors' effects run.
  // Solid runs ancestors' effects first, so also assign it synchronously on setup.
  const initialActionsRef = untrack(() => componentProps.actionsRef);
  if (initialActionsRef) {
    initialActionsRef.current = actions;
  }

  useIsoLayoutEffect(
    ([actionsRef]) => {
      if (actionsRef) {
        actionsRef.current = actions;
      }
    },
    () => [componentProps.actionsRef],
  );

  const clearErrors = (name: string | undefined) => {
    if (!name) {
      return;
    }
    setErrors((previousErrors) => {
      if (!previousErrors || !Object.hasOwn(previousErrors, name)) {
        return previousErrors;
      }
      const nextErrors = { ...previousErrors };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const contextValue: FormContext = {
    elementRef,
    formRef,
    validationMode: () => componentProps.validationMode ?? 'onSubmit',
    errors: () => errors() ?? (EMPTY_OBJECT as Record<string, string | string[]>),
    clearErrors,
    submitCountRef,
  };

  return (
    <FormContext value={contextValue}>
      {useRenderElement('form', componentProps, {
        ref: (element: HTMLFormElement | null) => {
          elementRef.current = element;
        },
        props: [
          {
            novalidate: true,
            onSubmit(event: SubmitEvent) {
              submitCountRef.current += 1;

              // Async validation isn't supported to stop the submit event.
              formRef.current.fields.forEach((field) => {
                field.validate();
              });

              if (focusFirstInvalid()) {
                event.preventDefault();
                return;
              }

              submitted = true;
              componentProps.onSubmit?.(event as any);

              const onFormSubmit = componentProps.onFormSubmit;
              if (onFormSubmit) {
                event.preventDefault();

                const formValues = {} as FormValues;
                formRef.current.fields.forEach((field) => {
                  if (field.name) {
                    (formValues as Record<string, any>)[field.name] = field.getValue();
                  }
                });

                onFormSubmit(formValues, createGenericEventDetails(REASONS.none, event));
              }
            },
          },
          elementProps,
        ],
      })}
    </FormContext>
  );
}

export type FormSubmitEventReason = typeof REASONS.none;
export type FormSubmitEventDetails = BaseUIGenericEventDetails<Form.SubmitEventReason>;

export type FormValidationMode = 'onSubmit' | 'onBlur' | 'onChange';

export interface FormActions {
  validate: (fieldName?: string | undefined) => void;
}

export interface FormState {}

export interface FormProps<
  FormValues extends Record<string, any> = Record<string, any>,
> extends Omit<BaseUIComponentProps<'form', FormState>, 'onSubmit'> {
  /**
   * Determines when the form should be validated.
   * The `validationMode` prop on `<Field.Root>` takes precedence over this.
   *
   * - `onSubmit` (default): validates the field when the form is submitted, afterwards fields will re-validate on change.
   * - `onBlur`: validates a field when it loses focus.
   * - `onChange`: validates the field on every change to its value.
   *
   * @default 'onSubmit'
   */
  validationMode?: FormValidationMode | undefined;
  /**
   * Validation errors returned externally, typically after submission by a server or a form action.
   * This should be an object where keys correspond to the `name` attribute on `<Field.Root>`,
   * and values correspond to error(s) related to that field.
   */
  errors?: Record<string, string | string[]> | undefined;
  /**
   * Event handler called when the native `submit` event fires, after validation passes.
   */
  onSubmit?: ((event: SubmitEvent & { currentTarget: HTMLFormElement }) => void) | undefined;
  /**
   * Event handler called when the form is submitted.
   * `preventDefault()` is called on the native submit event when used.
   */
  onFormSubmit?:
    ((formValues: FormValues, eventDetails: Form.SubmitEventDetails) => void) | undefined;
  /**
   * A ref to imperative actions.
   * - `validate`: Validates all fields when called. Optionally pass a field name to validate a single field.
   * @example
   * ```tsx
   * // validate all fields
   * actionsRef.current?.validate();
   *
   * // validate one field
   * actionsRef.current?.validate('email');
   * ```
   */
  actionsRef?: RefObject<Form.Actions | null> | undefined;
}

export namespace Form {
  export type Props<FormValues extends Record<string, any> = Record<string, any>> =
    FormProps<FormValues>;
  export type State = FormState;
  export type Actions = FormActions;
  export type ValidationMode = FormValidationMode;
  export type SubmitEventReason = FormSubmitEventReason;
  export type SubmitEventDetails = FormSubmitEventDetails;

  export type Values<FormValues extends Record<string, any> = Record<string, any>> = FormValues;
}

/* eslint-disable no-bitwise */
function comesBeforeInSameTree(element: Node, reference: Node) {
  const position = element.compareDocumentPosition(reference);
  return (
    (position & Node.DOCUMENT_POSITION_DISCONNECTED) === 0 &&
    (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

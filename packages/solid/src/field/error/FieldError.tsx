import { For, Show, createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { FieldRootState, FieldValidityData } from '../root/FieldRoot';
import { useFieldRootContext } from '../../internals/field-root-context/FieldRootContext';
import { useLabelableContext } from '../../internals/labelable-provider/LabelableContext';
import { fieldValidityMapping } from '../../internals/field-constants/constants';
import { useFormContext } from '../../internals/form-context/FormContext';
import type { BaseUIComponentProps } from '../../internals/types';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

const stateAttributesMapping: StateAttributesMapping<FieldErrorState> = {
  ...fieldValidityMapping,
  ...transitionStatusMapping,
};

/**
 * An error message displayed if the field control fails validation.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Field](https://base-ui.com/react/components/field)
 */
export function FieldError(componentProps: FieldError.Props) {
  const elementProps = omit(componentProps, 'render', 'id', 'class', 'match', 'style');

  const generatedId = useBaseUiId();
  const id = () => componentProps.id ?? generatedId;

  const { validityData, state: fieldState, name } = useFieldRootContext(false);
  const { setMessageIds } = useLabelableContext();

  const { errors } = useFormContext();

  const formError = () => {
    const currentName = name();
    const currentErrors = errors();
    return currentName && Object.hasOwn(currentErrors, currentName)
      ? currentErrors[currentName]
      : null;
  };
  const hasFormError = () => {
    const currentFormError = formError();
    return !!(Array.isArray(currentFormError) ? currentFormError.length : currentFormError);
  };
  const hasSpecificMatch = () => typeof componentProps.match === 'string';

  const rendered = createMemo(() => {
    const match = componentProps.match;
    if (match === true) {
      return true;
    }
    if (fieldState().disabled) {
      return false;
    }
    if (typeof match === 'string') {
      return Boolean(validityData().state[match as keyof FieldValidityData['state']]);
    }
    return hasFormError() || validityData().state.valid === false;
  });

  const { mounted, transitionStatus, setMounted } = useTransitionStatus(rendered);

  useIsoLayoutEffect(
    ([isRendered, currentId]) => {
      if (!isRendered || !currentId) {
        return undefined;
      }

      setMessageIds((v) => v.concat(currentId));

      return () => {
        setMessageIds((v) => v.filter((item) => item !== currentId));
      };
    },
    () => [rendered(), id()],
  );

  let errorElement: HTMLDivElement | null = null;

  type ErrorValue = string | string[] | null | undefined;

  const error = createMemo<ErrorValue>(() => {
    const currentValidityData = validityData();
    if (!hasSpecificMatch() && hasFormError()) {
      return formError();
    }
    if (currentValidityData.errors.length > 1) {
      return currentValidityData.errors;
    }
    return currentValidityData.error;
  });

  // Upstream keeps the last rendered message (so it stays visible while the error animates out)
  // by adjusting state during render; here it's a memo that only updates while rendered.
  const lastRenderedError = createMemo<{
    key: string | null | undefined;
    error: ErrorValue;
  } | null>((previous) => {
    const currentError = error();
    if (!rendered()) {
      return previous ?? null;
    }
    const key = Array.isArray(currentError) ? JSON.stringify(currentError) : currentError;
    return previous && previous.key === key ? previous : { key, error: currentError };
  });

  const errorMessage = (): JSX.Element => {
    const currentError = lastRenderedError()?.error;
    if (Array.isArray(currentError)) {
      return currentError.length > 1 ? (
        <ul>
          <For each={currentError}>{(message) => <li>{message}</li>}</For>
        </ul>
      ) : (
        currentError[0]
      );
    }
    return currentError;
  };

  useOpenChangeComplete({
    open: rendered,
    ref: () => errorElement,
    onComplete() {
      if (!rendered()) {
        setMounted(false);
      }
    },
  });

  const state = createMemo<FieldErrorState>(() => ({
    ...fieldState(),
    transitionStatus: transitionStatus(),
  }));

  return (
    <Show when={mounted()}>
      {useRenderElement('div', componentProps, {
        ref: (element: HTMLDivElement | null) => {
          errorElement = element;
        },
        state,
        props: () => [
          {
            id: id(),
            get children() {
              return errorMessage();
            },
          },
          elementProps,
        ],
        stateAttributesMapping,
      })}
    </Show>
  );
}

export interface FieldErrorState extends FieldRootState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface FieldErrorProps extends BaseUIComponentProps<'div', FieldErrorState> {
  /**
   * Determines whether to show the error message according to the field's
   * [ValidityState](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState).
   * Specifying `true` will always show the error message, and lets external libraries
   * control the visibility.
   */
  match?: boolean | keyof ValidityState | undefined;
}

export namespace FieldError {
  export type State = FieldErrorState;
  export type Props = FieldErrorProps;
}

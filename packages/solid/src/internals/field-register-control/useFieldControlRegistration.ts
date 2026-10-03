import { type Accessor, untrack } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { getCombinedFieldValidityData } from '../../field/utils/getCombinedFieldValidityData';
import { useFormContext } from '../form-context/FormContext';
import type { FieldValidityData } from '../../field/root/FieldRoot';

export interface FieldControlRegistration {
  controlRef: RefObject<any>;
  id: string | undefined;
  name?: string | undefined;
  getValue?: (() => unknown) | undefined;
  value: unknown;
}

export function useFieldControlRegistration(params: UseFieldControlRegistrationParameters) {
  const {
    change,
    commit,
    invalid,
    markedDirtyRef,
    name,
    setRegisteredFieldName,
    registeredFieldIdRef,
    setValidityData,
    validityData,
  } = params;

  const { formRef } = useFormContext();

  let activeFieldControlSource: symbol | null = null;
  let currentRegistration: FieldControlRegistration | null = null;
  let initialValueCaptured = false;

  const getValueForForm = () => {
    const registration = currentRegistration;
    if (!registration) {
      return undefined;
    }

    if (registration.getValue) {
      return registration.getValue();
    }

    return registration.value;
  };

  function getRegistrationValue(registration: FieldControlRegistration) {
    return registration.value === undefined ? getValueForForm() : registration.value;
  }

  const validate = () =>
    untrack(() => {
      const registration = currentRegistration;
      markedDirtyRef.current = true;

      if (!registration) {
        commit(validityData().value);
        return;
      }

      commit(getRegistrationValue(registration));
    });

  function setFormField(registration: FieldControlRegistration) {
    if (!registration.id) {
      return;
    }

    formRef.current.fields.set(registration.id, {
      getValue: getValueForForm,
      name: untrack(name) ?? registration.name,
      controlRef: registration.controlRef,
      validityData: getCombinedFieldValidityData(untrack(validityData), untrack(invalid)),
      validate,
    });
  }

  function refreshRegistration() {
    const registration = currentRegistration;
    if (!registration) {
      return;
    }

    setFormField(registration);
  }

  function deleteRegistration(id = currentRegistration?.id) {
    if (id) {
      formRef.current.fields.delete(id);
    }
  }

  // The baseline belongs to the field, not to a control instance: registration re-runs on every
  // value change, and a control that unmounts and remounts (or is swapped for another one) comes
  // back as a brand new registration. Capturing more than once would turn whichever value the
  // control happens to hold at that point into the initial value, so a modified field would read
  // pristine and its real initial value would read dirty. Consumers that want a fresh baseline
  // remount `<Field.Root>` itself.
  function captureInitialValue(registration: FieldControlRegistration) {
    if (initialValueCaptured) {
      return;
    }

    initialValueCaptured = true;
    const initialValue = getRegistrationValue(registration);

    setValidityData((prev) =>
      prev.initialValue === initialValue ? prev : { ...prev, initialValue },
    );
  }

  useIsoLayoutEffect(
    ([currentName]) => {
      const registration = currentRegistration;
      if (!registration || !registration.id) {
        return;
      }

      setRegisteredFieldName(currentName ? undefined : registration.name);
      setFormField(registration);
    },
    () => [name(), invalid(), validityData()],
  );

  const fields = formRef.current.fields;
  useIsoLayoutEffect(
    () => () => {
      const id = currentRegistration?.id;
      if (id) {
        fields.delete(id);
      }
    },
    () => [],
  );

  const register = (source: symbol, registration: FieldControlRegistration | undefined) =>
    untrack(() => {
      if (!registration) {
        if (activeFieldControlSource === source) {
          activeFieldControlSource = null;
          change(undefined, true);
          deleteRegistration();
          currentRegistration = null;
          setRegisteredFieldName(undefined);
          registeredFieldIdRef.current = undefined;
        }
        return;
      }

      const previousId = currentRegistration?.id;
      const previousSource = activeFieldControlSource;

      // Drop work owned by a replaced control, but not on first registration.
      if (previousSource && previousSource !== source) {
        change(undefined, true);
      }

      activeFieldControlSource = source;
      currentRegistration = registration;
      if (!name()) {
        setRegisteredFieldName(registration.name);
      }
      registeredFieldIdRef.current = registration.id;

      if (previousId && previousId !== registration.id) {
        deleteRegistration(previousId);
      }

      captureInitialValue(registration);
      refreshRegistration();
    });

  return [validate, register] as const;
}

export interface UseFieldControlRegistrationParameters {
  change: (value: unknown, cancelPending?: boolean) => void;
  commit: (value: unknown) => void;
  invalid: Accessor<boolean>;
  markedDirtyRef: RefObject<boolean>;
  name: Accessor<string | undefined>;
  setRegisteredFieldName: (name: string | undefined) => void;
  registeredFieldIdRef: RefObject<string | undefined>;
  setValidityData: (
    value: FieldValidityData | ((prev: FieldValidityData) => FieldValidityData),
  ) => void;
  validityData: Accessor<FieldValidityData>;
}

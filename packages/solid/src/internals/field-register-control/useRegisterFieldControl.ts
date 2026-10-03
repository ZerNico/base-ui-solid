import type { Accessor } from 'solid-js';
import { onCleanup } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useFieldRootContext } from '../field-root-context/FieldRootContext';
import type { FieldControlRegistration } from './useFieldControlRegistration';

export function useRegisterFieldControl(
  controlRef: FieldControlRegistration['controlRef'],
  id: Accessor<FieldControlRegistration['id']>,
  value: Accessor<FieldControlRegistration['value']>,
  getFormValueOverride?: FieldControlRegistration['getValue'],
  enabled: Accessor<boolean> = () => true,
  name?: Accessor<FieldControlRegistration['name']>,
) {
  const { registerFieldControl } = useFieldRootContext();
  const source = Symbol();

  // Re-register without unregistering first: re-registration with the same id updates the
  // form's fields Map entry in place, while a delete + re-add would move the field to the
  // end of the Map every time its value changes.
  useIsoLayoutEffect(
    ([isEnabled, currentId, currentValue, currentName]) => {
      if (!isEnabled) {
        registerFieldControl(source, undefined);
        return;
      }

      const registration: FieldControlRegistration = {
        controlRef,
        getValue: getFormValueOverride,
        id: currentId,
        name: currentName,
        value: currentValue,
      };

      registerFieldControl(source, registration);
    },
    () => [enabled(), id(), value(), name?.()],
  );

  onCleanup(() => {
    registerFieldControl(source, undefined);
  });
}

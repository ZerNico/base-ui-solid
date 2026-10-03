import { type Accessor, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';

export function useValueChanged<T>(value: Accessor<T>, onChange: (previousValue: T) => void) {
  let previousValue = untrack(value);

  useIsoLayoutEffect(
    ([currentValue]) => {
      if (previousValue !== currentValue) {
        onChange(previousValue);
      }

      previousValue = currentValue;
    },
    () => [value()],
  );
}

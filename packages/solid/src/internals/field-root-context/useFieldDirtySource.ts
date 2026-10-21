import { createMemo, onSettled, untrack } from 'solid-js';
import { runCleanup } from '@base-ui-solid/utils/cleanup';
import type { Accessor } from 'solid-js';
import { useFieldRootContext } from './FieldRootContext';
import type { FieldDirtySource } from './FieldRootContext';

/**
 * Registers whether the control's value differs from the field's initial value, which the field
 * derives its `dirty` state from.
 *
 * Port note: upstream's controls compare the value from an effect when it changes and write the
 * result with `setDirty`. Here the comparison is derived: nothing until the value first changes
 * (the initial value is registered after mount), then a new result for each change. `isDirty`
 * returns `undefined` for a value it has no opinion on, which keeps the previous state.
 */
export function useFieldDirtySource<T>(
  value: Accessor<T>,
  isDirty: (value: T, initialValue: unknown) => boolean | undefined,
) {
  const { registerDirtySource, validityData } = useFieldRootContext();
  const mountedValue = untrack(value);
  let changed = false;
  let changeCount = 0;
  const source = createMemo<FieldDirtySource>(() => {
    const currentValue = value();
    if (!changed) {
      if (Object.is(currentValue, mountedValue)) {
        return undefined;
      }
      changed = true;
    }
    const dirty = untrack(() => isDirty(currentValue, validityData().initialValue));
    changeCount += 1;
    return dirty === undefined ? undefined : { dirty, change: changeCount };
  });
  // Registered once the control has rendered, like `LabelableProvider`'s message ids: writing during
  // a render would invalidate a computation that creates the control. The source has no opinion
  // until the value changes, so registering later doesn't change the state.
  onSettled(() => {
    const unregister = registerDirtySource(source);
    return () => runCleanup(unregister);
  });
}

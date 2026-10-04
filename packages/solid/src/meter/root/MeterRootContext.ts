import { createContext, useContext } from 'solid-js';
import type { Accessor, Setter } from 'solid-js';

export type MeterRootContext = {
  formattedValue: Accessor<string>;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   */
  percentageValue: Accessor<number>;
  setLabelId: Setter<string | undefined>;
  value: Accessor<number>;
};

// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const MeterRootContext = createContext<MeterRootContext | null>(null);

export function useMeterRootContext() {
  const context = useContext(MeterRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: MeterRootContext is missing. Meter parts must be placed within <Meter.Root>.',
    );
  }

  return context;
}

import { type Accessor, type Setter, createContext, useContext } from 'solid-js';
import type { ProgressRootState } from './ProgressRoot';

export type ProgressRootContext = {
  /**
   * Formatted value of the component.
   */
  formattedValue: Accessor<string>;
  /**
   * The value normalized to a `0`–`100` percentage of the range, clamped to those bounds.
   * `null` while the progress is indeterminate.
   */
  percentageValue: Accessor<number | null>;
  /**
   * Value of the component.
   */
  value: Accessor<number | null>;
  setLabelId: Setter<string | undefined>;
  state: Accessor<ProgressRootState>;
};

/**
 * @internal
 */
// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const ProgressRootContext = createContext<ProgressRootContext | null>(null);

export function useProgressRootContext() {
  const context = useContext(ProgressRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: ProgressRootContext is missing. Progress parts must be placed within <Progress.Root>.',
    );
  }

  return context;
}

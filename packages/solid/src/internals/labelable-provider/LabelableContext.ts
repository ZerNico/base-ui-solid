import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import { NOOP } from '../noop';
import type { HTMLProps } from '../types';

type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

export interface LabelableContext {
  /**
   * The `id` of the labelable element.
   * When `null` the label omits `for`, either because the association is implicit or
   * because the control takes its name from `aria-labelledby`.
   */
  controlId: Accessor<string | null | undefined>;
  registerControlId: (source: symbol, id: string | null | undefined) => void;
  resetControlId: () => void;
  /**
   * The `id` of the label.
   */
  labelId: Accessor<string | undefined>;
  setLabelId: StateSetter<string | undefined>;
  /**
   * An array of `id`s of elements that provide an accessible description.
   */
  messageIds: Accessor<string[]>;
  /**
   * Registers an accessor of a message element's `id` (`undefined` while it isn't rendered) for
   * the lifetime of the calling owner. Call it once, when the part is set up.
   */
  registerMessageId: (id: Accessor<string | false | null | undefined>) => void;
  /**
   * Reads reactive state: call it inside a reactive scope (e.g. a `props` accessor).
   */
  getDescriptionProps: (externalProps: HTMLProps) => HTMLProps;
}

const EMPTY_MESSAGE_IDS: string[] = [];

/**
 * A context for providing [labelable elements](https://html.spec.whatwg.org/multipage/forms.html#category-label)\
 * with an accessible name (label) and description.
 */
export const LabelableContext = createContext<LabelableContext>({
  controlId: () => undefined,
  registerControlId: NOOP,
  resetControlId: NOOP,
  labelId: () => undefined,
  setLabelId: NOOP,
  messageIds: () => EMPTY_MESSAGE_IDS,
  registerMessageId: NOOP,
  getDescriptionProps: (externalProps: HTMLProps) => externalProps,
});

export function useLabelableContext() {
  return useContext(LabelableContext);
}

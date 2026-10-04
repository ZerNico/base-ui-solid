import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';

export interface SelectItemContext {
  selected: Accessor<boolean>;
  index: Accessor<number>;
  textRef: RefObject<HTMLElement | null>;
  selectedByFocus: Accessor<boolean>;
}

export const SelectItemContext = createContext<SelectItemContext | null>(null);

export function useSelectItemContext() {
  const context = useContext(SelectItemContext);
  if (!context) {
    throw new Error(
      'Base UI: SelectItemContext is missing. SelectItem parts must be placed within <Select.Item>.',
    );
  }
  return context;
}

import { createContext, useContext } from 'solid-js';

export interface FilterDropdownGroupContext {
  registerItem: (id: symbol, retained: boolean) => () => void;
}
export const FilterDropdownGroupContext = createContext<FilterDropdownGroupContext | null>(null);
export function useFilterDropdownGroupContext() {
  return useContext(FilterDropdownGroupContext);
}

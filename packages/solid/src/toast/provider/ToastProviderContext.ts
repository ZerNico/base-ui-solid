import { createContext, useContext } from 'solid-js';
import type { ToastStore } from '../store';

export type ToastContext = ToastStore;

export const ToastContext = createContext<ToastContext | null>(null);

export function useToastProviderContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('Base UI: useToastManager must be used within <Toast.Provider>.');
  }
  return context;
}

import { createContext, createSignal, onSettled, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';

export interface PackageManagerSnippetContext {
  // Port note: an accessor, so components re-render when the preference changes.
  packageManager: Accessor<string>;
  setPackageManager: (variant: string) => void;
}

export const PackageManagerSnippetContext = createContext<PackageManagerSnippetContext | null>(
  null,
);

export const usePackageManagerSnippetContext = () => {
  const context = useContext(PackageManagerSnippetContext);
  if (!context) {
    throw new Error('Missing PackageManagerSnippetContext');
  }

  return context;
};

interface PackageManagerSnippetProviderProps {
  children: JSX.Element;
  defaultValue: string;
}

const STORAGE_KEY = 'preferredPackageManager';

export function PackageManagerSnippetProvider(props: PackageManagerSnippetProviderProps) {
  const [value, setValue] = createSignal(props.defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    localStorage.setItem(STORAGE_KEY, newValue);
  };

  // Port note: read the saved value once the tree has settled after hydration, so the server
  // markup (default value) hydrates without a mismatch.
  onSettled(() => {
    const savedValue = localStorage.getItem(STORAGE_KEY);

    if (savedValue) {
      setValue(savedValue);
    }
  });

  const contextValue: PackageManagerSnippetContext = {
    packageManager: value,
    setPackageManager: handleValueChange,
  };

  return (
    <PackageManagerSnippetContext value={contextValue}>
      {props.children}
    </PackageManagerSnippetContext>
  );
}

import { createEffect, createSignal, onSettled } from 'solid-js';
import { isServer } from '@solidjs/web';
import { useLocation } from '@tanstack/solid-router';

// Port note: static prerenders contain no query parameters. Read the browser URL
// after hydration, while preserving the server location for dynamic SSR requests.
export function useErrorSearchParams() {
  const location = useLocation();
  const [search, setSearch] = createSignal('');
  onSettled(() => {
    setSearch(window.location.search);
  });
  createEffect(
    () => location().searchStr,
    (value) => {
      setSearch(window.location.search || value);
    },
  );
  return () => new URLSearchParams(isServer ? location().searchStr : search());
}

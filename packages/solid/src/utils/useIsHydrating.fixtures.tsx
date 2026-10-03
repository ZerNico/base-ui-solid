import { useIsHydrating } from './useIsHydrating';

export function TestComponent() {
  const isHydrating = useIsHydrating();

  return <span data-testid="value">{String(isHydrating())}</span>;
}

import type { Accessor } from 'solid-js';
import { useIsHydrated, useIsHydrating } from '@base-ui-solid/utils/hydration';

function createProbe(hook: () => Accessor<boolean>, testId: string) {
  return function Probe() {
    const value = hook();
    return <span data-testid={testId}>{value() ? 'yes' : 'no'}</span>;
  };
}

export const HydratedProbe = createProbe(useIsHydrated, 'hydrated');

export const HydratingProbe = createProbe(useIsHydrating, 'hydrating');

import { SolidStore } from '@base-ui-solid/utils/store';

type FixtureState = { value: string; label: string };

const selectors = {
  value: (state: FixtureState) => state.value,
  label: (state: FixtureState) => state.label,
};

export function SyncedValues(props: { value: string }) {
  const store = new SolidStore<FixtureState, Record<string, never>, typeof selectors>(
    { value: 'initial', label: 'initial' },
    undefined,
    selectors,
  );
  store.useSyncedValue('value', () => props.value);
  store.useSyncedValues(() => ({ label: `${props.value}-label` }));
  const value = store.useState('value');
  const label = store.useState('label');

  return (
    <output data-testid="output" data-label={label()}>
      {value()}
    </output>
  );
}

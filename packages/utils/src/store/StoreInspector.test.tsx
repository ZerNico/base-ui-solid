import { expect, describe, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { Store } from './Store';
import { StoreInspector } from './StoreInspector';

describe('StoreInspector', () => {
  it('marks a reference back to the store reached through a Map as circular', async () => {
    const state: { owners: Map<string, { store: Store<any> }> } = { owners: new Map() };
    const store = new Store(state);
    state.owners.set('owner', { store });

    // Port note: `Store` is invariant in its state type here, so the test types the owners loosely.
    render(() => <StoreInspector store={store} defaultOpen />);

    expect(screen.getByText(/\[circular reference\]/)).not.toBe(null);
  });
});

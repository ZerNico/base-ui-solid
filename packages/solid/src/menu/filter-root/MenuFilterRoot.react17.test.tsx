import { renderToString, screen, waitFor } from '#test-utils';

import { expect, describe, it } from 'vitest';

import userEvent from '@testing-library/user-event';

import { ServerFixture1, ServerFixture2 } from './MenuFilterRoot.react17.fixtures';

// Port note: Solid ids use the native hydration allocator; no React 17 module mock applies.
describe('<Menu.FilterProvider><Menu.Root/></Menu.FilterProvider> with the React 17 id fallback', () => {
  it('omits partial ids during SSR and wires relationships after hydration', async () => {
    const { hydrate } = await renderToString(ServerFixture1);
    expect(document.querySelector('[id*="undefined"]')).toBe(null);
    hydrate();
    const trigger = screen.getByRole('button', { name: 'Actions' });
    const popup = screen.getByRole('dialog');
    const input = screen.getByRole('searchbox', { name: 'Filter actions' });
    const list = screen.getByRole('menu');
    const item = screen.getByRole('menuitem', { name: 'Rename' });
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-controls', popup.id);
    });
    expect(input).toHaveAttribute('aria-controls', list.id);
    // Ids come from the fallback counter, which proves `React.useId` really is unavailable here.
    expect(item.id).toMatch(/^base-ui-/);
  });
  it('registers a submenu trigger after fallback ids resolve', async () => {
    const { hydrate } = await renderToString(ServerFixture2);
    hydrate();
    const user = userEvent.setup();
    const input = screen.getByRole('searchbox', { name: 'Filter actions' });
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
    await user.keyboard('[ArrowDown][ArrowRight]');
    const trigger = screen.getByRole('menuitem', { name: 'More actions' });
    const popup = await screen.findByRole('dialog', { name: 'More actions' });
    await waitFor(() => {
      expect(screen.getByRole('searchbox', { name: 'Filter more actions' })).toHaveFocus();
    });
    expect(trigger.id).toMatch(/^base-ui-/);
    expect(trigger).toHaveAttribute('aria-controls', popup.id);
  });
});

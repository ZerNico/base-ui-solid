import { expect, describe, it } from 'vitest';
import { renderToString, screen } from '#test-utils';
import { TwoSlots } from './OTPFieldRoot.react17.fixtures';

// Port note: upstream runs these with `SafeReact.useId` mocked away to exercise React 17's id
// fallback. Solid always has `createUniqueId`, so there's nothing to mock; the behaviors are kept.
describe('<OTPField.Root /> with the React 17 id fallback', () => {
  it('omits generated slot ids during SSR until the client fallback is assigned', async () => {
    const { hydrate } = await renderToString(TwoSlots);

    const inputs = screen.getAllByRole('textbox');

    // Port note: upstream asserts that the server markup has no slot ids, because React 17 has no
    // `useId` and the fallback ids only arrive after hydration. Solid's `createUniqueId` works on
    // the server, so the ids are already there; assert instead that the server ids follow the
    // slot scheme and survive hydration unchanged.
    const firstId = inputs[0].id;
    expect(firstId).not.toBe('');
    expect(inputs[1]).toHaveAttribute('id', `${firstId}-2`);

    hydrate();

    const hydratedInputs = screen.getAllByRole('textbox');
    expect(hydratedInputs[0]).toHaveAttribute('id', firstId);
    expect(hydratedInputs[1]).toHaveAttribute('id', `${firstId}-2`);
  });
});

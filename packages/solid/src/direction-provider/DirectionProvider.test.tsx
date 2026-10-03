import { expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { DirectionProvider, useDirection } from '../direction-provider';
import type { TextDirection } from '../direction-provider';
import { render, screen } from '#test-utils';

function DirectionProbe() {
  // Port note: `useDirection()` returns an accessor.
  const direction = useDirection();
  return <span data-testid="direction">{direction()}</span>;
}

function DirectionProviderTest(props: { direction?: TextDirection }) {
  return (
    <DirectionProvider direction={props.direction}>
      <DirectionProbe />
    </DirectionProvider>
  );
}

describe('<DirectionProvider />', () => {
  it('defaults useDirection to ltr outside a provider', async () => {
    await render(() => <DirectionProbe />);

    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });

  it('provides the configured direction to descendants', async () => {
    const [direction, setDirection] = createSignal<TextDirection>('rtl');
    await render(() => <DirectionProviderTest direction={direction()} />);

    expect(screen.getByTestId('direction')).toHaveTextContent('rtl');

    setDirection('ltr');
    flush();

    expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
  });
});

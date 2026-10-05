import { describe, it, expect } from 'vitest';
import { Portal } from '@solidjs/web';
import { within } from '@solidjs/testing-library';
import { render, describeConformance, screen } from '#test-utils';
import { Slider } from '..';
import { Field } from '../../field';

describe('<Slider.Label />', () => {
  describeConformance(Slider.Label, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Slider.Root defaultValue={50}>
        {node()}
        <Slider.Control>
          <Slider.Thumb />
        </Slider.Control>
      </Slider.Root>
    ),
  });

  it('focuses the registered thumb when composed within a Field', async () => {
    const { user } = await render(() => (
      <Field.Root>
        <Slider.Root defaultValue={50}>
          <Slider.Label data-testid="label">Volume</Slider.Label>
          <Slider.Control>
            <input aria-label="Unrelated range" type="range" />
            <Slider.Thumb />
          </Slider.Control>
        </Slider.Root>
      </Field.Root>
    ));

    await user.click(screen.getByTestId('label'));

    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveFocus();
    expect(screen.getByRole('slider', { name: 'Unrelated range' })).not.toHaveFocus();
  });

  it('focuses the thumb in its shadow root when the outer document has a matching ID', async () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);
    document.body.appendChild(host);

    try {
      // Port note: `ReactDOM.createPortal` -> Solid's `<Portal mount>`.
      const { user, unmount } = await render(() => (
        <>
          <input aria-label="Unrelated control" />
          <Portal mount={container}>
            <Field.Root>
              <Slider.Root defaultValue={50}>
                <Slider.Label>Volume</Slider.Label>
                <Slider.Control>
                  <Slider.Thumb />
                </Slider.Control>
              </Slider.Root>
            </Field.Root>
          </Portal>
        </>
      ));

      try {
        const thumb = within(container).getByRole('slider', { name: 'Volume' });
        const unrelatedControl = screen.getByRole('textbox', { name: 'Unrelated control' });
        expect(thumb.id).not.toBe('');
        unrelatedControl.id = thumb.id;

        await user.click(within(container).getByText('Volume'));

        expect(shadowRoot.activeElement).toBe(thumb);
        expect(unrelatedControl).not.toHaveFocus();
      } finally {
        unmount();
      }
    } finally {
      host.remove();
    }
  });

  it('does nothing when a Field slider has no thumb to focus', async () => {
    const { user } = await render(() => (
      <Field.Root>
        <Slider.Root defaultValue={50}>
          <Slider.Label data-testid="label">Volume</Slider.Label>
          <Slider.Control />
        </Slider.Root>
      </Field.Root>
    ));

    await user.click(screen.getByTestId('label'));

    expect(document.body).toHaveFocus();
  });
});

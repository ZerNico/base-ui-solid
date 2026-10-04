import { createSignal, flush } from 'solid-js';
import { it, expect } from 'vitest';
import { render, screen } from '#test-utils';
import { Slider } from '..';

// Port note: regressions for reactive Solid props and owner lifecycle, absent upstream.
it('updates the explicit thumb id and keeps the generated fallback stable', async () => {
  const [id, setId] = createSignal<string | undefined>();
  await render(() => (
    <Slider.Root defaultValue={50}>
      <Slider.Control>
        <Slider.Thumb id={id()} data-testid="thumb" />
      </Slider.Control>
    </Slider.Root>
  ));
  const thumb = screen.getByTestId('thumb');
  const fallback = thumb.id;
  setId('before');
  flush();
  expect(thumb.id).toBe('before');
  setId('after');
  flush();
  expect(thumb.id).toBe('after');
  setId(undefined);
  flush();
  expect(thumb.id).toBe(fallback);
});

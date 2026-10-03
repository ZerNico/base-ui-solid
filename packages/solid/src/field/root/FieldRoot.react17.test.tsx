import { createSignal } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { Field } from '..';
import { fireEvent, render, screen, waitFor } from '#test-utils';

// Port note: upstream runs these with `SafeReact.useId` mocked away to exercise React 17's id
// fallback. Solid always has `createUniqueId`, so there's nothing to mock; the behaviors are kept.
describe('<Field.Root /> with the React 17 id fallback', () => {
  it('falls back to a generated id when an explicit control id is removed', async () => {
    function TestCase() {
      const [explicit, setExplicit] = createSignal(true);

      return (
        <>
          <Field.Root>
            <Field.Label data-testid="label">Label</Field.Label>
            <Field.Control id={explicit() ? 'custom' : undefined} />
          </Field.Root>
          <button type="button" onClick={() => setExplicit(false)}>
            clear
          </button>
        </>
      );
    }

    await render(() => <TestCase />);

    await waitFor(() => {
      expect(screen.getByTestId('label')).toHaveAttribute('for', 'custom');
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('textbox').id).not.toBe('custom');
    });

    const control = screen.getByRole('textbox');

    expect(control.id).not.toBe('');
    expect(screen.getByTestId('label')).toHaveAttribute('for', control.id);
  });

  it('allows mount-time imperative validation before the fallback id is assigned', async () => {
    function TestCase() {
      const actionsRef: { current: Field.Root.Actions | null } = { current: null };

      useIsoLayoutEffect(
        () => {
          actionsRef.current?.validate();
        },
        () => [],
      );

      return (
        <Field.Root actionsRef={actionsRef} validate={() => 'Mount-time error'}>
          <Field.Error />
        </Field.Root>
      );
    }

    await render(() => <TestCase />);

    expect(await screen.findByText('Mount-time error')).toBeVisible();
  });

  it('reports label mismatches without the owner-stack API', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(() => (
        <Field.Root>
          <Field.Label render="div">Label</Field.Label>
        </Field.Root>
      ));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('<Field.Label> expected a <label> element'),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('reports non-native label mismatches without the owner-stack API', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await render(() => (
        <Field.Root>
          <Field.Label nativeLabel={false}>Label</Field.Label>
        </Field.Root>
      ));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('<Field.Label> expected a non-<label> element'),
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});

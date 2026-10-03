import { expect, describe } from 'vitest';
import { Show, createSignal } from 'solid-js';
import { flushMicrotasks, render, renderToString, screen, waitFor } from '#test-utils';
import { Checkbox } from '..';
import { CheckboxGroup } from '../../checkbox-group';
import { Field } from '../../field';
import { FieldItemCheckbox } from './CheckboxRoot.react17.fixtures';

// Port note: upstream runs these with `SafeReact.useId` mocked away to exercise React 17's id
// fallback. Solid always has `createUniqueId`, so there's nothing to mock; the behaviors are kept.
describe('<Checkbox.Root /> with the React 17 id fallback', () => {
  function TestCase(props: { checkboxId?: string | undefined; nativeButton: boolean }) {
    return (
      <Field.Root>
        <Field.Label data-testid="label">Label</Field.Label>
        <Checkbox.Root
          id={props.checkboxId}
          nativeButton={props.nativeButton}
          render={props.nativeButton ? 'button' : undefined}
        />
      </Field.Root>
    );
  }

  function getLabelControl(nativeButton: boolean) {
    return nativeButton
      ? screen.getByRole('checkbox')
      : document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  }

  it.each([false, true])(
    'drops an explicit id when the prop is removed (nativeButton=%s)',
    async (nativeButton) => {
      const [checkboxId, setCheckboxId] = createSignal<string | undefined>('explicit');
      await render(() => <TestCase checkboxId={checkboxId()} nativeButton={nativeButton} />);

      setCheckboxId(undefined);
      await flushMicrotasks();

      const control = getLabelControl(nativeButton);
      expect(control.id).not.toBe('');
      expect(control).not.toHaveAttribute('id', 'explicit');
      expect(screen.getByTestId('label')).toHaveAttribute('for', control.id);
    },
  );

  it.each([false, true])(
    'does not reuse an unmounted Checkbox id for a keyed id-less Checkbox (nativeButton=%s)',
    async (nativeButton) => {
      // Port note: React's `key` change remounts the checkbox; a keyed `<Show>` does the same.
      const [checkboxKey, setCheckboxKey] = createSignal<'explicit' | 'generated'>('explicit');
      await render(() => (
        <Show when={checkboxKey()} keyed>
          {(key) => (
            <TestCase
              checkboxId={key === 'explicit' ? 'explicit' : undefined}
              nativeButton={nativeButton}
            />
          )}
        </Show>
      ));

      setCheckboxKey('generated');
      await flushMicrotasks();

      const control = getLabelControl(nativeButton);
      expect(control.id).not.toBe('');
      expect(control).not.toHaveAttribute('id', 'explicit');
      expect(screen.getByTestId('label')).toHaveAttribute('for', control.id);
    },
  );

  it.each([false, true])(
    'assigns the label association once the fallback ids arrive (nativeButton=%s)',
    async (nativeButton) => {
      const { hydrate } = await renderToString(FieldItemCheckbox, { nativeButton });

      // Port note: upstream asserts that the server markup has no ids at all, because React 17
      // has no `useId` and the fallback ids only arrive after hydration. Solid's
      // `createUniqueId` works on the server, so the ids are already there; assert instead that
      // the server markup doesn't render a dangling association.
      const serverControl = getLabelControl(nativeButton);
      expect(serverControl.id).not.toBe('');
      expect(screen.getByTestId('label')).toHaveAttribute('for', serverControl.id);

      hydrate();

      await waitFor(() => {
        expect(getLabelControl(nativeButton).id).not.toBe('');
      });
      expect(screen.getByTestId('label')).toHaveAttribute('for', getLabelControl(nativeButton).id);
    },
  );

  it.each([false, true])(
    'wires parent aria-controls once the fallback ids are assigned (nativeButton=%s)',
    async (nativeButton) => {
      await render(() => (
        <Field.Root name="apple">
          <CheckboxGroup allValues={['fuji', 'gala']}>
            <Checkbox.Root
              parent
              data-testid="parent"
              nativeButton={nativeButton}
              render={nativeButton ? 'button' : undefined}
            />
            <Checkbox.Root
              value="fuji"
              data-testid="fuji"
              nativeButton={nativeButton}
              render={nativeButton ? 'button' : undefined}
            />
            <Checkbox.Root
              value="gala"
              data-testid="gala"
              nativeButton={nativeButton}
              render={nativeButton ? 'button' : undefined}
            />
          </CheckboxGroup>
        </Field.Root>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('parent')).toHaveAttribute(
          'aria-controls',
          `${screen.getByTestId('fuji').id} ${screen.getByTestId('gala').id}`,
        );
      });
    },
  );
});

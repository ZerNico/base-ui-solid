import { describe, expect, it } from 'vitest';
import { Portal } from '@solidjs/web';
import { within } from '@solidjs/testing-library';
import { Select } from 'base-ui-solid/select';
import { Combobox } from 'base-ui-solid/combobox';
import { Field } from 'base-ui-solid/field';
import { flushMicrotasks, render, screen } from '#test-utils';
import { useLabel } from './useLabel';

describe('useLabel', () => {
  describe.each(['Select.Label', 'Combobox.Label', 'Field.Label'])('%s', (labelType) => {
    function TestControl() {
      if (labelType === 'Combobox.Label') {
        // Port note: `labelType` is fixed per `describe` block, so the early return can't go stale.
        // eslint-disable-next-line solid/components-return-once
        return (
          <Field.Root name="country">
            <Combobox.Root>
              <Combobox.Label>Country</Combobox.Label>
              <Combobox.Trigger id="country">Choose a country</Combobox.Trigger>
              <Combobox.Portal>
                <Combobox.Positioner>
                  <Combobox.Popup>
                    <Combobox.Input aria-label="Search countries" />
                    <Combobox.List>
                      <Combobox.Item value="fr">France</Combobox.Item>
                    </Combobox.List>
                  </Combobox.Popup>
                </Combobox.Positioner>
              </Combobox.Portal>
            </Combobox.Root>
          </Field.Root>
        );
      }

      return (
        <Field.Root name="country">
          {labelType === 'Field.Label' && (
            <Field.Label nativeLabel={false} render="div">
              Country
            </Field.Label>
          )}
          <Select.Root>
            {labelType === 'Select.Label' && <Select.Label>Country</Select.Label>}
            <Select.Trigger id="country">Choose a country</Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.List>
                    <Select.Item value="fr">
                      <Select.ItemText>France</Select.ItemText>
                    </Select.Item>
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </Field.Root>
      );
    }

    it('focuses the trigger without opening the popup in the document', async () => {
      const { user } = await render(() => <TestControl />);
      const trigger = screen.getByRole('combobox', { name: 'Country' });

      await user.click(screen.getByText('Country'));

      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it.each([false, true])(
      'focuses the trigger in its shadow root without opening the popup (outer matching ID: %s)',
      async (outerMatchingId) => {
        const host = document.createElement('div');
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        shadowRoot.appendChild(container);
        document.body.appendChild(host);

        try {
          // Port note: `ReactDOM.createPortal` -> Solid's `<Portal mount>`.
          const { user, unmount } = await render(() => (
            <>
              {outerMatchingId && <input id="country" aria-label="Unrelated control" />}
              <Portal mount={container}>
                <TestControl />
              </Portal>
            </>
          ));

          try {
            const trigger = within(container).getByRole('combobox', { name: 'Country' });

            await user.click(within(container).getByText('Country'));

            expect(shadowRoot.activeElement).toBe(trigger);
            expect(document.activeElement).toBe(host);
            expect(trigger).toHaveAttribute('aria-expanded', 'false');
          } finally {
            unmount();
          }
        } finally {
          host.remove();
        }
      },
    );
  });

  it('preserves native label activation inside a shadow root', async () => {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadowRoot.appendChild(container);
    document.body.appendChild(host);

    try {
      const { user, unmount } = await render(
        () => (
          <Field.Root>
            <Field.Label>Name</Field.Label>
            <Field.Control />
          </Field.Root>
        ),
        { container },
      );

      try {
        const control = within(container).getByRole('textbox', { name: 'Name' });

        await user.click(within(container).getByText('Name'));

        expect(shadowRoot.activeElement).toBe(control);
      } finally {
        unmount();
      }
    } finally {
      host.remove();
    }
  });

  it('does not focus the control when a composed click originates inside a nested button', async () => {
    function Test() {
      const labelProps = useLabel({ fallbackControlId: () => 'control' });
      const hostRef = (host: HTMLSpanElement) => {
        if (host && !host.shadowRoot) {
          const target = document.createElement('span');
          target.dataset.testid = 'shadow-target';
          host.attachShadow({ mode: 'open' }).appendChild(target);
        }
      };

      return (
        <>
          <div {...labelProps()}>
            Label
            <button type="button">
              Action
              <span ref={hostRef} />
            </button>
          </div>
          <input id="control" />
        </>
      );
    }

    await render(() => <Test />);

    const button = screen.getByRole('button');
    const target = button.querySelector('span')?.shadowRoot?.querySelector('span');
    const control = screen.getByRole('textbox');

    expect(target).not.toBeNull();

    target?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await flushMicrotasks();

    expect(control).not.toHaveFocus();
  });
});

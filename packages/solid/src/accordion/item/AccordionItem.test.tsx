import { expect, describe, it } from 'vitest';
import { render, screen, describeConformance, isJSDOM } from '#test-utils';
import { Accordion } from '..';

describe('<Accordion.Item />', () => {
  it('throws when rendered outside an Accordion.Root', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Accordion.Item />)).rejects.toThrow(
        'Base UI: AccordionRootContext is missing. Accordion parts must be placed within <Accordion.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describeConformance(Accordion.Item, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Accordion.Root>{node()}</Accordion.Root>,
  });

  describe('state', () => {
    it.skipIf(isJSDOM)(
      'does not report hidden=true after the item has started opening',
      async () => {
        const renderSpy = vi.fn();
        const { user } = await render(() => (
          <Accordion.Root>
            <Accordion.Item
              render={(props, state) => {
                // Solid calls the render function once; record each state change reactively.
                return (
                  <>
                    {(renderSpy({ open: state.open, hidden: state.hidden }), null)}
                    <div {...props} />
                  </>
                );
              }}
            >
              <Accordion.Header>
                <Accordion.Trigger>Trigger</Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel>Panel</Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        ));

        await user.click(screen.getByRole('button', { name: 'Trigger' }));

        expect(renderSpy.mock.calls.some(([state]) => state.open === true)).toBe(true);
        expect(
          renderSpy.mock.calls.some(([state]) => state.open === true && state.hidden === true),
        ).toBe(false);
      },
    );
  });
});

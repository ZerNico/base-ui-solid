import { Accordion } from '..';
import {
  render,
  describeConformance,
} from '#test-utils';

describe('<Accordion.Header />', () => {
  it('throws when rendered outside an Accordion.Item', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      await expect(render(() => <Accordion.Header />)).rejects.toThrow(
        'Base UI: AccordionItemContext is missing. Accordion parts must be placed within <Accordion.Item>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  describeConformance(Accordion.Header, {
    refInstanceof: window.HTMLHeadingElement,
    wrap: (node) => (
      <Accordion.Root>
        <Accordion.Item>{node()}</Accordion.Item>
      </Accordion.Root>
    ),
  });
});

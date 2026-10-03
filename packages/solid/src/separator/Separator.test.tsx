import { Separator } from '.';
import { render, screen, describeConformance } from '#test-utils';

describe('<Separator />', () => {
  describeConformance(Separator, {
    refInstanceof: window.HTMLDivElement,
  });

  it('renders a div with the `separator` role', async () => {
    await render(() => <Separator />);
    expect(screen.getByRole('separator')).toBeVisible();
  });

  describe('prop: orientation', () => {
    ['horizontal', 'vertical'].forEach((orientation) => {
      it(orientation, async () => {
        await render(() => (
          <Separator orientation={orientation as Separator.Props['orientation']} />
        ));

        expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', orientation);
      });
    });
  });
});

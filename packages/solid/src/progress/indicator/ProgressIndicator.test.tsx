import { describe, it, expect } from 'vitest';
import { render, describeConformance, isJSDOM, screen } from '#test-utils';
import { Progress } from '..';

describe('<Progress.Indicator />', () => {
  describeConformance(Progress.Indicator, {
    wrap: (node) => <Progress.Root value={40}>{node()}</Progress.Root>,
    refInstanceof: window.HTMLDivElement,
  });

  describe.skipIf(isJSDOM)('internal styles', () => {
    it('determinate', async () => {
      await render(() => (
        <Progress.Root value={33}>
          <Progress.Track>
            {/* Port note: `render={<span />}` (React element) is unsupported; a tag name is used. */}
            <Progress.Indicator data-testid="indicator" render="span" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({
        insetInlineStart: '0px',
        width: '33%',
      });
    });

    it('sets zero width when value is 0', async () => {
      await render(() => (
        <Progress.Root value={0}>
          <Progress.Track>
            <Progress.Indicator data-testid="indicator" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({
        insetInlineStart: '0px',
        width: '0px',
      });
    });

    it('indeterminate', async () => {
      await render(() => (
        <Progress.Root value={null}>
          <Progress.Track>
            <Progress.Indicator data-testid="indicator" />
          </Progress.Track>
        </Progress.Root>
      ));

      const indicator = screen.getByTestId('indicator');

      expect(indicator).toHaveComputedStyle({});
    });
  });
});

import { expect, describe, it } from 'vitest';
import { render, screen, describeConformance } from '#test-utils';
import { Toolbar } from '..';
import { NOOP } from '../../internals/noop';
import { ToolbarRootContext } from '../root/ToolbarRootContext';
import { CompositeRootContext } from '../../internals/composite/root/CompositeRootContext';

// Port note: Solid context values hold accessors.
const testCompositeContext: CompositeRootContext = {
  highlightedIndex: () => 0,
  onHighlightedIndexChange: NOOP,
  highlightItemOnHover: () => false,
  relayKeyboardEvent: NOOP,
};

const testToolbarContext: ToolbarRootContext = {
  disabled: () => false,
  orientation: () => 'horizontal',
};

describe('<Toolbar.Link />', () => {
  describeConformance(Toolbar.Link, {
    refInstanceof: window.HTMLAnchorElement,
    wrap: (node) => (
      <ToolbarRootContext value={testToolbarContext}>
        <CompositeRootContext value={testCompositeContext}>{node()}</CompositeRootContext>
      </ToolbarRootContext>
    ),
  });

  describe('ARIA attributes', () => {
    it('renders an anchor', async () => {
      await render(() => (
        <Toolbar.Root>
          <Toolbar.Link data-testid="link" href="https://base-ui.com" />
        </Toolbar.Root>
      ));

      expect(screen.getByTestId('link')).toBe(screen.getByRole('link'));
    });
  });
});

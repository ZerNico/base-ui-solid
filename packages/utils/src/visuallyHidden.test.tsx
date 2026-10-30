import { expect, describe, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { isJSDOM } from './testUtils';
import { visuallyHidden, visuallyHiddenInputPinned } from './visuallyHidden';

describe.skipIf(isJSDOM)('visuallyHidden', () => {
  describe.each([
    { name: 'visuallyHidden', style: visuallyHidden },
    { name: 'visuallyHiddenInputPinned', style: visuallyHiddenInputPinned },
  ])('$name', ({ style }) => {
    it.each([
      ['ltr', 'ltr'],
      ['ltr', 'rtl'],
      ['rtl', 'ltr'],
      ['rtl', 'rtl'],
    ] as Array<['ltr' | 'rtl', 'ltr' | 'rtl']>)(
      'does not overflow a %s scroller with %s content',
      async (scrollerDirection, contentDirection) => {
        render(() => (
          <div
            data-testid="scroller"
            dir={scrollerDirection}
            style={{ width: '100px', height: '100px', overflow: 'auto' }}
          >
            {/* Establish a fixed-position containing block below the scroller's top edge. */}
            <div dir={contentDirection} style={{ transform: 'translateY(20px)' }}>
              <input type="radio" style={style} />
            </div>
          </div>
        ));

        const scroller = screen.getByTestId('scroller');
        expect(scroller.scrollWidth).toBe(scroller.clientWidth);
      },
    );

    // Label clicks and native validation focus hidden inputs.
    it('does not scroll the page when focused', async ({ onTestFinished }) => {
      onTestFinished(() => window.scrollTo(0, 0));
      render(() => (
        <div style={{ 'padding-top': '2000px', height: '5000px' }}>
          <input type="checkbox" data-testid="input" style={style} />
        </div>
      ));
      window.scrollTo(0, 1500);
      expect(window.scrollY).toBe(1500);

      screen.getByTestId('input').focus();
      expect(window.scrollY).toBe(1500);
    });
  });

  it('places visuallyHidden just above the viewport', async () => {
    render(() => <span data-testid="hidden" style={visuallyHidden} />);
    expect(screen.getByTestId('hidden').getBoundingClientRect().bottom).toBe(0);
  });
});

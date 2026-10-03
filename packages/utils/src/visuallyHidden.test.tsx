import { expect, describe, it } from 'vitest';
import type { JSX } from '@solidjs/web';
import { render, screen } from '@solidjs/testing-library';
import { isJSDOM } from './testUtils';
import { visuallyHidden } from './visuallyHidden';

describe.skipIf(isJSDOM)('visuallyHidden', () => {
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
            <input type="radio" style={visuallyHidden as JSX.CSSProperties} />
          </div>
        </div>
      ));

      const scroller = screen.getByTestId('scroller');
      expect(scroller.scrollWidth).toBe(scroller.clientWidth);
    },
  );
});

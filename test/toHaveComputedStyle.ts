import { expect } from 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match Vitest's Matchers signature for declaration merging
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    /**
     * Port of `@mui/internal-test-utils`' `toHaveComputedStyle` chai assertion: checks that the
     * element's computed style matches every given (camelCase) property.
     */
    toHaveComputedStyle(expectedStyle: Record<string, string>): R;
  }
}

function hyphenate(property: string) {
  return property.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

expect.extend({
  toHaveComputedStyle(element: Element, expectedStyle: Record<string, string>) {
    if (element?.nodeType !== 1) {
      return {
        pass: false,
        message: () => `Expected an Element but got ${String(element)}`,
      };
    }

    const computedStyle = element.ownerDocument.defaultView!.getComputedStyle(element);
    const actualStyle: Record<string, string> = {};
    Object.keys(expectedStyle).forEach((property) => {
      actualStyle[property] = computedStyle.getPropertyValue(hyphenate(property));
    });

    const pass = this.equals(actualStyle, expectedStyle);
    return {
      pass,
      message: () =>
        `Expected computed style ${pass ? 'not ' : ''}to match:\n` +
        `${this.utils.diff(expectedStyle, actualStyle)}`,
      actual: actualStyle,
      expected: expectedStyle,
    };
  },
});

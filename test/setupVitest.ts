import { afterEach, beforeAll, vi } from 'vitest';
// eslint-disable-next-line import/no-relative-packages
import '../packages/solid/test/addVitestMatchers';
import '@testing-library/jest-dom/vitest';
import './toHaveComputedStyle';
import './toBeInaccessible';

declare global {
  // eslint-disable-next-line vars-on-top
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

// Port note: mirrors upstream's `test/setupVitest.ts`. `@mui/internal-test-utils/setupVitest`
// (React-specific) has no counterpart; `@solidjs/testing-library` cleans up after each test.
let resetError = () => {};
let resetAnimationFrameScheduler = () => {};

beforeAll(async () => {
  // eslint-disable-next-line import/no-relative-packages
  ({ reset: resetError } = await import('../packages/utils/src/error'));
  ({ resetAnimationFrameScheduler } = await import(
    // eslint-disable-next-line import/no-relative-packages
    '../packages/utils/src/useAnimationFrame'
  ));
});

afterEach(() => {
  vi.resetAllMocks();
  globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  resetError();
  // Drop animation frame callbacks that were scheduled but never ran (e.g. under fake timers torn
  // down before the frame fired). The scheduler is process-global, so without this they would leak
  // into a later test and run there against stale state.
  resetAnimationFrameScheduler();
});

globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

if (typeof window !== 'undefined' && window?.navigator?.userAgent?.includes('jsdom')) {
  globalThis.requestAnimationFrame = (cb) => {
    setTimeout(() => cb(0), 0);
    return 0;
  };

  // Port note: mirrors `@mui/internal-test-utils/setupVitest`.
  // Not yet supported: https://github.com/jsdom/jsdom/issues/2152
  (globalThis as any).window.Touch ??= class Touch {
    declare instance: any;

    constructor(instance: any) {
      this.instance = instance;
    }

    get identifier() {
      return this.instance.identifier;
    }

    get pageX() {
      return this.instance.pageX;
    }

    get pageY() {
      return this.instance.pageY;
    }

    get clientX() {
      return this.instance.clientX;
    }

    get clientY() {
      return this.instance.clientY;
    }
  };
}

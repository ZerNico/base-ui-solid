import { Errored, untrack } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { PreviewCard } from 'base-ui-solid/preview-card';
import { createRenderer, describeConformance, screen } from '#test-utils';

describe('<PreviewCard.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(PreviewCard.Popup, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <PreviewCard.Root open>
        <PreviewCard.Portal>
          <PreviewCard.Positioner>{node()}</PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <PreviewCard.Root>', async () => {
    // Port note: capture the intentional error with Solid's error boundary so the reactive
    // scheduler stays live, then assert the same upstream exception.
    let caughtError: unknown;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = untrack(error);
          return null;
        }}
      >
        <PreviewCard.Popup />
      </Errored>
    ));
    expect(() => {
      throw caughtError;
    }).toThrow(
      'Base UI: PreviewCardRootContext is missing. PreviewCard parts must be placed within <PreviewCard.Root>.',
    );
  });

  it('throws a descriptive error when rendered outside <PreviewCard.Positioner>', async () => {
    // Port note: capture the intentional error with Solid's error boundary so the reactive
    // scheduler stays live, then assert the same upstream exception.
    let caughtError: unknown;
    await render(() => (
      <Errored
        fallback={(error) => {
          caughtError = untrack(error);
          return null;
        }}
      >
        <PreviewCard.Root open>
          <PreviewCard.Portal>
            <PreviewCard.Popup />
          </PreviewCard.Portal>
        </PreviewCard.Root>
      </Errored>
    ));
    expect(() => {
      throw caughtError;
    }).toThrow(
      'Base UI: PreviewCardPositionerContext is missing. PreviewCardPositioner parts must be placed within <PreviewCard.Positioner>.',
    );
  });

  it('should render the children', async () => {
    await render(() => (
      <PreviewCard.Root open>
        <PreviewCard.Portal>
          <PreviewCard.Positioner>
            <PreviewCard.Popup>Content</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ));

    expect(screen.getByText('Content')).not.toBe(null);
  });
});

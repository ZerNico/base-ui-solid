import { Errored, untrack } from 'solid-js';
import { expect, describe, it } from 'vitest';
import { PreviewCard } from 'base-ui-solid/preview-card';
import { createRenderer, describeConformance, viewportConformanceTests } from '#test-utils';

describe('<PreviewCard.Viewport />', () => {
  const { render } = createRenderer();

  describeConformance(PreviewCard.Viewport, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <PreviewCard.Root open>
        <PreviewCard.Trigger>Trigger</PreviewCard.Trigger>
        <PreviewCard.Portal>
          <PreviewCard.Positioner>
            <PreviewCard.Popup>{node()}</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ),
  });

  viewportConformanceTests({
    render,
    openOn: 'focus',
    createComponent: (props) => (
      <PreviewCard.Root {...props.root}>
        {({ payload }) => (
          <>
            {props.triggers.map((trigger) => (
              <PreviewCard.Trigger href="#" delay={0} {...trigger} />
            ))}
            <PreviewCard.Portal {...props.portal}>
              <PreviewCard.Positioner {...props.positioner}>
                <PreviewCard.Popup {...props.popup}>
                  <PreviewCard.Viewport {...props.viewport}>
                    {props.renderContent(payload)}
                  </PreviewCard.Viewport>
                </PreviewCard.Popup>
              </PreviewCard.Positioner>
            </PreviewCard.Portal>
          </>
        )}
      </PreviewCard.Root>
    ),
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
            <PreviewCard.Viewport />
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
});

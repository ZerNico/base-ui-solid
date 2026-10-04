import { describe } from 'vitest';
import { PreviewCard } from 'base-ui-solid/preview-card';
import { createRenderer, describeConformance } from '#test-utils';

describe('<PreviewCard.Arrow />', () => {
  createRenderer();

  describeConformance(PreviewCard.Arrow, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <PreviewCard.Root open>
        <PreviewCard.Portal>
          <PreviewCard.Positioner>
            <PreviewCard.Popup>{node()}</PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    ),
  });
});

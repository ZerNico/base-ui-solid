import { describe } from 'vitest';
import { PreviewCard } from 'base-ui-solid/preview-card';
import { createRenderer, describeConformance } from '#test-utils';

describe('<PreviewCard.Portal />', () => {
  createRenderer();

  describeConformance(
    (props: PreviewCard.Portal.Props) => <PreviewCard.Portal keepMounted {...props} />,
    {
      refInstanceof: window.HTMLDivElement,
      wrap: (node) => <PreviewCard.Root open>{node()}</PreviewCard.Root>,
    },
  );
});

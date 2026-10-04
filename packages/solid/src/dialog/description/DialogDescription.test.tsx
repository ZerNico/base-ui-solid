import { describe } from 'vitest';
import { Dialog } from 'base-ui-solid/dialog';
import { describeConformance } from '#test-utils';

describe('<Dialog.Description />', () => {
  describeConformance(Dialog.Description, {
    refInstanceof: window.HTMLParagraphElement,
    wrap: (node) => (
      <Dialog.Root open modal={false}>
        <Dialog.Portal>
          <Dialog.Popup>{node()}</Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  });
});

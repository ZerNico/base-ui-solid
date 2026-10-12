import { describe } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance } from '#test-utils';

const toast: Toast.Root.ToastObject = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Description />', () => {
  createRenderer();

  describeConformance(
    (props: Toast.Description.Props) => (
      <Toast.Description {...props}>description</Toast.Description>
    ),
    {
      refInstanceof: window.HTMLParagraphElement,
      wrap: (node) => (
        <Toast.Provider>
          <Toast.Viewport>
            <Toast.Root toast={toast}>{node()}</Toast.Root>
          </Toast.Viewport>
        </Toast.Provider>
      ),
    },
  );
});

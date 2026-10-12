import { describe } from 'vitest';
import { Toast } from 'base-ui-solid/toast';
import { createRenderer, describeConformance } from '#test-utils';

const toast = {
  id: 'test',
  title: 'Toast title',
};

describe('<Toast.Title />', () => {
  createRenderer();

  describeConformance((props: Toast.Title.Props) => <Toast.Title {...props}>title</Toast.Title>, {
    refInstanceof: window.HTMLHeadingElement,
    wrap: (node) => (
      <Toast.Provider>
        <Toast.Viewport>
          <Toast.Root toast={toast}>{node()}</Toast.Root>
        </Toast.Viewport>
      </Toast.Provider>
    ),
  });
});

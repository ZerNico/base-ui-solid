import { createRenderer, screen } from '#test-utils';
import { Drawer } from 'base-ui-solid/drawer';
import { describe, expect, it } from 'vitest';

interface TestCaseProps {
  open: boolean;
}
function TestCase(props: TestCaseProps) {
  return (
    <Drawer.Provider>
      <Drawer.IndentBackground data-testid="bg" />
      <Drawer.Root open={props.open}>
        <Drawer.Trigger>Open</Drawer.Trigger>
      </Drawer.Root>
    </Drawer.Provider>
  );
}
describe('<Drawer.IndentBackground />', () => {
  const { render } = createRenderer();
  it('sets data-active when any drawer is open', async () => {
    const { setProps } = await render((overrides) => <TestCase open={false} {...overrides()} />);
    const background = screen.getByTestId('bg');
    expect(background.getAttribute('data-inactive')).toBe('');
    expect(background.getAttribute('data-active')).toBeNull();
    await setProps({ open: true });
    expect(background.getAttribute('data-active')).toBe('');
    expect(background.getAttribute('data-inactive')).toBeNull();
  });
});

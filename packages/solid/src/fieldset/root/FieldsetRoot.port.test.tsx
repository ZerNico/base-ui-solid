import { expect, describe, it } from 'vitest';
import { CheckboxGroup } from 'base-ui-solid/checkbox-group';
import { Fieldset } from 'base-ui-solid/fieldset';
import { Button } from 'base-ui-solid/button';
import { render, screen } from '#test-utils';

// Port note: regressions for the Forms handbook pattern (absent upstream), which spreads a render
// function's props on another component.
describe('<Fieldset.Root render>', () => {
  it('renders another component with the render function props', async () => {
    await render(() => (
      <Fieldset.Root
        data-testid="group"
        style={{ color: 'red' }}
        render={(props) => <CheckboxGroup {...props} />}
      >
        <Fieldset.Legend>Backup schedule</Fieldset.Legend>
      </Fieldset.Root>
    ));
    const group = screen.getByTestId('group');
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAttribute('aria-labelledby', screen.getByText('Backup schedule').id);
    expect(group.style.color).toBe('red');
  });

  it('treats a false style as no style', async () => {
    await render(() => (
      <>
        <Button data-testid="false" style={false} />
        <Button data-testid="function" style={() => false} />
      </>
    ));
    expect(screen.getByTestId('false')).not.toHaveAttribute('style');
    expect(screen.getByTestId('function')).not.toHaveAttribute('style');
  });
});

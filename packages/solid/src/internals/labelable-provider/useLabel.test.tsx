import { flushMicrotasks, render, screen } from '#test-utils';
import { useLabel } from './useLabel';

describe('useLabel', () => {
  it('does not focus the control when a composed click originates inside a nested button', async () => {
    function Test() {
      const labelProps = useLabel({ fallbackControlId: () => 'control' });
      const hostRef = (host: HTMLSpanElement) => {
        if (host && !host.shadowRoot) {
          const target = document.createElement('span');
          target.dataset.testid = 'shadow-target';
          host.attachShadow({ mode: 'open' }).appendChild(target);
        }
      };

      return (
        <>
          <div {...labelProps()}>
            Label
            <button type="button">
              Action
              <span ref={hostRef} />
            </button>
          </div>
          <input id="control" />
        </>
      );
    }

    await render(() => <Test />);

    const button = screen.getByRole('button');
    const target = button.querySelector('span')?.shadowRoot?.querySelector('span');
    const control = screen.getByRole('textbox');

    expect(target).not.toBeNull();

    target?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    await flushMicrotasks();

    expect(control).not.toHaveFocus();
  });
});

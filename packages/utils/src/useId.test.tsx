import { expect, describe, it } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import { useId } from '@base-ui-solid/utils/useId';
// eslint-disable-next-line import/no-relative-packages
import { renderToString } from '../../solid/test/renderToString';
import { GeneratedIdComponent, TestComponent } from './useId.fixtures';

describe('useId', () => {
  it('returns the provided ID', async () => {
    const { hydrate } = await renderToString(TestComponent, { id: 'some-id' });
    const { setProps } = hydrate();

    expect(screen.getByTestId('target')).toHaveProperty('id', 'some-id');

    setProps({ id: 'another-id' });

    expect(screen.getByTestId('target')).toHaveProperty('id', 'another-id');
  });

  it("generates an ID if one isn't provided", async () => {
    const { hydrate } = await renderToString(TestComponent);
    const { setProps } = hydrate();

    expect(screen.getByTestId('target').id).not.toBe('');

    setProps({ id: 'another-id' });
    expect(screen.getByTestId('target')).toHaveProperty('id', 'another-id');
  });

  it('can be suffixed', () => {
    function Widget() {
      const id = useId();
      const labelId = `${id}-label`;

      return (
        <>
          <span data-testid="labelable" aria-labelledby={labelId} />
          <span data-testid="label" id={labelId}>
            Label
          </span>
        </>
      );
    }
    render(() => <Widget />);

    expect(screen.getByTestId('labelable')).toHaveAttribute(
      'aria-labelledby',
      screen.getByTestId('label').id,
    );
  });

  it('can be used in in IDREF attributes', () => {
    function Widget() {
      const labelPartA = useId();
      const labelPartB = useId();

      return (
        <>
          <span data-testid="labelable" aria-labelledby={`${labelPartA} ${labelPartB}`} />
          <span data-testid="labelA" id={labelPartA}>
            A
          </span>
          <span data-testid="labelB" id={labelPartB}>
            B
          </span>
        </>
      );
    }
    render(() => <Widget />);

    expect(screen.getByTestId('labelable')).toHaveAttribute(
      'aria-labelledby',
      `${screen.getByTestId('labelA').id} ${screen.getByTestId('labelB').id}`,
    );
  });

  // Port note: upstream skips this when `React.useId` is missing (React 17). Solid's
  // `createUniqueId` always works on the server, so it always runs.
  it('provides an ID on server in React 18', async () => {
    await renderToString(GeneratedIdComponent);

    expect(screen.getByTestId('target').id).not.toBe('');
  });

  it('can be prefixed', () => {
    const PREFIX = 'base-ui';
    function Widget() {
      const id = useId(undefined, PREFIX);

      return (
        <>
          <span data-testid="labelable" aria-labelledby={id} />
          <span data-testid="label" id={id}>
            Label
          </span>
        </>
      );
    }
    render(() => <Widget />);

    expect(screen.getByTestId('label').id.slice(0, 8)).toBe(`${PREFIX}-`);
    expect(screen.getByTestId('labelable')).toHaveAttribute(
      'aria-labelledby',
      screen.getByTestId('label').id,
    );
  });
});

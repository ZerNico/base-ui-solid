import { createSignal, flush, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { expect, describe, it } from 'vitest';
import { render, screen } from '#test-utils';
import { useRegisteredLabelId } from './useRegisteredLabelId';

describe('useRegisteredLabelId', () => {
  function Label(props: {
    id: string;
    setLabelId: (
      value: string | undefined | ((prev: string | undefined) => string | undefined),
    ) => void;
    children: JSX.Element;
  }) {
    const registeredId = useRegisteredLabelId(() => props.id, props.setLabelId);
    return <span id={registeredId()}>{props.children}</span>;
  }

  function Test(props: { labels: 'old' | 'both' | 'new' }) {
    const [labelId, setLabelId] = createSignal<string | undefined>();

    return (
      <>
        <div data-testid="target" aria-labelledby={labelId()} />
        <Show when={props.labels !== 'new'}>
          <Label id="old-label" setLabelId={setLabelId}>
            Old
          </Label>
        </Show>
        <Show when={props.labels !== 'old'}>
          <Label id="new-label" setLabelId={setLabelId}>
            New
          </Label>
        </Show>
      </>
    );
  }

  it('does not let an older label cleanup clear a newer label', async () => {
    const [labels, setLabels] = createSignal<'old' | 'both' | 'new'>('old');
    await render(() => <Test labels={labels()} />);

    const target = screen.getByTestId('target');
    expect(target).toHaveAttribute('aria-labelledby', 'old-label');

    setLabels('both');
    flush();
    expect(target).toHaveAttribute('aria-labelledby', 'new-label');

    setLabels('new');
    flush();
    expect(target).toHaveAttribute('aria-labelledby', 'new-label');
  });
});

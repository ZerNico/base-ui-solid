import { createSignal, Show, untrack } from 'solid-js';
import { Tooltip } from '..';
import type { TooltipRoot } from './TooltipRoot';

interface FixtureContext {
  handle: Tooltip.Handle<unknown>;
  onOpenChange?:
    ((open: boolean, eventDetails: TooltipRoot.ChangeEventDetails) => void) | undefined;
}

const contexts = new Map<string, FixtureContext>();

/**
 * Port note: handles and callbacks can't be passed to fixtures as (serializable) props, so the
 * fixtures and the test share them through this registry, keyed by a serializable `fixtureKey`.
 * The server render uses its own module instance, so it gets its own handle.
 */
export function getFixtureContext(fixtureKey: string): FixtureContext {
  let context = contexts.get(fixtureKey);
  if (!context) {
    context = { handle: Tooltip.createHandle() };
    contexts.set(fixtureKey, context);
  }
  return context;
}

export function DefaultOpenDetachedRoot(props: { fixtureKey: string }) {
  const context = getFixtureContext(untrack(() => props.fixtureKey));
  return <Tooltip.Root handle={context.handle} defaultOpen defaultTriggerId="trigger" />;
}

export function DetachedTrigger(props: { fixtureKey: string; id: string; label: string }) {
  const context = getFixtureContext(untrack(() => props.fixtureKey));
  return (
    <Tooltip.Trigger handle={context.handle} id={props.id}>
      {props.label}
    </Tooltip.Trigger>
  );
}

export function ControlledRootWithSwitchableTrigger(props: { fixtureKey: string }) {
  const context = getFixtureContext(untrack(() => props.fixtureKey));
  const [open, setOpen] = createSignal(true);
  const [activeTriggerId, setActiveTriggerId] = createSignal('trigger-a');

  return (
    <>
      <button type="button" onClick={() => setActiveTriggerId('trigger-b')}>
        Switch to B
      </button>
      <Tooltip.Root
        handle={context.handle}
        open={open()}
        triggerId={activeTriggerId()}
        onOpenChange={(nextOpen, eventDetails) => {
          context.onOpenChange?.(nextOpen, eventDetails);
          setOpen(nextOpen);
        }}
      />
      <Show when={activeTriggerId() === 'trigger-a'}>
        <Tooltip.Trigger handle={context.handle} id="trigger-a">
          Trigger A
        </Tooltip.Trigger>
      </Show>
    </>
  );
}

import { Dialog } from '..';

// Port note: the handle can't be passed as a (serializable) prop, so each render creates its own.
export function DetachedTriggerWithDefaultOpenRoot() {
  const handle = Dialog.createHandle();

  return (
    <>
      <Dialog.Root handle={handle} defaultOpen defaultTriggerId="trigger" />
      <Dialog.Trigger handle={handle} id="trigger">
        Trigger
      </Dialog.Trigger>
    </>
  );
}

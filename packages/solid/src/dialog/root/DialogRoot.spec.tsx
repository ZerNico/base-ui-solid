import { expectType } from '#test-utils';
import { Dialog } from 'base-ui-solid/dialog';

const numberPayloadHandle = Dialog.createHandle<number>();

const rootWithDirectChildren = (
  <Dialog.Root handle={numberPayloadHandle}>
    <Dialog.Portal />
  </Dialog.Root>
);

const rootWithFunctionChildren = (
  <Dialog.Root handle={numberPayloadHandle}>
    {({ payload }) => {
      // Port note: `payload` is an accessor.
      expectType<number | undefined, ReturnType<typeof payload>>(payload());
      return null;
    }}
  </Dialog.Root>
);

const triggerWithPayload = <Dialog.Trigger handle={numberPayloadHandle} payload={42} />;
const triggerWithoutPayload = <Dialog.Trigger handle={numberPayloadHandle} />;

const triggerWithInvalidPayload = (
  // @ts-expect-error The handle requires a number payload, not a string.
  <Dialog.Trigger handle={numberPayloadHandle} payload={'invalid'} />
);

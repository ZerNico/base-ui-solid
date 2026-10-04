import { expectType } from '#test-utils';
import { DirectionProvider } from 'base-ui-solid/direction-provider';
import type {
  useDirection,
  DirectionProviderProps,
  TextDirection,
} from 'base-ui-solid/direction-provider';

const direction = null as unknown as ReturnType<typeof useDirection>;

// Port note: the direction hook returns a reactive accessor in Solid.
expectType<TextDirection, ReturnType<typeof direction>>(direction());

const props: DirectionProviderProps = {
  direction: 'rtl',
  children: <div />,
};

expectType<TextDirection | undefined, typeof props.direction>(props.direction);

<DirectionProvider />;
<DirectionProvider direction="ltr" />;
<DirectionProvider direction="rtl" />;

const invalidDirection = (
  // @ts-expect-error
  <DirectionProvider direction="vertical" />
);

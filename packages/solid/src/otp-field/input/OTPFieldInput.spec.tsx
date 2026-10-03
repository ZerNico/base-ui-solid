import { expectType } from '#test-utils';
import { OTPField } from '..';

// @ts-expect-error - slot order is inferred from render order
const noExplicitIndexSupport = <OTPField.Input index={0} />;
void noExplicitIndexSupport;

// `OTPField.Input` exposes the native `<input>` props in its `render` callback.
// Port note: Solid's boolean attributes also accept `''` and use lowercase names (`readonly`).
<OTPField.Input
  render={(props) => {
    expectType<boolean | '' | undefined, typeof props.disabled>(props.disabled);
    expectType<boolean | '' | undefined, typeof props.readonly>(props.readonly);
    return <input {...props} />;
  }}
/>;

import { expectType } from '#test-utils';
import { NumberField } from 'base-ui-solid/number-field';

// `NumberField.Input` exposes the native `<input>` props in its `render` callback.
// Port note: Solid's attribute is `readonly` (React's `readOnly`), and Solid types boolean
// attributes as `boolean | '' | undefined` instead of React's `boolean | undefined`.
<NumberField.Input
  render={(props) => {
    expectType<boolean | '' | undefined, typeof props.disabled>(props.disabled);
    expectType<boolean | '' | undefined, typeof props.readonly>(props.readonly);
    return <input {...props} />;
  }}
/>;

import type { JSX } from '@solidjs/web';
import { expectType } from '#test-utils';
import { Form } from 'base-ui-solid/form';

interface Values {
  name: string;
  age: number;
}

<Form<Values>
  onFormSubmit={(values) => {
    expectType<string, typeof values.name>(values.name);
    expectType<number, typeof values.age>(values.age);
    // @ts-expect-error
    values.email.startsWith('a');
  }}
/>;

// `Form` exposes the native `<form>` props in its `render` callback.
<Form
  render={(props) => {
    // Port note: native Solid form attributes are lowercase and include serializable values.
    expectType<JSX.FormHTMLAttributes<HTMLFormElement>['novalidate'], typeof props.novalidate>(
      props.novalidate,
    );
    return <form {...props} />;
  }}
/>;

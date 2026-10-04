import { createSignal } from 'solid-js';
import { z } from 'zod';
import { Field } from 'base-ui-solid/field';
import { Form } from 'base-ui-solid/form';
import { Button } from 'base-ui-solid/button';
import styles from './index.module.css';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.coerce.number('Age must be a number').positive('Age must be a positive number'),
});

async function submitForm(formValues: Form.Values) {
  const result = schema.safeParse(formValues);

  if (!result.success) {
    return {
      errors: z.flattenError(result.error).fieldErrors,
    };
  }

  return {
    errors: {},
  };
}

export default function Page() {
  const [errors, setErrors] = createSignal({});

  return (
    <Form
      class={styles.Form}
      errors={errors()}
      onFormSubmit={async (formValues) => {
        const response = await submitForm(formValues);
        setErrors(response.errors);
      }}
    >
      <Field.Root name="name" class={styles.Field}>
        <Field.Label class={styles.Label}>Name</Field.Label>
        <Field.Control placeholder="Enter name" class={styles.Input} />
        <Field.Error class={styles.Error} />
      </Field.Root>
      <Field.Root name="age" class={styles.Field}>
        <Field.Label class={styles.Label}>Age</Field.Label>
        <Field.Control placeholder="Enter age" class={styles.Input} />
        <Field.Error class={styles.Error} />
      </Field.Root>
      <Button type="submit" class={styles.Button}>
        Submit
      </Button>
    </Form>
  );
}

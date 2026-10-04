import { createSignal } from 'solid-js';
import { Field } from 'base-ui-solid/field';
import { Form } from 'base-ui-solid/form';
import { Button } from 'base-ui-solid/button';
import styles from './index.module.css';

interface FormState {
  serverErrors?: Form.Props['errors'];
}

export default function ActionStateForm() {
  const [state, setState] = createSignal<FormState>({});
  const [loading, setLoading] = createSignal(false);
  async function formAction(event: SubmitEvent) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setLoading(true);
    try {
      setState(await submitForm(state(), data));
    } finally {
      setLoading(false);
      // React resets a form passed to `action` once the action completes.
      form.reset();
    }
  }

  return (
    <Form errors={state().serverErrors} onSubmit={formAction} class={styles.Form}>
      <Field.Root name="username" class={styles.Field}>
        <Field.Label class={styles.Label}>Username</Field.Label>
        <Field.Control
          type="text"
          autocomplete="username"
          required
          defaultValue="admin"
          placeholder="e.g. alice132"
          class={styles.Input}
        />
        <Field.Error class={styles.Error} />
      </Field.Root>
      <Button type="submit" disabled={loading()} focusableWhenDisabled class={styles.Button}>
        Submit
      </Button>
    </Form>
  );
}

// Mark this as a Server Function with `'use server'` in a supporting framework like Next.js
async function submitForm(_previousState: FormState, formData: FormData) {
  // Mimic a server response
  await new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  try {
    const username = formData.get('username') as string | null;

    if (username === 'admin') {
      return { success: false, serverErrors: { username: "'admin' is reserved for system use" } };
    }

    // 50% chance the username is taken
    const success = Math.random() > 0.5;

    if (!success) {
      return {
        serverErrors: { username: `${username} is unavailable` },
      };
    }
  } catch {
    return { serverErrors: { username: 'A server error has occurred' } };
  }

  return {};
}

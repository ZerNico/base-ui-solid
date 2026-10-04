import { Field } from 'base-ui-solid/field';
import styles from './Input.module.css';

export default function InputValidateOnChange() {
  return (
    <Field.Root
      validationMode="onChange"
      validate={(val) => (val === 'abcd' ? 'custom error' : null)}
      class={styles.Root}
    >
      <Field.Control required minlength={3} defaultValue="" class={styles.Control} />
      <Field.Error data-testid="error" class={styles.Error} match="valueMissing">
        valueMissing error
      </Field.Error>
      <Field.Error data-testid="error" class={styles.Error} match="tooShort">
        tooShort error
      </Field.Error>
      <Field.Error data-testid="error" class={styles.Error} match="customError" />
    </Field.Root>
  );
}

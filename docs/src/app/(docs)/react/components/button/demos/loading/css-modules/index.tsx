// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { createSignal, createUniqueId } from 'solid-js';
import { Button } from 'base-ui-solid/button';
import styles from './index.module.css';

export default function ExampleButton() {
  const [loading, setLoading] = createSignal(false);
  const labelId = createUniqueId();

  return (
    <Button
      class={styles.Button}
      disabled={loading()}
      focusableWhenDisabled
      aria-labelledby={labelId}
      onClick={() => {
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
        }, 4000);
      }}
    >
      <span id={labelId}>{loading() ? 'Submitting' : 'Submit'}</span>
    </Button>
  );
}

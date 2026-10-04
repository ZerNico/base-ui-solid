// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.
import { Input } from 'base-ui-solid/input';
import styles from './index.module.css';

export default function ExampleInput() {
  return (
    <label class={styles.Label}>
      Name
      <Input placeholder="e.g. Colm Tuite" class={styles.Input} />
    </label>
  );
}

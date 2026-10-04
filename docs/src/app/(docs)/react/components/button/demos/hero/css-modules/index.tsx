// Port note: Solid primitives, native attributes/events, and reactive accessors replace React APIs.

import { Button } from 'base-ui-solid/button';
import styles from './index.module.css';

export default function ExampleButton() {
  return <Button class={styles.Button}>Submit</Button>;
}

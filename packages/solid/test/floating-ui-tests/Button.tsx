import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import styles from './Button.module.css';

/** @internal */
export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  // Port note: Solid's class array replaces `clsx`; the `ref` is forwarded with the other props.
  return (
    // eslint-disable-next-line react/button-has-type
    <button {...omit(props, 'class')} class={[props.class, styles.Button]} />
  );
}

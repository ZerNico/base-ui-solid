import type { JSX } from '@solidjs/web';
import './SkipNav.css';

export const MAIN_CONTENT_ID = 'main-content';
export function SkipNav(props: JSX.IntrinsicElements['a']) {
  return <a {...props} class={['SkipNav', props.class]} href={`#${MAIN_CONTENT_ID}`} />;
}

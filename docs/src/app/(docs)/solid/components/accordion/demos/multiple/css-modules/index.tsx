import type { JSX } from '@solidjs/web';
import { Accordion } from 'base-ui-solid/accordion';
import styles from '../../_index.module.css';

export default function ExampleAccordion() {
  return (
    <Accordion.Root class={styles.Accordion} multiple>
      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            What is Base UI?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Base UI is a library of high-quality unstyled Solid components for design systems and
            web apps.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            How do I get started?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Head to the “Quick start” guide in the docs. If you’ve used unstyled libraries before,
            you’ll feel at home.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            Can I use it for my project?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>Of course! Base UI is free and open source.</div>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

function PlusIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M1.5 8h13M8 14.5v-13" />
    </svg>
  );
}

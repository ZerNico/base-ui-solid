import type { JSX } from '@solidjs/web';
import { Accordion } from 'base-ui-solid/accordion';
import styles from '../../_index.module.css';

export default function ExampleAccordion() {
  return (
    <Accordion.Root class={styles.Accordion} hiddenUntilFound>
      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            How long does shipping take?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Standard shipping takes 3–5 business days. Express delivery arrives in 1–2 business
            days.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            What is your return policy?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            You can return any item within 30 days of delivery. Opened items may be subject to a 10%
            restocking fee.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            Do you ship internationally?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Yes, we ship to over 40 countries. International orders typically arrive within 7–14
            business days.
          </div>
        </Accordion.Panel>
      </Accordion.Item>

      <Accordion.Item class={styles.Item}>
        <Accordion.Header class={styles.Header}>
          <Accordion.Trigger class={styles.Trigger}>
            How can I track my order?
            <PlusIcon class={styles.Icon} />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel class={styles.Panel}>
          <div class={styles.Content}>
            Once your order ships, you’ll receive a tracking link by email. Tracking updates can
            take up to 24 hours to appear.
          </div>
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

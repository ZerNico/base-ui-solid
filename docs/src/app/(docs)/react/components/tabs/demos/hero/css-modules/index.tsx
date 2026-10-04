import { Tabs } from 'base-ui-solid/tabs';
import styles from './index.module.css';

export default function ExampleTabs() {
  return (
    <Tabs.Root class={styles.Root} defaultValue="overview">
      <Tabs.List class={styles.List}>
        <Tabs.Tab class={styles.Tab} value="overview">
          Overview
        </Tabs.Tab>
        <Tabs.Tab class={styles.Tab} value="projects">
          Projects
        </Tabs.Tab>
        <Tabs.Tab class={styles.Tab} value="account">
          Account
        </Tabs.Tab>
        <Tabs.Indicator class={styles.Indicator} />
      </Tabs.List>
      <div class={styles.PanelViewport}>
        <Tabs.Panel class={styles.Panel} value="overview">
          <p class={styles.Paragraph}>Workspace stats and activity.</p>
        </Tabs.Panel>
        <Tabs.Panel class={styles.Panel} value="projects">
          <p class={styles.Paragraph}>Milestones and deadlines.</p>
        </Tabs.Panel>
        <Tabs.Panel class={styles.Panel} value="account">
          <p class={styles.Paragraph}>Profile and preferences.</p>
        </Tabs.Panel>
      </div>
    </Tabs.Root>
  );
}

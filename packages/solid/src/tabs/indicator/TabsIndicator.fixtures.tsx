import { Tabs } from 'base-ui-solid/tabs';
import { CSPProvider } from 'base-ui-solid/csp-provider';

export function TabsWithPrehydrationIndicator() {
  return (
    <Tabs.Root value={1}>
      <Tabs.List>
        <Tabs.Tab value={1}>One</Tabs.Tab>
        <Tabs.Indicator renderBeforeHydration />
      </Tabs.List>
    </Tabs.Root>
  );
}

export function TabsWithPrehydrationIndicatorInCSPProvider(props: { nonce: string }) {
  return (
    <CSPProvider nonce={props.nonce}>
      <Tabs.Root value={1}>
        <Tabs.List>
          <Tabs.Tab value={1}>One</Tabs.Tab>
          <Tabs.Indicator renderBeforeHydration />
        </Tabs.List>
      </Tabs.Root>
    </CSPProvider>
  );
}

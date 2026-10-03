import { Collapsible } from '..';

const PANEL_CONTENT = 'This is panel content';

export function OpenPanelWithStylesheetAnimation() {
  return (
    <>
      <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }

            .animation-test-panel[data-open] {
              animation: panel-slide-down 100ms linear;
            }
          `}</style>

      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Trigger</Collapsible.Trigger>
        <Collapsible.Panel class="animation-test-panel" data-testid="panel">
          {PANEL_CONTENT}
        </Collapsible.Panel>
      </Collapsible.Root>
    </>
  );
}

export function OpenPanelWithInlineAnimation() {
  return (
    <>
      <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--collapsible-panel-height);
              }
            }
          `}</style>

      <Collapsible.Root defaultOpen>
        <Collapsible.Trigger>Trigger</Collapsible.Trigger>
        <Collapsible.Panel
          data-testid="panel"
          style={{
            'animation-duration': '100ms',
            'animation-name': 'panel-slide-down',
            'animation-timing-function': 'linear',
          }}
        >
          {PANEL_CONTENT}
        </Collapsible.Panel>
      </Collapsible.Root>
    </>
  );
}

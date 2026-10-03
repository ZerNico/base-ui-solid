import { Accordion } from '..';

const PANEL_CONTENT = 'This is panel content';

export function OpenPanelWithInlineAnimation() {
  return (
    <>
      <style>{`
            @keyframes panel-slide-down {
              from {
                height: 0;
              }

              to {
                height: var(--accordion-panel-height);
              }
            }
          `}</style>

      <Accordion.Root defaultValue={[0]}>
        <Accordion.Item value={0}>
          <Accordion.Header>
            <Accordion.Trigger>Trigger</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel
            data-testid="panel"
            style={{
              'animation-duration': '100ms',
              'animation-name': 'panel-slide-down',
              'animation-timing-function': 'linear',
            }}
          >
            {PANEL_CONTENT}
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion.Root>
    </>
  );
}

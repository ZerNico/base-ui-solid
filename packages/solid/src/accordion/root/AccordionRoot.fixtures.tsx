import { Accordion } from '..';

const PANEL_CONTENT_1 = 'Panel contents 1';

export function OpenAccordion() {
  return (
    <Accordion.Root defaultValue={[0]}>
      <Accordion.Item value={0}>
        <Accordion.Header>
          <Accordion.Trigger>Trigger 1</Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>{PANEL_CONTENT_1}</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

import { createSignal } from 'solid-js';
import { render } from '@solidjs/web';
import { Accordion } from 'base-ui-solid/accordion';
import { Collapsible } from 'base-ui-solid/collapsible';
import { Separator } from 'base-ui-solid/separator';
import { Toggle } from 'base-ui-solid/toggle';
import { ToggleGroup } from 'base-ui-solid/toggle-group';
import './styles.css';

function Content() {
  return (
    <div class="Content">
      <div>vR9xT2</div>
      <div>kLm4Pq</div>
      <div>Zt8YwN</div>
    </div>
  );
}

function App() {
  const [open, setOpen] = createSignal(false);
  const [log, setLog] = createSignal<string[]>([]);

  return (
    <main>
      <h1>Base UI Solid playground</h1>

      <section>
        <h2>Collapsible (CSS transition)</h2>
        <Collapsible.Root>
          <Collapsible.Trigger class="Trigger">
            <span class="Icon">▸</span> Recovery keys
          </Collapsible.Trigger>
          <Collapsible.Panel class="Panel" data-testid="transition-panel">
            <Content />
          </Collapsible.Panel>
        </Collapsible.Root>
      </section>

      <section>
        <h2>Collapsible (CSS keyframes, keepMounted)</h2>
        <Collapsible.Root defaultOpen>
          <Collapsible.Trigger class="Trigger">
            <span class="Icon">▸</span> Recovery keys
          </Collapsible.Trigger>
          <Collapsible.Panel class="Panel keyframes" keepMounted data-testid="keyframes-panel">
            <Content />
          </Collapsible.Panel>
        </Collapsible.Root>
      </section>

      <section>
        <h2>Controlled + render prop</h2>
        <button type="button" onClick={() => setOpen(!open())}>
          Toggle externally ({open() ? 'open' : 'closed'})
        </button>
        <Collapsible.Root
          open={open()}
          onOpenChange={(next, details) => {
            setLog((entries) => [...entries, `${next} (${details.reason})`]);
            setOpen(next);
          }}
        >
          <Collapsible.Trigger
            class="Trigger"
            render={(props, state) => (
              <button {...props}>{state.open ? 'Hide' : 'Show'} details</button>
            )}
          />
          <Collapsible.Panel class="Panel">
            <Content />
          </Collapsible.Panel>
        </Collapsible.Root>
        <pre>{log().join('\n')}</pre>
      </section>

      <section>
        <h2>hiddenUntilFound (try Cmd/Ctrl+F "Zt8YwN")</h2>
        <Collapsible.Root>
          <Collapsible.Trigger class="Trigger">
            <span class="Icon">▸</span> Searchable
          </Collapsible.Trigger>
          <Collapsible.Panel class="Panel" hiddenUntilFound>
            <Content />
          </Collapsible.Panel>
        </Collapsible.Root>
      </section>

      <section>
        <h2>Accordion</h2>
        <Accordion.Root class="Accordion" defaultValue={['a']}>
          {['a', 'b', 'c'].map((value) => (
            <Accordion.Item value={value} class="AccordionItem">
              <Accordion.Header class="AccordionHeader">
                <Accordion.Trigger class="Trigger" data-testid={`accordion-trigger-${value}`}>
                  <span class="Icon">▸</span> Section {value.toUpperCase()}
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel class="Panel" data-testid={`accordion-panel-${value}`}>
                <Content />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </section>

      <Separator class="Separator" />

      <section>
        <h2>Toggle group (arrow keys, Home/End)</h2>
        <ToggleGroup class="ToggleGroup" defaultValue={['left']} aria-label="Alignment">
          <Toggle value="left" class="Toggle">
            Left
          </Toggle>
          <Toggle value="center" class="Toggle">
            Center
          </Toggle>
          <Toggle value="right" class="Toggle" disabled>
            Right
          </Toggle>
          <Toggle value="justify" class="Toggle">
            Justify
          </Toggle>
        </ToggleGroup>
        <p>
          Standalone:{' '}
          <Toggle class="Toggle" aria-label="Bold">
            B
          </Toggle>
        </p>
      </section>

      <section>
        <h2>Disabled</h2>
        <Collapsible.Root disabled>
          <Collapsible.Trigger class="Trigger">
            <span class="Icon">▸</span> Disabled
          </Collapsible.Trigger>
          <Collapsible.Panel class="Panel">
            <Content />
          </Collapsible.Panel>
        </Collapsible.Root>
      </section>
    </main>
  );
}

render(() => <App />, document.getElementById('root')!);

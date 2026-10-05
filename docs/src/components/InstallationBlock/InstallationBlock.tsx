import { createSignal, For } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { Tabs } from 'base-ui-solid/tabs';
import { usePackageManagerSnippetContext } from '../../blocks/PackageManagerSnippet/PackageManagerSnippetProvider';
import { CopyIcon } from '../../icons/CopyIcon';
import { INSTALLATION_PACKAGE_MANAGERS, getInstallCommand } from './model';
import '../CodeBlock/CodeBlock.css';
import '../GhostButton.css';
import './InstallationBlock.css';

export function InstallationBlock(props: { package: string; class?: string }) {
  const { packageManager: globalPreference, setPackageManager: setGlobalPreference } =
    usePackageManagerSnippetContext();
  const [value, setValue] = createSignal<string>(INSTALLATION_PACKAGE_MANAGERS[0].value);

  useIsoLayoutEffect(
    ([preference]) => {
      if (INSTALLATION_PACKAGE_MANAGERS.some((pm) => pm.value === preference)) {
        setValue(preference);
      }
    },
    () => [globalPreference()],
  );

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    setGlobalPreference(newValue);
  };
  const command = () =>
    getInstallCommand(
      INSTALLATION_PACKAGE_MANAGERS.find((pm) => pm.value === value())!,
      props.package,
    );
  return (
    <Tabs.Root
      class={['InstallationBlock', props.class]}
      value={value()}
      onValueChange={handleValueChange}
    >
      <figure class="CodeBlockRoot">
        <div class="CodeBlockPanel">
          <Tabs.List class="InstallationBlockTabsList" aria-label="Package manager" activateOnFocus>
            <For each={INSTALLATION_PACKAGE_MANAGERS}>
              {(pm) => (
                <Tabs.Tab value={pm.value} class="InstallationBlockTab">
                  <span>{pm.label}</span>
                </Tabs.Tab>
              )}
            </For>
          </Tabs.List>
          <button
            class="GhostButton"
            data-layout="icon"
            aria-label="Copy installation command"
            onClick={() => navigator.clipboard.writeText(command())}
          >
            <CopyIcon />
          </button>
        </div>
        <For each={INSTALLATION_PACKAGE_MANAGERS}>
          {(pm) => (
            <Tabs.Panel value={pm.value} class="InstallationBlockTabPanel">
              <div class="CodeBlockViewport" style={{ 'overflow-x': 'auto' }} tabindex="0">
                <pre class="CodeBlockPre CodeBlockPreInline">
                  <code class="Code language-bash">
                    <span class="frame">
                      <span class="line">
                        <span class="pl-en">{pm.value}</span>{' '}
                        <span class="pl-smi">{pm.command}</span>{' '}
                        <span class="pl-s">{props.package}</span>
                      </span>
                    </span>
                  </code>
                </pre>
              </div>
            </Tabs.Panel>
          )}
        </For>
      </figure>
    </Tabs.Root>
  );
}

import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Drawer } from 'base-ui-solid/drawer';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import styles from './index.module.css';

const ITEMS = [
  { href: '/solid/overview', label: 'Overview' },
  { href: '/solid/components', label: 'Components' },
  { href: '/solid/utils', label: 'Utilities' },
  { href: '/solid/overview/releases', label: 'Releases' },
] as const;

const LONG_LIST = [
  { href: '/solid/components/accordion', label: 'Accordion' },
  { href: '/solid/components/alert-dialog', label: 'Alert Dialog' },
  { href: '/solid/components/autocomplete', label: 'Autocomplete' },
  { href: '/solid/components/avatar', label: 'Avatar' },
  { href: '/solid/components/button', label: 'Button' },
  { href: '/solid/components/checkbox', label: 'Checkbox' },
  { href: '/solid/components/checkbox-group', label: 'Checkbox Group' },
  { href: '/solid/components/collapsible', label: 'Collapsible' },
  { href: '/solid/components/combobox', label: 'Combobox' },
  { href: '/solid/components/context-menu', label: 'Context Menu' },
  { href: '/solid/components/dialog', label: 'Dialog' },
  { href: '/solid/components/drawer', label: 'Drawer' },
  { href: '/solid/components/field', label: 'Field' },
  { href: '/solid/components/fieldset', label: 'Fieldset' },
  { href: '/solid/components/form', label: 'Form' },
  { href: '/solid/components/input', label: 'Input' },
  { href: '/solid/components/menu', label: 'Menu' },
  { href: '/solid/components/menubar', label: 'Menubar' },
  { href: '/solid/components/meter', label: 'Meter' },
  { href: '/solid/components/navigation-menu', label: 'Navigation Menu' },
  { href: '/solid/components/number-field', label: 'Number Field' },
  { href: '/solid/components/otp-field', label: 'OTP Field' },
  { href: '/solid/components/popover', label: 'Popover' },
  { href: '/solid/components/preview-card', label: 'Preview Card' },
  { href: '/solid/components/progress', label: 'Progress' },
  { href: '/solid/components/radio-group', label: 'Radio Group' },
  { href: '/solid/components/scroll-area', label: 'Scroll Area' },
  { href: '/solid/components/select', label: 'Select' },
  { href: '/solid/components/separator', label: 'Separator' },
  { href: '/solid/components/slider', label: 'Slider' },
  { href: '/solid/components/switch', label: 'Switch' },
  { href: '/solid/components/tabs', label: 'Tabs' },
  { href: '/solid/components/toast', label: 'Toast' },
  { href: '/solid/components/toggle', label: 'Toggle' },
  { href: '/solid/components/toggle-group', label: 'Toggle Group' },
  { href: '/solid/components/toolbar', label: 'Toolbar' },
  { href: '/solid/components/tooltip', label: 'Tooltip' },
] as const;

export default function ExampleDrawerMobileNav() {
  return (
    <Drawer.Root>
      <Drawer.Trigger class={styles.Button}>Open mobile menu</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop class={styles.Backdrop} />
        <Drawer.Viewport class={styles.Viewport}>
          <ScrollArea.Root style={{ position: undefined }} class={styles.ScrollAreaRoot}>
            <ScrollArea.Viewport class={styles.ScrollAreaViewport}>
              <ScrollArea.Content class={styles.ScrollContent}>
                <Drawer.Popup class={styles.Popup}>
                  <nav aria-label="Navigation" class={styles.Panel}>
                    <div class={styles.Header}>
                      <div aria-hidden="true" class={styles.HeaderSpacer} />
                      <div class={styles.Handle} />
                      <Drawer.Close aria-label="Close menu" class={styles.CloseButton}>
                        <XIcon />
                      </Drawer.Close>
                    </div>

                    <Drawer.Content class={styles.Content}>
                      <Drawer.Title class={styles.Title}>Menu</Drawer.Title>
                      <Drawer.Description class={styles.Description}>
                        Scroll the long list. Flick down from the top to dismiss.
                      </Drawer.Description>

                      <div class={styles.ScrollArea}>
                        <ul class={styles.List}>
                          <For each={ITEMS}>
                            {(item) => (
                              <li class={styles.Item}>
                                <a class={styles.Link} href={item.href}>
                                  {item.label}
                                </a>
                              </li>
                            )}
                          </For>
                        </ul>

                        <ul class={styles.LongList} aria-label="Component links">
                          <For each={LONG_LIST}>
                            {(item) => (
                              <li class={styles.Item}>
                                <a class={styles.Link} href={item.href}>
                                  {item.label}
                                </a>
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    </Drawer.Content>
                  </nav>
                </Drawer.Popup>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar class={styles.Scrollbar}>
              <ScrollArea.Thumb class={styles.ScrollbarThumb} />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function XIcon(props: JSX.IntrinsicElements['svg']) {
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
      <path d="m2.5 2.5 11 11m-11 0 11-11" />
    </svg>
  );
}

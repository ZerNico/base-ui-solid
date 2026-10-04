import type { JSX } from '@solidjs/web';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';

const topTriggerStyle: JSX.CSSProperties = {
  'box-sizing': 'border-box',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  gap: '6px',
  height: '40px',
  padding: '0 14px',
  border: 'none',
  'border-radius': '6px',
  background: 'rgb(249 250 251)',
  color: 'rgb(17 24 39)',
  font: 'inherit',
};

const nestedTriggerStyle: JSX.CSSProperties = {
  'box-sizing': 'border-box',
  display: 'flex',
  'flex-direction': 'column',
  'align-items': 'flex-start',
  gap: '4px',
  width: '100%',
  padding: '12px 14px',
  border: 'none',
  'border-radius': '8px',
  background: 'transparent',
  color: 'rgb(17 24 39)',
  'text-align': 'left',
  font: 'inherit',
};

const triggerCardStyle: JSX.CSSProperties = {
  'box-sizing': 'border-box',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'space-between',
  width: '100%',
  padding: '12px 14px',
  border: '1px solid rgb(229 231 235)',
  'border-radius': '8px',
  background: 'rgb(249 250 251)',
  color: 'rgb(17 24 39)',
  'text-align': 'left',
  font: 'inherit',
};

const linkCardStyle: JSX.CSSProperties = {
  display: 'block',
  padding: '10px 12px',
  'border-radius': '8px',
  color: 'inherit',
  'text-decoration': 'none',
};

export default function InlineSubmenuHoverHandoff() {
  return (
    <div style={{ padding: '40px' }}>
      <NavigationMenu.Root>
        <NavigationMenu.List
          style={{
            display: 'flex',
            'list-style': 'none',
            margin: 0,
            padding: '4px',
            'border-radius': '8px',
            background: 'rgb(249 250 251)',
            width: 'max-content',
          }}
        >
          <NavigationMenu.Item value="product">
            <NavigationMenu.Trigger data-testid="trigger-product" style={topTriggerStyle}>
              Product
            </NavigationMenu.Trigger>
            <NavigationMenu.Content
              data-testid="content-product"
              style={{ width: '720px', 'max-width': 'calc(100vw - 80px)', padding: 0 }}
            >
              <NavigationMenu.Root defaultValue="developers" orientation="vertical">
                <div
                  style={{
                    display: 'grid',
                    'grid-template-columns': '220px minmax(0, 1fr)',
                    'min-height': '280px',
                    overflow: 'hidden',
                    'border-radius': '12px',
                    border: '1px solid rgb(229 231 235)',
                    background: 'white',
                  }}
                >
                  <NavigationMenu.List
                    style={{
                      display: 'flex',
                      'flex-direction': 'column',
                      gap: '4px',
                      'list-style': 'none',
                      margin: 0,
                      padding: '12px',
                      background: 'rgb(243 244 246)',
                      'border-right': '1px solid rgb(229 231 235)',
                    }}
                  >
                    <NavigationMenu.Item value="developers">
                      <NavigationMenu.Trigger
                        data-testid="trigger-developers"
                        style={nestedTriggerStyle}
                      >
                        <span>Developers</span>
                        <span style={{ 'font-size': '14px', color: 'rgb(107 114 128)' }}>
                          Go from idea to UI faster.
                        </span>
                      </NavigationMenu.Trigger>
                      <NavigationMenu.Content
                        data-testid="content-developers"
                        style={{ padding: '24px', width: '500px', 'min-height': '280px' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            'flex-direction': 'column',
                            gap: '16px',
                          }}
                        >
                          <div>
                            <h2
                              style={{
                                margin: 0,
                                'font-size': '24px',
                                'line-height': '1.2',
                                'font-weight': '600',
                              }}
                            >
                              Build product UI without giving up control
                            </h2>
                            <p
                              style={{
                                margin: '8px 0 0',
                                'font-size': '14px',
                                'line-height': '1.5',
                                color: 'rgb(75 85 99)',
                              }}
                            >
                              Hover Composition, then move off the right edge of the trigger and
                              into the popup across the gap.
                            </p>
                          </div>

                          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
                            <Link href="#quick-start">Quick start</Link>
                            <Link href="#accessibility">Accessibility</Link>

                            <NavigationMenu.Root>
                              <NavigationMenu.List
                                style={{
                                  display: 'flex',
                                  'flex-direction': 'column',
                                  'list-style': 'none',
                                  margin: 0,
                                  padding: 0,
                                }}
                              >
                                <NavigationMenu.Item value="composition">
                                  <NavigationMenu.Trigger
                                    data-testid="trigger-composition"
                                    style={triggerCardStyle}
                                  >
                                    <span>Composition</span>
                                    <span aria-hidden="true">→</span>
                                  </NavigationMenu.Trigger>
                                  <NavigationMenu.Content
                                    data-testid="content-composition"
                                    style={{ width: '280px', padding: '16px' }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        'flex-direction': 'column',
                                        gap: '12px',
                                      }}
                                    >
                                      <div>
                                        <h3
                                          style={{
                                            margin: 0,
                                            'font-size': '18px',
                                            'line-height': '1.25',
                                            'font-weight': '600',
                                          }}
                                        >
                                          Composition popup
                                        </h3>
                                        <p
                                          style={{
                                            margin: '8px 0 0',
                                            'font-size': '14px',
                                            'line-height': '1.5',
                                            color: 'rgb(75 85 99)',
                                          }}
                                        >
                                          The menu should stay open while the pointer crosses the
                                          gap into this popup.
                                        </p>
                                      </div>
                                      <Link href="#composition-handbook">Composition handbook</Link>
                                      <Link href="#navigation-menu-docs">Navigation Menu docs</Link>
                                    </div>
                                  </NavigationMenu.Content>
                                </NavigationMenu.Item>
                              </NavigationMenu.List>

                              <NavigationMenu.Portal>
                                <NavigationMenu.Positioner
                                  data-testid="positioner-composition"
                                  side="right"
                                  sideOffset={10}
                                  collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
                                >
                                  <NavigationMenu.Popup
                                    style={{
                                      'border-radius': '12px',
                                      background: 'white',
                                      outline: '1px solid rgb(229 231 235)',
                                      'box-shadow':
                                        '0 10px 15px -3px rgb(229 231 235), 0 4px 6px -4px rgb(229 231 235)',
                                    }}
                                  >
                                    <NavigationMenu.Viewport />
                                  </NavigationMenu.Popup>
                                </NavigationMenu.Positioner>
                              </NavigationMenu.Portal>
                            </NavigationMenu.Root>
                          </div>
                        </div>
                      </NavigationMenu.Content>
                    </NavigationMenu.Item>

                    <NavigationMenu.Item value="systems">
                      <NavigationMenu.Trigger style={nestedTriggerStyle}>
                        <span>Design systems</span>
                        <span style={{ 'font-size': '14px', color: 'rgb(107 114 128)' }}>
                          Move here to close the branch.
                        </span>
                      </NavigationMenu.Trigger>
                      <NavigationMenu.Content
                        style={{ padding: '24px', width: '500px', 'min-height': '280px' }}
                      >
                        <p style={{ margin: 0 }}>Sibling panel</p>
                      </NavigationMenu.Content>
                    </NavigationMenu.Item>
                  </NavigationMenu.List>

                  <NavigationMenu.Viewport data-testid="viewport-inline" />
                </div>
              </NavigationMenu.Root>
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>

        <NavigationMenu.Portal>
          <NavigationMenu.Positioner
            align="start"
            sideOffset={10}
            collisionPadding={{ top: 5, bottom: 5, left: 20, right: 20 }}
          >
            <NavigationMenu.Popup
              style={{
                'border-radius': '12px',
                background: 'white',
                outline: '1px solid rgb(229 231 235)',
                'box-shadow': '0 10px 15px -3px rgb(229 231 235), 0 4px 6px -4px rgb(229 231 235)',
              }}
            >
              <NavigationMenu.Viewport />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    </div>
  );
}

function Link(props: NavigationMenu.Link.Props) {
  return (
    <NavigationMenu.Link
      // Port note: React elements can't be cloned in Solid, so the `render` element is a function.
      render={(renderProps) => <a aria-label="fixture link" href={props.href} {...renderProps} />}
      {...props}
      style={{
        ...linkCardStyle,
        ...((props.style as JSX.CSSProperties | undefined) ?? {}),
      }}
    />
  );
}

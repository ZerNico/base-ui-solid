import { createSignal } from 'solid-js';

import { afterEach, expect, vi, describe, it } from 'vitest';
import { screen } from '#test-utils';
import { Menu } from 'base-ui-solid/menu';
import { createRenderer } from '../../../test/menuPortHelpers';
import { act } from '../../../test/utils';
import { describeMenuConformance } from '../../../test/menuConformance';
import { MenuGroupContext } from '../group/MenuGroupContext';

const testContext: MenuGroupContext = createSignal<string | undefined>()[1];
describe('<Menu.GroupLabel />', () => {
  const { render } = createRenderer();
  afterEach(async () => {
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        }),
    );
  });
  describeMenuConformance(Menu.GroupLabel, {
    render: (node) =>
      render(() => <MenuGroupContext value={testContext}>{node()}</MenuGroupContext>),
    refInstanceof: window.HTMLDivElement,
  });
  it('throws when rendered outside Menu.Group or Menu.RadioGroup', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render(
          (testProps: any) => <Menu.GroupLabel {...testProps} />,
          () => ({}),
        ),
      ).rejects.toThrow(
        'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  describe('a11y attributes', () => {
    it('is hidden from the accessibility tree by default', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Group>
                        <Menu.GroupLabel>Test group</Menu.GroupLabel>
                      </Menu.Group>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const groupLabel = screen.getByText('Test group');
      expect(groupLabel).toHaveAttribute('aria-hidden', 'true');
    });
    it('allows overriding aria-hidden', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Group>
                        <Menu.GroupLabel aria-hidden={undefined}>Test group</Menu.GroupLabel>
                      </Menu.Group>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const groupLabel = screen.getByText('Test group');
      expect(groupLabel).not.toHaveAttribute('aria-hidden');
    });
    it("should reference the generated id in Group's `aria-labelledby`", async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Group>
                        <Menu.GroupLabel>Test group</Menu.GroupLabel>
                      </Menu.Group>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const group = screen.getByRole('group');
      const groupLabel = screen.getByText('Test group');
      expect(group).toHaveAttribute('aria-labelledby', groupLabel.id);
    });
    it("should reference the provided id in Group's `aria-labelledby`", async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Group>
                        <Menu.GroupLabel id="test-group">Test group</Menu.GroupLabel>
                      </Menu.Group>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby', 'test-group');
    });
    it("should reference the generated id in RadioGroup's `aria-labelledby`", async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.RadioGroup>
                        <Menu.GroupLabel>Test group</Menu.GroupLabel>
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const radioGroup = screen.getByRole('group');
      const groupLabel = screen.getByText('Test group');
      expect(radioGroup).toHaveAttribute('aria-labelledby', groupLabel.id);
    });
    it("should reference the provided id in RadioGroup's `aria-labelledby`", async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.RadioGroup>
                        <Menu.GroupLabel id="test-group">Test group</Menu.GroupLabel>
                      </Menu.RadioGroup>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const radioGroup = screen.getByRole('group');
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'test-group');
    });
    it('should support GroupLabel when RadioGroup is rendered as Group', async () => {
      await render(
        (testProps: any) => <Menu.Root {...testProps} />,
        () => ({
          open: true,
          get children() {
            return (
              <>
                <Menu.Portal>
                  <Menu.Positioner>
                    <Menu.Popup>
                      <Menu.Group
                        render={(renderProps) => (
                          <Menu.RadioGroup {...(renderProps as Menu.RadioGroup.Props)} />
                        )}
                      >
                        <Menu.GroupLabel>Test group</Menu.GroupLabel>
                      </Menu.Group>
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </>
            );
          },
        }),
      );
      const radioGroup = screen.getByRole('group');
      const groupLabel = screen.getByText('Test group');
      expect(radioGroup).toHaveAttribute('aria-labelledby', groupLabel.id);
    });
    it('does not let an older label cleanup clear a newer label', async () => {
      function Test(componentProps1: { labels: 'old' | 'both' | 'new' }) {
        return (
          <Menu.Root open>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <Menu.Group>
                    {componentProps1.labels !== 'new' && (
                      <Menu.GroupLabel id="old-label">Old</Menu.GroupLabel>
                    )}
                    {componentProps1.labels !== 'old' && (
                      <Menu.GroupLabel id="new-label">New</Menu.GroupLabel>
                    )}
                  </Menu.Group>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        );
      }
      const { setProps } = await render(
        (testProps: any) => <Test {...testProps} />,
        () => ({
          labels: 'old',
        }),
      );
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-labelledby', 'old-label');
      await setProps({ labels: 'both' });
      expect(group).toHaveAttribute('aria-labelledby', 'new-label');
      await setProps({ labels: 'new' });
      expect(group).toHaveAttribute('aria-labelledby', 'new-label');
    });
  });
});

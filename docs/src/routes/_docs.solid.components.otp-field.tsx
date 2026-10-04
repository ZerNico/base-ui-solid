// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { createFileRoute } from '@tanstack/solid-router';
import Content from '../app/(docs)/solid/components/otp-field/page.mdx';
import { mdxComponents } from '../mdx-components';

export const Route = createFileRoute('/_docs/solid/components/otp-field')({
  // Port note: keep head metadata independent of MDX so Start can split the page component.
  head: () => ({
    meta: [
      { title: 'OTP Field · Base UI · Solid' },
      {
        name: 'description',
        content:
          'A high-quality, unstyled Solid OTP field component for one-time password and verification code entry.',
      },
    ],
  }),
  component: () => <Content components={mdxComponents} />,
});

import type { JSX } from '@solidjs/web';
import { Dynamic } from '@solidjs/web';
import * as QuickNav from './components/QuickNav/QuickNav';

function Heading(props: {
  as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  id?: JSX.IntrinsicElements['h1']['id'];
  children?: JSX.Element;
  'data-heading-badge'?: string;
}) {
  return (
    <Dynamic
      component={props.as}
      id={props.id}
      class={{
        MdH1: props.as === 'h1',
        MdH2: props.as === 'h2',
        MdH3: props.as === 'h3',
        MdH4: props.as === 'h4',
        MdH5: props.as === 'h5',
        MdH6: props.as === 'h6',
      }}
    >
      <a class="HeadingLink" href={props.id ? `#${props.id}` : undefined}>
        {props.children}
      </a>
      <span class="MdHeadingBadge">{props['data-heading-badge']}</span>
    </Dynamic>
  );
}
export const mdxComponents = {
  h1: (props: JSX.IntrinsicElements['h1']) => <Heading {...props} as="h1" />,
  h2: (props: JSX.IntrinsicElements['h2']) => <Heading {...props} as="h2" />,
  h3: (props: JSX.IntrinsicElements['h3']) => <Heading {...props} as="h3" />,
  h4: (props: JSX.IntrinsicElements['h4']) => <Heading {...props} as="h4" />,
  h5: (props: JSX.IntrinsicElements['h5']) => <Heading {...props} as="h5" />,
  h6: (props: JSX.IntrinsicElements['h6']) => <Heading {...props} as="h6" />,
  p: (props: JSX.IntrinsicElements['p']) => <p {...props} class="MdP" />,
  a: (props: JSX.IntrinsicElements['a']) => <a {...props} class="MdLink" />,
  code: (props: JSX.IntrinsicElements['code']) => (
    <code {...props} class={['MdCode', props.class]} />
  ),
  pre: (props: JSX.IntrinsicElements['pre']) => (
    <pre {...props} class="CodeBlockPre" tabindex="0" />
  ),
  ul: (props: JSX.IntrinsicElements['ul']) => <ul {...props} class="MdUl" />,
  ol: (props: JSX.IntrinsicElements['ol']) => <ol {...props} class="MdOl" />,
  li: (props: JSX.IntrinsicElements['li']) => <li {...props} class="MdListItem" />,
  table: (props: JSX.IntrinsicElements['table']) => <table {...props} class="MdTable" />,
  kbd: (props: JSX.IntrinsicElements['kbd']) => <kbd {...props} class="Kbd" />,
  Subtitle: (props: { children?: JSX.Element }) => <p class="Subtitle">{props.children}</p>,
  // Port note: route head metadata replaces Next.js's metadata export extraction.
  Meta: () => null,
  QuickNav,
};
export function useMDXComponents() {
  return mdxComponents;
}

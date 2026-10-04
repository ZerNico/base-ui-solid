import { useMediaQuery } from '.';

function createMatchMedia(initialMatches: boolean) {
  const mediaQueryList = {
    matches: initialMatches,
    addEventListener() {},
    removeEventListener() {},
  };
  return (() => mediaQueryList) as unknown as typeof window.matchMedia;
}

/**
 * Port note: the server render runs in Node, so `ssrMatchMedia` can't be a spy from the test.
 * The fixture records the queries it receives in `data-ssr-match-media-calls` instead.
 */
export function SsrMatchMediaTest(props: { query: string }) {
  const calls: string[] = [];
  const ssrMatchMedia = (query: string) => {
    calls.push(query);
    return { matches: true };
  };
  const matches = useMediaQuery(
    () => props.query,
    () => ({ ssrMatchMedia }),
  );
  return (
    <span data-testid="result" data-ssr-match-media-calls={calls.join('|')}>
      {String(matches())}
    </span>
  );
}

/**
 * Port note: `matchMedia` is created in the fixture (where the server render runs) from the
 * serializable `matches` prop.
 */
export function NoSsrTest(props: {
  query: string;
  matches: boolean;
  defaultMatches?: boolean | undefined;
  noSsr?: boolean | undefined;
}) {
  const matchMedia = createMatchMedia(props.matches);
  const matches = useMediaQuery(
    () => props.query,
    () => ({ matchMedia, defaultMatches: props.defaultMatches, noSsr: props.noSsr }),
  );
  return <span data-testid="result">{String(matches())}</span>;
}

import { useFormatLocale } from './useFormatLocale';

export function TestComponent(props: { locale?: string | undefined }) {
  const formatLocale = useFormatLocale(() => props.locale);
  return <span data-testid="locale">{String(formatLocale())}</span>;
}

import { useErrorSearchParams } from './useErrorSearchParams';
import codes from '../../../error-codes.json';
// Port note: Solid Router supplies query parameters on server and client.
export default function ErrorDisplay() {
  const params = useErrorSearchParams();
  return (
    <code>
      {(() => {
        const code = params().get('code');
        const msg =
          (code ? (codes as Partial<Record<string, string>>)[code] : null) ??
          `Unknown error code: ${code}`;
        const args = params().getAll('args[]');
        let index = 0;
        return msg.replace(/%s/g, () => {
          const replacement = args[index];
          index += 1;
          return replacement ?? '[missing argument]';
        });
      })()}
    </code>
  );
}

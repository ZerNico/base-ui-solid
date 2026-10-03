import type { Accessor } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useBaseUiId } from '../internals/useBaseUiId';

export function useRegisteredLabelId(
  idProp: Accessor<string | undefined>,
  setLabelId: (
    value: string | undefined | ((prev: string | undefined) => string | undefined),
  ) => void,
): Accessor<string> {
  const generatedId = useBaseUiId();
  const id = () => idProp() ?? generatedId;

  useIsoLayoutEffect(
    ([currentId]) => {
      setLabelId(currentId);
      return () => {
        setLabelId((currentLabelId) => (currentLabelId === currentId ? undefined : currentLabelId));
      };
    },
    () => [id()],
  );

  return id;
}

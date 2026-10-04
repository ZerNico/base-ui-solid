import reference from '../../../../../../reference/toast.json';
import { createMultipleTypes } from '../../../../../utils/createTypes';
// Port note: upstream types.md supplies the reference; render/class/style use Solid types.
export const TypesToast = createMultipleTypes(reference);

// Port note: render upstream additional toast types through the same reference renderer.
export const TypesToastAdditional = (props: { showAdditionalTypes: string[] }) =>
  props.showAdditionalTypes.map((name) => {
    const key = Object.keys(reference).find((candidate) => candidate.toLowerCase() === name);
    const Content = key ? TypesToast[key as keyof typeof TypesToast] : undefined;
    return Content ? Content() : null;
  });

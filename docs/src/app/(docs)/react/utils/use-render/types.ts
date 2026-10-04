import { createMultipleTypes } from '../../../../../utils/createTypes';
import reference from '../../../../../../reference/use-render.json';
// Port note: upstream snapshot rendered as Solid reference tables.
const types = createMultipleTypes(reference);
export const TypesUseRender = types.useRender;

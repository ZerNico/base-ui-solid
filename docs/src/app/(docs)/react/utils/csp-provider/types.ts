import { createMultipleTypes } from '../../../../../utils/createTypes';
import reference from '../../../../../../reference/csp-provider.json';
// Port note: upstream snapshot rendered as Solid reference tables.
const types = createMultipleTypes(reference);
export const TypesCSPProvider = types.CSPProvider;

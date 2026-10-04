import reference from '../../../../../../reference/form.json';
import { createMultipleTypes } from '../../../../../utils/createTypes';
// Port note: upstream types.md is the authoritative API snapshot, adapted to Solid.
export const TypesForm = createMultipleTypes(reference).Form;

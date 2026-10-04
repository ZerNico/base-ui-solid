import reference from '../../../../../../reference/input.json';
import { createMultipleTypes } from '../../../../../utils/createTypes';
// Port note: upstream types.md is the authoritative API snapshot, adapted to Solid.
export const TypesInput = createMultipleTypes(reference).Input;

import reference from '../../../../../../reference/avatar.json';
import { createMultipleTypes } from '../../../../../utils/createTypes';
// Port note: upstream types.md is the authoritative API snapshot, adapted to Solid.
export const TypesAvatar = createMultipleTypes(reference);
export const TypesAvatarAdditional = createMultipleTypes(reference).Additional;

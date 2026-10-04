import { createMultipleTypes } from '../../../../../utils/createTypes';
import reference from '../../../../../../reference/direction-provider.json';
// Port note: upstream snapshot rendered as Solid reference tables.
const types = createMultipleTypes(reference);
export const TypesDirectionProvider = types.DirectionProvider;
export const TypesUseDirection = types.useDirection;

export const TypesDirectionProviderAdditionalTypes = types.TextDirection;

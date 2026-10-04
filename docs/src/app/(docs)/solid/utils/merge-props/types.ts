import { createMultipleTypes } from '../../../../../utils/createTypes';
import reference from '../../../../../../reference/merge-props.json';
// Port note: upstream snapshot rendered as Solid reference tables.
const types = createMultipleTypes(reference);
export const TypesMergeProps = types.mergeProps;
export const TypesMergePropsN = types.mergePropsN;

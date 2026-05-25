import type { PreviewSizeKey } from '../../constants/preview-sizes.constants';
import type { AspectRatio } from '../../models/card-data.model';

/** Row descriptor rendered inside the Layout panel's "Format" list. */
export interface FormatOption {
  readonly key: PreviewSizeKey;
  readonly label: string;
  readonly dims: string;
  readonly ratio: AspectRatio;
}

/** Platform group wrapping its format options in the scrollable picker. */
export interface FormatGroup {
  readonly label: string;
  readonly options: readonly FormatOption[];
}

import { RenderOptions } from "@dexkit/widgets/src/widgets/swap/types";

import type { CellPlugin } from "@react-page/editor";
import SwapWidget from "../components/SwapWidget";

// you can pass the shape of the data as the generic type argument
const Swap2Plugin: CellPlugin<RenderOptions> = {
  Renderer: ({ data, isEditMode }) => (
    <SwapWidget formData={data} isEditMode={isEditMode} />
  ),
  id: "swap-settings-plugin",
  title: "Swap plugin",
  description: "Swap",
  version: 1,
};

export default Swap2Plugin;

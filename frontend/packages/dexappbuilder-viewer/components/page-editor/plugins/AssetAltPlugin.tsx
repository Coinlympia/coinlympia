import type { CellPlugin } from "@react-page/editor";

import dynamic from "next/dynamic";

const AssetSection = dynamic(() => import("../../sections/AssetSection/index"));

// you can pass the shape of the data as the generic type argument
const AssetAltPlugin: CellPlugin = {
  Renderer: ({ data, isEditMode, onChange }) => {
    return (
      <AssetSection
        section={{ config: data, type: "asset-section" }}
        key={JSON.stringify(data)}
      />
    );
  },
  id: "asset-alt-plugin",
  title: "Asset Section",
  description: "Asset Section",
  version: 1,
};

export default AssetAltPlugin;

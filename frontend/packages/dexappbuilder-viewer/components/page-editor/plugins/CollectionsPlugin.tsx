import type { CellPlugin } from "@react-page/editor";

import { CollectionPageSection } from "@dexkit/ui/modules/wizard/types/section";
import CollectionSection from "../../sections/CollectionSection";

// you can pass the shape of the data as the generic type argument
const CollectionsPlugin: CellPlugin<{
  section?: CollectionPageSection;
}> = {
  Renderer: ({ data, isEditMode }) => {
    return data.section ? <CollectionSection section={data.section} /> : null;
  },
  id: "collection-new",
  title: "Collection",
  description: "Show a collection",
  version: 1,
};

export default CollectionsPlugin;

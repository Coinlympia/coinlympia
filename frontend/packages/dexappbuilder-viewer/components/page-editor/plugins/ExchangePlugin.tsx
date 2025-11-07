import type { CellPlugin } from "@react-page/editor";

import { DexkitExchangeSettings } from "@dexkit/exchange/types";
import dynamic from "next/dynamic";
const ExchangeSection = dynamic(() => import("../../sections/ExchangeSection"));

// you can pass the shape of the data as the generic type argument
const ExchangePlugin: CellPlugin<DexkitExchangeSettings> = {
  Renderer: ({ data, isEditMode, onChange }) => {
    return (
      <ExchangeSection
        section={{ settings: data, type: "exchange", title: "exchange" }}
        key={JSON.stringify(data)}
      />
    );
  },
  id: "exchange-settings-plugin",
  title: "Exchange plugin",
  description: "Exchange",
  version: 1,
};

export default ExchangePlugin;

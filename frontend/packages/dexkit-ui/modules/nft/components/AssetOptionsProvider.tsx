import React from "react";
import { AssetOptions } from "../types";

export const AssetOptionsContext = React.createContext<AssetOptions>({});

export interface AssetOptionsProviderProps {
  children: React.ReactNode;
  options?: AssetOptions;
}

export default function AssetOptionsProvider({
  children,
  options,
}: AssetOptionsProviderProps) {
  return (
    <AssetOptionsContext.Provider value={{ options }}>
      {children}
    </AssetOptionsContext.Provider>
  );
}

import React from "react";
import { DexkitApiProviderState } from "../types";

export const DexkitApiProvider = React.createContext<DexkitApiProviderState>({
  instance: null,
});

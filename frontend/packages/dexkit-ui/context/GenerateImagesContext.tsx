import { UseMutateAsyncFunction } from "@tanstack/react-query";
import React from "react";

export interface GenerateImageContext {
  saveImages?: UseMutateAsyncFunction<
    any,
    unknown,
    {
      urls: string[];
    },
    unknown
  >;
  isSavingImages?: boolean;
  generatedImages?: string[];
  savedImages?: string[];
  addSavedImages: (urls: string[]) => void;
  addGeneratedImages: (urls: string[]) => void;
  unsavedImages: string[];
  hasUnsavedImages: boolean;
}

export const GenerateImagesContext = React.createContext<GenerateImageContext>({
  unsavedImages: [],
  hasUnsavedImages: false,
  addSavedImages: (urls: string[]) => {},
  addGeneratedImages: (urls: string[]) => {},
});

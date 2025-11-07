import Stack from "@mui/material/Stack";
import type { CellPlugin } from "@react-page/editor";
import { useMemo } from "react";
import { SearchNFT } from "../components/SearchNFT";

type Data = {
  padding: number;
  position: string;
  collections?: {
    name: string;
    contractAddress: string;
    backgroundImage: string;
    network: string;
    chainId: number;
    image: string;
  }[];
};

// you can pass the shape of the data as the generic type argument
const SearchNFTPlugin: CellPlugin<Data> = {
  Renderer: ({ isEditMode, data }) => {
    const position = useMemo(() => {
      if (data.position === "center") {
        return "center";
      }
      if (data.position === "start") {
        return "flex-start";
      }
      if (data.position === "end") {
        return "flex-end";
      }
    }, [data.position]);

    return (
      <Stack
        sx={{ p: data.padding }}
        justifyContent={position}
        alignItems={position}
      >
        <SearchNFT disabled={isEditMode} collections={data.collections} />
      </Stack>
    );
  },

  id: "dexkit-search-nft-plugin",
  title: "Search NFT",
  description: "Insert search nft.",
  version: 1,
};

export default SearchNFTPlugin;

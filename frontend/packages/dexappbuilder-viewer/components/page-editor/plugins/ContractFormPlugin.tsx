import type { CellPlugin } from "@react-page/editor";

import { ContractFormParams } from "@dexkit/web3forms/types";

import ContractFormView from "@dexkit/web3forms/components/ContractFormView";
import { Box } from "@mui/material";

// you can pass the shape of the data as the generic type argument
const ContractFormPlugin: CellPlugin<ContractFormParams> = {
  Renderer: ({ data, isEditMode }) =>
    data.abi ? (
      <Box sx={{ p: 2 }}>
        <ContractFormView params={data} />
      </Box>
    ) : null,
  id: "contract-form-settings-plugin",
  title: "Contract",
  description: "Contract form",
  version: 1,
};

export default ContractFormPlugin;

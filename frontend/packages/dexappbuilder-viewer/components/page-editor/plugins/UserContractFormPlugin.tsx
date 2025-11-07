import type { CellPlugin } from "@react-page/editor";

import UserContractSection from "../../sections/UserContractSection";

// you can pass the shape of the data as the generic type argument
const UserContractFormPlugin: CellPlugin<{
  formId?: number;
  hideFormInfo?: boolean;
}> = {
  Renderer: ({ data, isEditMode }) => {
    return data.formId ? (
      <UserContractSection
        section={{
          formId: data.formId,
          type: "user-contract-form",
          hideFormInfo: data.hideFormInfo,
        }}
      />
    ) : null;
  },
  id: "user-contract-form-plugin",
  title: "Contract from user Form",
  description: "Contract from user Form",
  version: 1,
};

export default UserContractFormPlugin;

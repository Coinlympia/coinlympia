import { ContractPageSection } from "@dexkit/ui/modules/wizard/types/section";
import ContractFormView from "@dexkit/web3forms/components/ContractFormView";
import { Container } from "@mui/material";

export interface Props {
  section?: ContractPageSection;
}

export default function ContractSection({ section }: Props) {
  return (
    <Container sx={{ py: 2 }}>
      {section?.config ? <ContractFormView params={section?.config} /> : null}
    </Container>
  );
}

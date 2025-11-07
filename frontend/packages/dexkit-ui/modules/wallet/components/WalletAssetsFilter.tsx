import { truncateAddress } from "@dexkit/core/utils";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { FormattedMessage } from "react-intl";
import { NetworkwAccordion } from "../../../components/NetworkAccordion";
import SidebarFilters from "../../../components/SidebarFilters";
import SidebarFiltersContent from "../../../components/SidebarFiltersContent";

interface Props {
  filters?: {
    account?: string;
  };
  accounts?: string[];
  setFilters: any;
  onClose: any;
}

function WalletAssetsFilter({ filters, setFilters, onClose, accounts }: Props) {
  const onFilterNetworkChanged = (net: string) => {
    setFilters((value: any) => {
      const newFilterNetwork = [...value.networks] as string[];
      if (newFilterNetwork.includes(net)) {
        const index = newFilterNetwork.findIndex((n) => n === net);
        newFilterNetwork.splice(index, 1);
      } else {
        newFilterNetwork.push(net);
      }
      return {
        ...value,
        networks: newFilterNetwork,
      };
    });
  };

  const onFilterAccountChanged = (account: string) => {
    setFilters((value: any) => {
      return {
        ...value,
        account: account,
      };
    });
  };

  return (
    <>
      <SidebarFilters
        title={<FormattedMessage id="filters" defaultMessage="Filters" />}
        onClose={onClose}
      >
        <SidebarFiltersContent>
          <Stack spacing={2}>
            {accounts && accounts.length > 1 && (
              <FormControl fullWidth>
                <InputLabel id="account-filter-label">
                  <FormattedMessage id="accounts" defaultMessage="Accounts" />
                </InputLabel>
                <Select
                  labelId="account-filter-label"
                  id="demo-simple-select"
                  value={filters?.account}
                  label={
                    <FormattedMessage id="account" defaultMessage="Account" />
                  }
                  onChange={(ev) => onFilterAccountChanged(ev.target.value)}
                >
                  {accounts.map((a, k) => (
                    <MenuItem value={a} key={k}>
                      {truncateAddress(a)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <NetworkwAccordion onFilterNetworks={onFilterNetworkChanged} />
          </Stack>
        </SidebarFiltersContent>
      </SidebarFilters>
    </>
  );
}

export default WalletAssetsFilter;

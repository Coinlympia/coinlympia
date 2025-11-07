import { NETWORKS } from "@dexkit/core/constants/networks";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { List, ListItem, ListItemText, Stack } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import { FormattedMessage } from "react-intl";
import { useActiveChainIds } from "../hooks/blockchain";

interface Props {
  onFilterNetworks?: (network: string) => void;
}

export function NetworkwAccordion({ onFilterNetworks }: Props) {
  const { activeChainIds } = useActiveChainIds();

  return (
    <Stack spacing={2} sx={{ pt: 2 }}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="networks"
          id="networks-display"
        >
          <Typography>
            <FormattedMessage id={"networks"} defaultMessage={"Networks"} />
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <List sx={{ maxHeight: "400px", overflow: "auto" }}>
            {Object.values(NETWORKS)
              .filter((n) => activeChainIds.includes(Number(n.chainId)))
              .filter((n) => !n.testnet)
              .map((net, key) => (
                <ListItem
                  key={key}
                  secondaryAction={
                    <FormControlLabel
                      value="start"
                      control={<Checkbox />}
                      onClick={() => {
                        if (onFilterNetworks && net?.slug) {
                          onFilterNetworks(net?.slug);
                        }
                      }}
                      label={""}
                    />
                  }
                >
                  <ListItemText primary={net.name} />
                </ListItem>
              ))}
          </List>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}

import { Tab } from "@mui/material";
import { styled } from "@mui/material/styles";

export const TradeWidgetTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  borderRadius: theme.shape.borderRadius,
  "&.Mui-selected": {
    backgroundColor: theme.palette.action.selected,
  },
}));

export default TradeWidgetTab;

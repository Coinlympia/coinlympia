import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
} from "@mui/material";

export default function SwapSelectCoinListSkeleton() {
  return (
    <List disablePadding dense>
      {new Array(6).fill(null).map((_, index) => (
        <ListItem key={index}>
          <ListItemAvatar>
            <Skeleton
              variant="circular"
              sx={{ height: "2.5rem", width: "2.5rem" }}
            />
          </ListItemAvatar>
          <ListItemText primary={<Skeleton />} secondary={<Skeleton />} />
        </ListItem>
      ))}
    </List>
  );
}

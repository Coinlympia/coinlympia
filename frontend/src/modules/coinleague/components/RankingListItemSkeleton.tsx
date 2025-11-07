import {
  ListItemAvatar,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { AnimatedSkeleton } from '@/components/animated/AnimatedSkeleton';

interface RankingButtonProps {}

export default function RankingListItemSkeleton({}: RankingButtonProps) {
  return (
    <ListItemButton>
      <ListItemAvatar>
        <AnimatedSkeleton
          variant="circular"
          sx={{ width: '1.5rem', height: '1.5rem' }}
        />
      </ListItemAvatar>
      <ListItemText primary={<AnimatedSkeleton />} />
    </ListItemButton>
  );
}

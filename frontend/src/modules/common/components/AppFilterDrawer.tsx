import { Close } from '@mui/icons-material';
import {
  Box,
  Divider,
  Drawer,
  DrawerProps,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { drawerVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface Props {
  drawerProps: DrawerProps;
  icon: React.ReactNode | React.ReactNode[];
  title: React.ReactNode | React.ReactNode[];
  children: React.ReactNode | React.ReactNode[];
}

export default function AppFilterDrawer({
  drawerProps,
  children,
  icon,
  title,
}: Props) {
  const { onClose, open } = drawerProps;
  const prefersReducedMotion = useReducedMotion();

  const handleClose = () => {
    if (onClose) {
      onClose({}, 'backdropClick');
    }
  };

  if (prefersReducedMotion) {
    return (
      <Drawer
        anchor="right"
        {...drawerProps}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 2,
        }}
      >
        <Box sx={{ p: 2, minWidth: (theme) => theme.breakpoints.values.sm / 2 }}>
          <Stack spacing={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                {icon}
                <Typography sx={{ fontWeight: 600 }} variant="body1">
                  {title}
                </Typography>
              </Stack>
              <IconButton onClick={handleClose}>
                <Close />
              </IconButton>
            </Stack>
            <Divider />
            <Box>{children}</Box>
          </Stack>
        </Box>
      </Drawer>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <Drawer
          anchor="right"
          {...drawerProps}
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 2,
          }}
          PaperProps={{
            component: motion.div,
            variants: drawerVariants,
            initial: 'hidden',
            animate: 'visible',
            exit: 'hidden',
            ...drawerProps.PaperProps,
          }}
        >
          <Box sx={{ p: 2, minWidth: (theme) => theme.breakpoints.values.sm / 2 }}>
            <Stack spacing={1}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  {icon}
                  <Typography sx={{ fontWeight: 600 }} variant="body1">
                    {title}
                  </Typography>
                </Stack>
                <IconButton onClick={handleClose}>
                  <Close />
                </IconButton>
              </Stack>
              <Divider />
              <Box>{children}</Box>
            </Stack>
          </Box>
        </Drawer>
      )}
    </AnimatePresence>
  );
}

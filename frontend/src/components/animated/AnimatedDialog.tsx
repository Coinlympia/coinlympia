import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogProps } from '@mui/material';
import { ReactNode } from 'react';
import { modalVariants, backdropVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface AnimatedDialogProps extends DialogProps {
  children: ReactNode;
  open: boolean;
}

export function AnimatedDialog({
  children,
  open,
  onClose,
  ...dialogProps
}: AnimatedDialogProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Dialog open={open} onClose={onClose} {...dialogProps}>
        {children}
      </Dialog>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={onClose}
          {...dialogProps}
          PaperComponent={({ children, ...props }) => (
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              {...props}
            >
              {children}
            </motion.div>
          )}
        >
          {children}
        </Dialog>
      )}
    </AnimatePresence>
  );
}


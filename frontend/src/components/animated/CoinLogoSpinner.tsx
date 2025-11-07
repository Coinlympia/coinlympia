import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import { DURATION, EASING } from '@/animations/constants';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Box } from '@mui/material';

interface CoinLogoSpinnerProps {
  size?: number;
}

export function CoinLogoSpinner({ size = 80 }: CoinLogoSpinnerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          src="/coinlympia-logo.png"
          alt="Coinlympia Logo"
          width={size}
          height={size}
          style={{ objectFit: 'contain' }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
        perspectiveOrigin: 'center center',
      }}
    >
      <motion.div
        animate={{
          rotateY: [0, 360],
        }}
        transition={{
          duration: 2,
          ease: 'linear',
          repeat: Infinity,
          repeatType: 'loop',
        }}
        style={{
          width: size,
          height: size,
          transformStyle: 'preserve-3d',
        }}
      >
        <Image
          src="/coinlympia-logo.png"
          alt="Coinlympia Logo"
          width={size}
          height={size}
          style={{
            objectFit: 'contain',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        />
      </motion.div>
    </Box>
  );
}


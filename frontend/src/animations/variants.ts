import { Variants } from 'framer-motion';
import { DURATION, EASING, STAGGER } from './constants';

export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const slideDownVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const slideLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const slideRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const scaleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const fadeSlideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeOut,
    },
  },
};

export const buttonVariants: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeOut,
    },
  },
  tap: {
    scale: 0.95,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeOut,
    },
  },
};

export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast / 1000,
      ease: EASING.easeIn,
    },
  },
};

export const listVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.normal,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
};

export const drawerVariants: Variants = {
  hidden: {
    x: '-100%',
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeIn,
    },
  },
  visible: {
    x: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
};

export const tabVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal / 1000,
      ease: EASING.easeOut,
    },
  },
};

export const skeletonVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shakeVariants: Variants = {
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: {
      duration: 0.5,
      ease: EASING.easeOut,
    },
  },
};


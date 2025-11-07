import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { memo } from 'react';
import { AnimatedSkeleton } from '@/components/animated/AnimatedSkeleton';
import { motion } from 'framer-motion';
import { listItemVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

interface Props {
  rows: number;
  cols: number;
}

function TableSkeleton({ rows, cols }: Props) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <Table>
        <TableHead>
          <TableRow>
            {new Array(cols).fill(null).map((_, j: number) => (
              <TableCell key={j}></TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {new Array(rows).fill(null).map((_, i: number) => (
            <TableRow key={i}>
              {new Array(cols).fill(null).map((_, j: number) => (
                <TableCell key={j}>
                  <AnimatedSkeleton />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {new Array(cols).fill(null).map((_, j: number) => (
            <TableCell key={j}></TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {new Array(rows).fill(null).map((_, i: number) => (
          <TableRow key={i} component={motion.tr} variants={listItemVariants}>
            {new Array(cols).fill(null).map((_, j: number) => (
              <TableCell key={j}>
                <AnimatedSkeleton />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default memo(TableSkeleton);

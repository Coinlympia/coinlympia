import { AnimatedTextField } from '@/components/animated/AnimatedTextField';
import { useDebounce } from '@/modules/common/hooks/misc';
import { TextFieldProps } from '@mui/material';

import { useCallback, useEffect, useState } from 'react';

interface Props {
  onChange: (value: string) => void;
  TextFieldProps?: TextFieldProps;
}

export function SearchTextField({ onChange, TextFieldProps }: Props) {
  const [value, setValue] = useState('');

  const lazyString = useDebounce<string>(value, 500);

  useEffect(() => {
    onChange(lazyString);
  }, [lazyString]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <AnimatedTextField {...TextFieldProps} value={value} onChange={handleChange} />
  );
}

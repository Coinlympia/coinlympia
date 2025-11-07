import { useDebounce } from "@dexkit/core/hooks/misc";

import { TextField, TextFieldProps } from "@mui/material";

import { ChangeEvent, useCallback, useEffect, useState } from "react";

interface LazyTextFieldProps {
  value?: string;
  onChange: (value: string) => void;
  TextFieldProps?: TextFieldProps;
}

export default function LazyTextField({
  value,
  onChange,
  TextFieldProps,
}: LazyTextFieldProps) {
  const [inputValue, setInputValue] = useState({
    triggerChange: false,
    value: "",
  });

  const lazyString = useDebounce<string>(inputValue.value, 500);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue({ value: e.target.value, triggerChange: true });
  }, []);

  useEffect(() => {
    if (value !== undefined && inputValue.value !== value) {
      setInputValue({ triggerChange: false, value });
    }
  }, [value]);

  useEffect(() => {
    if (inputValue.triggerChange) {
      onChange(lazyString);
    }
  }, [lazyString, inputValue.triggerChange]);

  return (
    <TextField
      {...TextFieldProps}
      value={inputValue.value}
      onChange={handleChange}
    />
  );
}

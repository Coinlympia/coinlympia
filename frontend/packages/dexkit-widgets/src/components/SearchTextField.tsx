import { TextField, TextFieldProps } from "@mui/material";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import { useDebounce } from "../hooks";

export interface SearchTextFieldProps {
  onChange: (value: string) => void;
  TextFieldProps?: TextFieldProps;
}

export default function SearchTextField({
  onChange,
  TextFieldProps,
}: SearchTextFieldProps) {
  const [value, setValue] = useState("");

  const lazyString = useDebounce<string>(value, 500);

  useEffect(() => {
    onChange(lazyString);
  }, [lazyString]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return (
    <TextField {...TextFieldProps} value={value} onChange={handleChange} />
  );
}

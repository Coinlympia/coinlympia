import { TextFieldProps } from "@mui/material";
import { useField } from "formik";
import DecimalInput from "./DecimalInput";

export interface FormikDecimalInputProps {
  TextFieldProps?: TextFieldProps;
  decimals?: number;
  maxDigits?: number;
  name: string;
}

export default function FormikDecimalInput({
  TextFieldProps,
  decimals,
  name,
  maxDigits,
}: FormikDecimalInputProps) {
  const [field, meta, helpers] = useField(name);

  const handleChange = (value: string) => {
    helpers.setValue(value);
  };

  return (
    <DecimalInput
      onChange={handleChange}
      value={field.value}
      TextFieldProps={{
        ...TextFieldProps,
        error: Boolean(meta.error),
        helperText: meta.error,
      }}
      decimals={decimals}
      maxDigits={maxDigits}
    />
  );
}

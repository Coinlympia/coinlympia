import { TextField } from "@mui/material";
import { useFormikContext } from "formik";

export default function IpfsFormInput() {
  const {} = useFormikContext<any>();

  return <TextField fullWidth type="file" size="small" />;
}

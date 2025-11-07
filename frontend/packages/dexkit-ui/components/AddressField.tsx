import { useEnsNameMutation } from "@dexkit/core/hooks";
import { isAddress } from "@dexkit/core/utils/ethers/isAddress";
import { Stack, Typography } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

import { Field, useField } from "formik";
import { TextField } from "formik-mui";
import { useState } from "react";
import { FormattedMessage } from "react-intl";

export function AddressField() {
  const ensNameMutation = useEnsNameMutation();
  const [field] = useField("address");
  const [previousValue, setPreviousValue] = useState<string>();
  const [previousValueResult, setPreviousValueResult] = useState<string>();
  return (
    <>
      <Field
        label={
          <FormattedMessage
            id="address.or.ens"
            defaultMessage="Address or ENS"
          />
        }
        validate={async (value: string) => {
          if (!value || !field.value) {
            return "address is required";
          }
          if (value === previousValue) {
            return previousValueResult;
          }

          if (value && value.split(".").length > 1) {
            const nameResolved = await ensNameMutation.mutateAsync(value);
            setPreviousValue(value);
            if (nameResolved) {
              setPreviousValueResult(undefined);
              return;
            } else {
              setPreviousValueResult("invalid ens");
              return "invalid ens";
            }
          }
          if (value && isAddress(value)) {
            return;
          }
          return "invalid address";
        }}
        name="address"
        component={TextField}
        type="text"
      />
      {ensNameMutation.isLoading && (
        <Stack spacing={2} direction="row">
          <CircularProgress color="inherit" size="1rem" />
          <Typography>
            <FormattedMessage
              id="validating.ens"
              defaultMessage="Validating ENS name"
            />
          </Typography>
        </Stack>
      )}
    </>
  );
}

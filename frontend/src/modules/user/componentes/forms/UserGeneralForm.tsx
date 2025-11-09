import {
  Button,
  Divider,
  Stack,
  styled,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Field, Formik } from 'formik';
import { TextField } from 'formik-mui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';

import ImageIcon from '@mui/icons-material/Image';
import dynamic from 'next/dynamic';
import * as Yup from 'yup';
import { getUsernameExists } from '../../services';
const MediaDialog = dynamic(() => import('@dexkit/ui/components/mediaDialog'));

export interface UserForm {
  username?: string;
  profileImageURL?: string;
  backgroundImageURL?: string;
}

const FormSchema: Yup.SchemaOf<UserForm> = Yup.object().shape({
  username: Yup.string()
    .required()
    .test(
      'username-backend-validation',
      'Username already taken',
      async (username) => {
        if (username) {
          try {
            const { data } = await getUsernameExists(username);
            return !data.exists;
          } catch (error) {
            console.warn('Error checking username availability:', error);
            return true;
          }
        }
        return false;
      },
    ),
  profileImageURL: Yup.string().test(
    'url-validation',
    'Must be a valid URL',
    (value) => !value || Yup.string().url().isValidSync(value)
  ),
  backgroundImageURL: Yup.string().test(
    'url-validation',
    'Must be a valid URL',
    (value) => !value || Yup.string().url().isValidSync(value)
  ),
});

const createEditFormSchema = (currentUsername?: string): Yup.SchemaOf<UserForm> => {
  return Yup.object().shape({
    username: Yup.string()
      .required()
      .test(
        'username-backend-validation',
        'Username already taken',
        async (username) => {
          if (username && currentUsername && username.toLowerCase() === currentUsername.toLowerCase()) {
            return true;
          }
          if (username) {
            try {
              const { data } = await getUsernameExists(username, currentUsername);
              return !data.exists;
            } catch (error) {
              console.warn('Error checking username availability:', error);
              return true;
            }
          }
          return false;
        },
      ),
    profileImageURL: Yup.string().test(
      'url-validation',
      'Must be a valid URL',
      (value) => !value || Yup.string().url().isValidSync(value)
    ),
    backgroundImageURL: Yup.string().test(
      'url-validation',
      'Must be a valid URL',
      (value) => !value || Yup.string().url().isValidSync(value)
    ),
  });
};

interface Props {
  isEdit?: boolean;
  initialValues?: UserForm | null;
  onSubmit?: (form: UserForm) => void;
  onChange?: (form: UserForm) => void;
  currentUsername?: string;
}

const EmptyImageBackground = styled(ImageIcon)(({ theme }) => ({
  height: theme.spacing(20),
  width: theme.spacing(20),
}));

const BackgroundImage = styled('img')(({ theme }) => ({
  height: theme.spacing(10),
  width: theme.spacing(10),
}));

const EmptyImageProfile = styled(ImageIcon)(({ theme }) => ({
  height: theme.spacing(10),
  width: theme.spacing(10),
}));

export default function UserGeneralForm({
  onSubmit,
  onChange,
  initialValues,
  currentUsername,
}: Props) {
  const [openMediaDialog, setOpenMediaDialog] = useState(false);
  const [mediaFieldToEdit, setMediaFieldToEdit] = useState<string>();
  return (
    <>
      <Stack>
        <Formik
          initialValues={
            initialValues || {
              username: '',
              profileImageURL: '',
              backgroundImageURL: '',
            }
          }
          onSubmit={(values, helpers) => {
            if (onSubmit) {
              onSubmit(values as UserForm);
              helpers.resetForm({ values });
            }
          }}
          validationSchema={initialValues ? createEditFormSchema(currentUsername) : FormSchema}
        >
          {({ submitForm, isSubmitting, isValid, setFieldValue, values }) => (
            <form>
              {openMediaDialog && (
                <MediaDialog
                  dialogProps={{
                    open: openMediaDialog,
                    maxWidth: 'lg',
                    fullWidth: true,
                    onClose: () => {
                      setOpenMediaDialog(false);
                      setMediaFieldToEdit(undefined);
                    },
                  }}
                  onConfirmSelectFile={(file) => {
                    if (mediaFieldToEdit && file) {
                      setFieldValue(mediaFieldToEdit, file.url);
                      if (onChange) {
                        onChange({ ...values, [mediaFieldToEdit]: file.url });
                      }
                    }
                    setMediaFieldToEdit(undefined);
                    setOpenMediaDialog(false);
                  }}
                />
              )}

              <Grid container spacing={2}>
                <Grid size={12}>
                  <Field
                    component={TextField}
                    fullWidth
                    name="username"
                    label={
                      <FormattedMessage
                        id="username"
                        defaultMessage="Username"
                      />
                    }
                    InputProps={{ disabled: false }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <FormattedMessage
                      id="profileImage"
                      defaultMessage="Profile Image"
                    />
                  </Typography>
                  <Button
                    onClick={() => {
                      setOpenMediaDialog(true);
                      setMediaFieldToEdit('profileImageURL');
                    }}
                  >
                    {values.profileImageURL ? (
                      <BackgroundImage src={values.profileImageURL} />
                    ) : (
                      <EmptyImageProfile />
                    )}
                  </Button>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2">
                    <FormattedMessage
                      id="backgroundImage"
                      defaultMessage="Background Image"
                    />
                  </Typography>
                  <Button
                    onClick={() => {
                      setOpenMediaDialog(true);
                      setMediaFieldToEdit('backgroundImageURL');
                    }}
                  >
                    {values.backgroundImageURL ? (
                      <BackgroundImage src={values.backgroundImageURL} />
                    ) : (
                      <EmptyImageBackground />
                    )}
                  </Button>
                </Grid>

                <Grid size={12}>
                  <Divider />
                </Grid>
                <Grid size={12}>
                  <Stack spacing={1} direction="row" justifyContent="flex-end">
                    <Button
                      disabled={!isValid}
                      onClick={submitForm}
                      variant="contained"
                      color="primary"
                    >
                      <FormattedMessage id="save" defaultMessage="Save" />
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          )}
        </Formik>
      </Stack>
    </>
  );
}


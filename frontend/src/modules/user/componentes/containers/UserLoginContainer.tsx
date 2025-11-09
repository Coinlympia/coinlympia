import { PageHeader } from '@dexkit/ui/components/PageHeader';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';

import { useAuthUserQuery } from '../../hooks';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
export function UserLoginContainer() {
  const router = useRouter();
  const { account } = useWeb3React();
  const userQuery = useAuthUserQuery();
  const user = userQuery.data;

  useEffect(() => {
    if (account && userQuery.isFetched) {
      if (user?.username) {
        router.push(`/u/${user.username}`);
      } else {
        router.push('/u/edit');
      }
    } else if (!account) {
      router.push('/');
    }
  }, [account, user, userQuery.isFetched, router]);

  return (
    <>
      <Container maxWidth={'xl'}>
        <Grid container spacing={2}>
          <Grid size={12}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <PageHeader
                breadcrumbs={[
                  {
                    caption: (
                      <FormattedMessage id="home" defaultMessage="Home" />
                    ),
                    uri: '/',
                  },
                  {
                    caption: (
                      <FormattedMessage
                        id="user.login"
                        defaultMessage="User login"
                      />
                    ),
                    uri: `/u/login`,
                  },
                ]}
              />
            </Stack>
          </Grid>

          <Grid size={12}>
            <Stack direction={'row'} justifyContent={'space-between'}></Stack>
          </Grid>
          <Grid size={12}>
            <Stack spacing={2} alignItems={'center'}>
              <Typography variant="h5">
                <FormattedMessage id="loading.profile" defaultMessage="Loading profile..." />
              </Typography>
              {!account && (
                <Typography variant="body1">
                  <FormattedMessage
                    id="please.connect.wallet"
                    defaultMessage="Please connect your wallet to view your profile"
                  />
                </Typography>
              )}
              {account && userQuery.isLoading && (
                <CircularProgress />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}


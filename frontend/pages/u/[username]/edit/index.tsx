import { UserEditContainer } from '@/modules/user/componentes/containers/UserEditContainer';
import Box from '@mui/material/Box';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { useEffect } from 'react';
import { FormattedMessage } from 'react-intl';

import AuthMainLayout from 'src/components/layouts/authMain';
import { useUserByUsernameQueryDB } from '@/modules/user/hooks';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import { isAddressEqual } from '@/modules/common/utils';
import CircularProgress from '@mui/material/CircularProgress';
import { Typography } from '@mui/material';

const UserEditByUsername: NextPage = () => {
  const router = useRouter();
  const { username } = router.query;
  const { account } = useWeb3React();
  
  const userQuery = useUserByUsernameQueryDB(username as string);
  const user = userQuery?.data;

  useEffect(() => {
    if (userQuery.isFetched && !user) {
      router.push('/404');
    }
    else if (user && account && !isAddressEqual(account, user.address)) {
      router.push(`/u/${username}`);
    }
  }, [user, userQuery.isFetched, account, router, username]);

  if (userQuery.isLoading) {
    return (
      <SessionProvider>
        <AuthMainLayout disablePadding>
          <Box py={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </AuthMainLayout>
      </SessionProvider>
    );
  }

  if (userQuery.isFetched && !user) {
    return (
      <SessionProvider>
        <AuthMainLayout disablePadding>
          <Box py={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography variant="h6">
              <FormattedMessage id="user.not.found" defaultMessage="User not found" />
            </Typography>
          </Box>
        </AuthMainLayout>
      </SessionProvider>
    );
  }

  if (user && account && !isAddressEqual(account, user.address)) {
    return (
      <SessionProvider>
        <AuthMainLayout disablePadding>
          <Box py={4} display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
          </Box>
        </AuthMainLayout>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <AuthMainLayout disablePadding>
        <Box py={4}>
          <UserEditContainer />
        </Box>
      </AuthMainLayout>
    </SessionProvider>
  );
};

export default UserEditByUsername;


import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import { useEffect, useRef } from 'react';

export function AutoCreateUserAccount() {
  const { account } = useWeb3React();
  const processedAccountsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (account) {
      const normalizedAccount = account.toLowerCase();
      
      if (processedAccountsRef.current.has(normalizedAccount)) {
        console.log('[AutoCreateUserAccount] Account already processed:', normalizedAccount);
        return;
      }

      console.log('[AutoCreateUserAccount] Account detected, creating or retrieving user account:', normalizedAccount);
      
      const createOrGetUser = async () => {
        try {
          console.log('[AutoCreateUserAccount] Sending request to /api/user/create-or-get with address:', normalizedAccount);
          const response = await fetch('/api/user/create-or-get', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: normalizedAccount,
            }),
          });

          console.log('[AutoCreateUserAccount] Response status:', response.status);
          if (response.ok) {
            const result = await response.json();
            console.log('[AutoCreateUserAccount] Response result:', result);
            if (result.success) {
              console.log('[AutoCreateUserAccount] User account created or retrieved:', result.user);
              processedAccountsRef.current.add(normalizedAccount);
            } else {
              console.error('[AutoCreateUserAccount] Failed to create or get user account:', result.error);
            }
          } else {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            console.error('[AutoCreateUserAccount] Error creating or getting user account:', response.status, errorData);
          }
        } catch (error) {
          console.error('[AutoCreateUserAccount] Error calling create-or-get user endpoint:', error);
          if (error instanceof Error) {
            console.error('[AutoCreateUserAccount] Error message:', error.message);
            console.error('[AutoCreateUserAccount] Error stack:', error.stack);
          }
        }
      };

      createOrGetUser();
    }
  }, [account]);

  return null;
}


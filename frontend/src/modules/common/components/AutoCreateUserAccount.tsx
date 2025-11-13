import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import { useEffect, useRef } from 'react';

export function AutoCreateUserAccount() {
  const { account } = useWeb3React();
  const processedAccountsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (account) {
      const normalizedAccount = account.toLowerCase();
      
      if (processedAccountsRef.current.has(normalizedAccount)) {
        return;
      }
      
      const createOrGetUser = async () => {
        try {
          const response = await fetch('/api/user/create-or-get', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              address: normalizedAccount,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              processedAccountsRef.current.add(normalizedAccount);
            }
          }
        } catch (error) {
        }
      };

      createOrGetUser();
    }
  }, [account]);

  return null;
}


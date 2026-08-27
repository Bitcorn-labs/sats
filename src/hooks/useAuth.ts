import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthClient } from '@icp-sdk/auth/client';
import {
  createBackend,
  createCkbtc,
  type Backend,
  type Ckbtc,
} from '../actors';

// The `/authorize` path is required: @icp-sdk/auth uses this URL verbatim,
// unlike @dfinity/auth-client which appended the authorize step for you.
// Without it the popup lands on the Internet Identity home page and never
// returns a delegation.
//
// This is correct on a local network too -- icp-cli's replica trusts mainnet
// subnet signatures, so delegations from mainnet II are accepted locally and no
// local II canister is needed.
const IDENTITY_PROVIDER = 'https://id.ai/authorize';

export interface Session {
  principal: string;
  backend: Backend;
  ckbtc: Ckbtc;
}

export interface Auth {
  session: Session | null;
  connecting: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): Auth {
  const [session, setSession] = useState<Session | null>(null);
  const [connecting, setConnecting] = useState(false);
  const clientRef = useRef<AuthClient | null>(null);

  const adopt = async (client: AuthClient) => {
    const identity = await client.getIdentity();
    setSession({
      principal: identity.getPrincipal().toString(),
      backend: createBackend(identity),
      ckbtc: createCkbtc(identity),
    });
  };

  useEffect(() => {
    const client = new AuthClient({ identityProvider: IDENTITY_PROVIDER });
    clientRef.current = client;

    // Restore a session that survived a page reload. Not awaited, so it needs
    // its own catch -- adopt() throws when the ic_env cookie is missing.
    if (client.isAuthenticated()) {
      adopt(client).catch((error) => {
        console.error('Could not restore the previous session:', error);
      });
    }
  }, []);

  const signIn = useCallback(async () => {
    setConnecting(true);
    try {
      const client = new AuthClient({ identityProvider: IDENTITY_PROVIDER });
      clientRef.current = client;

      if (!client.isAuthenticated()) {
        // signIn() opens the provider window, so it must stay inside the click
        // handler's call stack or the browser blocks the popup.
        await client.signIn();
      }
      await adopt(client);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setConnecting(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await clientRef.current?.signOut();
    setSession(null);
  }, []);

  return { session, connecting, signIn, signOut };
}

import { idlFactory as SATSFactory } from '../declarations/backend';
import { _SERVICE as SATSService } from '../declarations/service_hack/service'; // changed to service.d because dfx generate would remove the export line from index.d
import { idlFactory as icpFactory } from '../declarations/nns-ledger';
import { _SERVICE as ckbtcService } from '../declarations/nns-ledger/index.d';
import { useEffect, useRef, useState } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';

interface InternetIdentityLoginHandlerProps {
  ckbtcCanisterID: string;
  setCkBtcLedgerActor: (value: ckbtcService | null) => void;
  SATSCanisterID: string;
  setSATSActor: (value: SATSService | null) => void;
  loading: boolean;
  setLoading: (value: boolean) => void;
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
  connectionType: string;
  setConnectionType: (value: string) => void;
  loggedInPrincipal: string;
  setLoggedInPrincipal: (value: string) => void;
}

const InternetIdentityLoginHandler: React.FC<
  InternetIdentityLoginHandlerProps
> = ({
  ckbtcCanisterID,
  setCkBtcLedgerActor,
  SATSCanisterID,
  setSATSActor,
  loading,
  setLoading,
  isConnected,
  setIsConnected,
  connectionType,
  setConnectionType,
  loggedInPrincipal,
  setLoggedInPrincipal,
}) => {
  const authClientRef = useRef<AuthClient | null>(null);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [buttonToggle, setButtonToggle] = useState(false);

  const [identityProvider, setIdentityProvider] = useState<URL | null>(null);

  // Returns the provider URL rather than only setting state: authClient.login()
  // calls window.open(), which browsers permit only inside the synchronous call
  // stack of a user gesture. The click handler therefore needs the URL
  // immediately -- a state update would not be visible until the next render.
  const resolveIdentityProvider = (option: number): URL => {
    //0 for ic0.app; 1 for internetcomputer.org
    if (process.env.DFX_NETWORK === 'local') {
      return new URL('http://br5f7-7uaaa-aaaaa-qaaca-cai.localhost:4943');
    } else if (option === 1) {
      return new URL('https://identity.internetcomputer.org/');
    }
    return new URL('https://identity.ic0.app/');
  };

  const authClientLogin = async (provider: URL) => {
    if (!authClient) return;

    return new Promise<void>((resolve, reject) => {
      authClient.login({
        identityProvider: provider,
        onSuccess: () => {
          console.log('II login success, setting isConnected to true');
          setIsConnected(true); // Set authentication state to true
          setConnectionType('ii');
          resolve(); // Resolve the promise on success
        },
        onError: (error) => {
          console.error('Login failed:', error);
          reject(error); // Reject the promise on error
        },
      });
    });
  };

  const login = async (provider: URL) => {
    setLoading(true);
    await authClientLogin(provider);

    if (!authClient) return;

    const identity = authClient.getIdentity();

    setLoggedInPrincipal(identity.getPrincipal().toString());
    console.log('Setting isConnected to true in login function');
    setIsConnected(true);
    setConnectionType('ii');
    await createAgent(provider);
    setLoading(false);
  };

  const createAuthClient = async (): Promise<void> => {
    setAuthClient(await AuthClient.create());
  };

  useEffect(() => {
    createAuthClient(); //Need to check if already logged in on refresh!
  }, []);

  const checkLoggedIn = async () => {
    if (!authClient) return;

    const authenticated = await authClient.isAuthenticated();
    console.log('Checking if authenticated:', authenticated);
    if (authenticated) {
      const identity = authClient.getIdentity();

      setLoggedInPrincipal(identity.getPrincipal().toString());
      console.log('Setting isConnected to true in checkLoggedIn');
      setIsConnected(true);
      setConnectionType('ii');
      await createAgent();
    }
  };

  useEffect(() => {
    if (!authClient) return;

    checkLoggedIn();
  }, [authClient]);

  const logout = async () => {
    if (!authClient) return;
    if (authClient) {
      await authClient.logout();
      setIsConnected(false);
      setConnectionType('');
      setLoggedInPrincipal('');
      setSATSActor(null);
      setCkBtcLedgerActor(null);
      setIdentityProvider(null);
    }
  };

  const createAgent = async (provider?: URL) => {
    if (!authClient) {
      console.log('authClientRef was null in createAgent()');
      return;
    }
    const activeProvider = provider ?? identityProvider;
    const identity = authClient.getIdentity();

    const agent = new HttpAgent({
      host:
        process.env.DFX_NETWORK === 'local'
          ? 'http://localhost:4943'
          : String(activeProvider) ===
            'https://identity.internetcomputer.org/'
          ? 'https://internetcomputer.org'
          : 'https://ic0.app/',
      identity: identity,
    });

    if (process.env.DFX_NETWORK === 'local') {
      agent.fetchRootKey();
      console.log('aaa');
    }

    setSATSActor(
      await Actor.createActor(SATSFactory, {
        agent,
        canisterId: SATSCanisterID,
      })
    );

    setCkBtcLedgerActor(
      await Actor.createActor(icpFactory, {
        agent,
        canisterId: ckbtcCanisterID,
      })
    );
  };

  return (
    <div>
      {!isConnected ? (
        <>
          {!buttonToggle ? (
            <button
              disabled={loading}
              onClick={() => {
                setButtonToggle(!buttonToggle);
              }}
            >
              Login with Internet Identity
            </button>
          ) : (
            <>
              <button
                disabled={loading}
                onClick={async () => {
                  // login() must run inside this handler so the II popup opens
                  // within the user gesture; a state update would be too late.
                  const provider = resolveIdentityProvider(0);
                  setIdentityProvider(provider);
                  if (!authClient) return;
                  if (await authClient.isAuthenticated()) {
                    await checkLoggedIn();
                    return;
                  }
                  await login(provider);
                }}
              >
                ic0.app
              </button>
              <button
                disabled={loading}
                onClick={async () => {
                  // login() must run inside this handler so the II popup opens
                  // within the user gesture; a state update would be too late.
                  const provider = resolveIdentityProvider(1);
                  setIdentityProvider(provider);
                  if (!authClient) return;
                  if (await authClient.isAuthenticated()) {
                    await checkLoggedIn();
                    return;
                  }
                  await login(provider);
                }}
              >
                internetcomputer.org
              </button>
            </>
          )}
        </>
      ) : connectionType === 'ii' ? (
        <>
          <p>
            Your Internet Identity Principal is <br />
            {loggedInPrincipal}
          </p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default InternetIdentityLoginHandler;

import { useEffect, useState } from 'react';
import { idlFactory as SATSFactory } from '../declarations/backend';
import { _SERVICE as SATSService } from '../declarations/service_hack/service'; // changed to service.d because dfx generate would remove the export line from index.d
import { idlFactory as icpFactory } from '../declarations/nns-ledger';
import { _SERVICE as ckbtcService } from '../declarations/nns-ledger/index.d';

interface PlugLoginHandlerProps {
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
  setCkBtcLedgerBalance: (value: bigint) => void;
  setSATSLedgerBalance: (value: bigint) => void;
  loggedInPrincipal: string;
  setLoggedInPrincipal: (value: string) => void;
}

const PlugLoginHandler: React.FC<PlugLoginHandlerProps> = ({
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
  setCkBtcLedgerBalance,
  setSATSLedgerBalance,
  loggedInPrincipal,
  setLoggedInPrincipal,
}) => {
  const checkConnection = async () => {
    try {
      const connection = !!(await window.ic.plug.isConnected());

      console.log({ connection });

      setIsConnected(connection);

      if (connection) {
        setConnectionType('plug');
        return true;
      } else {
        setConnectionType('');
        return false;
      }
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // This code runs after `icpActor` and `icdvActor` have been updated.
    if (isConnected && connectionType === 'plug') {
      fetchPrincipal();
      // Ensure fetchBalances is defined and correctly handles asynchronous operations
      setUpActors();
      console.log('isConnected', isConnected, connectionType);
    }

    // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  }, [isConnected]);

  const fetchPrincipal = async () => {
    if (!checkConnection) return;
    setLoggedInPrincipal(
      (await window.ic.plug.agent.getPrincipal()).toString()
    );
  };

  const setUpActors = async () => {
    console.log('Setting up actors...', ckbtcCanisterID, SATSCanisterID);

    setSATSActor(
      await window.ic.plug.createActor({
        canisterId: SATSCanisterID,
        interfaceFactory: SATSFactory,
      })
    );

    setCkBtcLedgerActor(
      await window.ic.plug.createActor({
        canisterId: ckbtcCanisterID,
        interfaceFactory: icpFactory,
      })
    );
  };

  const handleLogout = async () => {
    setLoading(true);

    if (isConnected && connectionType === 'plug') {
      try {
        await window.ic.plug.disconnect();
        setSATSActor(null);
        setCkBtcLedgerActor(null);
        setIsConnected(false);
        setConnectionType('');
        setCkBtcLedgerBalance(0n);
        setSATSLedgerBalance(0n);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    handleLogout();
    setLoading(true);
    try {
      const connected = await checkConnection();
      if (!connected) {
        const pubkey = await window.ic.plug.requestConnect({
          // whitelist, host, and onConnectionUpdate need to be defined or imported appropriately
          whitelist: [ckbtcCanisterID, SATSCanisterID],
          host:
            process.env.DFX_NETWORK === 'local'
              ? 'http://127.0.0.1:4943'
              : 'https://ic0.app',
          onConnectionUpdate: async () => {
            console.log(
              'Connection updated',
              await window.ic.plug.isConnected()
            );
            checkConnection();
          },
        });
        if (process.env.DFX_NETWORK === 'local') {
          await window.ic.plug.sessionManager.sessionData.agent.agent.fetchRootKey();
        }
        console.log('Connected with pubkey:', pubkey);
        await setIsConnected(true);
        setConnectionType('plug');
      } else {
        if (process.env.DFX_NETWORK === 'local') {
          await window.ic.plug.sessionManager.sessionData.agent.agent.fetchRootKey();
        }
        setIsConnected(true);
        setConnectionType('plug');
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsConnected(false);
      setConnectionType('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div>
      {!isConnected ? (
        <>
          <div className="card">
            <button onClick={handleLogin} disabled={loading}>
              Login with Plug
            </button>
          </div>
        </>
      ) : connectionType === 'plug' ? (
        <>
          <p>
            Your plug principal is
            <br />
            {loggedInPrincipal}
          </p>
          <button onClick={handleLogout} disabled={loading}>
            Logout
          </button>
        </>
      ) : (
        <></>
      )}
    </div>
  );
};

export default PlugLoginHandler;

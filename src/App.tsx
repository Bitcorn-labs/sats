import './App.css';
import React, { useState, useEffect, ReactElement, useRef } from 'react';
import reactLogo from './assets/gold.png';
import sgldtLogo from './assets/sgldt.png';
import gldtLogo from './assets/gldtlogo.png';
// import { useQueryCall, useUpdateCall } from '@ic-reactor/react';
import { Principal } from '@dfinity/principal';
// import {Agent, Actor, HttpAgent} from '@dfinity/agent';
import ic from 'ic0';

import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';

import { idlFactory as icpFactory } from './declarations/nns-ledger';
import { _SERVICE as gldtService } from './declarations/nns-ledger/index.d';

import { idlFactory as sGLDTFactory } from './declarations/backend';
import { _SERVICE as sGLDTService } from './declarations/service_hack/service'; // changed to service.d because dfx generate would remove the export line from index.d
import { Stats } from './declarations/backend/backend.did.d';
import { CircularProgress, TextField } from '@mui/material';
import GLDTMintingField from './components/ReBobMintingField';
import ShowTransactionStatus from './components/ShowTransactionStatus';
import SGLDTWithdrawField from './components/BobWithdrawField';

import bigintToFloatString from './bigIntToFloatString';
import PlugLoginHandler from './components/PlugLoginHandler';
import InternetIdentityLoginHandler from './components/InternetIdentityLoginHandler';
import TokenManagement from './components/TokenManagement';

const gldtCanisterID =
  process.env.DFX_NETWORK === 'local'
    ? '6c7su-kiaaa-aaaar-qaira-cai'
    : '6c7su-kiaaa-aaaar-qaira-cai';
const sGLDTCanisterID =
  process.env.DFX_NETWORK === 'local'
    ? 'bkyz2-fmaaa-aaaaa-qaaaq-cai'
    : 'i2s4q-syaaa-aaaan-qz4sq-cai';

function App() {
  const [loading, setLoading] = useState(false);
  // const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [gldtLedgerBalance, setGldtLedgerBalance] = useState<bigint>(0n);
  const [sGLDTLedgerBalance, setsGLDTLedgerBalance] = useState<bigint>(0n);

  const [gldtLedgerAllowance, setGldtLedgerAllowance] = useState<bigint>(0n);
  const [sGLDTLedgerAllowance, setsGLDTLedgerAllowance] = useState<bigint>(0n);

  const [share, setShare] = useState<bigint>(0n);
  const [stats, setStats] = useState<Stats | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string>('');

  const [sGLDTActor, setsGLDTActor] = useState<sGLDTService | null>(null);
  // const [sGLDTActorTemp, setsGLDTActorTemp] = useState<sGLDTService | null>(
  //   null
  // );
  const [gldtLedgerActor, setGldtLedgerActor] = useState<gldtService | null>(null);

  const [totalGLDTHeld, setTotalGLDTHeld] = useState<string>('');
  const [totalSGLDTMinted, setTotalSGLDTMinted] = useState<string>('');

  const [loggedInPrincipal, setLoggedInPrincipal] = useState('');

  const gldtFee: bigint = 10_000_000n;
  const sGLDTFee: bigint = 1_000n;

  const fetchTotalTokens = async () => {
    // const totalGLDTHeldResponse = await gldtLedgerActor.icrc1_balance_of({
    //   owner: Principal.fromText(sGLDTCanisterID),
    //   subaccount: [],
    // }); // Can't use plug actors as anonymous.

    // We will use the internet identity anonymous calls in the next update. ic0 will work for now.
    const gldtIcActor = await ic('6c7su-kiaaa-aaaar-qaira-cai'); // hard coding this because it will work in local still.

    const totalGLDTHeldResponse = await gldtIcActor.call('icrc1_balance_of', {
      owner: Principal.fromText('i2s4q-syaaa-aaaan-qz4sq-cai'), // hard coding this because it won't work with local of sGLDTCanisterID
      subaccount: [],
    });

    //const totalSGLDTMintedResponse = await sGLDTActor.icrc1_total_supply();

    setTotalGLDTHeld(bigintToFloatString(totalGLDTHeldResponse, 8));
    //setTotalSGLDTMinted(bigintToFloatString(totalSGLDTMintedResponse));
  };

  const cleanUp = () => {
    setLoading(false);
    if (gldtLedgerActor && sGLDTActor) {
      fetchBalances();
      //fetchStats();
    } else {
      console.error('Actors were not loaded when trying to cleanup!');
    }
  };

  useEffect(() => {
    //console.log('Component mounted, waiting for user to log in...');
    fetchTotalTokens();
    // checkLoggedIn();

    //setUpActors(); // can't use plug actors as anonymous?
    //console.log("first time", isConnected);
    //checkConnection();
  }, []); // Dependency array remains empty if you only want this effect to run once on component mount

  useEffect(() => {
    // This code runs after `icpActor` and `icdvActor` have been updated.
    //console.log('actors updated', gldtLedgerActor, sGLDTActor);

    fetchBalances();
    //fetchMinters();
    // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  }, [gldtLedgerActor, sGLDTActor]);

  // useEffect(() => {
  //   // This code runs after `icpActor` and `icdvActor` have been updated.
  //   //console.log("actors updated", icpActor, gldtActor, gldtLedgerActor, sGLDTActor);

  //   fetchStats();
  //   //fetchMinters();
  //   // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  // }, [sGLDTActorTemp]);

  // const fetchStats = async () => {
  //   if (sGLDTActorTemp != null) {
  //     const stats = await sGLDTActorTemp.stats();
  //     console.log({ stats });
  //     await setStats(stats);
  //   }
  // };

  const isValidPrincipal = (principalString: string): boolean => {
    try {
      Principal.fromText(principalString);
      return true;
    } catch (error) {
      return false;
    }
  };

  const getGldtLedgerBalance = async () => {
    if (gldtLedgerActor === null) return;

    if (!isValidPrincipal(loggedInPrincipal)) return;

    const gldtLedgerBalanceResponse = await gldtLedgerActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
      subaccount: [],
    });

    //console.log('Fetching balances...', { gldtLedgerBalanceResponse });

    setGldtLedgerBalance(gldtLedgerBalanceResponse);
  };

  const getSGLDTLedgerBalance = async () => {
    if (sGLDTActor === null) return;
    if (!isValidPrincipal(loggedInPrincipal)) return;
    const sGLDTLedgerBalanceResponse = await sGLDTActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
      subaccount: [],
    });

    setsGLDTLedgerBalance(sGLDTLedgerBalanceResponse);

    //console.log('Fetching balances...', { sGLDTLedgerBalanceResponse });
  };

  const getGldtLedgerAllowance = async () => {
    if (gldtLedgerActor === null) return;
    const gldtLedgerAllowanceResponse = await gldtLedgerActor.icrc2_allowance({
      account: {
        owner: Principal.fromText(loggedInPrincipal),
        subaccount: [],
      },
      spender: { owner: Principal.fromText(sGLDTCanisterID), subaccount: [] },
    });

    setGldtLedgerAllowance(gldtLedgerAllowanceResponse.allowance);

    // console.log(
    //   'Fetching balances... (gldtLedgerAllowanceResponse)',
    //   gldtLedgerAllowanceResponse.allowance
    // ); // Need to add check if response was good.
  };

  const getSGLDTLedgerAllowance = async () => {
    if (sGLDTActor === null) return;
    const sGLDTLedgerAllowanceResponse = await sGLDTActor.icrc2_allowance({
      account: {
        owner: Principal.fromText(loggedInPrincipal),
        subaccount: [],
      },
      spender: { owner: Principal.fromText(sGLDTCanisterID), subaccount: [] },
    });

    setsGLDTLedgerAllowance(sGLDTLedgerAllowanceResponse.allowance); // Need to add check if response was good.

    // console.log(
    //   'Fetching balances... (sGLDTLedgerAllowanceResponse)',
    //   sGLDTLedgerAllowanceResponse.allowance
    // );
  };

  const fetchBalances = async () => {
    //
    // You'd need to replace this with actual logic to instantiate your actors and fetch balances
    // This is a placeholder for actor creation and balance fetching

    fetchTotalTokens();

    //if (!isConnected) return;

    // console.log('Fetching balances...', gldtLedgerActor, sGLDTActor);
    if (gldtLedgerActor === null || sGLDTActor === null) return;
    // Fetch balances (assuming these functions return balances in a suitable format)

    getGldtLedgerBalance();
    getSGLDTLedgerBalance();
    getGldtLedgerAllowance();
    getSGLDTLedgerAllowance();
  };

  const handleFailedWithdraw = async () => {
    setLoading(true);

    //sGLDTWithdraw(sGLDTLedgerAllowance); // 
    setLoading(false);
  };


  const handleFailedMint = async () => {
    setLoading(true);

    //gldtDeposit(gldtLedgerAllowance);

    setLoading(false);
  };

  return (
    <div className="App">
      <div>
        <a href="https://app.sneeddao.com" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <h1>sVAULT</h1>
          <img src={sgldtLogo} alt="sGLDT Logo" style={{ height: '40px', width: 'auto' }} />
        </div>
        <h2>Reduce the fees associated with Gold Token by Wrapping for sGLDT</h2>
        <h3>
          Total GLDT In Vault:{' '}
          {totalGLDTHeld !== '' ? (
            <>{totalGLDTHeld} GLDT</>
          ) : (
            <>
              <CircularProgress size={16} />
            </>
          )}{' '}
        </h3>
      </div>

      <PlugLoginHandler
        gldtCanisterID={gldtCanisterID}
        setGldtLedgerActor={setGldtLedgerActor}
        sGLDTCanisterID={sGLDTCanisterID}
        setsGLDTActor={setsGLDTActor}
        loading={loading}
        setLoading={setLoading}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        setGldtLedgerBalance={setGldtLedgerBalance}
        setsGLDTLedgerBalance={setsGLDTLedgerBalance}
        loggedInPrincipal={loggedInPrincipal}
        setLoggedInPrincipal={setLoggedInPrincipal}
      />

      <InternetIdentityLoginHandler
        gldtCanisterID={gldtCanisterID}
        setGldtLedgerActor={setGldtLedgerActor}
        sGLDTCanisterID={sGLDTCanisterID}
        setsGLDTActor={setsGLDTActor}
        loading={loading}
        setLoading={setLoading}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        loggedInPrincipal={loggedInPrincipal}
        setLoggedInPrincipal={setLoggedInPrincipal}
              />
      {(() => { console.log('App render - isConnected:', isConnected, 'connectionType:', connectionType); return null; })()}
      {!isConnected ? (
        <></>
      ) : (
        <>
          <div
            style={{
              marginTop: '16px',
              flexDirection: 'column',
              display: 'flex',
              alignItems: 'center',
              minWidth: '250px',
              width: 'fit-content', // I can't get it to stop expanding and contracting.
            }}
            className="card"
          >
            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={gldtLogo} alt="GLDT Logo" style={{ height: '24px', width: 'auto' }} />
                Wrap GLDT:
              </h2>
              <h3>$GLDT Balance: {bigintToFloatString(gldtLedgerBalance)}</h3>
              <GLDTMintingField
                loading={loading}
                setLoading={setLoading}
                gldtLedgerBalance={gldtLedgerBalance}
                gldtFee={gldtFee}
                isConnected={isConnected}
                sGLDTCanisterID={sGLDTCanisterID}
                gldtLedgerActor={gldtLedgerActor}
                cleanUp={cleanUp}
                sGLDTActor={sGLDTActor}
                minimumTransactionAmount={50000000n}
              />
              <p></p>
            </div>
            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                marginTop: '16px',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={sgldtLogo} alt="sGLDT Logo" style={{ height: '24px', width: 'auto' }} />
                Unwrap sGLDT:
              </h2>
              <p style={{ fontSize: '14px', color: '#222', marginTop: '4px', marginBottom: '8px' }}>The Vault charges a .2 fee per transaction to redeem sGLDT back to GLDT</p>
              <h3>
                $sGLDT Balance: {bigintToFloatString(sGLDTLedgerBalance, 8)}
              </h3>
              <SGLDTWithdrawField
                loading={loading}
                setLoading={setLoading}
                sGLDTLedgerBalance={sGLDTLedgerBalance}
                sGLDTFee={sGLDTFee}
                gldtFee={gldtFee}
                isConnected={isConnected}
                sGLDTActor={sGLDTActor}
                sGLDTCanisterID={sGLDTCanisterID}
                cleanUp={cleanUp}
              />
            </div>

            <div
              style={{
                border: '3px solid lightgrey',
                padding: '10px',
                width: '100%',
                marginTop: '16px',
                backgroundColor: 'rgba(192, 192, 192, 0.3)',
              }}
            >
              <TokenManagement
                loading={loading}
                setLoading={setLoading}
                tokens={[
                  {
                    tokenActor: gldtLedgerActor,
                    tokenFee: gldtFee,
                    tokenTicker: 'GLDT',
                    tokenDecimals: 8,
                    tokenLedgerBalance: gldtLedgerBalance,
                  },
                  {
                    tokenActor: sGLDTActor,
                    tokenFee: sGLDTFee,
                    tokenTicker: 'sGLDT',
                    tokenDecimals: 8,
                    tokenLedgerBalance: sGLDTLedgerBalance,
                  },
                ]}
                cleanUp={cleanUp}
                loggedInPrincipal={loggedInPrincipal}
                fetchBalances={fetchBalances}
              />
            </div>
          </div>
        </>
      )}
      <p className="read-the-docs">
        Bitcorn Labs presents: build on GLDT Click logos to learn more.
      </p>
    </div>
  );
}

export default App;

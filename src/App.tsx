import './App.css';
import React, { useState, useEffect, ReactElement, useRef } from 'react';
import reactLogo from './assets/gold.png';
import sckbtcLogo from './assets/sgldt.png';
import ckbtcLogo from './assets/gldtlogo.png';
// import { useQueryCall, useUpdateCall } from '@ic-reactor/react';
import { Principal } from '@dfinity/principal';
// import {Agent, Actor, HttpAgent} from '@dfinity/agent';
import ic from 'ic0';

import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent, Actor, AnonymousIdentity } from '@dfinity/agent';

import { idlFactory as icpFactory } from './declarations/nns-ledger';
import { _SERVICE as ckbtcService } from './declarations/nns-ledger/index.d';

import { idlFactory as SATSFactory } from './declarations/backend';
import { _SERVICE as SATSService } from './declarations/service_hack/service'; // changed to service.d because dfx generate would remove the export line from index.d
import { Stats } from './declarations/backend/backend.did.d';
import { CircularProgress, TextField } from '@mui/material';
import CkBTCMintingField from './components/ReBobMintingField';
import ShowTransactionStatus from './components/ShowTransactionStatus';
import SatsWithdrawField from './components/BobWithdrawField';

import bigintToFloatString from './bigIntToFloatString';
import PlugLoginHandler from './components/PlugLoginHandler';
import InternetIdentityLoginHandler from './components/InternetIdentityLoginHandler';
import TokenManagement from './components/TokenManagement';
import { ckbtcCanisterID, SATSCanisterID } from './config';


function App() {
  const [loading, setLoading] = useState(false);
  // const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [ckbtcLedgerBalance, setCkBtcLedgerBalance] = useState<bigint>(0n);
  const [SATSLedgerBalance, setSATSLedgerBalance] = useState<bigint>(0n);

  const [ckbtcLedgerAllowance, setCkBtcLedgerAllowance] = useState<bigint>(0n);
  const [SATSLedgerAllowance, setSATSLedgerAllowance] = useState<bigint>(0n);

  const [share, setShare] = useState<bigint>(0n);
  const [stats, setStats] = useState<Stats | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionType, setConnectionType] = useState<string>('');

  const [SATSActor, setSATSActor] = useState<SATSService | null>(null);
  // const [SATSActorTemp, setSATSActorTemp] = useState<SATSService | null>(
  //   null
  // );
  const [ckbtcLedgerActor, setCkBtcLedgerActor] = useState<ckbtcService | null>(null);

  const [totalckBTCHeld, setTotalckBTCHeld] = useState<string>('');
  const [totalSckBTCMinted, setTotalSckBTCMinted] = useState<string>('');

  const [loggedInPrincipal, setLoggedInPrincipal] = useState('');

  const ckbtcFee: bigint = 10n; // ckBTC ledger fee, raw
  const SATSFee: bigint = 100n; // SATS ledger fee, raw

  const fetchTotalTokens = async () => {
    // const totalckBTCHeldResponse = await ckbtcLedgerActor.icrc1_balance_of({
    //   owner: Principal.fromText(SATSCanisterID),
    //   subaccount: [],
    // }); // Can't use plug actors as anonymous.

    // We will use the internet identity anonymous calls in the next update. ic0 will work for now.
    const ckbtcIcActor = await ic(ckbtcCanisterID);

    const totalckBTCHeldResponse = await ckbtcIcActor.call('icrc1_balance_of', {
      owner: Principal.fromText(SATSCanisterID),
      subaccount: [],
    });

    //const totalSckBTCMintedResponse = await SATSActor.icrc1_total_supply();

    setTotalckBTCHeld(bigintToFloatString(totalckBTCHeldResponse, 8));
    //setTotalSckBTCMinted(bigintToFloatString(totalSckBTCMintedResponse));
  };

  const cleanUp = () => {
    setLoading(false);
    if (ckbtcLedgerActor && SATSActor) {
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
    //console.log('actors updated', ckbtcLedgerActor, SATSActor);

    fetchBalances();
    //fetchMinters();
    // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  }, [ckbtcLedgerActor, SATSActor]);

  // useEffect(() => {
  //   // This code runs after `icpActor` and `icdvActor` have been updated.
  //   //console.log("actors updated", icpActor, ckbtcActor, ckbtcLedgerActor, SATSActor);

  //   fetchStats();
  //   //fetchMinters();
  //   // Note: If `fetchBalances` depends on `icpActor` or `icdvActor`, you should ensure it's capable of handling null values or wait until these values are not null.
  // }, [SATSActorTemp]);

  // const fetchStats = async () => {
  //   if (SATSActorTemp != null) {
  //     const stats = await SATSActorTemp.stats();
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

  const getCkBtcLedgerBalance = async () => {
    if (ckbtcLedgerActor === null) return;

    if (!isValidPrincipal(loggedInPrincipal)) return;

    const ckbtcLedgerBalanceResponse = await ckbtcLedgerActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
      subaccount: [],
    });

    //console.log('Fetching balances...', { ckbtcLedgerBalanceResponse });

    setCkBtcLedgerBalance(ckbtcLedgerBalanceResponse);
  };

  const getSckBTCLedgerBalance = async () => {
    if (SATSActor === null) return;
    if (!isValidPrincipal(loggedInPrincipal)) return;
    const SATSLedgerBalanceResponse = await SATSActor.icrc1_balance_of({
      owner: Principal.fromText(loggedInPrincipal),
      subaccount: [],
    });

    setSATSLedgerBalance(SATSLedgerBalanceResponse);

    //console.log('Fetching balances...', { SATSLedgerBalanceResponse });
  };

  const getCkBtcLedgerAllowance = async () => {
    if (ckbtcLedgerActor === null) return;
    const ckbtcLedgerAllowanceResponse = await ckbtcLedgerActor.icrc2_allowance({
      account: {
        owner: Principal.fromText(loggedInPrincipal),
        subaccount: [],
      },
      spender: { owner: Principal.fromText(SATSCanisterID), subaccount: [] },
    });

    setCkBtcLedgerAllowance(ckbtcLedgerAllowanceResponse.allowance);

    // console.log(
    //   'Fetching balances... (ckbtcLedgerAllowanceResponse)',
    //   ckbtcLedgerAllowanceResponse.allowance
    // ); // Need to add check if response was good.
  };

  const getSckBTCLedgerAllowance = async () => {
    if (SATSActor === null) return;
    const SATSLedgerAllowanceResponse = await SATSActor.icrc2_allowance({
      account: {
        owner: Principal.fromText(loggedInPrincipal),
        subaccount: [],
      },
      spender: { owner: Principal.fromText(SATSCanisterID), subaccount: [] },
    });

    setSATSLedgerAllowance(SATSLedgerAllowanceResponse.allowance); // Need to add check if response was good.

    // console.log(
    //   'Fetching balances... (SATSLedgerAllowanceResponse)',
    //   SATSLedgerAllowanceResponse.allowance
    // );
  };

  const fetchBalances = async () => {
    //
    // You'd need to replace this with actual logic to instantiate your actors and fetch balances
    // This is a placeholder for actor creation and balance fetching

    fetchTotalTokens();

    //if (!isConnected) return;

    // console.log('Fetching balances...', ckbtcLedgerActor, SATSActor);
    if (ckbtcLedgerActor === null || SATSActor === null) return;
    // Fetch balances (assuming these functions return balances in a suitable format)

    getCkBtcLedgerBalance();
    getSckBTCLedgerBalance();
    getCkBtcLedgerAllowance();
    getSckBTCLedgerAllowance();
  };

  const handleFailedWithdraw = async () => {
    setLoading(true);

    //SATSWithdraw(SATSLedgerAllowance); // 
    setLoading(false);
  };


  const handleFailedMint = async () => {
    setLoading(true);

    //ckbtcDeposit(ckbtcLedgerAllowance);

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
          <img src={sckbtcLogo} alt="SATS Logo" style={{ height: '40px', width: 'auto' }} />
        </div>
        <h2>Reduce the fees associated with Bitcoin by wrapping ckBTC for SATS</h2>
        <h3>
          Total ckBTC In Vault:{' '}
          {totalckBTCHeld !== '' ? (
            <>{totalckBTCHeld} ckBTC</>
          ) : (
            <>
              <CircularProgress size={16} />
            </>
          )}{' '}
        </h3>
      </div>

      <PlugLoginHandler
        ckbtcCanisterID={ckbtcCanisterID}
        setCkBtcLedgerActor={setCkBtcLedgerActor}
        SATSCanisterID={SATSCanisterID}
        setSATSActor={setSATSActor}
        loading={loading}
        setLoading={setLoading}
        isConnected={isConnected}
        setIsConnected={setIsConnected}
        connectionType={connectionType}
        setConnectionType={setConnectionType}
        setCkBtcLedgerBalance={setCkBtcLedgerBalance}
        setSATSLedgerBalance={setSATSLedgerBalance}
        loggedInPrincipal={loggedInPrincipal}
        setLoggedInPrincipal={setLoggedInPrincipal}
      />

      <InternetIdentityLoginHandler
        ckbtcCanisterID={ckbtcCanisterID}
        setCkBtcLedgerActor={setCkBtcLedgerActor}
        SATSCanisterID={SATSCanisterID}
        setSATSActor={setSATSActor}
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
                <img src={ckbtcLogo} alt="ckBTC Logo" style={{ height: '24px', width: 'auto' }} />
                Wrap ckBTC:
              </h2>
              <h3>$ckBTC Balance: {bigintToFloatString(ckbtcLedgerBalance)}</h3>
              <CkBTCMintingField
                loading={loading}
                setLoading={setLoading}
                ckbtcLedgerBalance={ckbtcLedgerBalance}
                ckbtcFee={ckbtcFee}
                isConnected={isConnected}
                SATSCanisterID={SATSCanisterID}
                ckbtcLedgerActor={ckbtcLedgerActor}
                cleanUp={cleanUp}
                SATSActor={SATSActor}
                minimumTransactionAmount={1000n}
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
                <img src={sckbtcLogo} alt="SATS Logo" style={{ height: '24px', width: 'auto' }} />
                Unwrap SATS:
              </h2>
              <p style={{ fontSize: '14px', color: '#222', marginTop: '4px', marginBottom: '8px' }}>Unwrapping costs 15 SATS per transaction — 10 for the ckBTC network fee and 5 for the vault</p>
              <h3>
                $SATS Balance: {bigintToFloatString(SATSLedgerBalance, 8)}
              </h3>
              <SatsWithdrawField
                loading={loading}
                setLoading={setLoading}
                SATSLedgerBalance={SATSLedgerBalance}
                SATSFee={SATSFee}
                ckbtcFee={ckbtcFee}
                isConnected={isConnected}
                SATSActor={SATSActor}
                SATSCanisterID={SATSCanisterID}
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
                    tokenActor: ckbtcLedgerActor,
                    tokenFee: ckbtcFee,
                    tokenTicker: 'ckBTC',
                    tokenDecimals: 8,
                    tokenLedgerBalance: ckbtcLedgerBalance,
                  },
                  {
                    tokenActor: SATSActor,
                    tokenFee: SATSFee,
                    tokenTicker: 'SATS',
                    tokenDecimals: 8,
                    tokenLedgerBalance: SATSLedgerBalance,
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
        ⚠️ IMPORTANT NOTICE - NO RESPONSIBILITY DISCLAIMER ⚠️

BY USING THE sVAULT PLATFORM, YOU EXPLICITLY ACKNOWLEDGE AND AGREE THAT YOU ARE USING THE PLATFORM ENTIRELY AT YOUR OWN RISK. WE ACCEPT ABSOLUTELY NO RESPONSIBILITY OR LIABILITY WHATSOEVER FOR ANY CONSEQUENCES RESULTING FROM YOUR USE OF THE PLATFORM.

THIS INCLUDES, BUT IS NOT LIMITED TO: FINANCIAL LOSSES, TECHNICAL ISSUES, SECURITY BREACHES, SMART CONTRACT VULNERABILITIES, REGULATORY COMPLIANCE, OR ANY OTHER POTENTIAL RISKS OR DAMAGES.
      </p>
    </div>
  );
}

export default App;

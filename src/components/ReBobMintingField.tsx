import { useEffect, useState } from 'react';
import { TextField, ThemeProvider, createTheme } from '@mui/material';
import theme from '../theme';
import bigintToFloatString from '../bigIntToFloatString';
import { Principal } from '@dfinity/principal';
import { _SERVICE as ckbtcService } from '../declarations/nns-ledger/index.d'; // why is this icpService?
import { _SERVICE as SATSService } from '../declarations/service_hack/service';
import ShowTransactionStatus from './ShowTransactionStatus';

interface ReBobMintingFieldProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  ckbtcLedgerBalance: bigint;
  ckbtcFee: bigint;
  isConnected: boolean;
  SATSCanisterID: string;
  cleanUp: () => void;
  ckbtcLedgerActor: ckbtcService | null;
  SATSActor: SATSService | null;
  minimumTransactionAmount: bigint;
}

const ReBobMintingField: React.FC<ReBobMintingFieldProps> = ({
  loading,
  setLoading,
  ckbtcLedgerBalance,
  ckbtcFee,
  isConnected,
  SATSCanisterID,
  cleanUp,
  ckbtcLedgerActor,
  SATSActor,
  minimumTransactionAmount,
}) => {
  const [bobFieldValue, setBobFieldValue] = useState<string>('');
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [textFieldErrored, setTextFieldErrored] = useState<boolean>(false);
  const [statusArray, setStatusArray] = useState<string[]>(['']);
  const [bobFieldNatValue, setBobFieldNatValue] = useState<bigint>(0n);
  const [textFieldValueTooLow, setTextFieldValueTooLow] =
    useState<boolean>(true);

  const handleBobFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const regex = /^\d*\.?\d{0,8}$/; // Regex to allow numbers with up to 8 decimal places
    const newBobFieldValue = event.target.value;

    if (regex.test(newBobFieldValue) || newBobFieldValue === '') {
      setBobFieldValue(newBobFieldValue);
    }
  };

  const handleMint = async () => {
    if (!isConnected) {
      addStatus('You must be logged in to swap!');
      return;
    }

    if (
      bobFieldNatValue + ckbtcFee * 2n > ckbtcLedgerBalance ||
      ckbtcLedgerBalance < minimumTransactionAmount
    ) {
      addStatus('You do not have enough ckBTC.');
      return;
    }

    if (!ckbtcLedgerActor || !SATSActor) {
      addStatus('Actors not loaded!');
      return;
    }

    setLoading(true);

    const approvalResult = await approveCkBtc(bobFieldNatValue + ckbtcFee);

    if (!approvalResult) {
      cleanUp();
      return;
    }

    const result = await ckbtcDeposit(bobFieldNatValue);

    if (!result) {
      addStatus('ckBTC was approved, but was not transferred.');
    }

    cleanUp();
    setBobFieldNatValue(0n);
    setBobFieldValue('');
  };

  const approveCkBtc = async (amountInE8s: bigint) => {
    if (!ckbtcLedgerActor) return false;

    addStatus(
      `Requesting to approve ${bigintToFloatString(amountInE8s, 8)} ckBTC.`
    );

    try {
      const approvalResult = await ckbtcLedgerActor.icrc2_approve({
        amount: amountInE8s, // Approve amount and the fee to send ckbtc back during icrc2_transfer_from() in deposit() function
        // Adjust with your canister ID and parameters
        spender: {
          owner: await Principal.fromText(SATSCanisterID),
          subaccount: [],
        },
        memo: [],
        fee: [ckbtcFee],
        created_at_time: [BigInt(Date.now()) * 1000000n],
        expires_at: [],
        expected_allowance: [],
        from_subaccount: [],
      });

      if ('Ok' in approvalResult) {
        addStatus(
          `${bigintToFloatString(amountInE8s, 8)} ckBTC approved for transfer!`
        );
        return true;
      } else {
        addStatus('ckBTC was not approved for transfer.');
        return false;
      }
    } catch (error) {
      console.error('Error occurred when approving ckBTC:', error);
      addStatus(
        "Error occurred when approving ckBTC (Check your web browser's console)"
      );
      return false;
    }
  };

  const ckbtcDeposit = async (amountInE8s: bigint) => {
    if (!SATSActor) {
      return false;
    }

    try {
      addStatus(
        `Depositing ${bigintToFloatString(amountInE8s, 8)} ckBTC to mint SATS.`
      );
      const result = await SATSActor.deposit([], amountInE8s);

      if ('ok' in result) {
        addStatus(
          `Swapped ${bigintToFloatString(
            amountInE8s,
            8
          )} ckBTC for ${bigintToFloatString(
            amountInE8s,
            6
          )} SATS! ckBTC transferred on block ${result.ok[0].toString()}. SATS minted on block ${result.ok[1].toString()}.`
        );
        return true;
      } else {
        addStatus(
          "Failed to deposit ckBTC to mint SATS (Check your web browser's console)"
        );
        console.error(
          'Failed to deposit ckBTC to mint SATS: ',
          result.err.toString()
        );
        return false;
      }
    } catch (error) {
      console.error('Failed when depositing ckBTC to mint SATS:', error);
      addStatus(
        "Failed when depositing ckBTC to mint SATS (Check your web browser's console)"
      );
      return false;
    }
  };

  const addStatus = (inputText: string) => {
    setStatusArray((prevArray) => [inputText, ...prevArray]);
  };

  useEffect(() => {
    const ckbtcNatValue =
      bobFieldValue && bobFieldValue !== '.'
        ? BigInt((parseFloat(bobFieldValue) * 1_0000_0000).toFixed(0)) // Convert to Nat
        : 0n;

    // console.log(ckbtcNatValue);
    setButtonDisabled(ckbtcNatValue + ckbtcFee * 2n > ckbtcLedgerBalance);
    setTextFieldValueTooLow(ckbtcNatValue < minimumTransactionAmount);
    setTextFieldErrored(
      (ckbtcLedgerBalance < minimumTransactionAmount && ckbtcNatValue > 0) ||
        (ckbtcLedgerBalance >= minimumTransactionAmount &&
          ckbtcNatValue + ckbtcFee * 2n > ckbtcLedgerBalance)
    );
    setBobFieldNatValue(ckbtcNatValue);
  }, [bobFieldValue, ckbtcLedgerBalance]);

  return (
    <ThemeProvider theme={theme}>
      {ckbtcLedgerBalance <= minimumTransactionAmount ? (
        <>
          <div>
            You need at least {bigintToFloatString(minimumTransactionAmount, 8)}{' '}
            $ckBTC to wrap to SATS
          </div>
        </>
      ) : (
        <></>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'start',
        }}
      >
        <div>
          <TextField
            label="ckBTC"
            variant="filled"
            value={bobFieldValue}
            onChange={handleBobFieldChange}
            helperText={
              buttonDisabled
                ? "You don't have enough ckBTC!"
                : textFieldValueTooLow
                ? `You must input at least ${bigintToFloatString(
                    minimumTransactionAmount,
                    8
                  )} to swap.`
                : ''
            }
            error={textFieldErrored}
            disabled={loading}
            slotProps={{
              input: {
                inputMode: 'decimal', // Helps show the numeric pad with decimal on mobile devices
              },
            }}
            style={{ width: '200px', minHeight: '84px' }} // Set a fixed width or use a percentage
          />
        </div>
        <div style={{ height: '100%', paddingLeft: '2px' }}>
          <button
            onClick={handleMint}
            disabled={loading || buttonDisabled}
            style={{
              height: '56px', // Match this with TextField's height
              width: '200px', // Set the same width as TextField
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'Wrap ckBTC'}
          </button>
        </div>
      </div>
      <div>
        <ShowTransactionStatus statusArray={statusArray} loading={loading} />

        {/* <RetryReBobMint/> */}
      </div>
    </ThemeProvider>
  );
};

export default ReBobMintingField;

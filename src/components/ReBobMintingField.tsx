import { useEffect, useState } from 'react';
import { TextField, ThemeProvider, createTheme } from '@mui/material';
import theme from '../theme';
import bigintToFloatString from '../bigIntToFloatString';
import { Principal } from '@dfinity/principal';
import { _SERVICE as gldtService } from '../declarations/nns-ledger/index.d'; // why is this icpService?
import { _SERVICE as sGLDTService } from '../declarations/service_hack/service';
import ShowTransactionStatus from './ShowTransactionStatus';

interface ReBobMintingFieldProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  gldtLedgerBalance: bigint;
  gldtFee: bigint;
  isConnected: boolean;
  sGLDTCanisterID: string;
  cleanUp: () => void;
  gldtLedgerActor: gldtService | null;
  sGLDTActor: sGLDTService | null;
  minimumTransactionAmount: bigint;
}

const ReBobMintingField: React.FC<ReBobMintingFieldProps> = ({
  loading,
  setLoading,
  gldtLedgerBalance,
  gldtFee,
  isConnected,
  sGLDTCanisterID,
  cleanUp,
  gldtLedgerActor,
  sGLDTActor,
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
      bobFieldNatValue + gldtFee * 2n > gldtLedgerBalance ||
      gldtLedgerBalance < minimumTransactionAmount
    ) {
      addStatus('You do not have enough GLDT.');
      return;
    }

    if (!gldtLedgerActor || !sGLDTActor) {
      addStatus('Actors not loaded!');
      return;
    }

    setLoading(true);

    const approvalResult = await approveGldt(bobFieldNatValue + gldtFee);

    if (!approvalResult) {
      cleanUp();
      return;
    }

    const result = await gldtDeposit(bobFieldNatValue);

    if (!result) {
      addStatus('GLDT was approved, but was not transferred.');
    }

    cleanUp();
    setBobFieldNatValue(0n);
    setBobFieldValue('');
  };

  const approveGldt = async (amountInE8s: bigint) => {
    if (!gldtLedgerActor) return false;

    addStatus(
      `Requesting to approve ${bigintToFloatString(amountInE8s, 8)} GLDT.`
    );

    try {
      const approvalResult = await gldtLedgerActor.icrc2_approve({
        amount: amountInE8s, // Approve amount and the fee to send gldt back during icrc2_transfer_from() in deposit() function
        // Adjust with your canister ID and parameters
        spender: {
          owner: await Principal.fromText(sGLDTCanisterID),
          subaccount: [],
        },
        memo: [],
        fee: [gldtFee],
        created_at_time: [BigInt(Date.now()) * 1000000n],
        expires_at: [],
        expected_allowance: [],
        from_subaccount: [],
      });

      if ('Ok' in approvalResult) {
        addStatus(
          `${bigintToFloatString(amountInE8s, 8)} GLDT approved for transfer!`
        );
        return true;
      } else {
        addStatus('GLDT was not approved for transfer.');
        return false;
      }
    } catch (error) {
      console.error('Error occurred when approving GLDT:', error);
      addStatus(
        "Error occurred when approving GLDT (Check your web browser's console)"
      );
      return false;
    }
  };

  const gldtDeposit = async (amountInE8s: bigint) => {
    if (!sGLDTActor) {
      return false;
    }

    try {
      addStatus(
        `Depositing ${bigintToFloatString(amountInE8s, 8)} GLDT to mint sGLDT.`
      );
      const result = await sGLDTActor.deposit([], amountInE8s);

      if ('ok' in result) {
        addStatus(
          `Swapped ${bigintToFloatString(
            amountInE8s,
            8
          )} GLDT for ${bigintToFloatString(
            amountInE8s,
            6
          )} sGLDT! GLDT transferred on block ${result.ok[0].toString()}. sGLDT minted on block ${result.ok[1].toString()}.`
        );
        return true;
      } else {
        addStatus(
          "Failed to deposit GLDT to mint sGLDT (Check your web browser's console)"
        );
        console.error(
          'Failed to deposit GLDT to mint sGLDT: ',
          result.err.toString()
        );
        return false;
      }
    } catch (error) {
      console.error('Failed when depositing GLDT to mint sGLDT:', error);
      addStatus(
        "Failed when depositing GLDT to mint sGLDT (Check your web browser's console)"
      );
      return false;
    }
  };

  const addStatus = (inputText: string) => {
    setStatusArray((prevArray) => [inputText, ...prevArray]);
  };

  useEffect(() => {
    const gldtNatValue =
      bobFieldValue && bobFieldValue !== '.'
        ? BigInt((parseFloat(bobFieldValue) * 1_0000_0000).toFixed(0)) // Convert to Nat
        : 0n;

    // console.log(gldtNatValue);
    setButtonDisabled(gldtNatValue + gldtFee * 2n > gldtLedgerBalance);
    setTextFieldValueTooLow(gldtNatValue < minimumTransactionAmount);
    setTextFieldErrored(
      (gldtLedgerBalance < minimumTransactionAmount && gldtNatValue > 0) ||
        (gldtLedgerBalance >= minimumTransactionAmount &&
          gldtNatValue + gldtFee * 2n > gldtLedgerBalance)
    );
    setBobFieldNatValue(gldtNatValue);
  }, [bobFieldValue, gldtLedgerBalance]);

  return (
    <ThemeProvider theme={theme}>
      {gldtLedgerBalance <= minimumTransactionAmount ? (
        <>
          <div>
            You need at least {bigintToFloatString(minimumTransactionAmount, 8)}{' '}
            $GLDT to wrap to sGLDT
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
            label="GLDT"
            variant="filled"
            value={bobFieldValue}
            onChange={handleBobFieldChange}
            helperText={
              buttonDisabled
                ? "You don't have enough GLDT!"
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
            {'Wrap GLDT'}
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

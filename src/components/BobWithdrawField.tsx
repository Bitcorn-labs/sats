import { useEffect, useState } from 'react';
import { TextField, ThemeProvider } from '@mui/material';
import theme from '../theme';
import bigintToFloatString from '../bigIntToFloatString';
import { Principal } from '@dfinity/principal';
import { _SERVICE as gldtService } from '../declarations/nns-ledger/index.d'; // why is this icpService?
import { _SERVICE as sGLDTService } from '../declarations/service_hack/service';
import ShowTransactionStatus from './ShowTransactionStatus';

interface BobWithdrawFieldProps {
  loading: boolean;
  setLoading: (value: boolean) => void;
  sGLDTLedgerBalance: bigint;
  sGLDTFee: bigint;
  gldtFee: bigint;
  isConnected: boolean;
  sGLDTActor: sGLDTService | null;
  sGLDTCanisterID: string;
  cleanUp: () => void;
}

const BobWithdrawField: React.FC<BobWithdrawFieldProps> = ({
  loading,
  setLoading,
  sGLDTLedgerBalance,
  gldtFee,
  sGLDTFee,
  isConnected,
  sGLDTActor,
  sGLDTCanisterID,
  cleanUp,
}) => {
  const [reBobFieldValue, setReBobFieldValue] = useState<string>('');
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [textFieldErrored, setTextFieldErrored] = useState<boolean>(false);
  const [reBobFieldNatValue, setReBobFieldNatValue] = useState<bigint>(0n);
  const [statusArray, setStatusArray] = useState<string[]>(['']);
  const [textFieldValueTooLow, setTextFieldValueTooLow] =
    useState<boolean>(true);

  const minimumTransactionAmount: bigint = 1_100_000n;

  const handleWithdrawl = async () => {
    if (!isConnected) {
      addStatus('You must be logged in to swap!');
      return;
    }

    if (
      reBobFieldNatValue + gldtFee + sGLDTFee > sGLDTLedgerBalance ||
      sGLDTLedgerBalance < minimumTransactionAmount
    ) {
      // Cover the gldt transfer from backend fee. Cover the sGLDT approval fee. The sGLDT is burned without a fee applied.
      addStatus('You do not have enough sGLDT.');
      return;
    }

    if (!sGLDTActor) {
      addStatus('sGLDT actor not loaded!');
      return;
    }

    setLoading(true);

// Snassy: This code is not needed (we don't need approval for sGLDT -> GLDT)
/*
    // This step isn't needed.
    const approvalResult = await approveSGLDT(
      reBobFieldNatValue + gldtFee + sGLDTFee
    );

    if (!approvalResult) {
      await cleanUp();
      return;
    }
*/

// Snassy: We don't need to add any fee here!
    const result = await gldtWithdraw(reBobFieldNatValue);
    // const result = await gldtWithdraw(reBobFieldNatValue + gldtFee);

    if (!result) {
      addStatus('sGLDT was approved, but was not transferred.');
    }

    await cleanUp();
    setReBobFieldNatValue(0n);
    setReBobFieldValue('');
  };

  const approveSGLDT = async (amountInE8s: bigint) => {
    if (!sGLDTActor) return false;

    addStatus(
      `Requesting to approve ${bigintToFloatString(amountInE8s, 6)} sGLDT.`
    );

    console.log('before');

    try {
      const approvalResult = await sGLDTActor.icrc2_approve({
        amount: amountInE8s, // Cover the fee of sending the gldt back to the user.
        // Adjust with your canister ID and parameters
        spender: {
          owner: await Principal.fromText(sGLDTCanisterID),
          subaccount: [],
        },
        memo: [],
        fee: [sGLDTFee],
        created_at_time: [BigInt(Date.now()) * 1000000n],
        expires_at: [
          BigInt(Date.now()) * 1000000n + 5n * 60n * 1000n * 1000000n,
        ], // 5 minute approval.
        expected_allowance: [],
        from_subaccount: [],
      });

      console.log('after');

      console.log({ approvalResult });

      if ('Ok' in approvalResult) {
        addStatus(
          `${bigintToFloatString(amountInE8s, 6)} sGLDT approved for transfer!`
        );
        return true;
      } else {
        addStatus('sGLDT was not approved for transfer.');
        return false;
      }
    } catch (error) {
      console.error('Error occurred when approving sGLDT: ', error);
      addStatus(
        "Error occurred when approving sGLDT (Check your web browser's console)"
      );
    }
    return false;
  };

  const gldtWithdraw = async (amountInE8s: bigint) => {
    if (!sGLDTActor) {
      return false;
    }

    try {
      addStatus(
        `Depositing ${bigintToFloatString(
          amountInE8s,
          6
        )} sGLDT to burn for GLDT.`
      );
      const result = await sGLDTActor.withdraw([], amountInE8s);
      if ('ok' in result) {
        addStatus(
          `Swapped ${bigintToFloatString(
            amountInE8s,
            6
          )} sGLDT for ${bigintToFloatString(
            amountInE8s,
            8
          )} GLDT! sGLDT burned on block ${
            result.ok[0]
          }. GLDT transferred on block ${result.ok[1]}`
        );
        return true;
      } else {
        addStatus(
          "failed to burn sGLDT and return GLDT (Check your web browser's console)"
        );
        console.error(
          'failed to burn sGLDT and return GLDT',
          result.err.toString()
        );
        return false;
      }
    } catch (error) {
      console.error('Burning sGLDT and returning GLDT failed:', error);
      addStatus(
        "Burning sGLDT and returning GLDT failed (Check your web browser's console)"
      );
      return false;
    }
  };

  const addStatus = (inputText: string) => {
    setStatusArray((prevArray) => [inputText, ...prevArray]);
  };

  const handleBobFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const regex = /^\d*\.?\d{0,6}$/; // Regex to allow numbers with up to 8 decimal places
    const newBobFieldValue = event.target.value;

    if (regex.test(newBobFieldValue) || newBobFieldValue === '') {
      setReBobFieldValue(newBobFieldValue);
    }
  };

  useEffect(() => {
    const sGLDTNatValue =
      reBobFieldValue && reBobFieldValue !== '.'
        ? BigInt((parseFloat(reBobFieldValue) * 1_0000_0000).toFixed(0)) // Convert to Nat with 8 decimals
        : 0n;

    // console.log(sGLDTNatValue);
    setButtonDisabled(sGLDTNatValue + gldtFee + sGLDTFee > sGLDTLedgerBalance);
    setTextFieldValueTooLow(sGLDTNatValue < minimumTransactionAmount);
    setTextFieldErrored(
      (sGLDTLedgerBalance < minimumTransactionAmount && sGLDTNatValue > 0) ||
        (sGLDTLedgerBalance >= minimumTransactionAmount &&
          sGLDTNatValue + gldtFee + sGLDTFee > sGLDTLedgerBalance)
    );
    setReBobFieldNatValue(sGLDTNatValue);
  }, [reBobFieldValue, sGLDTLedgerBalance]);

  return (
    <ThemeProvider theme={theme}>
      {sGLDTLedgerBalance < minimumTransactionAmount ? (
        <>
          <div>
            {`You need at least ${bigintToFloatString(
              minimumTransactionAmount,
              6
            )}
            $sGLDT to unwrap to GLDT`}
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
          width: '100%',
        }}
      >
        <div>
          <TextField
            label="sGLDT"
            variant="filled"
            value={reBobFieldValue}
            onChange={handleBobFieldChange}
            helperText={
              buttonDisabled
                ? "You don't have enough sGLDT!"
                : textFieldValueTooLow
                ? `You must input at least ${bigintToFloatString(
                    minimumTransactionAmount,
                    6
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
            onClick={handleWithdrawl}
            disabled={loading || buttonDisabled}
            style={{
              height: '56px', // Match this with TextField's height
              width: '200px', // Set the same width as TextField
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {'Unwrap to GLDT'}
          </button>
        </div>
      </div>
      <div>
        <ShowTransactionStatus statusArray={statusArray} loading={loading} />
      </div>
    </ThemeProvider>
  );
};

export default BobWithdrawField;

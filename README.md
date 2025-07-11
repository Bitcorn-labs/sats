# GLDT VAULT - Low Fee GLDT Wrapper

A token wrapper dapp that allows users to wrap GLDT tokens into sGLDT with significantly lower transaction fees while maintaining a 1:1 ratio.

## Overview

This application provides a simple interface for users to:
- **Wrap GLDT to sGLDT**: Deposit GLDT and receive sGLDT tokens
- **Unwrap sGLDT to GLDT**: Burn sGLDT tokens and receive GLDT back

The wrapper maintains a 1:1 ratio between GLDT and sGLDT, but sGLDT has much lower transaction fees, making it ideal for frequent trading and transfers.

### Token Details:
- **GLDT Token:** `6c7su-kiaaa-aaaar-qaira-cai` - Fee: 10,000,000 (0.1 GLDT)
- **sGLDT Token:** Minted by backend canister - Fee: 1,000 (0.000001 sGLDT)
- **GLDT Decimals:** 8
- **sGLDT Decimals:** 6
- **Ratio:** 1:1 (1 GLDT = 1 sGLDT)

## Features

- **Low Fee Wrapping**: Convert GLDT to sGLDT for reduced transaction costs
- **Secure Unwrapping**: Burn sGLDT to retrieve original GLDT
- **Real-time Balances**: View your GLDT and sGLDT balances
- **Transaction History**: Track all wrap/unwrap operations
- **Multiple Authentication**: Support for Plug wallet and Internet Identity
- **Beautiful UI**: Gold-themed interface with modern design

## Architecture

The application consists of three main components:

1. **Backend Canister** (`i2s4q-syaaa-aaaan-qz4sq-cai`): Handles sGLDT token minting/burning and GLDT transfers
2. **Frontend Canister**: Serves the React web application
3. **GLDT Ledger**: The original GLDT token contract

## Deployment

### Prerequisites

- [Node.js](https://nodejs.org/en/) `>= 16`
- [`dfx`](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) `>= 0.14`
- ICP balance for canister deployment

### 1. Clone and Setup

```bash
git clone <repository-url>
cd Bobsplitter
npm install
```

### 2. Configure Canister IDs

The application is pre-configured with the following canister IDs:

```typescript
// In src/App.tsx
const gldtCanisterID = '6c7su-kiaaa-aaaar-qaira-cai';  // GLDT Ledger
const sGLDTCanisterID = 'i2s4q-syaaa-aaaan-qz4sq-cai'; // Backend (sGLDT)
```

### 3. Deploy to Internet Computer

```bash
# Set environment variable to suppress identity warning
export DFX_WARNING=-mainnet_plaintext_identity

# Deploy backend canister
dfx deploy backend --network ic

# Deploy frontend canister  
dfx deploy frontend --network ic
```

### 4. Update Compute Allocation (Optional)

For better performance, you may want to update the compute allocation:

```bash
dfx canister --network ic update-settings backend --compute-allocation 1
```

## Usage

### Connecting to the App

1. **Plug Wallet**: Click "Connect Plug" and approve the connection
2. **Internet Identity**: Click "Connect Internet Identity" and authenticate

### Wrapping GLDT to sGLDT

1. Ensure you have sufficient GLDT balance
2. Enter the amount of GLDT you want to wrap
3. Click "Wrap GLDT"
4. Approve the transaction in your wallet
5. Wait for confirmation - you'll receive sGLDT tokens

### Unwrapping sGLDT to GLDT

1. Ensure you have sufficient sGLDT balance
2. Enter the amount of sGLDT you want to unwrap
3. Click "Unwrap to GLDT"
4. Approve the transaction in your wallet
5. Wait for confirmation - you'll receive GLDT tokens

## Development

### Local Development

```bash
# Start local replica
dfx start --clean --background

# Deploy locally
dfx deploy

# Start development server
npm start
```

### Project Structure

```
src/
├── components/
│   ├── GLDTMintingField.tsx      # GLDT to sGLDT wrapping
│   ├── SGLDTWithdrawField.tsx    # sGLDT to GLDT unwrapping
│   ├── PlugLoginHandler.tsx      # Plug wallet integration
│   ├── InternetIdentityLoginHandler.tsx  # II authentication
│   └── TokenManagement.tsx       # Balance and allowance management
├── assets/
│   ├── goldbackground.jpg        # Background image
│   ├── gold.png                  # Gold logo
│   └── ...                       # Other assets
├── App.tsx                       # Main application component
└── index.scss                    # Global styles
```

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Sass + Material-UI
- **Backend**: Motoko
- **Authentication**: Plug Wallet + Internet Identity
- **Deployment**: Internet Computer (ICP)

## Security

- All transactions require user approval through their wallet
- Token transfers use ICRC-2 standard for secure approvals
- Backend canister handles all token minting/burning operations
- No private keys are stored in the application

## Support

For issues or questions:
- Check the transaction status messages for detailed error information
- Ensure you have sufficient token balances and allowances
- Verify your wallet connection is active

## License

This project is open source and available under the MIT License.

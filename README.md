# ALLAWEE

A minimal ERC-20 token allowance checker and revocation tool on **BOT Chain Bohr Testnet**.

## Overview

**ALLAWEE** allows users to:
1. Connect their Web3 wallet (such as MetaMask or other injected providers).
2. Validate active network connection and switch to **BOT Chain Bohr Testnet (Chain ID 968)**.
3. Check token allowances by entering an ERC-20 token contract address and a spender address.
4. Inspect token details (`name`, `symbol`, `decimals`, and `allowance`).
5. Revoke allowances by setting `approve(spender, 0)` with wallet confirmation.
6. Track live transaction progress with direct links to the **BOHR Scan Explorer**.

## Network Configuration

- **Chain Name:** BOT Chain Bohr Testnet
- **Chain ID:** `968`
- **Native Currency:** `BOT` (18 decimals)
- **RPC Endpoint:** `https://rpc.bohr.life`
- **Block Explorer:** `https://scan.bohr.life`

## Tech Stack

- **Framework:** Vite + React + TypeScript
- **Web3 Interaction:** `viem` + `wagmi`
- **Query Management:** `@tanstack/react-query`
- **Styling:** Plain CSS (minimalist, modern, and responsive)

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- A Web3 wallet browser extension (e.g., MetaMask)

### Installation & Local Run

```bash
# Install dependencies (already installed if cloned with node_modules)
npm install

# Start the local development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Important Safety & Operational Rules

- No private keys are ever requested or stored.
- Transactions are restricted exclusively to BOT Chain Bohr Testnet (Chain ID 968).
- Transactions require explicit user signature in the connected wallet.
- No backend or database is utilized; all queries interact directly with the Bohr Testnet JSON-RPC endpoint.

# Web3 Freelance Marketplace

A production-ready Web3 Freelance Marketplace similar to Upwork, Fiverr, Braintrust, and LaborX where clients can hire freelancers using cryptocurrency with secure escrow smart contracts and milestone-based payments.

## Architecture & Tech Stack

This project is organized as a monorepo containing three core components:

1. **Smart Contracts (`/contracts`)**
   - Solidity smart contracts managed using Hardhat.
   - Leverages OpenZeppelin for security controls, pausing mechanisms, and upgradeability.
   - Deploys to Ethereum, Polygon, Base, Arbitrum, and BNB Chain.

2. **Backend Engine (`/backend`)**
   - NestJS REST & WebSocket API built on TypeScript.
   - Prisma ORM interfacing with a PostgreSQL database.
   - Redis for rate-limiting, event queuing, and local caching.
   - Event listener service syncing blockchain transactions to database state.

3. **Frontend Dashboard (`/frontend`)**
   - Next.js 15 App Router using TypeScript.
   - Styled with Tailwind CSS, Shadcn UI, and animated via Framer Motion.
   - Integrated with Wagmi & Viem for seamless wallet logins (MetaMask, WalletConnect, Coinbase Wallet).

## Directory Structure

```text
├── contracts/        # Solidity Smart Contracts (Hardhat, Ethers, Waffle, Chai)
├── backend/          # NestJS Server Application (PostgreSQL, Prisma, Redis)
├── frontend/         # Next.js Application Client Dashboard (Tailwind CSS, Shadcn, Wagmi)
├── docker-compose.yml# Multi-container local execution setup (Postgre, Redis)
├── package.json      # NPM Workspaces orchestration config
└── README.md         # Main project documentation
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose
- MetaMask or any Web3 Wallet

### Setup Instructions

1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd Web3-Job-Portal
   npm install
   ```

2. **Start Infrastructure Services**:
   ```bash
   npm run docker:up
   ```

3. **Compile Smart Contracts**:
   ```bash
   npm run contracts:build
   ```

4. **Start Backend Server**:
   ```bash
   npm run backend:dev
   ```

5. **Start Frontend App**:
   ```bash
   npm run frontend:dev
   ```

## Development and Deployment Roadmap

See `implementation_plan.md` in the agent artifacts directory for the detailed roadmap of commits and phase definitions.

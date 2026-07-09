# Smart Contracts Workspace

This directory contains the Solidity smart contracts, hardhat configurations, and tests for the Web3 Freelance Marketplace.

## Layout

- `contracts/`: Solidity source files.
- `scripts/`: Deploy, upgrade, ABI export, and block explorer verification scripts.
- `test/`: Isolated unit tests and comprehensive integration workflow.
- `deployments/`: Addresses and exported JSON ABIs.

## Commands

- Compile: `npm run compile`
- Test: `npm run test`
- Deploy: `npx hardhat run scripts/deploy.ts`
- Export ABIs: `npx hardhat run scripts/exportAbis.ts`

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";
const ARBISCAN_API_KEY = process.env.ARBISCAN_API_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia",
      accounts: [PRIVATE_KEY],
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc.ankr.com/polygon_amoy",
      accounts: [PRIVATE_KEY],
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [PRIVATE_KEY],
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      mainnet: ETHERSCAN_API_KEY,
      sepolia: ETHERSCAN_API_KEY,
      polygon: POLYGONSCAN_API_KEY,
      polygonAmoy: POLYGONSCAN_API_KEY,
      base: BASESCAN_API_KEY,
      baseSepolia: BASESCAN_API_KEY,
      arbitrumOne: ARBISCAN_API_KEY,
      arbitrumSepolia: ARBISCAN_API_KEY,
      bsc: BSCSCAN_API_KEY,
      bscTestnet: BSCSCAN_API_KEY,
    },
  },
};

export default config;

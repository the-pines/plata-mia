require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_SURI = process.env.DEPLOYER_SURI || "";

module.exports = {
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
    polkadotTestnet: {
      url: "https://eth-rpc-testnet.polkadot.io",
      chainId: 420420417,
      accounts: DEPLOYER_SURI ? { mnemonic: DEPLOYER_SURI } : [],
    },
  },
};

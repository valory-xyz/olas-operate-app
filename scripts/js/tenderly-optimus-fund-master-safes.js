/**
 * This script funds the relevant master safes with the following balances:
 * - 1000 ETH on all networks
 * - 1000 OLAS on Optimism
 * - 1000 USDC on Ethereum
 * @note yarn dotenv -e .env node scripts/js/tenderly-optimus-fund-master-safes.js
 */

require('dotenv').config();

const fs = require('fs');

const operateEthereumJson = fs.readFileSync('.operate/wallets/ethereum.json');
const operateEthereum = JSON.parse(operateEthereumJson);

console.log(operateEthereum)

const masterSafeAddress = operateEthereum.safes['4']; // assuming all safe addresses are the same

const setBalance = async (masterSafeAddress, rpc) => fetch(rpc, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tenderly_setBalance',
        params: [
            masterSafeAddress,
            "0x3635C9ADC5DEA00000"
        ]
    }),
}).then(() => console.log(`Successfully set balance for ${masterSafeAddress} on ${rpc}`))

const setErc20Balance = async (erc20Address, masterSafeAddress, rpc) => fetch(rpc, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tenderly_setERC20Balance',
        params: [
            erc20Address,
            masterSafeAddress,
            "0x3635C9ADC5DEA00000"
        ]
    }),
}).then(() => console.log(`Successfully set ERC20 balance for ${masterSafeAddress} on ${rpc}`))

const main = async () => {
    const rpcs = {
        gnosis: process.env.GNOSIS_RPC,
        optimism: process.env.OPTIMISM_RPC,
        base: process.env.BASE_RPC,
        ethereum: process.env.ETHEREUM_RPC
    };

    const erc20Addresses = {
        olas: {
            gnosis: "0xcE11e14225575945b8E6Dc0D4F2dD4C570f79d9f",
            optimism: "0xFC2E6e6BCbd49ccf3A5f029c79984372DcBFE527",
            ethereum:
                "0x0001A500A6B18995B03f44bb040A5fFc28E45CB0",
            base:
                "0x4B1a99467a284CC690e3237bc69105956816F762"
        },
        usdc: {
            ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
    }

    // ETH on all
    await Promise.all(Object.values(rpcs).map(rpc => setBalance(masterSafeAddress, rpc)));

    // ERC20s
    await setErc20Balance(erc20Addresses.usdc.ethereum, masterSafeAddress, rpcs.ethereum)
    await setErc20Balance(erc20Addresses.olas.optimism, masterSafeAddress, rpcs.optimism)
}

main()
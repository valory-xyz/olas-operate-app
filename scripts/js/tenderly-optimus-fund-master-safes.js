/**
 * This script funds the relevant master safes with the following balances:
 * - 1000 ETH on all networks
 * - 1000 OLAS on Optimism
 * - 1000 USDC on Ethereum
 * @note yarn dotenv -e .env node scripts/js/tenderly-optimus-fund-master-safes.js
 */

require('dotenv').config();

const fs = require('fs');

const operateEthereumJson = fs.readFileSync('./.operate/wallets/ethereum.json');
const operateEthereum = JSON.parse(operateEthereumJson);

const masterSafeAddress = Object.values(operateEthereum.safes)[0]; // assuming all safe addresses are the same

const setBalance = async (address, rpc) => fetch(rpc, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tenderly_setBalance',
        params: [
            address,
            "0x3635C9ADC5DEA00000"
        ]
    }),
}).then(() => console.log(`Successfully set balance for ${address} on ${rpc}`))

const setErc20Balance = async (erc20Address, address, rpc) => fetch(rpc, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tenderly_setErc20Balance',
        params: [
            erc20Address,
            address,
            "0x56BC75E2D63100000"
        ],
        id: "3640"
    }),
}).then((e) => console.log(`Successfully set ERC20 balance for ${address} on ${rpc}\n ${JSON.stringify(e)}`))

const main = async () => {
    const rpcs = {
        gnosis: process.env.GNOSIS_RPC,
        optimism: process.env.OPTIMISM_RPC,
        base: process.env.BASE_RPC,
        ethereum: process.env.ETHEREUM_RPC
    };

    const erc20Addresses = {
        olas: {
            gnosis: "0xce11e14225575945b8e6dc0d4f2dd4c570f79d9f",
            optimism: "0xFC2E6e6BCbd49ccf3A5f029c79984372DcBFE527",
            ethereum:
                "0x0001a500a6b18995b03f44bb040a5ffc28e45cb0",
            base:
                "0x54330d28ca3357F294334BDC454a032e7f353416"
        },
        usdc: {
            ethereum: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
    }


    // ETH on all
    await Promise.all(Object.values(rpcs).map(rpc => setBalance(masterSafeAddress, rpc)));
    
    // check eth on all
    await Promise.all(Object.entries(rpcs).map(([chain, rpc]) =>
        fetch(rpc, {
            method: 'POST',
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [
                    masterSafeAddress,
                    'latest'
                ],
                id: 1
            }),
        }).then(async (res) => JSON.stringify(({... await res.json(), chain}), null, 0)).then(console.log)
    ));

    // ERC20s
    // await Promise.all(Object.entries(erc20Addresses.olas).map(([chain, address]) => (chain==="gnosis") && setErc20Balance(address, masterSafeAddress, rpcs[chain])));
    await setErc20Balance(erc20Addresses.olas.gnosis, masterSafeAddress, rpcs.gnosis);

    // check erc20s
    await Promise.all(Object.entries(erc20Addresses.olas).map(([chain, address]) =>
        fetch(rpcs[chain], {
            method: 'POST',
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                    {
                        to: address,
                        data: `0x70a082310000000000000000${masterSafeAddress.slice(2)}`
                    },
                    'latest'
                ],
                id: 1
            }),
        }).then(async (res) => JSON.stringify(({... await res.json(), chain}), null, 0)).then(console.log)
    ));
}

main()
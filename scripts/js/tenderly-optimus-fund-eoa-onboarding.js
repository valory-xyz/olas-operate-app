/**
 * This script sets the balance of the master EOA to 1000 ETH on all the networks
 * @note yarn dotenv -e .env node scripts/js/tenderly-optimus-fund-onboarding.js
 */

require('dotenv').config();

console.log(process.env)

const fs = require('fs');

const masterEoaJson = fs.readFileSync('.operate/wallets/ethereum.json');

const masterEoa = JSON.parse(masterEoaJson).address;

const setBalance = async (masterEoa, rpc) => fetch(rpc, {
    method: 'POST',
    body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tenderly_setBalance',
        params: [
            masterEoa,
            "0x3635C9ADC5DEA00000"
        ]
    }),
}).then(() => console.log(`Successfully set balance for ${masterEoa} on ${rpc}`))

const main = async () => {
    const rpcs = {
        gnosis: process.env.GNOSIS_RPC,
        optimus: process.env.OPTIMISM_RPC,
        base: process.env.BASE_RPC,
        ethereum: process.env.ETHEREUM_RPC
    };

    console.log(rpcs)

    await Promise.all(Object.values(rpcs).map(rpc => setBalance(masterEoa, rpc)));
}

main()